#!/usr/bin/env node
'use strict';

/**
 * OPS-03 focused observer tests.
 *
 * Exercises the read-only observer's pure transformation functions and the
 * historical-import DB reader against a SYNTHETIC SQLite database built in a
 * temp dir (never the real board DB). Synthetic board fixtures only.
 * Node built-in test runner; node:sqlite for the import reader. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const observer = require('../observer/mdg-ops-observer.cjs');

const FIX = path.join(__dirname, 'fixtures', 'observer');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-ops-observer-test-'));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// normalizeState
// ---------------------------------------------------------------------------

test('normalizeState maps Hermes done to card_completed, NOT released', () => {
  assert.equal(observer.normalizeState('done'), 'card_completed');
  assert.equal(observer.normalizeState('running'), 'in_progress');
  assert.equal(observer.normalizeState('ready'), 'ready');
  assert.equal(observer.normalizeState('blocked'), 'blocked');
  assert.equal(observer.normalizeState('todo'), 'triage');
  assert.equal(observer.normalizeState('weird-state'), 'unknown');
  assert.equal(observer.normalizeState(null), 'unknown');
});

test('epochToIso converts epoch seconds to UTC ISO', () => {
  assert.equal(observer.epochToIso(0), '1970-01-01T00:00:00.000Z');
  assert.equal(observer.epochToIso(1784064228), new Date(1784064228 * 1000).toISOString());
  assert.throws(() => observer.epochToIso('not-a-number'), /invalid epoch/);
});

// ---------------------------------------------------------------------------
// normalizeBoardState
// ---------------------------------------------------------------------------

test('first observation left-censors all tasks with null entry time', () => {
  const tasks = observer.normalizeBoardState(loadFixture('board-first.json'), { isFirst: true });
  assert.equal(tasks.length, 3);
  for (const t of tasks) {
    assert.equal(t.censoring.left_censored, true);
    assert.equal(t.censoring.unknown_state_entry_time, true);
    assert.equal(t.state_entry_time, null, 'entry time must be unknown on first observation');
  }
  const done = tasks.find((t) => t.task_id === 't_synthetic_done');
  assert.equal(done.normalized_state, 'card_completed');
  assert.equal(done.completion.card_completed, true);
  assert.equal(done.completion.verified_production_release, false, 'done is not a release');
});

test('normalizeBoardState rejects duplicate task IDs', () => {
  const dup = [
    { id: 't_x', status: 'ready' },
    { id: 't_x', status: 'running' },
  ];
  assert.throws(() => observer.normalizeBoardState(dup, { isFirst: true }), /DUPLICATE_TASK_ID/);
});

// ---------------------------------------------------------------------------
// diffToEvents
// ---------------------------------------------------------------------------

test('first observation emits task_observed for every task, left-censored', () => {
  const tasks = observer.normalizeBoardState(loadFixture('board-first.json'), { isFirst: true });
  const events = observer.diffToEvents({
    priorTasks: [], currentTasks: tasks,
    observedAt: '2026-07-26T12:00:00.000Z', sourceSha: 'a'.repeat(64), provenance: 'live_observer',
  });
  assert.equal(events.length, 3);
  for (const e of events) {
    assert.equal(e.event_type, 'task_observed');
    assert.equal(e.from_state, null);
    assert.equal(e.occurred_at, e.observed_at, 'no inferred occurrence time on first sight');
    assert.equal(e.censoring.left_censored, true);
    assert.equal(e.provenance, 'live_observer');
  }
});

test('unchanged snapshot emits no events (idempotent)', () => {
  const tasks = observer.normalizeBoardState(loadFixture('board-first.json'), { isFirst: false });
  const events = observer.diffToEvents({
    priorTasks: tasks, currentTasks: tasks,
    observedAt: '2026-07-26T13:00:00.000Z', sourceSha: 'b'.repeat(64), provenance: 'live_observer',
  });
  assert.equal(events.length, 0);
});

test('state change emits task_state_changed; block emits task_blocked; new task emits task_created_observed', () => {
  const prior = observer.normalizeBoardState(loadFixture('board-first.json'), { isFirst: false });
  const current = observer.normalizeBoardState(loadFixture('board-second.json'), { isFirst: false });
  const events = observer.diffToEvents({
    priorTasks: prior, currentTasks: current,
    observedAt: '2026-07-26T14:00:00.000Z', sourceSha: 'c'.repeat(64), provenance: 'live_observer',
  });
  const byTask = new Map(events.map((e) => [e.task_id, e]));
  // a: in_progress -> blocked
  assert.equal(byTask.get('t_synthetic_a').event_type, 'task_blocked');
  assert.equal(byTask.get('t_synthetic_a').from_state, 'in_progress');
  assert.equal(byTask.get('t_synthetic_a').to_state, 'blocked');
  // b: ready -> in_progress
  assert.equal(byTask.get('t_synthetic_b').event_type, 'task_state_changed');
  assert.equal(byTask.get('t_synthetic_b').to_state, 'in_progress');
  // done: unchanged -> no event
  assert.equal(byTask.has('t_synthetic_done'), false);
  // new: created
  assert.equal(byTask.get('t_synthetic_new').event_type, 'task_created_observed');
});

test('unblock emits task_unblocked', () => {
  const prior = observer.normalizeBoardState(
    [{ id: 't_x', status: 'blocked', blocking_reason: 'needs_input' }], { isFirst: false },
  );
  const current = observer.normalizeBoardState([{ id: 't_x', status: 'ready' }], { isFirst: false });
  const events = observer.diffToEvents({
    priorTasks: prior, currentTasks: current,
    observedAt: '2026-07-26T15:00:00.000Z', sourceSha: 'd'.repeat(64), provenance: 'live_observer',
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, 'task_unblocked');
  assert.equal(events[0].from_state, 'blocked');
});

// ---------------------------------------------------------------------------
// historical import mapping
// ---------------------------------------------------------------------------

test('mapTaskEventRow maps state-transition kinds and skips run-lifecycle kinds', () => {
  const observedAt = '2026-07-26T16:00:00.000Z';
  const importBatch = 'hermes-task-events-2026-07-14';

  const blocked = observer.mapTaskEventRow(
    { id: 3, task_id: 't_x', kind: 'blocked', payload: '{"kind":"needs_input"}', created_at: 1784064228 },
    { observedAt, importBatch },
  );
  assert.equal(blocked.event_type, 'task_blocked');
  assert.equal(blocked.to_state, 'blocked');
  assert.equal(blocked.provenance, 'historical_import');
  assert.equal(blocked.import_batch, importBatch);
  assert.equal(blocked.occurred_at, observer.epochToIso(1784064228));
  assert.equal(blocked.source_ref, 'task_events:row:3');

  const completed = observer.mapTaskEventRow(
    { id: 9, task_id: 't_y', kind: 'completed', payload: '{}', created_at: 1784065019 },
    { observedAt, importBatch },
  );
  assert.equal(completed.to_state, 'card_completed', 'completed maps to card_completed, not released');

  // run-lifecycle kinds are skipped
  for (const kind of ['heartbeat', 'claimed', 'spawned', 'commented', 'respawn_guarded']) {
    const skipped = observer.mapTaskEventRow(
      { id: 1, task_id: 't_z', kind, payload: '{}', created_at: 1784064228 },
      { observedAt, importBatch },
    );
    assert.equal(skipped, null, `${kind} should be skipped`);
  }
});

// ---------------------------------------------------------------------------
// historical import DB reader (synthetic SQLite)
// ---------------------------------------------------------------------------

function buildSyntheticBoardDb(dbPath) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      run_id INTEGER,
      kind TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  const insert = db.prepare('INSERT INTO task_events (task_id, run_id, kind, payload, created_at) VALUES (?, ?, ?, ?, ?)');
  insert.run('t_a', null, 'created', '{"status":"ready"}', 1784064228);
  insert.run('t_a', null, 'blocked', '{"kind":"needs_input"}', 1784064300);
  insert.run('t_a', null, 'unblocked', '{}', 1784064400);
  insert.run('t_a', 1, 'heartbeat', '{}', 1784064500); // skipped
  insert.run('t_b', null, 'completed', '{}', 1784065019);
  insert.run('t_b', 2, 'claimed', '{}', 1784064900); // skipped
  db.close();
}

test('readHistoricalEvents reads a synthetic board DB and maps only state transitions', () => {
  const dir = makeTempDir();
  try {
    const dbPath = path.join(dir, 'kanban.db');
    buildSyntheticBoardDb(dbPath);
    const { events, totalRows, skippedBeforeCutoff } = observer.readHistoricalEvents(dbPath, {
      observedAt: '2026-07-26T17:00:00.000Z',
      importBatch: 'hermes-task-events-2026-07-14',
    });
    assert.equal(totalRows, 6);
    assert.equal(skippedBeforeCutoff, 0);
    // 6 rows - 2 skipped (heartbeat, claimed) = 4 mapped events
    assert.equal(events.length, 4);
    for (const e of events) {
      assert.equal(e.provenance, 'historical_import');
      assert.equal(e.import_batch, 'hermes-task-events-2026-07-14');
      assert.ok(/^[0-9a-f]{64}$/.test(e.source_sha256));
    }
    const types = events.map((e) => e.event_type).sort();
    assert.deepEqual(types, ['task_blocked', 'task_created_observed', 'task_state_changed', 'task_unblocked']);
  } finally {
    cleanup(dir);
  }
});

test('readHistoricalEvents honors a cutoff epoch', () => {
  const dir = makeTempDir();
  try {
    const dbPath = path.join(dir, 'kanban.db');
    buildSyntheticBoardDb(dbPath);
    // cutoff after the first two rows (created@1784064228, blocked@1784064300)
    const { events, skippedBeforeCutoff } = observer.readHistoricalEvents(dbPath, {
      observedAt: '2026-07-26T17:00:00.000Z',
      importBatch: 'hermes-task-events-2026-07-14',
      cutoffEpoch: 1784064350,
    });
    assert.ok(skippedBeforeCutoff >= 2, 'rows before cutoff should be skipped');
    for (const e of events) {
      assert.ok(Date.parse(e.occurred_at) >= 1784064350 * 1000);
    }
  } finally {
    cleanup(dir);
  }
});

// ---------------------------------------------------------------------------
// no timestamp fabrication
// ---------------------------------------------------------------------------

test('imported events use the row created_at, never an inferred time', () => {
  const dir = makeTempDir();
  try {
    const dbPath = path.join(dir, 'kanban.db');
    buildSyntheticBoardDb(dbPath);
    const { events } = observer.readHistoricalEvents(dbPath, {
      observedAt: '2026-07-26T17:00:00.000Z',
      importBatch: 'hermes-task-events-2026-07-14',
    });
    const created = events.find((e) => e.event_type === 'task_created_observed');
    assert.equal(created.occurred_at, observer.epochToIso(1784064228));
    assert.notEqual(created.occurred_at, created.observed_at, 'occurrence != observation for history');
  } finally {
    cleanup(dir);
  }
});

#!/usr/bin/env node
'use strict';

/**
 * OPS-02 focused ledger tests.
 *
 * Exercises the private immutable event ledger against a temporary root
 * (never the real ~/.hermes/data/mdg-ops). Synthetic fixtures only.
 * Node built-in test runner; no external dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ledger = require('../ledger/mdg-ops-ledger.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCHEMA = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'docs', 'governance', 'schemas', 'mdg-operations-event-v1.schema.json'), 'utf8'),
);
const FIX = path.join(__dirname, 'fixtures', 'ledger');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-ops-ledger-test-'));
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
}

test('init creates marker, events, quarantine with owner-only perms', () => {
  const root = makeTempRoot();
  try {
    const res = ledger.init(root);
    assert.equal(res.ok, true);
    assert.ok(fs.existsSync(path.join(root, 'INITIALIZED')));
    assert.ok(fs.existsSync(path.join(root, 'events')));
    assert.ok(fs.existsSync(path.join(root, 'quarantine')));
    assert.equal(fs.statSync(root).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(root, 'INITIALIZED')).mode & 0o777, 0o600);
  } finally {
    cleanup(root);
  }
});

test('init twice fails closed (exclusive first creation)', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    assert.throws(() => ledger.init(root), /ALREADY_INITIALIZED/);
  } finally {
    cleanup(root);
  }
});

test('init force re-asserts without error', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    assert.doesNotThrow(() => ledger.init(root, { force: true }));
  } finally {
    cleanup(root);
  }
});

test('rejects a root inside the repository', () => {
  assert.throws(
    () => ledger.resolveRoot({ repoRoot: REPO_ROOT, env: { MDG_OPS_ROOT: path.join(REPO_ROOT, '.hermes-ops') } }),
    /OPS_ROOT_INSIDE_REPO/,
  );
});

test('rejects the repository root itself', () => {
  assert.throws(
    () => ledger.resolveRoot({ repoRoot: REPO_ROOT, env: { MDG_OPS_ROOT: REPO_ROOT } }),
    /OPS_ROOT_INSIDE_REPO/,
  );
});

test('rejects a symlink alias resolving into the repository', () => {
  const outside = makeTempRoot();
  const linkPath = path.join(outside, 'sneaky-link');
  try {
    fs.symlinkSync(path.join(REPO_ROOT, 'docs'), linkPath);
    assert.throws(
      () => ledger.resolveRoot({ repoRoot: REPO_ROOT, env: { MDG_OPS_ROOT: linkPath } }),
      /OPS_ROOT_SYMLINK_ESCAPE|OPS_ROOT_INSIDE_REPO/,
    );
  } finally {
    cleanup(outside);
  }
});

test('accepts a legitimate outside root', () => {
  const outside = makeTempRoot();
  try {
    const resolved = ledger.resolveRoot({ repoRoot: REPO_ROOT, env: { MDG_OPS_ROOT: outside } });
    assert.equal(resolved, path.resolve(outside));
  } finally {
    cleanup(outside);
  }
});

test('append valid event writes a 0600 file and returns seq', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    const res = ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    assert.equal(res.outcome, 'appended');
    assert.equal(res.seq, 1);
    const files = ledger._internal.readAllEvents(root);
    assert.equal(files.length, 1);
    assert.equal(fs.statSync(files[0].__path).mode & 0o777, 0o600);
  } finally {
    cleanup(root);
  }
});

test('identical re-append is idempotent (no duplicate)', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    const event = loadFixture('valid-event.json');
    const first = ledger.appendEvent(root, event, { schema: SCHEMA });
    const second = ledger.appendEvent(root, JSON.parse(JSON.stringify(event)), { schema: SCHEMA });
    assert.equal(first.outcome, 'appended');
    assert.equal(second.outcome, 'duplicate-noop');
    assert.equal(second.seq, first.seq);
    assert.equal(ledger._internal.readAllEvents(root).length, 1);
  } finally {
    cleanup(root);
  }
});

test('same event_id with different content fails closed', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    const mutated = loadFixture('valid-event.json');
    mutated.to_state = 'accepted';
    assert.throws(() => ledger.appendEvent(root, mutated, { schema: SCHEMA }), /CONFLICTING_EVENT_ID/);
    assert.equal(ledger._internal.readAllEvents(root).length, 1);
  } finally {
    cleanup(root);
  }
});

test('two distinct events append with increasing seq', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    const a = ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    const b = ledger.appendEvent(root, loadFixture('valid-event-2.json'), { schema: SCHEMA });
    assert.equal(a.seq, 1);
    assert.equal(b.seq, 2);
    assert.equal(ledger._internal.readAllEvents(root).length, 2);
  } finally {
    cleanup(root);
  }
});

test('schema-invalid event is rejected and quarantined', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    assert.throws(() => ledger.appendEvent(root, loadFixture('invalid-event-bad-sha.json'), { schema: SCHEMA }), /INVALID_EVENT/);
    assert.equal(ledger._internal.readAllEvents(root).length, 0);
    const q = fs.readdirSync(path.join(root, 'quarantine')).filter((f) => f.endsWith('.json'));
    assert.ok(q.length >= 1, 'invalid event should be quarantined');
  } finally {
    cleanup(root);
  }
});

test('unsupported schema is rejected', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    const bad = loadFixture('valid-event.json');
    bad.schema = 'mdg-operations-event-v9';
    assert.throws(() => ledger.appendEvent(root, bad, { schema: SCHEMA }), /UNSUPPORTED_SCHEMA|INVALID_EVENT/);
  } finally {
    cleanup(root);
  }
});

test('invalid observed_at (bad timestamp) is rejected', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    const bad = loadFixture('valid-event.json');
    bad.event_id = 'evt_bad_time';
    bad.observed_at = 'not-a-date';
    assert.throws(() => ledger.appendEvent(root, bad, { schema: SCHEMA }), /INVALID_EVENT/);
  } finally {
    cleanup(root);
  }
});

test('append before init fails', () => {
  const root = makeTempRoot();
  try {
    assert.throws(() => ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA }), /NOT_INITIALIZED/);
  } finally {
    cleanup(root);
  }
});

test('events are partitioned by observed_at UTC date', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    ledger.appendEvent(root, loadFixture('valid-event-2.json'), { schema: SCHEMA });
    const dayDir = path.join(root, 'events', '2026', '07', '26');
    assert.ok(fs.existsSync(dayDir), 'expected UTC date partition 2026/07/26');
    assert.equal(fs.readdirSync(dayDir).filter((f) => f.endsWith('.json')).length, 2);
  } finally {
    cleanup(root);
  }
});

test('check passes on a clean ledger', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    ledger.appendEvent(root, loadFixture('valid-event-2.json'), { schema: SCHEMA });
    const res = ledger.check(root, { schema: SCHEMA });
    assert.equal(res.ok, true, `expected clean check, got ${JSON.stringify(res.problems)}`);
    assert.equal(res.eventCount, 2);
  } finally {
    cleanup(root);
  }
});

test('check detects unsafe file permissions', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    const file = ledger._internal.readAllEvents(root)[0].__path;
    fs.chmodSync(file, 0o644);
    const res = ledger.check(root, { schema: SCHEMA });
    assert.equal(res.ok, false);
    assert.ok(res.problems.some((p) => p.startsWith('FILE_PERMS')));
  } finally {
    cleanup(root);
  }
});

test('check detects a hash mismatch (tampering)', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    const file = ledger._internal.readAllEvents(root)[0].__path;
    const wrapper = JSON.parse(fs.readFileSync(file, 'utf8'));
    wrapper.event.to_state = 'tampered';
    fs.writeFileSync(file, JSON.stringify(wrapper, null, 2), { mode: 0o600 });
    const res = ledger.check(root, { schema: SCHEMA });
    assert.equal(res.ok, false);
    assert.ok(res.problems.some((p) => p.startsWith('HASH_MISMATCH')));
  } finally {
    cleanup(root);
  }
});

test('health reports aggregates only and redacts bodies', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    ledger.appendEvent(root, loadFixture('valid-event-2.json'), { schema: SCHEMA });
    const h = ledger.health(root);
    assert.equal(h.status, 'ok');
    assert.equal(h.eventCount, 2);
    assert.ok(Array.isArray(h.schemas));
    assert.ok(h.eventTypeCounts.task_state_changed >= 1);
    assert.ok(h.firstObservedAt && h.lastObservedAt);
    const serialized = JSON.stringify(h);
    assert.ok(!serialized.includes('t_synthetic_ledger'), 'health must not leak task ids/bodies');
    assert.ok(!serialized.includes('synthetic ledger fixture'), 'health must not leak metadata notes');
  } finally {
    cleanup(root);
  }
});

test('list filters by observed_at window', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    ledger.appendEvent(root, loadFixture('valid-event-2.json'), { schema: SCHEMA });
    assert.equal(ledger.list(root).length, 2);
    const morning = ledger.list(root, { from: '2026-07-26T09:00:00Z', to: '2026-07-26T10:30:00Z' });
    assert.equal(morning.length, 1);
    assert.equal(morning[0].event.event_id, 'evt_ledger_0001');
  } finally {
    cleanup(root);
  }
});

test('no stray temp files remain after appends', () => {
  const root = makeTempRoot();
  try {
    ledger.init(root);
    ledger.appendEvent(root, loadFixture('valid-event.json'), { schema: SCHEMA });
    ledger.appendEvent(root, loadFixture('valid-event-2.json'), { schema: SCHEMA });
    const stray = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.startsWith('.tmp.')) stray.push(full);
      }
    };
    walk(root);
    assert.equal(stray.length, 0, `stray tmp files: ${stray.join(', ')}`);
  } finally {
    cleanup(root);
  }
});

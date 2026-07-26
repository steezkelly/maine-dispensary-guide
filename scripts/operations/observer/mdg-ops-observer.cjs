'use strict';

/**
 * mdg-ops-observer.cjs — read-only MDG operations observer.
 *
 * Two ingestion modes (per OPS-03/04 rescope note 2026-07-26):
 *
 *   1. HISTORICAL IMPORT (one-time): read the Hermes board SQLite
 *      (task_events / task_runs / task_links) and map each row to an
 *      mdg-operations-event-v1 event with provenance="historical_import" and a
 *      documented import_batch. occurred_at = the row's created_at (epoch→UTC).
 *      This is trustworthy structured history, NOT inference.
 *
 *   2. LIVE SNAPSHOT-DIFF (ongoing): accept board-state + workflow-status JSON
 *      FILES, normalize into a snapshot, diff against the prior trustworthy
 *      snapshot, and emit events with provenance="live_observer". First
 *      observation left-censors pre-existing tasks (unknown state-entry time).
 *
 * The observer NEVER mutates Hermes, Git, or the Hub. It only derives events
 * and (optionally) hands them to the OPS-02 ledger. All transformation
 * functions are pure so they are testable without a live board.
 *
 * Node built-ins only (crypto, fs, path; node:sqlite for the import reader).
 */

const crypto = require('node:crypto');

const SCHEMA_ID = 'mdg-operations-event-v1';

// ---------------------------------------------------------------------------
// Normalized state vocabulary (mirrors snapshot schema)
// ---------------------------------------------------------------------------

const RAW_TO_NORMALIZED = {
  ready: 'ready',
  todo: 'triage',
  triage: 'triage',
  running: 'in_progress',
  in_progress: 'in_progress',
  authored: 'authored',
  verifying: 'verifying',
  needs_fix: 'needs_fix',
  accepted: 'accepted',
  integrating: 'integrating',
  released: 'released',
  blocked: 'blocked',
  done: 'card_completed', // CRITICAL: Hermes 'done' is card completion, NOT a release.
  cancelled: 'card_completed',
  archived: 'card_completed',
};

function normalizeState(raw) {
  if (typeof raw !== 'string') return 'unknown';
  return RAW_TO_NORMALIZED[raw.trim().toLowerCase()] || 'unknown';
}

function epochToIso(epochSeconds) {
  const ms = Number(epochSeconds) * 1000;
  if (!Number.isFinite(ms) || Number.isNaN(ms)) {
    throw new Error(`invalid epoch seconds: ${epochSeconds}`);
  }
  return new Date(ms).toISOString();
}

function sha256OfString(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function canonicalize(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Completion concepts (six distinct, non-equivalent)
// ---------------------------------------------------------------------------

function emptyCompletion() {
  return {
    card_completed: false,
    initiative_completed: false,
    verification_pass: false,
    accepted_candidate: false,
    integration_completed: false,
    verified_production_release: false,
  };
}

// ---------------------------------------------------------------------------
// MODE 2: live snapshot normalization + diff
// ---------------------------------------------------------------------------

/**
 * Normalize a Hermes board export (array of cards) into snapshot task records.
 * `isFirst` left-censors every pre-existing task (unknown state-entry time).
 */
function normalizeBoardState(cards, { isFirst = false } = {}) {
  const list = Array.isArray(cards) ? cards : Array.isArray(cards && cards.tasks) ? cards.tasks : [];
  const seen = new Set();
  const tasks = [];
  for (const card of list) {
    if (!card || typeof card !== 'object') continue;
    const taskId = typeof card.id === 'string' ? card.id : '';
    if (!taskId) continue;
    if (seen.has(taskId)) {
      throw new Error(`DUPLICATE_TASK_ID: ${taskId} appears more than once in the board snapshot`);
    }
    seen.add(taskId);

    const rawState = typeof card.status === 'string' ? card.status : (typeof card.state === 'string' ? card.state : '');
    const normalized = normalizeState(rawState);
    const completion = emptyCompletion();
    if (normalized === 'card_completed') completion.card_completed = true;

    tasks.push({
      task_id: taskId,
      initiative_id: typeof card.parent === 'string' ? card.parent : null,
      raw_state: rawState,
      normalized_state: normalized,
      completion,
      censoring: {
        left_censored: isFirst,
        right_censored: normalized !== 'card_completed' && normalized !== 'released',
        unknown_state_entry_time: isFirst,
      },
      // First observation: entry time is UNKNOWN. Never inferred.
      state_entry_time: null,
      depends_on: Array.isArray(card.depends_on) ? card.depends_on.filter((d) => typeof d === 'string') : [],
      actor_role: null,
      base_sha: typeof card.base_sha === 'string' ? card.base_sha : null,
      branch: typeof card.branch_name === 'string' ? card.branch_name : null,
      worktree: typeof card.workspace_path === 'string' ? card.workspace_path : null,
      blocked_reason: typeof card.blocking_reason === 'string' ? card.blocking_reason : null,
      next_check_at: typeof card.nextCheckAt === 'string' ? card.nextCheckAt : null,
      verification_evidence_ref: null,
      integration_evidence_ref: null,
      release_evidence_ref: null,
    });
  }
  return tasks;
}

/**
 * Diff a prior task map against the current normalized tasks and derive events.
 * Pure: returns event objects; does not write anything.
 *
 * - First observation (priorTasks empty): emit task_observed for each task,
 *   left-censored, from_state null, occurred_at == observed_at.
 * - Later: emit task_state_changed / task_blocked / task_unblocked only when
 *   normalized_state actually changed. No change => no event (idempotent).
 */
function diffToEvents({ priorTasks, currentTasks, observedAt, sourceSha, provenance }) {
  const events = [];
  const priorById = new Map((priorTasks || []).map((t) => [t.task_id, t]));
  const isFirst = priorById.size === 0;

  for (const task of currentTasks) {
    const prior = priorById.get(task.task_id);

    if (!prior) {
      events.push(makeEvent({
        eventType: isFirst ? 'task_observed' : 'task_created_observed',
        taskId: task.task_id,
        fromState: null,
        toState: task.normalized_state,
        occurredAt: observedAt, // first sight: occurrence == observation; no inference
        observedAt,
        sourceSha,
        provenance,
        censoring: {
          left_censored: isFirst,
          right_censored: task.censoring.right_censored,
          unknown_state_entry_time: isFirst,
        },
      }));
      continue;
    }

    if (prior.normalized_state === task.normalized_state) {
      continue; // no change => idempotent, no event
    }

    let eventType = 'task_state_changed';
    if (task.normalized_state === 'blocked') eventType = 'task_blocked';
    else if (prior.normalized_state === 'blocked' && task.normalized_state !== 'blocked') eventType = 'task_unblocked';

    events.push(makeEvent({
      eventType,
      taskId: task.task_id,
      fromState: prior.normalized_state,
      toState: task.normalized_state,
      occurredAt: observedAt, // transition observed at this snapshot; not back-dated
      observedAt,
      sourceSha,
      provenance,
      reasonCode: eventType === 'task_blocked' ? (task.blocked_reason ? 'blocked' : null) : null,
      censoring: {
        left_censored: false,
        right_censored: task.censoring.right_censored,
        unknown_state_entry_time: false,
      },
    }));
  }

  return events;
}

// ---------------------------------------------------------------------------
// MODE 1: historical import mapping
// ---------------------------------------------------------------------------

const KIND_TO_EVENT_TYPE = {
  created: 'task_created_observed',
  completed: 'task_state_changed',
  blocked: 'task_blocked',
  unblocked: 'task_unblocked',
  promoted: 'task_state_changed',
};

/**
 * Map one board-SQLite task_events row to an operations event.
 * Returns null for kinds that are not task-state transitions (heartbeat,
 * claimed, spawned, commented, etc.) — those are run lifecycle, not state.
 * `importBatch` documents the source + cutoff on every imported record.
 */
function mapTaskEventRow(row, { observedAt, importBatch }) {
  const eventType = KIND_TO_EVENT_TYPE[row.kind];
  if (!eventType) return null; // not a task-state transition

  const occurredAt = epochToIso(row.created_at);
  let payload = {};
  try { payload = row.payload ? JSON.parse(row.payload) : {}; } catch { payload = {}; }

  let toState = null;
  let fromState = null;
  if (row.kind === 'completed') toState = 'card_completed';
  else if (row.kind === 'blocked') toState = 'blocked';
  else if (row.kind === 'unblocked') toState = 'ready';
  else if (row.kind === 'promoted') toState = 'ready';
  else if (row.kind === 'created') toState = normalizeState(payload.status || 'ready');

  const sourceCanonical = canonicalize({ table: 'task_events', id: row.id, task_id: row.task_id, kind: row.kind, payload: row.payload, created_at: row.created_at });

  return makeEvent({
    eventType,
    taskId: row.task_id,
    fromState,
    toState,
    occurredAt,
    observedAt,
    sourceSha: sha256OfString(sourceCanonical),
    provenance: 'historical_import',
    importBatch,
    sourceRef: `task_events:row:${row.id}`,
    reasonCode: row.kind === 'blocked' ? (payload.kind || 'blocked') : null,
    censoring: { left_censored: false, right_censored: false, unknown_state_entry_time: false },
  });
}

/**
 * Read task_events from a board SQLite database and map to events.
 * Uses node:sqlite (built-in). `cutoffEpoch` (optional) bounds the import;
 * rows before the documented cutoff are excluded and reported.
 */
function readHistoricalEvents(dbPath, { observedAt, importBatch, cutoffEpoch = null } = {}) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch (err) {
    throw new Error(`NODE_SQLITE_UNAVAILABLE: ${err.message}`);
  }
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db.prepare(
      'SELECT id, task_id, run_id, kind, payload, created_at FROM task_events ORDER BY id ASC',
    ).all();
    const events = [];
    let skippedBeforeCutoff = 0;
    for (const row of rows) {
      if (cutoffEpoch !== null && row.created_at < cutoffEpoch) {
        skippedBeforeCutoff += 1;
        continue;
      }
      const event = mapTaskEventRow(row, { observedAt, importBatch });
      if (event) events.push(event);
    }
    return { events, totalRows: rows.length, skippedBeforeCutoff };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Event constructor (v1-shaped)
// ---------------------------------------------------------------------------

function makeEvent({
  eventType, taskId, fromState, toState, occurredAt, observedAt,
  sourceSha, provenance, importBatch = null, sourceRef = null,
  reasonCode = null, censoring = null,
}) {
  const event = {
    schema: SCHEMA_ID,
    event_id: `${provenance}:${eventType}:${taskId}:${sourceSha.slice(0, 16)}`,
    event_type: eventType,
    occurred_at: occurredAt,
    observed_at: observedAt,
    task_id: taskId,
    from_state: fromState,
    to_state: toState,
    actor_role: null,
    source_system: provenance === 'historical_import' ? 'hermes-kanban' : 'hermes-kanban',
    source_ref: sourceRef,
    source_sha256: sourceSha,
    provenance,
    import_batch: importBatch,
    reason_code: reasonCode,
    outcome: null,
  };
  if (censoring) event.censoring = censoring;
  return event;
}

module.exports = {
  SCHEMA_ID,
  normalizeState,
  epochToIso,
  emptyCompletion,
  normalizeBoardState,
  diffToEvents,
  mapTaskEventRow,
  readHistoricalEvents,
  makeEvent,
  _internal: { sha256OfString, canonicalize, KIND_TO_EVENT_TYPE, RAW_TO_NORMALIZED },
};

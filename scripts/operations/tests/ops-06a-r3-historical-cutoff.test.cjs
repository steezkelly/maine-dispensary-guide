#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R3-D — historical-cutoff diagnostic tests.
 *
 * Every reported metric applies the requested occurrence window on occurred_at.
 * These tests prove the historical-cutoff behavior:
 *   1. blocked July 2, report cutoff July 8, unblocked July 10 -> July 8 report
 *      still shows blocked (a future unblock must not rewrite history);
 *   2. task created after cutoff -> absent from WIP and arrivals;
 *   3. ready before cutoff, released after cutoff -> right-censored at cutoff;
 *   4. first verification after cutoff -> absent from earlier FPY;
 *   5. needs_fix after cutoff -> absent from earlier rework count;
 *   6. historical imported task creation -> arrival assigned by occurred_at,
 *      not import observed_at.
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const metrics = require('../metrics/mdg-ops-metrics.cjs');

const CUTOFF = Date.parse('2026-07-08T00:00:00Z');
const WINDOW = { windowStartMs: Date.parse('2026-07-01T00:00:00Z'), windowEndMs: CUTOFF };

function ev(overrides) {
  return {
    schema: 'mdg-operations-event-v1',
    event_id: overrides.event_id || `e-${Math.random().toString(36).slice(2)}`,
    event_type: overrides.event_type || 'task_state_changed',
    occurred_at: overrides.occurred_at,
    observed_at: overrides.observed_at || overrides.occurred_at,
    source_system: 'test',
    source_sha256: 'a'.repeat(64),
    ...overrides,
  };
}

test('R3-D 1: future unblock does not rewrite an earlier historical blocked report', () => {
  // Blocked July 2, unblocked July 10 (after the July 8 cutoff).
  const events = [
    ev({ event_id: 'b', event_type: 'task_blocked', task_id: 't1', to_state: 'blocked', occurred_at: '2026-07-02T00:00:00Z' }),
    ev({ event_id: 'u', event_type: 'task_unblocked', task_id: 't1', to_state: 'ready', occurred_at: '2026-07-10T00:00:00Z' }),
  ];
  const r = metrics.blockedAge(events, { windowEndMs: CUTOFF });
  assert.equal(r.currently_blocked, 1, 'still blocked at the July 8 cutoff');
  assert.equal(r.unknown_entry, 0);
  // Age = July 8 - July 2 = 6 days = 144 hours.
  assert.ok(Math.abs(r.oldest_hours - 144) < 1e-6, `expected 144h, got ${r.oldest_hours}`);
});

test('R3-D 1b: a future block cannot produce a negative age', () => {
  // Block occurs July 10 (after the July 8 cutoff) -> ignored; not blocked at cutoff.
  const events = [
    ev({ event_id: 'b', event_type: 'task_blocked', task_id: 't1', to_state: 'blocked', occurred_at: '2026-07-10T00:00:00Z' }),
  ];
  const r = metrics.blockedAge(events, { windowEndMs: CUTOFF });
  assert.equal(r.currently_blocked, 0, 'future block ignored at the earlier cutoff');
});

test('R3-D 2: task created after cutoff is absent from WIP and arrivals', () => {
  const events = [
    ev({ event_id: 'c1', event_type: 'task_created_observed', task_id: 't_future', occurred_at: '2026-07-10T00:00:00Z' }),
    ev({ event_id: 's1', task_id: 't_future', to_state: 'ready', occurred_at: '2026-07-10T01:00:00Z' }),
    // an in-window task for contrast
    ev({ event_id: 'c2', event_type: 'task_created_observed', task_id: 't_in', occurred_at: '2026-07-02T00:00:00Z' }),
    ev({ event_id: 's2', task_id: 't_in', to_state: 'ready', occurred_at: '2026-07-02T01:00:00Z' }),
  ];
  const arrivals = metrics.arrivals(events, WINDOW);
  assert.equal(arrivals.count, 1, 'only the in-window creation counts');
  const wip = metrics.wipByState(events, { windowEndMs: CUTOFF });
  assert.equal(wip.ready, 1, 'future-created task must not appear (not even as unknown)');
  assert.equal(wip.unknown, undefined, 'no unknown bucket for future-created tasks');
});

test('R3-D 3: ready before cutoff, released after cutoff -> right-censored at cutoff', () => {
  const events = [
    ev({ event_id: 'r', task_id: 't1', to_state: 'ready', occurred_at: '2026-07-02T00:00:00Z' }),
    ev({ event_id: 'rel', event_type: 'release_recorded', task_id: 't1', occurred_at: '2026-07-10T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  const ft = metrics.readyToReleaseFlowTime(events, WINDOW);
  assert.equal(ft.eligible, 0, 'release after cutoff is not in the completed cohort');
  assert.equal(ft.right_censored_excluded, 1, 'right-censored at the cutoff');
});

test('R3-D 4: first verification after cutoff is absent from earlier FPY', () => {
  const events = [
    ev({ event_id: 'v1', event_type: 'verification_completed', task_id: 't1', outcome: 'pass', occurred_at: '2026-07-10T00:00:00Z' }),
    // an in-window verification for contrast
    ev({ event_id: 'v2', event_type: 'verification_completed', task_id: 't2', outcome: 'pass', occurred_at: '2026-07-03T00:00:00Z' }),
  ];
  const fpy = metrics.firstPassVerificationYield(events, WINDOW);
  assert.equal(fpy.verified_tasks, 1, 'only the in-window first verification counts');
  assert.equal(fpy.first_pass, 1);
});

test('R3-D 5: needs_fix after cutoff is absent from earlier rework count', () => {
  const events = [
    ev({ event_id: 'nf_future', task_id: 't1', to_state: 'needs_fix', occurred_at: '2026-07-10T00:00:00Z' }),
    ev({ event_id: 'nf_in', task_id: 't2', to_state: 'needs_fix', occurred_at: '2026-07-03T00:00:00Z' }),
  ];
  const rw = metrics.reworkLoops(events, WINDOW);
  assert.equal(rw.total, 1, 'only the in-window needs_fix counts');
  assert.equal(rw.tasks_with_rework, 1);
});

test('R3-D 6: historical imported task creation is assigned by occurred_at, not observed_at', () => {
  // Created in-window (July 2) but imported/observed later (July 20).
  const events = [
    ev({ event_id: 'c1', event_type: 'task_created_observed', task_id: 't1', occurred_at: '2026-07-02T00:00:00Z', observed_at: '2026-07-20T00:00:00Z' }),
  ];
  const arrivals = metrics.arrivals(events, WINDOW);
  assert.equal(arrivals.count, 1, 'arrival assigned by occurred_at, not the later import observed_at');
  assert.equal(arrivals.basis, 'occurred_at');
});

test('R3-D: task_observed (left-censored preexisting) is NOT an arrival', () => {
  const events = [
    ev({ event_id: 'o1', event_type: 'task_observed', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-07-02T00:00:00Z' }),
  ];
  const arrivals = metrics.arrivals(events, WINDOW);
  assert.equal(arrivals.count, 0, 'task_observed is not a genuine arrival');
});

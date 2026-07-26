#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R3-C — left-censored / unknown-entry population tests.
 *
 * littlesLawComponents must inspect ALL task timelines and never silently drop
 * a left-censored active task without a ready entry. Such a task is reported
 * explicitly (active_left_censored_without_entry, unknown_entry_tasks) and
 * forces computable=false. An opening snapshot may establish existence for L but
 * cannot invent the missing ready-to-release duration for W.
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const metrics = require('../metrics/mdg-ops-metrics.cjs');

const WINDOW = {
  windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
  windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
};

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

test('R3-C: first observation in in_progress with no ready event -> unknown entry, not dropped', () => {
  const events = [
    ev({ event_id: 'o1', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-07-02T00:00:00Z' }),
    // no ready event, no release -> unknown entry, active in window
  ];
  const r = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(r.unknown_entry_tasks, 1, 'unknown-entry task reported, not silently dropped');
  assert.equal(r.flow_time_population_complete, false);
  assert.equal(r.computable, false);
  assert.ok(r.insufficiency_reasons.some((x) => /unknown entry/.test(x)), r.insufficiency_reasons.join('; '));
});

test('R3-C: first observation in verifying with no ready event -> unknown entry', () => {
  const events = [
    ev({ event_id: 'o1', task_id: 't1', to_state: 'verifying', occurred_at: '2026-07-03T00:00:00Z' }),
  ];
  const r = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(r.unknown_entry_tasks, 1);
  assert.equal(r.computable, false);
});

test('R3-C: left-censored terminal task completed before the window is IGNORED', () => {
  // Left-censored (first event flagged left_censored) but terminally departed
  // before the window start -> ignored, does not poison opening state.
  const events = [
    ev({ event_id: 'o1', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-06-01T00:00:00Z', censoring: { left_censored: true } }),
    ev({ event_id: 'o2', task_id: 't1', to_state: 'done', occurred_at: '2026-06-10T00:00:00Z' }),
    // a clean in-window task for contrast
    ev({ event_id: 'r2', task_id: 't2', to_state: 'ready', occurred_at: '2026-07-01T00:00:00Z' }),
    ev({ event_id: 'rel2', event_type: 'release_recorded', task_id: 't2', occurred_at: '2026-07-02T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  const r = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true, observationCoverageComplete: true });
  assert.equal(r.unknown_entry_tasks, 0, 'left-censored task completed before window is ignored');
  assert.equal(r.released_in_window, 1);
});

test('R3-C: left-censored active task that later releases inside the window is reported (W unknowable)', () => {
  const events = [
    ev({ event_id: 'o1', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-06-20T00:00:00Z', censoring: { left_censored: true } }),
    ev({ event_id: 'rel1', event_type: 'release_recorded', task_id: 't1', occurred_at: '2026-07-03T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  const r = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true, observationCoverageComplete: true });
  // No ready entry -> unknown entry; even though it released, its full
  // ready-to-release duration is unknowable -> flow-time population incomplete.
  assert.equal(r.unknown_entry_tasks, 1);
  assert.equal(r.active_left_censored_without_entry, 1);
  assert.equal(r.flow_time_population_complete, false);
  assert.equal(r.computable, false, 'opening snapshot cannot invent the missing W');
});

test('R3-C: opening snapshot present but ready-entry time still unknown -> not reconcilable', () => {
  // Even with trustworthy opening state AND complete observation coverage, an
  // unknown-entry active task prevents reconciliation (its W is unknowable).
  const events = [
    ev({ event_id: 'o1', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-07-02T00:00:00Z' }),
    ev({ event_id: 'r2', task_id: 't2', to_state: 'ready', occurred_at: '2026-07-01T00:00:00Z' }),
    ev({ event_id: 'rel2', event_type: 'release_recorded', task_id: 't2', occurred_at: '2026-07-02T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  const r = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true, observationCoverageComplete: true });
  assert.equal(r.opening_state_complete, false, 'unknown-entry task leaves opening set unaccounted');
  assert.equal(r.flow_time_population_complete, false);
  assert.equal(r.computable, false);
});

test('R3-C: a clean population with complete evidence IS reconcilable (control)', () => {
  const events = [
    ev({ event_id: 'r1', task_id: 't1', to_state: 'ready', occurred_at: '2026-07-01T00:00:00Z' }),
    ev({ event_id: 'rel1', event_type: 'release_recorded', task_id: 't1', occurred_at: '2026-07-02T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  const r = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true, observationCoverageComplete: true });
  assert.equal(r.unknown_entry_tasks, 0);
  assert.equal(r.opening_state_complete, true);
  assert.equal(r.flow_time_population_complete, true);
  assert.equal(r.computable, true, r.insufficiency_reasons.join('; '));
});

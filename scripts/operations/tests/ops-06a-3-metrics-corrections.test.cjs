#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-3 focused tests — metric and privacy corrections.
 *
 * Tests:
 *   A. M1 measurement states (measured_zero, instrumentation_missing, measured_nonzero)
 *   B. Task-ID privacy (default no IDs; --detailed includes IDs)
 *   C. Time-average WIP (hand-calculated from simple event trajectories)
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const metrics = require('../metrics/mdg-ops-metrics.cjs');

// ---------------------------------------------------------------------------
// A. M1 measurement states (OPS-06A-R2-B: fail closed without proven coverage)
// ---------------------------------------------------------------------------

const WINDOW = {
  windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
  windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
};
const FULL_COVERAGE = {
  state: 'complete',
  window_start: '2026-07-01T00:00:00Z',
  window_end: '2026-07-08T00:00:00Z',
  source: 'synthetic_test',
};

test('M1: instrumentation_missing when no release_recorded events and no coverage', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
  ];
  const result = metrics.verifiedReleaseThroughput(events, WINDOW);
  assert.equal(result.measurement_state, 'instrumentation_missing');
  assert.equal(result.releases, 0);
  assert.equal(result.release_event_count, 0);
  assert.equal(result.instrumentation_coverage_state, 'unmeasured');
  assert.equal(result.rate_per_week, metrics.INSUFFICIENT_DATA);
});

test('M1: a historical release before window does NOT prove measured_zero (fails closed)', () => {
  // R2-B: do not infer full-window instrumentation from one historical release.
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-06-01T01:00:00Z' },
    {
      task_id: 't1',
      event_type: 'release_recorded',
      occurred_at: '2026-06-15T00:00:00Z', // OUTSIDE window
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
  ];
  const result = metrics.verifiedReleaseThroughput(events, WINDOW);
  assert.equal(result.measurement_state, 'instrumentation_missing');
  assert.equal(result.releases, 0);
  assert.ok(result.insufficiency_reasons.some((r) => /coverage not proven|coverage/.test(r)), result.insufficiency_reasons.join('; '));
});

test('M1: measured_zero ONLY with explicit complete coverage and zero releases', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    // no release in window
  ];
  const result = metrics.verifiedReleaseThroughput(events, { ...WINDOW, instrumentationCoverage: FULL_COVERAGE });
  assert.equal(result.measurement_state, 'measured_zero');
  assert.equal(result.releases, 0);
  assert.equal(result.instrumentation_coverage_state, 'complete');
  assert.equal(result.rate_per_week, 0);
  assert.match(result.minimum_evidence_warning, /measured zero/);
});

test('M1: measured_nonzero when releases occur in window', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'release_recorded', occurred_at: '2026-07-03T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
    { task_id: 't2', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-02T01:00:00Z' },
    { task_id: 't2', event_type: 'release_recorded', occurred_at: '2026-07-04T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
  ];
  const result = metrics.verifiedReleaseThroughput(events, WINDOW);
  assert.equal(result.measurement_state, 'measured_nonzero');
  assert.equal(result.releases, 2);
  assert.equal(result.release_event_count, 2);
  assert.match(result.minimum_evidence_warning, /fewer than 5 releases/);
});

test('M1: partial coverage does not prove measured_zero', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
  ];
  const partial = { state: 'partial', window_start: '2026-07-01T00:00:00Z', window_end: '2026-07-04T00:00:00Z', source: 'synthetic_test' };
  const result = metrics.verifiedReleaseThroughput(events, { ...WINDOW, instrumentationCoverage: partial });
  assert.equal(result.measurement_state, 'instrumentation_missing');
  assert.equal(result.instrumentation_coverage_state, 'partial');
});

test('M1: minimum_evidence_warning for fewer than 5 releases', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'release_recorded', occurred_at: '2026-07-03T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
  ];
  const result = metrics.verifiedReleaseThroughput(events, WINDOW);
  assert.equal(result.measurement_state, 'measured_nonzero');
  assert.equal(result.releases, 1);
  assert.match(result.minimum_evidence_warning, /fewer than 5 releases/);
});

// ---------------------------------------------------------------------------
// B. Task-ID privacy
// ---------------------------------------------------------------------------

test('M1: default (includeTaskIds=false) does NOT include releaseTaskIds', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    {
      task_id: 't1',
      event_type: 'release_recorded',
      occurred_at: '2026-07-03T00:00:00Z',
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
  ];
  const result = metrics.verifiedReleaseThroughput(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
    includeTaskIds: false,
  });
  assert.equal(result.releaseTaskIds, undefined);
});

test('M1: includeTaskIds=true includes releaseTaskIds', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    {
      task_id: 't1',
      event_type: 'release_recorded',
      occurred_at: '2026-07-03T00:00:00Z',
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
  ];
  const result = metrics.verifiedReleaseThroughput(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
    includeTaskIds: true,
  });
  assert.deepEqual(result.releaseTaskIds, ['t1']);
});

// ---------------------------------------------------------------------------
// C. Time-average WIP via the authoritative littlesLawComponents (R2-C)
//    (timeAverageWip was removed; L is computed inside littlesLawComponents.)
// ---------------------------------------------------------------------------

test('littlesLawComponents: hand-calculated L over the release population', () => {
  // Window: 2026-07-01T00:00:00Z to 2026-07-08T00:00:00Z (7 days = 168 hours).
  // Task t1: ready day 1 01:00, verified release day 3 00:00 -> active 47h.
  // Task t2: ready day 2 01:00, verified release day 5 00:00 -> active 71h.
  // Task t3: ready day 4 01:00, no release (in-flight) -> active 95h.
  // Total active-hours = 47 + 71 + 95 = 213; L = 213 / 168 = 1.267857...
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'release_recorded', occurred_at: '2026-07-03T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
    { task_id: 't2', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-02T01:00:00Z' },
    { task_id: 't2', event_type: 'release_recorded', occurred_at: '2026-07-05T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
    { task_id: 't3', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-04T01:00:00Z' },
  ];
  const result = metrics.littlesLawComponents(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
    openingStateTrustworthy: true,
  });
  const expectedL = 213 / 168;
  assert.ok(Math.abs(result.L - expectedL) < 0.001, `expected L ≈ ${expectedL}, got ${result.L}`);
  assert.equal(result.coverage_state, 'adequate');
  assert.equal(result.in_flight_at_end, 1);
  assert.equal(result.released_in_window, 2);
});

test('littlesLawComponents: L is INSUFFICIENT_DATA when no trustworthy entry', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    // No ready-entry, no release.
  ];
  const result = metrics.littlesLawComponents(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });
  assert.equal(result.L, metrics.INSUFFICIENT_DATA);
  assert.equal(result.computable, false);
});

test('littlesLawComponents: invalid window fails closed', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
  ];
  const result = metrics.littlesLawComponents(events, {
    windowStartMs: Date.parse('2026-07-08T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-01T00:00:00Z'), // end < start
  });
  assert.equal(result.L, metrics.INSUFFICIENT_DATA);
  assert.equal(result.computable, false);
  assert.equal(result.coverage_state, 'invalid_window');
});

test('littlesLawComponents: short window -> coverage inadequate, not computable', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'release_recorded', occurred_at: '2026-07-01T12:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
  ];
  const result = metrics.littlesLawComponents(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-02T00:00:00Z'),
    openingStateTrustworthy: true,
  });
  assert.ok(typeof result.L === 'number');
  assert.equal(result.coverage_state, 'inadequate');
  assert.equal(result.computable, false);
});

test('littlesLawComponents: verified release counts as exit (L = 47/168)', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'release_recorded', occurred_at: '2026-07-03T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } },
  ];
  const result = metrics.littlesLawComponents(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
    openingStateTrustworthy: true,
  });
  // Active from day 1 01:00 to day 3 00:00 = 47 hours; window 168h; L = 47/168.
  const expectedL = 47 / 168;
  assert.ok(Math.abs(result.L - expectedL) < 0.001, `expected L ≈ ${expectedL}, got ${result.L}`);
});

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
// A. M1 measurement states
// ---------------------------------------------------------------------------

test('M1: instrumentation_missing when no release_recorded events exist', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
  ];
  const result = metrics.verifiedReleaseThroughput(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });
  assert.equal(result.measurement_state, 'instrumentation_missing');
  assert.equal(result.releases, 0);
  assert.equal(result.evidence_count, 0);
  assert.match(result.instrumentation_state, /no release_recorded events/);
});

test('M1: measured_zero when release_recorded exists but none in window', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    {
      task_id: 't1',
      event_type: 'release_recorded',
      occurred_at: '2026-06-15T00:00:00Z', // OUTSIDE window
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
  ];
  const result = metrics.verifiedReleaseThroughput(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });
  assert.equal(result.measurement_state, 'measured_zero');
  assert.equal(result.releases, 0);
  assert.equal(result.evidence_count, 0);
  assert.match(result.instrumentation_state, /release_recorded events present/);
  assert.match(result.minimum_evidence_warning, /zero releases in window/);
});

test('M1: measured_nonzero when releases occur in window', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    {
      task_id: 't1',
      event_type: 'release_recorded',
      occurred_at: '2026-07-03T00:00:00Z', // IN window
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
    { task_id: 't2', event_type: 'task_created_observed', occurred_at: '2026-07-02T00:00:00Z', observed_at: '2026-07-02T00:00:00Z' },
    { task_id: 't2', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-02T01:00:00Z' },
    {
      task_id: 't2',
      event_type: 'release_recorded',
      occurred_at: '2026-07-04T00:00:00Z', // IN window
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
  ];
  const result = metrics.verifiedReleaseThroughput(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });
  assert.equal(result.measurement_state, 'measured_nonzero');
  assert.equal(result.releases, 2);
  assert.equal(result.evidence_count, 2);
  assert.match(result.instrumentation_state, /release_recorded events present/);
  assert.match(result.minimum_evidence_warning, /fewer than 5 releases/); // 2 releases triggers warning
});

test('M1: minimum_evidence_warning for fewer than 5 releases', () => {
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
  });
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
// C. Time-average WIP (hand-calculated)
// ---------------------------------------------------------------------------

test('timeAverageWip: simple trajectory, hand-calculated L', () => {
  // Window: 2026-07-01T00:00:00Z to 2026-07-08T00:00:00Z (7 days = 604800000 ms)
  // Task t1: enters ready at day 1 (01:00), exits (done) at day 3 (00:00)
  //   -> active from day 1 01:00 to day 3 00:00 = 47 hours
  // Task t2: enters ready at day 2 (01:00), exits (done) at day 5 (00:00)
  //   -> active from day 2 01:00 to day 5 00:00 = 71 hours
  // Task t3: enters ready at day 4 (01:00), no exit (still active at window end)
  //   -> active from day 4 01:00 to day 8 00:00 = 95 hours
  //
  // Total active-hours = 47 + 71 + 95 = 213 hours
  // Window = 7 days = 168 hours
  // L = 213 / 168 = 1.267857...

  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'done', occurred_at: '2026-07-03T00:00:00Z' },
    { task_id: 't2', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-02T01:00:00Z' },
    { task_id: 't2', event_type: 'task_state_changed', to_state: 'done', occurred_at: '2026-07-05T00:00:00Z' },
    { task_id: 't3', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-04T01:00:00Z' },
  ];

  const result = metrics.timeAverageWip(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });

  const expectedL = 213 / 168;
  assert.ok(Math.abs(result.L - expectedL) < 0.001, `expected L ≈ ${expectedL}, got ${result.L}`);
  assert.equal(result.adequate_observation, true);
});

test('timeAverageWip: insufficient_data when no trustworthy entry/exit', () => {
  const events = [
    { task_id: 't1', event_type: 'task_created_observed', occurred_at: '2026-07-01T00:00:00Z', observed_at: '2026-07-01T00:00:00Z' },
    // No ready-entry, no exit
  ];
  const result = metrics.timeAverageWip(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });
  assert.equal(result.L, metrics.INSUFFICIENT_DATA);
  assert.equal(result.adequate_observation, false);
});

test('timeAverageWip: insufficient_data for invalid window', () => {
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
  ];
  const result = metrics.timeAverageWip(events, {
    windowStartMs: Date.parse('2026-07-08T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-01T00:00:00Z'), // end < start
  });
  assert.equal(result.L, metrics.INSUFFICIENT_DATA);
  assert.equal(result.adequate_observation, false);
});

test('timeAverageWip: adequate_observation=false for short window', () => {
  // Window: 1 day (less than 7 days)
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'done', occurred_at: '2026-07-01T12:00:00Z' },
  ];
  const result = metrics.timeAverageWip(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-02T00:00:00Z'),
  });
  assert.ok(typeof result.L === 'number');
  assert.equal(result.adequate_observation, false);
  assert.match(result.note, /consider extending observation/);
});

test('timeAverageWip: verified release counts as exit', () => {
  // Task enters ready at day 1, exits via verified release at day 3
  const events = [
    { task_id: 't1', event_type: 'task_state_changed', to_state: 'ready', occurred_at: '2026-07-01T01:00:00Z' },
    {
      task_id: 't1',
      event_type: 'release_recorded',
      occurred_at: '2026-07-03T00:00:00Z',
      release_evidence: { verifier_pass: true, post_deploy_verified: true },
    },
  ];
  const result = metrics.timeAverageWip(events, {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-08T00:00:00Z'),
  });
  // Active from day 1 01:00 to day 3 00:00 = 47 hours
  // Window = 168 hours
  // L = 47 / 168 = 0.27976...
  const expectedL = 47 / 168;
  assert.ok(Math.abs(result.L - expectedL) < 0.001, `expected L ≈ ${expectedL}, got ${result.L}`);
});

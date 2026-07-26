#!/usr/bin/env node
'use strict';

/**
 * OPS-04 focused metrics tests.
 *
 * Exercises the queue-flow metric functions against synthetic event sets.
 * Verifies the OPS-01 metric contract rules:
 *   - empty/unsupported => INSUFFICIENT_DATA, never zero
 *   - censored tasks separated, not mixed into primary distribution
 *   - no creation-time substitution for missing ready time
 *   - deterministic quantiles (re-run => identical)
 *   - release throughput counts ONLY verified_production_release
 *   - FPY denominator = tasks with first verification; missing evidence != pass
 *   - Little's Law: residual + coverage warning + common boundary
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const metrics = require('../metrics/mdg-ops-metrics.cjs');

const ID = metrics.INSUFFICIENT_DATA;
const WINDOW = { windowStartMs: 0, windowEndMs: Date.parse('2026-12-31T00:00:00Z') };

// ---------------------------------------------------------------------------
// Event builders (synthetic)
// ---------------------------------------------------------------------------

function ev(overrides) {
  return {
    schema: 'mdg-operations-event-v1',
    event_id: `evt_${Math.random().toString(36).slice(2)}`,
    event_type: 'task_state_changed',
    occurred_at: '2026-07-26T10:00:00.000Z',
    observed_at: '2026-07-26T10:00:00.000Z',
    task_id: 't_x',
    from_state: null,
    to_state: 'ready',
    source_system: 'hermes-kanban',
    source_sha256: 'a'.repeat(64),
    provenance: 'live_observer',
    import_batch: null,
    ...overrides,
  };
}

function releaseEvent(taskId, occurredAt, { verifierPass = true, postDeploy = true } = {}) {
  return ev({
    event_id: `rel_${taskId}`,
    event_type: 'release_recorded',
    task_id: taskId,
    occurred_at: occurredAt,
    observed_at: occurredAt,
    to_state: 'released',
    release_evidence: {
      final_sha: 'b'.repeat(40),
      verifier_pass: verifierPass,
      post_deploy_verified: postDeploy,
    },
  });
}

// ---------------------------------------------------------------------------
// quantile determinism + insufficient_data
// ---------------------------------------------------------------------------

test('quantile returns INSUFFICIENT_DATA for empty input, never zero', () => {
  assert.equal(metrics.quantile([], 0.5), ID);
  assert.equal(metrics.summarize([]).p50, ID);
});

test('quantile is deterministic across repeated runs', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const run1 = metrics.summarize(values);
  const run2 = metrics.summarize([...values].reverse()); // order-independent
  assert.deepEqual(run1, run2);
  // R-7 linear interpolation: p50 of 1..100 step 10 = 55
  assert.equal(run1.p50, 55);
});

test('quantile single value returns that value', () => {
  assert.equal(metrics.quantile([42], 0.95), 42);
});

// ---------------------------------------------------------------------------
// M1: verified release throughput
// ---------------------------------------------------------------------------

test('release throughput counts ONLY verified_production_release', () => {
  const events = [
    releaseEvent('t_a', '2026-07-26T10:00:00Z', { verifierPass: true, postDeploy: true }), // counts
    releaseEvent('t_b', '2026-07-26T11:00:00Z', { verifierPass: false, postDeploy: true }), // no verifier pass
    releaseEvent('t_c', '2026-07-26T12:00:00Z', { verifierPass: true, postDeploy: false }), // no post-deploy
    ev({ event_id: 'done_d', event_type: 'task_state_changed', task_id: 't_d', to_state: 'card_completed' }), // done is not a release
  ];
  const result = metrics.verifiedReleaseThroughput(events, { ...WINDOW, includeTaskIds: true });
  assert.equal(result.releases, 1, 'only t_a is a verified production release');
  assert.deepEqual(result.releaseTaskIds, ['t_a']);
  // Privacy-by-default: without includeTaskIds, no task IDs are exposed.
  const privateResult = metrics.verifiedReleaseThroughput(events, WINDOW);
  assert.equal(privateResult.releaseTaskIds, undefined);
});

test('release throughput over empty events fails closed (instrumentation_missing), rate INSUFFICIENT_DATA', () => {
  // R2-B: with no releases AND no proven full-window coverage, a zero-release
  // window must fail closed — not be reported as a measured zero.
  const result = metrics.verifiedReleaseThroughput([], WINDOW);
  assert.equal(result.releases, 0);
  assert.equal(result.measurement_state, 'instrumentation_missing');
  assert.equal(result.rate_per_week, ID);
  assert.equal(result.instrumentation_coverage_state, 'unmeasured');
  assert.ok(result.insufficiency_reasons.length > 0);
});

// ---------------------------------------------------------------------------
// M2: ready-to-release flow time
// ---------------------------------------------------------------------------

test('flow time separates censored tasks and does not substitute creation time', () => {
  const events = [
    // t_full: ready -> released, trustworthy => eligible
    ev({ event_id: 'full_ready', task_id: 't_full', to_state: 'ready', occurred_at: '2026-07-26T00:00:00Z', observed_at: '2026-07-26T00:00:00Z' }),
    releaseEvent('t_full', '2026-07-26T10:00:00Z'), // 10h flow
    // t_left: left-censored first observation => excluded
    ev({ event_id: 'left_obs', event_type: 'task_observed', task_id: 't_left', to_state: 'in_progress', occurred_at: '2026-07-26T00:00:00Z', observed_at: '2026-07-26T00:00:00Z', censoring: { left_censored: true, right_censored: false, unknown_state_entry_time: true } }),
    releaseEvent('t_left', '2026-07-26T10:00:00Z'),
    // t_right: ready but not released => right-censored
    ev({ event_id: 'right_ready', task_id: 't_right', to_state: 'ready', occurred_at: '2026-07-26T00:00:00Z', observed_at: '2026-07-26T00:00:00Z' }),
    // t_noready: released but no ready event => missing-ready excluded (NOT substituted)
    releaseEvent('t_noready', '2026-07-26T10:00:00Z'),
  ];
  const result = metrics.readyToReleaseFlowTime(events, WINDOW);
  assert.equal(result.eligible, 1, 'only t_full is eligible');
  assert.equal(result.left_censored_excluded, 1);
  assert.equal(result.right_censored_excluded, 1);
  assert.equal(result.missing_ready_excluded, 1);
  assert.equal(result.p50_hours, 10, 't_full flow time is 10 hours');
});

test('flow time with no eligible tasks returns INSUFFICIENT_DATA percentiles', () => {
  const result = metrics.readyToReleaseFlowTime([], WINDOW);
  assert.equal(result.eligible, 0);
  assert.equal(result.p50_hours, ID);
  assert.equal(result.p85_hours, ID);
  assert.equal(result.p95_hours, ID);
});

// ---------------------------------------------------------------------------
// M3: first-pass verification yield
// ---------------------------------------------------------------------------

test('FPY denominator is tasks with first verification; missing evidence is not a pass', () => {
  const events = [
    // t_pass: first verification pass
    ev({ event_id: 'v_pass', event_type: 'verification_completed', task_id: 't_pass', outcome: 'pass' }),
    // t_fail: first verification fail (rework)
    ev({ event_id: 'v_fail', event_type: 'verification_completed', task_id: 't_fail', outcome: 'fail' }),
    // t_noevidence: no verification event => NOT counted, NOT a pass
    ev({ event_id: 'noev', event_type: 'task_state_changed', task_id: 't_noevidence', to_state: 'authored' }),
  ];
  const result = metrics.firstPassVerificationYield(events);
  assert.equal(result.verified_tasks, 2, 'only tasks with a verification');
  assert.equal(result.first_pass, 1);
  assert.equal(result.fpy, 0.5);
});

test('FPY with no verifications is INSUFFICIENT_DATA, not zero', () => {
  const result = metrics.firstPassVerificationYield([]);
  assert.equal(result.verified_tasks, 0);
  assert.equal(result.fpy, ID);
});

test('repeated verification counts as rework, not a first pass', () => {
  const events = [
    ev({ event_id: 'v1', event_type: 'verification_completed', task_id: 't_x', outcome: 'fail', occurred_at: '2026-07-26T01:00:00Z', observed_at: '2026-07-26T01:00:00Z' }),
    ev({ event_id: 'v2', event_type: 'verification_completed', task_id: 't_x', outcome: 'pass', occurred_at: '2026-07-26T02:00:00Z', observed_at: '2026-07-26T02:00:00Z' }),
  ];
  const result = metrics.firstPassVerificationYield(events);
  assert.equal(result.verified_tasks, 1);
  assert.equal(result.first_pass, 0, 'first verification was a fail => not a first pass');
});

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

test('wipByState reports last known state per task at window end', () => {
  const events = [
    ev({ event_id: 'a1', task_id: 't_a', to_state: 'ready', occurred_at: '2026-07-26T01:00:00Z', observed_at: '2026-07-26T01:00:00Z' }),
    ev({ event_id: 'a2', task_id: 't_a', to_state: 'in_progress', occurred_at: '2026-07-26T02:00:00Z', observed_at: '2026-07-26T02:00:00Z' }),
    ev({ event_id: 'b1', task_id: 't_b', to_state: 'blocked', occurred_at: '2026-07-26T01:00:00Z', observed_at: '2026-07-26T01:00:00Z' }),
  ];
  const wip = metrics.wipByState(events, WINDOW);
  assert.equal(wip.in_progress, 1);
  assert.equal(wip.blocked, 1);
});

test('reworkLoops counts needs_fix and failed verifications', () => {
  const events = [
    ev({ event_id: 'nf1', task_id: 't_a', to_state: 'needs_fix' }),
    ev({ event_id: 'vf1', event_type: 'verification_completed', task_id: 't_a', outcome: 'fail' }),
    ev({ event_id: 'ok', event_type: 'verification_completed', task_id: 't_b', outcome: 'pass' }),
  ];
  const result = metrics.reworkLoops(events);
  assert.equal(result.total, 2);
  assert.equal(result.tasks_with_rework, 1);
});

test('blockedAge reports currently-blocked tasks only', () => {
  const events = [
    ev({ event_id: 'blk', event_type: 'task_blocked', task_id: 't_a', to_state: 'blocked', occurred_at: '2026-07-26T00:00:00Z', observed_at: '2026-07-26T00:00:00Z' }),
    ev({ event_id: 'unblk', event_type: 'task_unblocked', task_id: 't_b', to_state: 'ready', occurred_at: '2026-07-26T01:00:00Z', observed_at: '2026-07-26T01:00:00Z' }),
  ];
  const result = metrics.blockedAge(events, { windowEndMs: Date.parse('2026-07-26T10:00:00Z') });
  assert.equal(result.currently_blocked, 1, 't_a still blocked; t_b unblocked');
});

// ---------------------------------------------------------------------------
// Little's Law (single authoritative API: littlesLawComponents, OPS-06A-R2-C)
// ---------------------------------------------------------------------------

test('Little\'s Law reconciles (computable) for a clean in-window population', () => {
  // Three tasks enter ready at window start and release at +1h, +2h, +9h.
  // Window 7 days. Opening state trustworthy. W = mean(1,2,9) = 4h.
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    ev({ event_id: 'r1', task_id: 't1', to_state: 'ready', occurred_at: t0, observed_at: t0 }),
    ev({ event_id: 'rel1', event_type: 'release_recorded', task_id: 't1', occurred_at: '2026-07-01T01:00:00Z', observed_at: '2026-07-01T01:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
    ev({ event_id: 'r2', task_id: 't2', to_state: 'ready', occurred_at: t0, observed_at: t0 }),
    ev({ event_id: 'rel2', event_type: 'release_recorded', task_id: 't2', occurred_at: '2026-07-01T02:00:00Z', observed_at: '2026-07-01T02:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
    ev({ event_id: 'r3', task_id: 't3', to_state: 'ready', occurred_at: t0, observed_at: t0 }),
    ev({ event_id: 'rel3', event_type: 'release_recorded', task_id: 't3', occurred_at: '2026-07-01T09:00:00Z', observed_at: '2026-07-01T09:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  const result = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true });
  assert.equal(result.computable, true, result.insufficiency_reasons.join('; '));
  assert.ok(Math.abs(result.W_hours - 4) < 1e-9, `W should be arithmetic mean 4h, got ${result.W_hours}`);
  assert.equal(result.released_in_window, 3);
  assert.ok(typeof result.residual === 'number', 'residual computed when computable');
});

test('Little\'s Law is not computable when opening state is untrustworthy', () => {
  // A carry-in task (ready before window start) without trustworthy opening state.
  const events = [
    ev({ event_id: 'r1', task_id: 't1', to_state: 'ready', occurred_at: '2026-06-30T00:00:00Z', observed_at: '2026-06-30T00:00:00Z' }),
    ev({ event_id: 'rel1', event_type: 'release_recorded', task_id: 't1', occurred_at: '2026-07-02T00:00:00Z', observed_at: '2026-07-02T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  // Window starts 2026-07-01, so the task (ready 2026-06-30) is carry-in.
  const result = metrics.littlesLawComponents(events, { windowStartMs: Date.parse('2026-07-01T00:00:00Z'), windowEndMs: Date.parse('2026-07-08T00:00:00Z') });
  assert.equal(result.computable, false);
  assert.equal(result.residual, ID);
  assert.equal(result.carry_in_releases, 1, 'carry-in release is counted, never silently dropped');
  assert.ok(result.insufficiency_reasons.some((r) => /opening WIP/.test(r)), result.insufficiency_reasons.join('; '));
});

test('Little\'s Law fails closed on inadequate coverage (short window)', () => {
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    ev({ event_id: 'r1', task_id: 't1', to_state: 'ready', occurred_at: t0, observed_at: t0 }),
    ev({ event_id: 'rel1', event_type: 'release_recorded', task_id: 't1', occurred_at: '2026-07-01T05:00:00Z', observed_at: '2026-07-01T05:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }),
  ];
  // 2-day window -> coverage inadequate.
  const result = metrics.littlesLawComponents(events, { windowStartMs: Date.parse('2026-07-01T00:00:00Z'), windowEndMs: Date.parse('2026-07-03T00:00:00Z'), openingStateTrustworthy: true });
  assert.equal(result.computable, false);
  assert.equal(result.coverage_state, 'inadequate');
});

// ---------------------------------------------------------------------------
// Coverage (evidence-based, OPS-06A-R2-D)
// ---------------------------------------------------------------------------

test('observationCoverage is INSUFFICIENT_DATA for empty events', () => {
  const result = metrics.observationCoverage([], WINDOW);
  assert.equal(result.state, ID);
  assert.equal(result.event_count, 0);
});

test('observationCoverage is unmeasured (NOT complete) when events fall in window but no coverage contract', () => {
  // R2-D: the mere presence of an event in the window must NOT yield complete.
  const events = [ev({ event_id: 'c1', observed_at: '2026-07-26T10:00:00Z' })];
  const result = metrics.observationCoverage(events, WINDOW);
  assert.equal(result.state, 'unmeasured');
  assert.equal(result.event_count, 1);
});

test('observationCoverage is complete only with a validated coverage contract spanning the window', () => {
  const events = [ev({ event_id: 'c1', observed_at: '2026-07-26T10:00:00Z' })];
  // Contract spans the full WINDOW (0 .. 2026-12-31).
  const coverageEvidence = { state: 'complete', window_start: '1970-01-01T00:00:00Z', window_end: '2026-12-31T00:00:00Z', source: 'synthetic_test' };
  const result = metrics.observationCoverage(events, { ...WINDOW, coverageEvidence });
  assert.equal(result.state, 'complete');
  assert.equal(result.coverage_source, 'synthetic_test');
});

#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R2 window-semantics, measurement-state, carry-in, and coverage tests
 * (findings A, B, C, D). Mixes lib-level and CLI-level assertions.
 *
 * R2-A — occurrence window vs observation coverage:
 *   - full history loaded; --from/--to applied on occurred_at;
 *   - carry-in task (ready before window, release inside) is NOT dropped;
 *   - historical-import event (occurred_at in window, observed_at = later
 *     import date) is handled on occurred_at.
 * R2-B — measurement state (5 CLI scenarios):
 *   1. no releases + no coverage;
 *   2. historical release before window + no coverage in window;
 *   3. complete synthetic coverage + zero releases;
 *   4. complete synthetic coverage + nonzero releases;
 *   5. partial coverage.
 * R2-C — carry-in / opening state (5 scenarios):
 *   - task completed before window does not poison opening state;
 *   - active-at-start included when opening state trustworthy;
 *   - active-at-start -> insufficient_data when not trustworthy;
 *   - carry-in release cannot silently disappear;
 *   - one event in 28 days is not complete observation coverage.
 * R2-D — coverage line consistent with Little's Law (no inWindow>0 -> complete).
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const metrics = require('../metrics/mdg-ops-metrics.cjs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI = path.resolve(__dirname, '../metrics/cli.cjs');
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

function releaseEvent(taskId, occurredAt, observedAt) {
  return ev({
    event_id: `rel-${taskId}-${occurredAt}`,
    event_type: 'release_recorded',
    task_id: taskId,
    occurred_at: occurredAt,
    observed_at: observedAt || occurredAt,
    release_evidence: { verifier_pass: true, post_deploy_verified: true },
  });
}

function readyEvent(taskId, occurredAt, observedAt) {
  return ev({ event_id: `ready-${taskId}`, task_id: taskId, to_state: 'ready', occurred_at: occurredAt, observed_at: observedAt || occurredAt });
}

function makeLedger(events) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-'));
  ledger.init(root);
  for (const e of events) ledger.appendEvent(root, e);
  return root;
}

function writeContract(root, name, contract) {
  const p = path.join(root, name);
  fs.writeFileSync(p, JSON.stringify(contract, null, 2), { mode: 0o600 });
  return p;
}

function runCli(root, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, MDG_OPS_ROOT: root },
    cwd: REPO_ROOT,
  });
}

const SCHEMA = 'mdg-operations-coverage-v1';
// Kind-specific validated coverage contracts (R3-A). Each consumer requires the
// exact coverage_kind it needs.
const EMITTER_FULL = { schema: SCHEMA, coverage_kind: 'release_emitter', state: 'complete', window_start: '2026-07-01T00:00:00Z', window_end: '2026-07-08T00:00:00Z', source: 'synthetic_test' };
const EMITTER_PARTIAL = { schema: SCHEMA, coverage_kind: 'release_emitter', state: 'partial', window_start: '2026-07-01T00:00:00Z', window_end: '2026-07-04T00:00:00Z', source: 'synthetic_test' };
const OBSERVATION_FULL = { schema: SCHEMA, coverage_kind: 'observation', state: 'complete', window_start: '2026-07-01T00:00:00Z', window_end: '2026-07-08T00:00:00Z', source: 'synthetic_test' };
const OPENING_FULL = { schema: SCHEMA, coverage_kind: 'opening_state', state: 'complete', window_start: '2026-07-01T00:00:00Z', window_end: '2026-07-08T00:00:00Z', source: 'synthetic_test', opening_snapshot_at: '2026-07-01T00:00:00Z' };

// ===========================================================================
// R2-A — occurrence window vs observation coverage
// ===========================================================================

test('R2-A CLI: carry-in task (ready before window, release inside) is NOT dropped', () => {
  // t_carry: ready 2026-06-20 (before window), verified release 2026-07-03 (inside).
  // t_inner: ready 2026-07-02, release 2026-07-04 (fully inside).
  const events = [
    readyEvent('t_carry', '2026-06-20T00:00:00Z'),
    releaseEvent('t_carry', '2026-07-03T00:00:00Z'),
    readyEvent('t_inner', '2026-07-02T00:00:00Z'),
    releaseEvent('t_inner', '2026-07-04T00:00:00Z'),
  ];
  const root = makeLedger(events);
  const opening = writeContract(root, 'opening.json', OPENING_FULL);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--opening-state-evidence', opening]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  // Both releases counted (carry-in not dropped).
  assert.equal(report.verified_release_throughput.releases, 2, 'carry-in release must be counted');
  assert.equal(report.littles_law.released_in_window, 2);
  assert.equal(report.littles_law.carry_in_releases, 1, 'exactly one carry-in release');
  // Validated opening-state evidence -> opening state known.
  assert.equal(report.littles_law.opening_state_known, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-A CLI: historical-import event (occurred_at in window, observed_at = later import) is handled on occurred_at', () => {
  // The release OCCURRED in-window (2026-07-03) but was OBSERVED/imported later
  // (2026-07-20). The occurrence metric must count it (occurred_at rule), and
  // the full history (listAll) must not drop it on observed_at.
  const events = [
    readyEvent('t_imp', '2026-07-01T00:00:00Z', '2026-07-20T00:00:00Z'),
    releaseEvent('t_imp', '2026-07-03T00:00:00Z', '2026-07-20T00:00:00Z'),
  ];
  const root = makeLedger(events);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verified_release_throughput.releases, 1, 'occurrence metric uses occurred_at, not observed_at');
  assert.equal(report.verified_release_throughput.measurement_state, 'measured_nonzero');
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-A lib: listAll returns full history; list (observed_at) would drop late imports', () => {
  const events = [
    readyEvent('t_imp', '2026-07-01T00:00:00Z', '2026-07-20T00:00:00Z'),
    releaseEvent('t_imp', '2026-07-03T00:00:00Z', '2026-07-20T00:00:00Z'),
  ];
  const root = makeLedger(events);
  const all = ledger.listAll(root);
  assert.equal(all.length, 2, 'listAll returns the full validated history');
  // list filtered to the occurrence window on observed_at would drop these
  // (observed 2026-07-20 is outside 07-01..07-08) — proving why occurrence
  // metrics must use listAll, not list.
  const observedFiltered = ledger.list(root, { from: '2026-07-01T00:00:00Z', to: '2026-07-08T00:00:00Z' });
  assert.equal(observedFiltered.length, 0, 'observed_at filtering drops late imports');
  fs.rmSync(root, { recursive: true, force: true });
});

// ===========================================================================
// R2-B — measurement state (5 CLI scenarios)
// ===========================================================================

test('R2-B CLI 1: no releases and no coverage -> instrumentation_missing', () => {
  const events = [readyEvent('t1', '2026-07-02T00:00:00Z')];
  const root = makeLedger(events);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const m1 = JSON.parse(result.stdout).verified_release_throughput;
  assert.equal(m1.measurement_state, 'instrumentation_missing');
  assert.equal(m1.instrumentation_coverage_state, 'unmeasured');
  assert.equal(m1.rate_per_week, metrics.INSUFFICIENT_DATA);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-B CLI 2: historical release before window, no coverage in window -> instrumentation_missing', () => {
  const events = [
    readyEvent('t1', '2026-06-01T00:00:00Z'),
    releaseEvent('t1', '2026-06-15T00:00:00Z'), // before window
  ];
  const root = makeLedger(events);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const m1 = JSON.parse(result.stdout).verified_release_throughput;
  assert.equal(m1.measurement_state, 'instrumentation_missing', 'a historical release must not prove measured_zero');
  assert.equal(m1.releases, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-B CLI 3: complete synthetic coverage + zero releases -> measured_zero', () => {
  const events = [readyEvent('t1', '2026-07-02T00:00:00Z')]; // no release
  const root = makeLedger(events);
  const contract = writeContract(root, 'instr.json', EMITTER_FULL);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--instrumentation-coverage', contract]);
  assert.equal(result.status, 0, result.stderr);
  const m1 = JSON.parse(result.stdout).verified_release_throughput;
  assert.equal(m1.measurement_state, 'measured_zero');
  assert.equal(m1.instrumentation_coverage_state, 'complete');
  assert.equal(m1.rate_per_week, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-B CLI 4: complete synthetic coverage + nonzero releases -> measured_nonzero', () => {
  const events = [
    readyEvent('t1', '2026-07-01T00:00:00Z'),
    releaseEvent('t1', '2026-07-03T00:00:00Z'),
  ];
  const root = makeLedger(events);
  const contract = writeContract(root, 'instr.json', EMITTER_FULL);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--instrumentation-coverage', contract]);
  assert.equal(result.status, 0, result.stderr);
  const m1 = JSON.parse(result.stdout).verified_release_throughput;
  assert.equal(m1.measurement_state, 'measured_nonzero');
  assert.equal(m1.releases, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-B CLI 5: partial coverage -> instrumentation_missing (not measured_zero)', () => {
  const events = [readyEvent('t1', '2026-07-02T00:00:00Z')];
  const root = makeLedger(events);
  const contract = writeContract(root, 'instr.json', EMITTER_PARTIAL);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--instrumentation-coverage', contract]);
  assert.equal(result.status, 0, result.stderr);
  const m1 = JSON.parse(result.stdout).verified_release_throughput;
  assert.equal(m1.measurement_state, 'instrumentation_missing');
  assert.equal(m1.instrumentation_coverage_state, 'partial');
  fs.rmSync(root, { recursive: true, force: true });
});

// ===========================================================================
// R2-C — carry-in / opening state (5 scenarios)
// ===========================================================================

test('R2-C 1: task entered and released before window does NOT poison opening state', () => {
  // Old task fully completed before window; a clean in-window task reconciles.
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t_old', '2026-06-01T00:00:00Z'),
    releaseEvent('t_old', '2026-06-10T00:00:00Z'), // completed before window
    readyEvent('t_a', t0), releaseEvent('t_a', '2026-07-01T01:00:00Z'),
    readyEvent('t_b', t0), releaseEvent('t_b', '2026-07-01T02:00:00Z'),
    readyEvent('t_c', t0), releaseEvent('t_c', '2026-07-01T09:00:00Z'),
  ];
  const result = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true, observationCoverageComplete: true });
  assert.equal(result.opening_state_known, true, 'old completed task must not poison opening state');
  assert.equal(result.computable, true, result.insufficiency_reasons.join('; '));
  assert.equal(result.released_in_window, 3, 'old task excluded; 3 in-window releases');
});

test('R2-C 2: task active at window start is INCLUDED when opening state is trustworthy', () => {
  const events = [
    readyEvent('t_carry', '2026-06-20T00:00:00Z'),
    releaseEvent('t_carry', '2026-07-03T00:00:00Z'),
    readyEvent('t_a', '2026-07-01T00:00:00Z'), releaseEvent('t_a', '2026-07-01T02:00:00Z'),
    readyEvent('t_b', '2026-07-01T00:00:00Z'), releaseEvent('t_b', '2026-07-01T04:00:00Z'),
  ];
  const result = metrics.littlesLawComponents(events, { ...WINDOW, openingStateTrustworthy: true });
  assert.equal(result.opening_state_known, true);
  assert.equal(result.carry_in_releases, 1, 'carry-in included');
  assert.equal(result.released_in_window, 3);
});

test('R2-C 3: task active at window start -> insufficient_data when opening state NOT trustworthy', () => {
  const events = [
    readyEvent('t_carry', '2026-06-20T00:00:00Z'),
    releaseEvent('t_carry', '2026-07-03T00:00:00Z'),
  ];
  const result = metrics.littlesLawComponents(events, WINDOW); // openingStateTrustworthy defaults false
  assert.equal(result.opening_state_known, false);
  assert.equal(result.computable, false);
  assert.equal(result.residual, metrics.INSUFFICIENT_DATA);
});

test('R2-C 4: carry-in release cannot silently disappear', () => {
  const events = [
    readyEvent('t_carry', '2026-06-20T00:00:00Z'),
    releaseEvent('t_carry', '2026-07-03T00:00:00Z'),
  ];
  // Even without trustworthy opening state (computable=false), the release is
  // still COUNTED — it never silently disappears.
  const result = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(result.released_in_window, 1, 'carry-in release counted even when not reconcilable');
  assert.equal(result.carry_in_releases, 1);
});

test('R2-C 5: one event in 28 days is NOT complete observation coverage', () => {
  const events = [readyEvent('t1', '2026-07-01T00:00:00Z')];
  const window28 = { windowStartMs: Date.parse('2026-07-01T00:00:00Z'), windowEndMs: Date.parse('2026-07-29T00:00:00Z') };
  const cov = metrics.observationCoverage(events, window28);
  assert.equal(cov.state, 'unmeasured', 'no coverage contract -> never complete');
  const ll = metrics.littlesLawComponents(events, window28);
  assert.equal(ll.coverage_state, 'unmeasured', 'density is not coverage; no evidence -> unmeasured');
  assert.equal(ll.computable, false);
});

// ===========================================================================
// R2-D — coverage line consistent with Little's Law
// ===========================================================================

test('R2-D CLI: top-level coverage and Little\'s Law coverage never contradict (no contract)', () => {
  const events = [
    readyEvent('t1', '2026-07-01T00:00:00Z'),
    releaseEvent('t1', '2026-07-03T00:00:00Z'),
  ];
  const root = makeLedger(events);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  // Without a coverage contract, both the top-level coverage and the LL coverage
  // derive from the same (absent) contract: both unmeasured. They never disagree.
  assert.equal(report.coverage.state, 'unmeasured');
  assert.equal(report.littles_law.coverage_state, 'unmeasured');
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-D CLI: with a complete observation contract, top-level and LL coverage agree (complete/adequate)', () => {
  const events = [
    readyEvent('t1', '2026-07-01T00:00:00Z'),
    releaseEvent('t1', '2026-07-03T00:00:00Z'),
  ];
  const root = makeLedger(events);
  const contract = writeContract(root, 'cov.json', OBSERVATION_FULL);
  const opening = writeContract(root, 'opening.json', OPENING_FULL);
  const result = runCli(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--coverage-evidence', contract, '--opening-state-evidence', opening]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.coverage.state, 'complete');
  assert.equal(report.coverage.coverage_source, 'synthetic_test');
  // Same contract drives the LL coverage_state -> adequate (both agree).
  assert.equal(report.littles_law.coverage_state, 'adequate');
  fs.rmSync(root, { recursive: true, force: true });
});

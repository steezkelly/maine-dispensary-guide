#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R1 remote-review correction tests — findings A, B, C, F, G.
 *
 * A. Little's Law W = arithmetic mean flow time (not P50). CLI-level
 *    composition test with a deliberately skewed sample (1h, 2h, 9h):
 *    median = 2h, arithmetic mean = 4h. Proves the report uses 4h.
 * B. L, lambda, W share one ready -> verified-release population boundary.
 *    Non-release departures (card_completed without release, cancelled) make
 *    the boundary incompatible; right-censored in-flight tasks stay in WIP.
 * C. Fail closed on inadequate coverage: one event in a 28-day window is not
 *    complete; 7 days + 3 timestamps is insufficient when opening WIP is
 *    unknown; coverageAdequate=false -> computable=false; residual not
 *    calculated for an invalid population/window.
 * F. Detailed private output: fail-closed path validation (lexical .. escape,
 *    symlink-ancestor escape, output-file symlink), 0700 dirs, 0600 file even
 *    over a pre-existing 0644, and no task IDs in stdout.
 * G. Program gate recognizes card_completed as a completed predecessor state.
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
const gate = require('../program-gate/mdg-ops-program-gate.cjs');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI = path.resolve(__dirname, '../metrics/cli.cjs');
const HOUR = 3600 * 1000;
const WINDOW = {
  windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
  windowEndMs: Date.parse('2026-07-08T00:00:00Z'), // 7 days
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

function releaseEvent(taskId, occurredAt, { verifierPass = true, postDeploy = true } = {}) {
  return ev({
    event_id: `rel-${taskId}-${occurredAt}`,
    event_type: 'release_recorded',
    task_id: taskId,
    occurred_at: occurredAt,
    release_evidence: { verifier_pass: verifierPass, post_deploy_verified: postDeploy },
  });
}

function readyEvent(taskId, occurredAt) {
  return ev({ event_id: `ready-${taskId}`, task_id: taskId, to_state: 'ready', occurred_at: occurredAt });
}

// ---------------------------------------------------------------------------
// A. Little's Law W = arithmetic mean (not P50) — CLI-level composition
// ---------------------------------------------------------------------------

test('A: CLI Little\'s Law uses arithmetic mean W (4h), not median (2h), for skewed 1/2/9h sample', () => {
  // Three tasks, all enter ready at window start, release at +1h, +2h, +9h.
  // Flow times: 1h, 2h, 9h. Median = 2h. Arithmetic mean = (1+2+9)/3 = 4h.
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0), releaseEvent('t1', '2026-07-01T01:00:00Z'),
    readyEvent('t2', t0), releaseEvent('t2', '2026-07-01T02:00:00Z'),
    readyEvent('t3', t0), releaseEvent('t3', '2026-07-01T09:00:00Z'),
  ];

  // Pure-helper assertion: mean_hours = 4, p50_hours = 2.
  const flow = metrics.readyToReleaseFlowTime(events, WINDOW);
  assert.equal(flow.eligible, 3);
  assert.ok(Math.abs(flow.mean_hours - 4) < 1e-9, `mean_hours should be 4, got ${flow.mean_hours}`);
  assert.ok(Math.abs(flow.p50_hours - 2) < 1e-9, `p50_hours should be 2, got ${flow.p50_hours}`);
  assert.notEqual(flow.mean_hours, flow.p50_hours, 'mean and median must differ for this skewed sample');

  // CLI-level composition: build a temp ledger, run the CLI, assert the
  // Little's Law W_hours in the JSON report is 4 (the mean), not 2 (the median).
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-a-'));
  ledger.init(root);
  for (const e of events) ledger.appendEvent(root, e);
  const result = spawnSync(process.execPath, [
    CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json',
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const ll = report.littles_law;
  assert.ok(Math.abs(ll.W_hours - 4) < 1e-9, `CLI Little's Law W_hours should be 4 (mean), got ${ll.W_hours}`);
  assert.notEqual(ll.W_hours, 2, 'CLI must NOT use the median (2h) as W');
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// B. Common ready -> verified-release population boundary
// ---------------------------------------------------------------------------

test('B: ready -> accepted -> verified release stays in WIP until the verified release', () => {
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0),
    ev({ event_id: 'acc-t1', task_id: 't1', to_state: 'accepted', occurred_at: '2026-07-01T02:00:00Z' }),
    releaseEvent('t1', '2026-07-01T04:00:00Z'),
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  // accepted is NOT an exit; the task stays in WIP until the verified release.
  assert.equal(ll.released_in_window, 1);
  assert.equal(ll.nonrelease_departures, 0);
  assert.equal(ll.boundary_compatible, true);
  // W = 4h (ready at 00:00, release at 04:00).
  assert.ok(Math.abs(ll.W_hours - 4) < 1e-9, `W should be 4h, got ${ll.W_hours}`);
});

test('B: ready -> card_completed WITHOUT release makes the boundary incompatible', () => {
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0),
    ev({ event_id: 'cc-t1', task_id: 't1', to_state: 'card_completed', occurred_at: '2026-07-01T03:00:00Z' }),
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(ll.boundary_compatible, false);
  assert.equal(ll.nonrelease_departures, 1);
  assert.equal(ll.computable, false);
  assert.equal(ll.residual, metrics.INSUFFICIENT_DATA);
  assert.ok(ll.insufficiency_reasons.some((r) => /non-release departure/.test(r)), ll.insufficiency_reasons.join('; '));
});

test('B: ready -> cancelled is an explicit non-release departure (incompatible)', () => {
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0),
    ev({ event_id: 'cancel-t1', task_id: 't1', to_state: 'cancelled', occurred_at: '2026-07-01T02:00:00Z' }),
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(ll.boundary_compatible, false);
  assert.equal(ll.nonrelease_departures, 1);
  assert.equal(ll.computable, false);
});

test('B: right-censored in-flight task stays in WIP (no release, no terminal)', () => {
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0),
    ev({ event_id: 'wip-t1', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-07-01T01:00:00Z' }),
    // no release, no terminal -> in-flight at window end
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(ll.in_flight_at_end, 1);
  assert.equal(ll.released_in_window, 0);
  assert.equal(ll.nonrelease_departures, 0);
  assert.equal(ll.boundary_compatible, true); // in-flight is not a non-release departure
});

// ---------------------------------------------------------------------------
// C. Fail closed on inadequate coverage
// ---------------------------------------------------------------------------

test('C: one event in a 28-day window is NOT complete coverage', () => {
  const events = [readyEvent('t1', '2026-07-01T00:00:00Z')];
  const window = {
    windowStartMs: Date.parse('2026-07-01T00:00:00Z'),
    windowEndMs: Date.parse('2026-07-29T00:00:00Z'), // 28 days
  };
  const ll = metrics.littlesLawComponents(events, window);
  assert.equal(ll.coverage_state, 'inadequate');
  assert.equal(ll.computable, false);
  assert.ok(ll.insufficiency_reasons.some((r) => /coverage inadequate/.test(r)), ll.insufficiency_reasons.join('; '));
});

test('C: 7 days + 3 timestamps is insufficient when opening WIP is unknown', () => {
  // Task entered ready BEFORE the window start -> opening WIP unknown.
  const events = [
    readyEvent('t1', '2026-06-30T00:00:00Z'), // before window start
    ev({ event_id: 'wip-t1', task_id: 't1', to_state: 'in_progress', occurred_at: '2026-07-02T00:00:00Z' }),
    releaseEvent('t1', '2026-07-04T00:00:00Z'),
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(ll.opening_state_known, false);
  assert.equal(ll.coverage_state, 'inadequate');
  assert.equal(ll.computable, false);
  assert.ok(ll.insufficiency_reasons.some((r) => /opening WIP/.test(r)), ll.insufficiency_reasons.join('; '));
});

test('C: coverageAdequate=false produces computable=false and no residual', () => {
  // Only 2 distinct timestamps in a 7-day window -> inadequate even if opening known.
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0),
    releaseEvent('t1', '2026-07-01T05:00:00Z'),
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(ll.coverage_state, 'inadequate'); // < 3 distinct timestamps
  assert.equal(ll.computable, false);
  assert.equal(ll.residual, metrics.INSUFFICIENT_DATA);
});

test('C: residual is not calculated for an invalid population (non-release departure)', () => {
  const t0 = '2026-07-01T00:00:00Z';
  const events = [
    readyEvent('t1', t0), releaseEvent('t1', '2026-07-01T02:00:00Z'),
    readyEvent('t2', t0), releaseEvent('t2', '2026-07-01T03:00:00Z'),
    readyEvent('t3', t0), releaseEvent('t3', '2026-07-01T04:00:00Z'),
    readyEvent('t4', t0),
    ev({ event_id: 'cancel-t4', task_id: 't4', to_state: 'cancelled', occurred_at: '2026-07-01T05:00:00Z' }),
  ];
  const ll = metrics.littlesLawComponents(events, WINDOW);
  assert.equal(ll.boundary_compatible, false);
  assert.equal(ll.computable, false);
  assert.equal(ll.residual, metrics.INSUFFICIENT_DATA);
});

// ---------------------------------------------------------------------------
// F. Detailed private output hardening
// ---------------------------------------------------------------------------

function makeLedgerWithRelease() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-f-'));
  ledger.init(root);
  const t0 = '2026-07-01T00:00:00Z';
  ledger.appendEvent(root, readyEvent('t_secret', t0));
  ledger.appendEvent(root, releaseEvent('t_secret', '2026-07-01T02:00:00Z'));
  return root;
}

test('F: ordinary valid private path writes a 0600 detailed report', () => {
  const root = makeLedgerWithRelease();
  const out = path.join(root, 'detailed-report.json');
  const result = spawnSync(process.execPath, [
    CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z',
    '--format', 'json', '--detailed', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(out));
  const mode = fs.statSync(out).mode & 0o777;
  assert.equal(mode, 0o600, `expected 0600, got 0${mode.toString(8)}`);
  // No task IDs in stdout.
  assert.ok(!result.stdout.includes('t_secret'), 'stdout must not contain task IDs');
  fs.rmSync(root, { recursive: true, force: true });
});

test('F: lexical .. escape is rejected', () => {
  const root = makeLedgerWithRelease();
  const escape = path.join(root, '..', 'escape.json');
  const result = spawnSync(process.execPath, [
    CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z',
    '--format', 'json', '--detailed', escape,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPS_OUTPUT_ESCAPE|not beneath private root/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('F: symlink-ancestor escape is rejected', () => {
  const root = makeLedgerWithRelease();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-f-outside-'));
  const linkDir = path.join(root, 'linkdir');
  fs.symlinkSync(outside, linkDir); // linkdir -> outside (escapes root)
  const out = path.join(linkDir, 'report.json');
  const result = spawnSync(process.execPath, [
    CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z',
    '--format', 'json', '--detailed', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPS_OUTPUT_ANCESTOR_ESCAPE|OPS_OUTPUT_ESCAPE|outside the private root/);
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('F: output-file symlink escape is rejected', () => {
  const root = makeLedgerWithRelease();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-f-outside2-'));
  const target = path.join(outside, 'target.json');
  fs.writeFileSync(target, '{}');
  const linkFile = path.join(root, 'report-link.json');
  fs.symlinkSync(target, linkFile); // report-link.json -> outside/target.json
  const result = spawnSync(process.execPath, [
    CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z',
    '--format', 'json', '--detailed', linkFile,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPS_OUTPUT_SYMLINK_ESCAPE|symlink escaping/);
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('F: pre-existing 0644 destination becomes 0600', () => {
  const root = makeLedgerWithRelease();
  const out = path.join(root, 'preexisting.json');
  fs.writeFileSync(out, '{}', { mode: 0o644 });
  assert.equal(fs.statSync(out).mode & 0o777, 0o644);
  const result = spawnSync(process.execPath, [
    CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z',
    '--format', 'json', '--detailed', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
  assert.equal(result.status, 0, result.stderr);
  const mode = fs.statSync(out).mode & 0o777;
  assert.equal(mode, 0o600, `expected 0600 after overwrite, got 0${mode.toString(8)}`);
  fs.rmSync(root, { recursive: true, force: true });
});

test('F: no task IDs in stdout (summary or json)', () => {
  const root = makeLedgerWithRelease();
  for (const format of ['summary', 'json']) {
    const result = spawnSync(process.execPath, [
      CLI, '--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', format,
    ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes('t_secret'), `${format} stdout must not contain task IDs`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// G. Program gate recognizes card_completed
// ---------------------------------------------------------------------------

test('G: program gate accepts card_completed as a completed predecessor state', () => {
  assert.ok(gate.isCompleted('card_completed'), 'card_completed must be a completed status');
  // A predecessor with card_completed + an allowed outcome satisfies the gate.
  const result = gate.evaluatePredecessor({ task_id: 't_pred', status: 'card_completed', outcome: 'EVIDENCE_SUFFICIENT' });
  assert.equal(result.satisfied, true, result.reason);
});

test('G: card_completed with a disallowed outcome still fails closed', () => {
  const result = gate.evaluatePredecessor({ task_id: 't_pred', status: 'card_completed', outcome: 'INSUFFICIENT_EVIDENCE' });
  assert.equal(result.satisfied, false);
});

test('G: card_completed with no outcome fails closed (completion alone insufficient)', () => {
  const result = gate.evaluatePredecessor({ task_id: 't_pred', status: 'card_completed' });
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /completion alone/i);
});

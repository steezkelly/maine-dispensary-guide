#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-2 focused tests — outcome-aware program gate.
 *
 * Core requirement: "completed with insufficient evidence" must NOT unlock a
 * downstream implementation task. Plus allowed/disallowed outcomes, completion
 * alone insufficient, fail-closed on unknown outcomes, AND semantics, and the
 * structured blocked-card annotation.
 *
 * Node built-in test runner. No dependency. Pure functions.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../program-gate/mdg-ops-program-gate.cjs');

// ---------------------------------------------------------------------------
// The headline requirement
// ---------------------------------------------------------------------------

test('completed with INSUFFICIENT_EVIDENCE does NOT unlock a downstream task', () => {
  const result = gate.evaluateGate([
    { task_id: 't_ops06', status: 'completed', outcome: 'INSUFFICIENT_EVIDENCE' },
  ]);
  assert.equal(result.dispatchable, false);
  assert.equal(result.unsatisfied.length, 1);
  assert.match(result.unsatisfied[0].reason, /disallowed/i);
});

test('completed with INSUFFICIENT_DATA does NOT unlock a downstream task', () => {
  const result = gate.evaluateGate([
    { task_id: 't_x', status: 'done', outcome: 'INSUFFICIENT_DATA' },
  ]);
  assert.equal(result.dispatchable, false);
});

// ---------------------------------------------------------------------------
// Completion alone is insufficient
// ---------------------------------------------------------------------------

test('completion with NO recorded outcome does NOT unlock (completion alone insufficient)', () => {
  const result = gate.evaluateGate([
    { task_id: 't_ops06', status: 'completed' }, // no outcome field
  ]);
  assert.equal(result.dispatchable, false);
  assert.match(result.unsatisfied[0].reason, /completion alone is insufficient/i);
});

test('not-completed predecessor does NOT unlock even with an allowed outcome recorded', () => {
  const result = gate.evaluateGate([
    { task_id: 't_x', status: 'running', outcome: 'EVIDENCE_SUFFICIENT' },
  ]);
  assert.equal(result.dispatchable, false);
  assert.match(result.unsatisfied[0].reason, /not completed/i);
});

// ---------------------------------------------------------------------------
// Allowed outcomes
// ---------------------------------------------------------------------------

test('each allowed outcome unlocks when completed', () => {
  for (const outcome of gate.ALLOWED_OUTCOMES) {
    const result = gate.evaluateGate([{ task_id: 't', status: 'completed', outcome }]);
    assert.equal(result.dispatchable, true, `outcome ${outcome} should unlock`);
  }
});

test('every disallowed outcome stays locked when completed', () => {
  for (const outcome of gate.DISALLOWED_OUTCOMES) {
    const result = gate.evaluateGate([{ task_id: 't', status: 'completed', outcome }]);
    assert.equal(result.dispatchable, false, `outcome ${outcome} must NOT unlock`);
  }
});

// ---------------------------------------------------------------------------
// Fail-closed on unknown outcomes
// ---------------------------------------------------------------------------

test('unrecognized outcome is fail-closed (does NOT unlock)', () => {
  const result = gate.evaluateGate([
    { task_id: 't', status: 'completed', outcome: 'SOMETHING_NEW' },
  ]);
  assert.equal(result.dispatchable, false);
  assert.match(result.unsatisfied[0].reason, /not a recognized allowed outcome/i);
});

// ---------------------------------------------------------------------------
// AND semantics across multiple predecessors
// ---------------------------------------------------------------------------

test('all predecessors must satisfy (AND): one insufficient blocks all', () => {
  const result = gate.evaluateGate([
    { task_id: 't_a', status: 'completed', outcome: 'EVIDENCE_SUFFICIENT' },
    { task_id: 't_b', status: 'completed', outcome: 'INSUFFICIENT_EVIDENCE' },
  ]);
  assert.equal(result.dispatchable, false);
  assert.equal(result.satisfied.length, 1);
  assert.equal(result.unsatisfied.length, 1);
});

test('all predecessors satisfied -> dispatchable', () => {
  const result = gate.evaluateGate([
    { task_id: 't_a', status: 'completed', outcome: 'BOTTLENECK_IDENTIFIED' },
    { task_id: 't_b', status: 'done', outcome: 'POLICY_CANDIDATE' },
  ]);
  assert.equal(result.dispatchable, true);
  assert.equal(result.unsatisfied.length, 0);
});

test('empty predecessor set is NOT dispatchable (no evidence to unlock)', () => {
  const result = gate.evaluateGate([]);
  assert.equal(result.dispatchable, false);
});

// ---------------------------------------------------------------------------
// Required-outcome pinning
// ---------------------------------------------------------------------------

test('requiredOutcome pins the exact outcome needed', () => {
  const ok = gate.evaluateGate(
    [{ task_id: 't', status: 'completed', outcome: 'POLICY_CANDIDATE' }],
    { requiredOutcome: 'POLICY_CANDIDATE' },
  );
  assert.equal(ok.dispatchable, true);

  const wrong = gate.evaluateGate(
    [{ task_id: 't', status: 'completed', outcome: 'EVIDENCE_SUFFICIENT' }],
    { requiredOutcome: 'POLICY_CANDIDATE' },
  );
  assert.equal(wrong.dispatchable, false);
  assert.match(wrong.unsatisfied[0].reason, /does not match the required outcome/i);
});

// ---------------------------------------------------------------------------
// Status normalization
// ---------------------------------------------------------------------------

test('status normalization: done/accepted/released count as completed', () => {
  for (const status of ['done', 'accepted', 'released', 'completed', 'COMPLETED']) {
    const result = gate.evaluateGate([{ task_id: 't', status, outcome: 'EVIDENCE_SUFFICIENT' }]);
    assert.equal(result.dispatchable, true, `status ${status} should be completed`);
  }
});

// ---------------------------------------------------------------------------
// Structured blocked-card annotation
// ---------------------------------------------------------------------------

test('blockAnnotation carries all required fields', () => {
  const annotation = gate.blockAnnotation({
    gatedTaskId: 't_a5bf2c12',
    predecessorTaskId: 't_33265aa7',
    evidenceRef: '~/.hermes/data/mdg-ops/OPS-06-baseline-decision-brief-2026-07-26.md',
    nextAction: 'emit structured release+verification events; extend observation past 28 days; re-baseline',
    resumeTrigger: 'OPS-06 (or replacement) records BOTTLENECK_IDENTIFIED / POLICY_CANDIDATE / EVIDENCE_SUFFICIENT',
    blockerOwner: 'coordinator',
  });
  for (const key of ['gated_task_id', 'blocker_owner', 'blocked_by', 'evidence_reference', 'required_outcome', 'required_next_action', 'measurable_resume_trigger', 'gate']) {
    assert.ok(key in annotation, `missing field ${key}`);
  }
  assert.deepEqual(annotation.required_outcome, gate.ALLOWED_OUTCOMES);
  assert.equal(annotation.blocker_owner, 'coordinator');
});

// ---------------------------------------------------------------------------
// No priority scoring / first-eligible ordering introduced
// ---------------------------------------------------------------------------

test('gate exposes no priority scoring or ordering surface', () => {
  // The module must not export anything resembling priority/weight/ordering.
  const exported = Object.keys(gate);
  for (const name of exported) {
    assert.ok(!/priority|weight|score|rank|order/i.test(name), `unexpected ordering surface: ${name}`);
  }
});

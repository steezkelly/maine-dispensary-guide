#!/usr/bin/env node
'use strict';

/**
 * OPS-05 focused graph + shadow-advisor tests.
 *
 * Verifies:
 *   - graph: cycles (exact path), missing deps, deterministic topo order,
 *     direct/transitive dependents, downstream unlock, longest chain,
 *     blocked descendants, tasks unlocking ready work
 *   - advisor: ranks ONLY eligible tasks; shows all score components;
 *     insufficient_scoring_data for missing fields; deterministic ties;
 *     NEVER writes/acquires/dispatches
 *   - CONTINUITY REGRESSION: the advisor's first-eligible selection matches
 *     the live continuity-check nextAction exactly (behavior unchanged)
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const graph = require('../graph/mdg-ops-graph.cjs');
const advisor = require('../advisor/mdg-ops-advisor.cjs');
const continuity = require(path.resolve(__dirname, '../../agent/mdg-continuity-check.cjs'));

// ---------------------------------------------------------------------------
// Graph: missing dependencies
// ---------------------------------------------------------------------------

test('missingDependencies reports referenced-but-absent deps', () => {
  const tasks = [
    { id: 'a', depends_on: ['b', 'ghost'], status: 'ready' },
    { id: 'b', depends_on: [], status: 'accepted' },
  ];
  const missing = graph.missingDependencies(tasks);
  assert.deepEqual(missing, [{ task_id: 'a', missing_dependency: 'ghost' }]);
});

// ---------------------------------------------------------------------------
// Graph: cycles
// ---------------------------------------------------------------------------

test('findCycles returns the exact cycle path', () => {
  const tasks = [
    { id: 'a', depends_on: ['b'], status: 'ready' },
    { id: 'b', depends_on: ['c'], status: 'ready' },
    { id: 'c', depends_on: ['a'], status: 'ready' },
  ];
  const cycles = graph.findCycles(tasks);
  assert.deepEqual(cycles, [['a', 'b', 'c', 'a']]);
});

test('findCycles returns empty for a DAG', () => {
  const tasks = [
    { id: 'a', depends_on: ['b'], status: 'ready' },
    { id: 'b', depends_on: ['c'], status: 'ready' },
    { id: 'c', depends_on: [], status: 'ready' },
  ];
  assert.deepEqual(graph.findCycles(tasks), []);
});

test('topologicalOrder throws on a cycle', () => {
  const tasks = [
    { id: 'a', depends_on: ['b'], status: 'ready' },
    { id: 'b', depends_on: ['a'], status: 'ready' },
  ];
  assert.throws(() => graph.topologicalOrder(tasks), /CYCLE_DETECTED/);
});

// ---------------------------------------------------------------------------
// Graph: topological order (deterministic, deps first)
// ---------------------------------------------------------------------------

test('topologicalOrder is deterministic and puts deps before dependents', () => {
  const tasks = [
    { id: 'z', depends_on: ['m'], status: 'ready' },
    { id: 'm', depends_on: ['a'], status: 'ready' },
    { id: 'a', depends_on: [], status: 'ready' },
  ];
  const order1 = graph.topologicalOrder(tasks);
  const order2 = graph.topologicalOrder([...tasks].reverse());
  assert.deepEqual(order1, order2, 'deterministic regardless of input order');
  assert.ok(order1.indexOf('a') < order1.indexOf('m'));
  assert.ok(order1.indexOf('m') < order1.indexOf('z'));
});

// ---------------------------------------------------------------------------
// Graph: dependents + unlock
// ---------------------------------------------------------------------------

test('directDependents and transitiveDependents', () => {
  const tasks = [
    { id: 'a', depends_on: [], status: 'accepted' },
    { id: 'b', depends_on: ['a'], status: 'ready' },
    { id: 'c', depends_on: ['b'], status: 'ready' },
    { id: 'd', depends_on: ['a'], status: 'ready' },
  ];
  assert.deepEqual(graph.directDependents(tasks, 'a'), ['b', 'd']);
  assert.deepEqual(graph.transitiveDependents(tasks, 'a'), ['b', 'c', 'd']);
});

test('downstreamUnlockCount counts newly-eligible tasks only', () => {
  const tasks = [
    { id: 'a', depends_on: [], status: 'ready' },        // completing a...
    { id: 'b', depends_on: ['a'], status: 'ready' },      // ...unlocks b
    { id: 'c', depends_on: ['a', 'x'], status: 'ready' }, // c still blocked by x (absent)
    { id: 'd', depends_on: [], status: 'ready' },         // d already eligible
    { id: 'blocked', depends_on: ['a'], status: 'blocked' },
    { id: 'finished', depends_on: ['a'], status: 'done' },
  ];
  // Only ready work counts. Blocked/terminal descendants remain graph context,
  // but they are not newly dispatchable work.
  assert.equal(graph.downstreamUnlockCount(tasks, 'a'), 1);
});

test('analyze exposes every graph analysis for each task', () => {
  const tasks = [
    { id: 'a', depends_on: [], status: 'ready' },
    { id: 'b', depends_on: ['a'], status: 'ready' },
    { id: 'c', depends_on: ['b'], status: 'blocked' },
  ];
  const result = graph.analyze(tasks);
  assert.deepEqual(result.topological_order, ['a', 'b', 'c']);
  assert.deepEqual(result.tasks.a.direct_dependents, ['b']);
  assert.deepEqual(result.tasks.a.transitive_dependents, ['b', 'c']);
  assert.equal(result.tasks.a.downstream_unlock_count, 1);
  assert.deepEqual(result.tasks.a.blocked_descendants, ['c']);
  assert.deepEqual(result.tasks_unlocking_ready_work, ['a']);
});

// ---------------------------------------------------------------------------
// Graph: longest chain + blocked descendants
// ---------------------------------------------------------------------------

test('longestChain measures hop count', () => {
  const tasks = [
    { id: 'a', depends_on: [], status: 'ready' },
    { id: 'b', depends_on: ['a'], status: 'ready' },
    { id: 'c', depends_on: ['b'], status: 'ready' },
    { id: 'd', depends_on: ['c'], status: 'ready' },
  ];
  const result = graph.longestChain(tasks);
  assert.equal(result.length, 3); // a->b->c->d = 3 hops
  assert.equal(result.deepest_task, 'd');
});

test('blockedDescendants finds blocked transitive dependents', () => {
  const tasks = [
    { id: 'a', depends_on: [], status: 'ready' },
    { id: 'b', depends_on: ['a'], status: 'blocked' },
    { id: 'c', depends_on: ['b'], status: 'ready' },
    { id: 'd', depends_on: ['a'], status: 'ready' },
  ];
  assert.deepEqual(graph.blockedDescendants(tasks, 'a'), ['b']);
});

test('tasksUnlockingReadyWork lists tasks with positive unlock count', () => {
  const tasks = [
    { id: 'a', depends_on: [], status: 'ready' },
    { id: 'b', depends_on: ['a'], status: 'ready' },
    { id: 'lonely', depends_on: [], status: 'ready' },
  ];
  const result = graph.tasksUnlockingReadyWork(tasks);
  assert.ok(result.includes('a'));
  assert.ok(!result.includes('lonely'));
});

// ---------------------------------------------------------------------------
// Advisor: eligibility + scoring
// ---------------------------------------------------------------------------

test('advisor ranks ONLY eligible tasks', () => {
  const tasks = [
    { id: 'ready1', status: 'ready', depends_on: [], decision: { trust_risk_reduction: 5, user_business_value: 5, freshness_urgency: 5, learning_value: 5, effort_points: 1, confidence: 1.0 } },
    { id: 'blocked1', status: 'blocked', depends_on: [], decision: { trust_risk_reduction: 5, user_business_value: 5, freshness_urgency: 5, learning_value: 5, effort_points: 1, confidence: 1.0 } },
    { id: 'done1', status: 'done', depends_on: [] },
  ];
  const result = advisor.advise(tasks);
  assert.equal(result.eligible_count, 1);
  assert.equal(result.advisory_selection, 'ready1');
  // blocked/done tasks never appear in the ranking
  const rankedIds = result.ranking.map((r) => r.task_id);
  assert.ok(!rankedIds.includes('blocked1'));
  assert.ok(!rankedIds.includes('done1'));
});

test('advisor shows all score components', () => {
  const tasks = [
    { id: 'r', status: 'ready', depends_on: [], created_at: 1784064228, decision: { trust_risk_reduction: 3, user_business_value: 4, freshness_urgency: 2, learning_value: 1, effort_points: 2, confidence: 0.5 } },
  ];
  const result = advisor.advise(tasks, { now: '2026-07-26T00:00:00Z' });
  const r = result.ranking[0];
  assert.equal(r.scoring, 'scored');
  for (const key of ['trust_risk_reduction', 'user_business_value', 'freshness_urgency', 'learning_value', 'downstream_unlock', 'normalized_unlock', 'age_adjustment', 'confidence', 'effort_points']) {
    assert.ok(key in r.components, `missing component ${key}`);
  }
  assert.ok(typeof r.score === 'number');
  assert.ok(typeof r.benefit === 'number');
});

test('missing decision metadata yields insufficient_scoring_data', () => {
  const tasks = [
    { id: 'nodecision', status: 'ready', depends_on: [] },
    { id: 'partial', status: 'ready', depends_on: [], decision: { trust_risk_reduction: 3 } },
  ];
  const result = advisor.advise(tasks);
  for (const r of result.ranking) {
    assert.equal(r.scoring, advisor.INSUFFICIENT_SCORING_DATA);
    assert.ok(r.components, 'all score components remain visible');
    for (const key of ['trust_risk_reduction', 'user_business_value', 'freshness_urgency', 'learning_value', 'downstream_unlock', 'normalized_unlock', 'age_adjustment', 'confidence', 'effort_points']) {
      assert.ok(key in r.components, `missing component ${key}`);
    }
    assert.ok(Array.isArray(r.missing_fields));
    assert.ok(r.missing_fields.length > 0);
  }
  assert.equal(result.advisory_selection, null, 'missing scores cannot produce a recommendation');
});

test('advisor ties are broken deterministically by id', () => {
  const decision = { trust_risk_reduction: 3, user_business_value: 3, freshness_urgency: 3, learning_value: 3, effort_points: 1, confidence: 1.0 };
  const tasks = [
    { id: 'beta', status: 'ready', depends_on: [], decision: { ...decision } },
    { id: 'alpha', status: 'ready', depends_on: [], decision: { ...decision } },
  ];
  const r1 = advisor.advise(tasks);
  const r2 = advisor.advise([...tasks].reverse());
  assert.equal(r1.ranking[0].task_id, r2.ranking[0].task_id, 'deterministic tie-break');
  assert.equal(r1.ranking[0].task_id, 'alpha', 'lower id wins the tie');
});

// ---------------------------------------------------------------------------
// CONTINUITY REGRESSION: advisor first-eligible == live continuity nextAction
// ---------------------------------------------------------------------------

test('advisor first-eligible selection matches continuity-check nextAction exactly', () => {
  // A board where continuity would dispatch the first ready, deps-satisfied,
  // non-colliding task. The advisor must report the SAME first-eligible.
  const tasks = [
    { id: 'dep', status: 'accepted', depends_on: [] },
    { id: 'first_ready', status: 'ready', depends_on: ['dep'] },
    { id: 'second_ready', status: 'ready', depends_on: ['dep'], decision: { trust_risk_reduction: 5, user_business_value: 5, freshness_urgency: 5, learning_value: 5, effort_points: 1, confidence: 1.0 } },
  ];
  const continuityAction = continuity.nextAction(tasks);
  assert.equal(continuityAction.kind, 'dispatch');
  const advisorResult = advisor.advise(tasks);
  assert.equal(advisorResult.first_eligible_selection, continuityAction.taskId, 'first-eligible must match continuity exactly');
  // The advisory selection may differ (second_ready scores higher), but the
  // first-eligible reported by the advisor is provably the continuity choice.
});

test('advisor reports no first-eligible when continuity would not dispatch', () => {
  // Only an in-progress task; continuity returns continue-reconnaissance, not dispatch.
  const tasks = [
    { id: 'running', status: 'in_progress', depends_on: [] },
  ];
  const continuityAction = continuity.nextAction(tasks);
  assert.notEqual(continuityAction.kind, 'dispatch');
  const advisorResult = advisor.advise(tasks);
  assert.equal(advisorResult.first_eligible_selection, null);
  assert.equal(advisorResult.eligible_count, 0);
});

test('advisor respects dependency satisfaction like continuity', () => {
  // ready task whose dependency is NOT accepted/released => not eligible.
  const tasks = [
    { id: 'pending_dep', status: 'ready', depends_on: [] },
    { id: 'blocked_by_dep', status: 'ready', depends_on: ['pending_dep'] },
  ];
  const advisorResult = advisor.advise(tasks);
  // blocked_by_dep depends on pending_dep which is 'ready' (not accepted/released) => ineligible
  const eligibleIds = advisorResult.ranking.map((r) => r.task_id);
  assert.ok(eligibleIds.includes('pending_dep'));
  assert.ok(!eligibleIds.includes('blocked_by_dep'));
});

test('advisor eligibility reuses continuity semantics for state fallback', () => {
  const tasks = [
    { id: 'dep', state: 'accepted', depends_on: [] },
    { id: 'candidate', state: 'ready', depends_on: ['dep'] },
  ];
  const continuityAction = continuity.nextAction(tasks);
  assert.equal(continuityAction.taskId, 'candidate');
  assert.deepEqual(advisor.eligibleTasks(tasks).map((task) => task.id), ['candidate']);
});

test('advisor eligibility reuses continuity lease-path normalization', () => {
  const tasks = [
    { id: 'active', status: 'in_progress', lease_paths: ['scripts/operations'] },
    { id: 'candidate', status: 'ready', lease_paths: ['scripts\\operations\\graph'] },
  ];
  assert.notEqual(continuity.nextAction(tasks).kind, 'dispatch');
  assert.deepEqual(advisor.eligibleTasks(tasks), []);
});

// ---------------------------------------------------------------------------
// Advisor never mutates
// ---------------------------------------------------------------------------

test('advisor module does not require fs/child_process for writes', () => {
  const src = require('node:fs').readFileSync(
    path.resolve(__dirname, '../advisor/mdg-ops-advisor.cjs'), 'utf8',
  );
  assert.ok(!/child_process/.test(src), 'advisor must not spawn processes');
  assert.ok(!/writeFileSync|appendFileSync|execSync|spawnSync/.test(src), 'advisor must not write or exec');
  assert.ok(!/hermes/.test(src.toLowerCase()) || /continuity/.test(src), 'advisor only touches continuity, not hermes CLI');
});

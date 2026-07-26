'use strict';

/**
 * mdg-ops-advisor.cjs — shadow dispatch advisor.
 *
 * Ranks ONLY currently-eligible tasks by a transparent shadow score and
 * compares against the live first-eligible selection. It NEVER writes to
 * Hermes, acquires a lease, dispatches an agent, or changes the default
 * policy. It reuses the actual continuity-check `nextAction` so the
 * first-eligible selection is provably unchanged.
 *
 * Shadow score (OPS-01 ADR §10):
 *   benefit = 3*R + 2*V + F + L + U + A
 *   score   = C * benefit / max(1, E)
 * where R=trust/risk reduction, V=user/business value, F=freshness urgency,
 * L=learning value, U=normalized downstream unlock, A=age adjustment,
 * C=confidence (0..1), E=effort points.
 *
 * Tasks lacking decision metadata get `insufficient_scoring_data` and remain
 * eligible under current rules. Every recommendation shows its components.
 * Ties are broken deterministically (by task id).
 *
 * Node built-ins only. No dependency.
 */

const path = require('node:path');
const graph = require('../graph/mdg-ops-graph.cjs');

// Reuse the LIVE continuity selector so first-eligible is provably unchanged.
const continuity = require(path.resolve(__dirname, '../../agent/mdg-continuity-check.cjs'));

const INSUFFICIENT_SCORING_DATA = 'insufficient_scoring_data';

function normalizeId(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeState(v) {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

/**
 * The set of currently-eligible (dispatchable) tasks, using the SAME rules as
 * continuity-check: status ready, dependencies satisfied (accepted/released),
 * no lease collision with in-progress tasks. Reimplemented here to expose the
 * full eligible set (continuity returns only the first), but kept identical.
 */
function eligibleTasks(tasks) {
  const byId = new Map();
  for (const t of tasks) {
    const id = normalizeId(t.id);
    if (id) byId.set(id, t);
  }
  const inProgress = tasks.filter((t) => normalizeState(t.status) === 'in_progress');

  const leasePaths = (t) => {
    const cands = [t.lease_paths, t.leasePaths, t.lease, t.leases, t.paths];
    for (const c of cands) {
      if (Array.isArray(c)) {
        const norm = c.filter((x) => typeof x === 'string').map((x) => x.trim().replace(/\/+$/, '')).filter(Boolean).sort();
        if (norm.length) return norm;
      }
    }
    return [];
  };
  const overlap = (a, b) => {
    if (!a || !b) return a === b;
    const pa = a.endsWith('/') ? a.slice(0, -1) : a;
    const pb = b.endsWith('/') ? b.slice(0, -1) : b;
    return pa.startsWith(`${pb}/`) || pb.startsWith(`${pa}/`);
  };
  const collides = (candidatePaths, active) => {
    if (!candidatePaths.length) return false;
    const activePaths = leasePaths(active);
    if (!activePaths.length) return false;
    return candidatePaths.some((cp) => activePaths.some((ap) => overlap(cp, ap)));
  };
  const depsSatisfied = (deps) => {
    if (!Array.isArray(deps)) return true;
    return deps.every((depId) => {
      const d = byId.get(normalizeId(depId));
      if (!d) return false;
      const s = normalizeState(d.status);
      return s === 'accepted' || s === 'released';
    });
  };

  return tasks.filter((t) => {
    if (!t || typeof t !== 'object') return false;
    if (normalizeState(t.status) !== 'ready') return false;
    if (!depsSatisfied(Array.isArray(t.depends_on) ? t.depends_on : [])) return false;
    const cp = leasePaths(t);
    return !inProgress.some((active) => collides(cp, active));
  });
}

/** The live first-eligible selection, via the actual continuity selector. */
function firstEligibleSelection(tasks, now) {
  const action = continuity.nextAction(tasks, now);
  if (action && action.kind === 'dispatch') return action.taskId;
  return null;
}

/**
 * Compute the shadow score for one task. Returns components + score, or
 * insufficient_scoring_data if decision metadata is missing.
 */
function scoreTask(task, { maxUnlock = 1, now = Date.now() } = {}) {
  const d = task.decision;
  if (!d || typeof d !== 'object') {
    return { task_id: normalizeId(task.id), scoring: INSUFFICIENT_SCORING_DATA };
  }
  const R = d.trust_risk_reduction;
  const V = d.user_business_value;
  const F = d.freshness_urgency;
  const L = d.learning_value;
  const E = d.effort_points;
  const C = d.confidence;

  const required = [R, V, F, L, E, C];
  if (required.some((x) => typeof x !== 'number' || Number.isNaN(x))) {
    return { task_id: normalizeId(task.id), scoring: INSUFFICIENT_SCORING_DATA };
  }

  const unlock = graph.downstreamUnlockCount
    ? safeUnlock(task, maxUnlock)
    : 0;
  const U = maxUnlock > 0 ? Math.min(1, unlock / maxUnlock) : 0;
  const A = ageAdjustment(task, now);

  const benefit = 3 * R + 2 * V + F + L + U + A;
  const score = (C * benefit) / Math.max(1, E);

  return {
    task_id: normalizeId(task.id),
    scoring: 'scored',
    components: {
      trust_risk_reduction: R,
      user_business_value: V,
      freshness_urgency: F,
      learning_value: L,
      downstream_unlock: unlock,
      normalized_unlock: U,
      age_adjustment: A,
      confidence: C,
      effort_points: E,
    },
    benefit,
    score,
  };
}

// unlock is computed by the caller (needs the full task list); placeholder.
function safeUnlock() { return 0; }

function ageAdjustment(task, now) {
  // Simple, bounded age adjustment: 0..2 based on days waiting, capped.
  const created = typeof task.created_at === 'number'
    ? task.created_at * 1000
    : Date.parse(task.created_at || '');
  if (!created || Number.isNaN(created)) return 0;
  const days = (now - created) / (24 * 3600 * 1000);
  if (days <= 0) return 0;
  return Math.min(2, days / 14); // reaches cap at 28 days
}

/**
 * Advise: rank eligible tasks by shadow score, compare with first-eligible.
 * `allTasks` is the full board; scoring uses it for unlock counts.
 */
function advise(allTasks, { now } = {}) {
  const nowMs = now ? Date.parse(now) : Date.now();
  const eligible = eligibleTasks(allTasks);
  const firstEligible = firstEligibleSelection(allTasks, now);

  // Max unlock across eligible tasks, for normalization.
  const unlocks = new Map();
  let maxUnlock = 0;
  for (const t of eligible) {
    const u = graph.downstreamUnlockCount(allTasks, normalizeId(t.id));
    unlocks.set(normalizeId(t.id), u);
    if (u > maxUnlock) maxUnlock = u;
  }

  const scored = eligible.map((t) => {
    const s = scoreTask(t, { maxUnlock, now: nowMs });
    if (s.scoring === 'scored') {
      s.components.downstream_unlock = unlocks.get(s.task_id) || 0;
      s.components.normalized_unlock = maxUnlock > 0 ? Math.min(1, (unlocks.get(s.task_id) || 0) / maxUnlock) : 0;
      // recompute benefit/score with the real unlock
      const c = s.components;
      s.benefit = 3 * c.trust_risk_reduction + 2 * c.user_business_value + c.freshness_urgency + c.learning_value + c.normalized_unlock + c.age_adjustment;
      s.score = (c.confidence * s.benefit) / Math.max(1, c.effort_points);
    }
    return s;
  });

  // Rank: scored tasks by score desc, deterministic tie-break by id;
  // insufficient_scoring_data tasks ranked after, by id.
  const ranked = [...scored].sort((a, b) => {
    const aScored = a.scoring === 'scored';
    const bScored = b.scoring === 'scored';
    if (aScored !== bScored) return aScored ? -1 : 1;
    if (aScored && bScored) {
      if (b.score !== a.score) return b.score - a.score;
      return a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0;
    }
    return a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0;
  });

  const advisorySelection = ranked.length ? ranked[0].task_id : null;
  const agrees = advisorySelection === firstEligible;

  return {
    eligible_count: eligible.length,
    first_eligible_selection: firstEligible,
    advisory_selection: advisorySelection,
    agreement: agrees,
    disagreement_reason: agrees
      ? null
      : (firstEligible === null
          ? 'no first-eligible dispatch (board not dispatching)'
          : 'shadow score ranks a different eligible task higher'),
    ranking: ranked,
  };
}

module.exports = {
  INSUFFICIENT_SCORING_DATA,
  eligibleTasks,
  firstEligibleSelection,
  scoreTask,
  advise,
};

'use strict';

/**
 * mdg-ops-graph.cjs — dependency graph analysis for MDG tasks.
 *
 * Pure functions over a task list (each task: { id, depends_on[], status }).
 * Edges point from a task to its dependencies (task -> dependency). Analyses:
 *   - missing dependencies (referenced but absent)
 *   - cycles (with the exact cycle path)
 *   - deterministic topological order
 *   - direct and transitive dependents
 *   - downstream unlock count (tasks transitively unlocked by completing a task)
 *   - longest dependency chain
 *   - blocked descendants
 *   - tasks that unlock ready work
 *
 * No duration weighting: the "critical path" is unit-weight (hop count) until
 * trustworthy duration estimates exist. Node built-ins only. No dependency.
 */

function normalizeId(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function depsOf(task) {
  return Array.isArray(task.depends_on)
    ? task.depends_on.map(normalizeId).filter(Boolean)
    : [];
}

function buildIndex(tasks) {
  const byId = new Map();
  for (const t of tasks) {
    const id = normalizeId(t.id);
    if (id) byId.set(id, t);
  }
  return byId;
}

/** Dependencies referenced by a task but absent from the task set. */
function missingDependencies(tasks) {
  const byId = buildIndex(tasks);
  const missing = [];
  for (const t of tasks) {
    const id = normalizeId(t.id);
    for (const dep of depsOf(t)) {
      if (!byId.has(dep)) missing.push({ task_id: id, missing_dependency: dep });
    }
  }
  return missing;
}

/**
 * Detect cycles in the dependency graph. Returns an array of cycles, each an
 * exact path array (e.g. ['a','b','c','a']). Deterministic order.
 */
function findCycles(tasks) {
  const byId = buildIndex(tasks);
  const ids = [...byId.keys()].sort();
  const adj = new Map();
  for (const id of ids) adj.set(id, depsOf(byId.get(id)).filter((d) => byId.has(d)));

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(ids.map((id) => [id, WHITE]));
  const cycles = [];
  const stack = [];

  function dfs(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adj.get(node) || []) {
      if (color.get(next) === GRAY) {
        // Found a cycle: extract the path from `next` to current stack top.
        const startIdx = stack.indexOf(next);
        const cyclePath = stack.slice(startIdx).concat(next);
        cycles.push(cyclePath);
      } else if (color.get(next) === WHITE) {
        dfs(next);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const id of ids) {
    if (color.get(id) === WHITE) dfs(id);
  }
  return cycles;
}

/**
 * Deterministic topological order (Kahn's algorithm, ties broken by sorted id).
 * Dependencies come before dependents. Throws if a cycle exists.
 */
function topologicalOrder(tasks) {
  const cycles = findCycles(tasks);
  if (cycles.length) {
    throw new Error(`CYCLE_DETECTED: ${cycles[0].join(' -> ')}`);
  }
  const byId = buildIndex(tasks);
  const ids = [...byId.keys()].sort();
  // in-degree = number of dependencies (edges task->dep); we order deps first,
  // so a task is "ready" when all its deps are emitted.
  const remainingDeps = new Map(ids.map((id) => [id, new Set(depsOf(byId.get(id)).filter((d) => byId.has(d)))]));
  const dependents = new Map(ids.map((id) => [id, []]));
  for (const id of ids) {
    for (const dep of remainingDeps.get(id)) dependents.get(dep).push(id);
  }

  const ready = ids.filter((id) => remainingDeps.get(id).size === 0).sort();
  const order = [];
  while (ready.length) {
    ready.sort();
    const node = ready.shift();
    order.push(node);
    for (const dependent of dependents.get(node)) {
      remainingDeps.get(dependent).delete(node);
      if (remainingDeps.get(dependent).size === 0) ready.push(dependent);
    }
  }
  return order;
}

/** Direct dependents: tasks that list `taskId` as a dependency. */
function directDependents(tasks, taskId) {
  const result = [];
  for (const t of tasks) {
    if (depsOf(t).includes(taskId)) result.push(normalizeId(t.id));
  }
  return result.sort();
}

/** Transitive dependents: all tasks that (transitively) depend on `taskId`. */
function transitiveDependents(tasks, taskId) {
  const byId = buildIndex(tasks);
  const dependents = new Map();
  for (const t of tasks) {
    const id = normalizeId(t.id);
    for (const dep of depsOf(t)) {
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep).push(id);
    }
  }
  const seen = new Set();
  const queue = [...(dependents.get(taskId) || [])];
  while (queue.length) {
    const cur = queue.shift();
    if (seen.has(cur) || cur === taskId) continue;
    if (!byId.has(cur)) continue;
    seen.add(cur);
    for (const next of dependents.get(cur) || []) queue.push(next);
  }
  return [...seen].sort();
}

/**
 * Downstream unlock count: number of tasks that would become newly eligible
 * (all deps satisfied) if `taskId` were completed, considering current states.
 * Does NOT count already-terminal work incorrectly.
 */
function downstreamUnlockCount(tasks, taskId) {
  const byId = buildIndex(tasks);
  const satisfied = (dep) => {
    const d = byId.get(dep);
    if (!d) return false;
    const s = normalizeId(d.status).toLowerCase();
    return s === 'accepted' || s === 'released' || s === 'done';
  };
  // Pretend taskId is now satisfied.
  const wouldBeSatisfied = (dep) => dep === taskId || satisfied(dep);

  let count = 0;
  for (const t of tasks) {
    const id = normalizeId(t.id);
    if (id === taskId) continue;
    // Keep ALL deps including absent ones: a missing dependency is never
    // satisfiable (matches continuity-check), so a task with a missing dep
    // can never be newly unlocked.
    const deps = depsOf(t);
    if (!deps.length) continue;
    const alreadyEligible = deps.every(satisfied);
    const newlyEligible = deps.every(wouldBeSatisfied);
    if (!alreadyEligible && newlyEligible) count += 1;
  }
  return count;
}

/** Longest dependency chain (unit-weight, hop count) ending at any task. */
function longestChain(tasks) {
  const byId = buildIndex(tasks);
  if (findCycles(tasks).length) throw new Error('CYCLE_DETECTED');
  const memo = new Map();
  function depth(id, visiting) {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) return 0; // guard
    visiting.add(id);
    const deps = depsOf(byId.get(id)).filter((d) => byId.has(d));
    let best = 0;
    for (const dep of deps) best = Math.max(best, 1 + depth(dep, visiting));
    visiting.delete(id);
    memo.set(id, best);
    return best;
  }
  let maxLen = 0;
  let deepest = null;
  for (const id of [...byId.keys()].sort()) {
    const d = depth(id, new Set());
    if (d > maxLen) { maxLen = d; deepest = id; }
  }
  return { length: maxLen, deepest_task: deepest };
}

/** Descendants (transitive dependents) that are currently blocked. */
function blockedDescendants(tasks, taskId) {
  const byId = buildIndex(tasks);
  return transitiveDependents(tasks, taskId).filter((id) => {
    const t = byId.get(id);
    return t && normalizeId(t.status).toLowerCase() === 'blocked';
  });
}

/**
 * Tasks that, if completed now, would unlock at least one ready-or-blocked
 * task whose only remaining unsatisfied dependency is this task.
 */
function tasksUnlockingReadyWork(tasks) {
  const result = [];
  for (const t of tasks) {
    const id = normalizeId(t.id);
    if (downstreamUnlockCount(tasks, id) > 0) result.push(id);
  }
  return result.sort();
}

module.exports = {
  missingDependencies,
  findCycles,
  topologicalOrder,
  directDependents,
  transitiveDependents,
  downstreamUnlockCount,
  longestChain,
  blockedDescendants,
  tasksUnlockingReadyWork,
};

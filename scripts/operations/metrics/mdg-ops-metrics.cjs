'use strict';

/**
 * mdg-ops-metrics.cjs — queue-flow metrics over the private operations ledger.
 *
 * Reads ONLY the validated private event store (via the OPS-02 ledger). Pure
 * functions over an event list; deterministic; UTC internally. Implements the
 * OPS-01 metric contract:
 *
 *   M1 verified release throughput  — counts ONLY verified_production_release
 *   M2 ready-to-release flow time   — P50/P85/P95, censored separated
 *   M3 first-pass verification yield — missing evidence is NOT a pass
 *   diagnostics: WIP by state, arrivals, blocked age, rework, pressure
 *   Little's Law — common boundary + window + residual + coverage warning
 *
 * Empty/unsupported measurements resolve to the sentinel INSUFFICIENT_DATA,
 * never to zero. Censored tasks are separated, never silently mixed.
 *
 * Node built-ins only. No dependency.
 */

const INSUFFICIENT_DATA = 'insufficient_data';

// ---------------------------------------------------------------------------
// Deterministic quantiles (linear interpolation, R-7 / "exclusive" percentile)
// ---------------------------------------------------------------------------

/**
 * Deterministic quantile using linear interpolation (R-7, matches NumPy/Excel
 * PERCENTILE.INC). Sorted ascending. Returns INSUFFICIENT_DATA for empty input.
 */
function quantile(sortedValues, q) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) return INSUFFICIENT_DATA;
  if (sortedValues.length === 1) return sortedValues[0];
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lower = sortedValues[base];
  const upper = sortedValues[base + 1] !== undefined ? sortedValues[base + 1] : lower;
  return lower + rest * (upper - lower);
}

function summarize(values) {
  if (!values.length) {
    return { count: 0, p50: INSUFFICIENT_DATA, p85: INSUFFICIENT_DATA, p95: INSUFFICIENT_DATA };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: quantile(sorted, 0.5),
    p85: quantile(sorted, 0.85),
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}

// ---------------------------------------------------------------------------
// Event indexing
// ---------------------------------------------------------------------------

function parseTime(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * Build a per-task timeline from events. Each task gets its ordered events and
 * derived markers (first ready time, release time, verification attempts).
 */
function indexByTask(events) {
  const byTask = new Map();
  for (const event of events) {
    const id = event.task_id;
    if (!id) continue;
    if (!byTask.has(id)) byTask.set(id, []);
    byTask.get(id).push(event);
  }
  for (const list of byTask.values()) {
    list.sort((a, b) => (parseTime(a.occurred_at) || 0) - (parseTime(b.occurred_at) || 0));
  }
  return byTask;
}

function isLeftCensored(events) {
  // A task whose first event is a left-censored task_observed has unknown entry.
  const first = events[0];
  return !!(first && first.censoring && first.censoring.left_censored);
}

// ---------------------------------------------------------------------------
// M1: verified release throughput
// ---------------------------------------------------------------------------

/**
 * Count distinct tasks with a verified production release in the window.
 * A release requires a release_recorded event whose release_evidence has
 * verifier_pass AND post_deploy_verified both true. Card completion, branch
 * creation, commits, and HTTP 200 are NOT releases.
 */
function verifiedReleaseThroughput(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  let releases = 0;
  const releaseTaskIds = [];
  for (const [taskId, list] of byTask) {
    const releaseEvent = list.find((e) => {
      if (e.event_type !== 'release_recorded') return false;
      const ev = e.release_evidence;
      return !!(ev && ev.verifier_pass === true && ev.post_deploy_verified === true);
    });
    if (!releaseEvent) continue;
    const t = parseTime(releaseEvent.occurred_at);
    if (t !== null && t >= windowStartMs && t <= windowEndMs) {
      releases += 1;
      releaseTaskIds.push(taskId);
    }
  }
  const windowMs = windowEndMs - windowStartMs;
  if (windowMs <= 0) {
    return { releases, rate_per_week: INSUFFICIENT_DATA, window_days: INSUFFICIENT_DATA, releaseTaskIds };
  }
  const windowWeeks = windowMs / (7 * 24 * 3600 * 1000);
  return {
    releases,
    rate_per_week: windowWeeks > 0 ? releases / windowWeeks : INSUFFICIENT_DATA,
    window_days: windowMs / (24 * 3600 * 1000),
    releaseTaskIds,
  };
}

// ---------------------------------------------------------------------------
// M2: ready-to-release flow time
// ---------------------------------------------------------------------------

/**
 * Flow time W_i = t(released) - t(ready) for tasks with a trustworthy
 * (non-censored) ready-entry time and a verified release time.
 * Left-censored tasks (unknown ready-entry) and right-censored tasks (not yet
 * released) are EXCLUDED from the primary distribution and reported separately.
 * Missing ready time is NEVER substituted with creation time.
 */
function readyToReleaseFlowTime(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  const flowTimes = [];
  let leftCensored = 0;
  let rightCensored = 0;
  let missingReady = 0;

  for (const [, list] of byTask) {
    const censored = isLeftCensored(list);
    // First trustworthy ready-entry: a task_state_changed/task_observed INTO ready
    // with a real occurred_at, and NOT left-censored.
    const readyEvent = list.find((e) => e.to_state === 'ready' && parseTime(e.occurred_at) !== null);
    const releaseEvent = list.find((e) => {
      if (e.event_type !== 'release_recorded') return false;
      const ev = e.release_evidence;
      return !!(ev && ev.verifier_pass === true && ev.post_deploy_verified === true);
    });

    if (censored || !readyEvent) {
      if (censored) leftCensored += 1;
      else missingReady += 1;
      continue;
    }
    if (!releaseEvent) {
      rightCensored += 1;
      continue;
    }

    const tReady = parseTime(readyEvent.occurred_at);
    const tRelease = parseTime(releaseEvent.occurred_at);
    if (tReady === null || tRelease === null) { missingReady += 1; continue; }
    if (tRelease < windowStartMs || tRelease > windowEndMs) continue;
    flowTimes.push(tRelease - tReady);
  }

  const summary = summarize(flowTimes);
  // Convert ms summaries to hours for readability, preserving INSUFFICIENT_DATA.
  const toHours = (v) => (v === INSUFFICIENT_DATA ? INSUFFICIENT_DATA : v / (3600 * 1000));
  return {
    eligible: flowTimes.length,
    left_censored_excluded: leftCensored,
    right_censored_excluded: rightCensored,
    missing_ready_excluded: missingReady,
    p50_hours: toHours(summary.p50),
    p85_hours: toHours(summary.p85),
    p95_hours: toHours(summary.p95),
  };
}

// ---------------------------------------------------------------------------
// M3: first-pass verification yield
// ---------------------------------------------------------------------------

/**
 * FPY = (tasks whose FIRST verification is PASS) / (tasks receiving a first
 * verification). Missing verifier evidence is NOT a pass. A repeated
 * verification counts as rework, not a first pass.
 */
function firstPassVerificationYield(events) {
  const byTask = indexByTask(events);
  let verified = 0;
  let firstPass = 0;
  for (const [, list] of byTask) {
    const verifications = list.filter((e) => e.event_type === 'verification_completed');
    if (verifications.length === 0) continue;
    verified += 1;
    const first = verifications[0];
    if (first.outcome === 'pass') firstPass += 1;
  }
  if (verified === 0) {
    return { verified_tasks: 0, first_pass: 0, fpy: INSUFFICIENT_DATA };
  }
  return { verified_tasks: verified, first_pass: firstPass, fpy: firstPass / verified };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** Arrivals: distinct task_created_observed / task_observed in window. */
function arrivals(events, { windowStartMs, windowEndMs }) {
  const seen = new Set();
  for (const e of events) {
    if (e.event_type !== 'task_created_observed' && e.event_type !== 'task_observed') continue;
    const t = parseTime(e.observed_at);
    if (t === null || t < windowStartMs || t > windowEndMs) continue;
    seen.add(e.task_id);
  }
  return { count: seen.size };
}

/** WIP by state at window end: last known normalized state per task. */
function wipByState(events, { windowEndMs }) {
  const byTask = indexByTask(events);
  const counts = {};
  for (const [, list] of byTask) {
    let lastState = 'unknown';
    for (const e of list) {
      const t = parseTime(e.occurred_at);
      if (t !== null && t <= windowEndMs && e.to_state) lastState = e.to_state;
    }
    counts[lastState] = (counts[lastState] || 0) + 1;
  }
  return counts;
}

/** Rework loops: count of needs_fix / repeated verification per task. */
function reworkLoops(events) {
  const byTask = indexByTask(events);
  let total = 0;
  const perTask = {};
  for (const [taskId, list] of byTask) {
    const needsFix = list.filter((e) => e.to_state === 'needs_fix' || (e.event_type === 'verification_completed' && e.outcome === 'fail')).length;
    if (needsFix > 0) {
      perTask[taskId] = needsFix;
      total += needsFix;
    }
  }
  return { total, tasks_with_rework: Object.keys(perTask).length };
}

/** Blocked age (ms) for tasks currently blocked at window end. */
function blockedAge(events, { windowEndMs }) {
  const byTask = indexByTask(events);
  const ages = [];
  for (const [, list] of byTask) {
    let blockedAt = null;
    let currentlyBlocked = false;
    for (const e of list) {
      if (e.event_type === 'task_blocked') { blockedAt = parseTime(e.occurred_at); currentlyBlocked = true; }
      else if (e.event_type === 'task_unblocked') { currentlyBlocked = false; blockedAt = null; }
    }
    if (currentlyBlocked && blockedAt !== null) {
      ages.push(windowEndMs - blockedAt);
    }
  }
  const summary = summarize(ages);
  const toHours = (v) => (v === INSUFFICIENT_DATA ? INSUFFICIENT_DATA : v / (3600 * 1000));
  return { currently_blocked: ages.length, oldest_hours: toHours(summary.max === undefined ? INSUFFICIENT_DATA : summary.max), p50_hours: toHours(summary.p50) };
}

// ---------------------------------------------------------------------------
// Little's Law: L = lambda * W, with preconditions and residual
// ---------------------------------------------------------------------------

/**
 * Little's Law reconciliation. Reports L (avg WIP), lambda (throughput), W
 * (avg flow time), residual L - lambda*W, the population definition, window,
 * and a coverage warning. A mechanically computable triple is NOT presented as
 * confident; if coverage is doubtful the warning says so.
 */
function littlesLaw({ avgWip, throughputPerWeek, avgFlowTimeWeeks, populationDefinition, windowLabel, coverageAdequate, coverageNote }) {
  const computable =
    typeof avgWip === 'number' &&
    typeof throughputPerWeek === 'number' &&
    typeof avgFlowTimeWeeks === 'number';

  if (!computable) {
    return {
      computable: false,
      L: avgWip ?? INSUFFICIENT_DATA,
      lambda: throughputPerWeek ?? INSUFFICIENT_DATA,
      W: avgFlowTimeWeeks ?? INSUFFICIENT_DATA,
      residual: INSUFFICIENT_DATA,
      population_definition: populationDefinition,
      window: windowLabel,
      coverage_warning: coverageNote || 'insufficient data to reconcile Little\'s Law',
    };
  }

  const expected = throughputPerWeek * avgFlowTimeWeeks;
  const residual = avgWip - expected;
  const warnings = [];
  if (!coverageAdequate) warnings.push(coverageNote || 'coverage inadequate; steady-state assumption doubtful');
  warnings.push('verify WIP, throughput, and flow time share the same population boundary');

  return {
    computable: true,
    L: avgWip,
    lambda: throughputPerWeek,
    W: avgFlowTimeWeeks,
    lambda_times_W: expected,
    residual,
    population_definition: populationDefinition,
    window: windowLabel,
    coverage_warning: warnings.join('; '),
  };
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

function observationCoverage(events, { windowStartMs, windowEndMs }) {
  if (!events.length) {
    return { state: INSUFFICIENT_DATA, first_observed_at: null, last_observed_at: null, event_count: 0 };
  }
  const times = events.map((e) => parseTime(e.observed_at)).filter((t) => t !== null);
  if (!times.length) return { state: INSUFFICIENT_DATA, first_observed_at: null, last_observed_at: null, event_count: events.length };
  const first = Math.min(...times);
  const last = Math.max(...times);
  const inWindow = times.filter((t) => t >= windowStartMs && t <= windowEndMs).length;
  return {
    state: inWindow > 0 ? 'complete' : 'partial',
    first_observed_at: new Date(first).toISOString(),
    last_observed_at: new Date(last).toISOString(),
    event_count: events.length,
    events_in_window: inWindow,
  };
}

module.exports = {
  INSUFFICIENT_DATA,
  quantile,
  summarize,
  indexByTask,
  verifiedReleaseThroughput,
  readyToReleaseFlowTime,
  firstPassVerificationYield,
  arrivals,
  wipByState,
  reworkLoops,
  blockedAge,
  littlesLaw,
  observationCoverage,
};

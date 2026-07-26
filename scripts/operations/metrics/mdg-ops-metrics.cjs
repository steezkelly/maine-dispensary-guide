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
 *
 * Returns measurement_state to distinguish:
 *   - measured_nonzero: releases in the window
 *   - measured_zero: instrumentation present (release_recorded events exist)
 *     but none in the window
 *   - instrumentation_missing: no release_recorded events anywhere in the
 *     event stream (the signal is absent, not zero activity)
 *
 * Also returns evidence_count, coverage_state, instrumentation_state, and
 * minimum_evidence_warning. Task IDs are gated behind includeTaskIds (default
 * false) to preserve privacy in ordinary console output.
 */
function verifiedReleaseThroughput(events, { windowStartMs, windowEndMs, includeTaskIds = false }) {
  const byTask = indexByTask(events);
  let releases = 0;
  const releaseTaskIds = [];
  let anyReleaseRecorded = false;

  for (const [taskId, list] of byTask) {
    const releaseEvent = list.find((e) => {
      if (e.event_type !== 'release_recorded') return false;
      anyReleaseRecorded = true;
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
  const windowWeeks = windowMs / (7 * 24 * 3600 * 1000);
  const ratePerWeek = windowWeeks > 0 ? releases / windowWeeks : INSUFFICIENT_DATA;
  const windowDays = windowMs / (24 * 3600 * 1000);

  // Measurement state
  let measurementState;
  let instrumentationState;
  if (!anyReleaseRecorded) {
    measurementState = 'instrumentation_missing';
    instrumentationState = 'no release_recorded events in event stream';
  } else if (releases === 0) {
    measurementState = 'measured_zero';
    instrumentationState = 'release_recorded events present';
  } else {
    measurementState = 'measured_nonzero';
    instrumentationState = 'release_recorded events present';
  }

  // Coverage state
  const coverageState = windowMs > 0 ? 'valid_window' : 'invalid_window';

  // Minimum-evidence warning
  const minimumEvidenceWarning = releases === 0 && anyReleaseRecorded
    ? 'zero releases in window; consider extending observation or checking instrumentation'
    : (releases > 0 && releases < 5 ? 'fewer than 5 releases; rate estimate has high variance' : null);

  const result = {
    releases,
    rate_per_week: ratePerWeek,
    window_days: windowDays,
    measurement_state: measurementState,
    evidence_count: releases,
    coverage_state: coverageState,
    instrumentation_state: instrumentationState,
    minimum_evidence_warning: minimumEvidenceWarning,
  };

  if (includeTaskIds) {
    result.releaseTaskIds = releaseTaskIds;
  }

  return result;
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
  // Arithmetic MEAN flow time (hours) for the same eligible population used by
  // the percentiles. Little's Law requires the arithmetic mean W, NOT a
  // percentile (OPS-06A-R1 finding A). P50/P85/P95 remain descriptive only.
  const meanHours = flowTimes.length
    ? flowTimes.reduce((acc, v) => acc + v, 0) / flowTimes.length / (3600 * 1000)
    : INSUFFICIENT_DATA;
  return {
    eligible: flowTimes.length,
    left_censored_excluded: leftCensored,
    right_censored_excluded: rightCensored,
    missing_ready_excluded: missingReady,
    mean_hours: meanHours,
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
 * Compute time-average WIP (L) over a window from the event trajectory.
 *
 * L = (1/T) ∫ WIP(t) dt, where WIP(t) is the count of tasks that have entered
 * the system (first ready-entry) but not yet exited (verified release or
 * terminal state) at time t.
 *
 * Returns { L, adequate_observation, note }. If the window is too short,
 * sparse, or unstable (e.g. no events, or all events at a single timestamp),
 * returns INSUFFICIENT_DATA rather than an approximation.
 */
function timeAverageWip(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  const windowMs = windowEndMs - windowStartMs;

  if (windowMs <= 0) {
    return { L: INSUFFICIENT_DATA, adequate_observation: false, note: 'invalid window (non-positive duration)' };
  }

  // Build entry/exit times for each task.
  const taskSpans = [];
  for (const [, list] of byTask) {
    // Entry: first ready-entry with a real timestamp.
    const readyEvent = list.find((e) => e.to_state === 'ready' && parseTime(e.occurred_at) !== null);
    if (!readyEvent) continue; // no trustworthy entry
    const entryTime = parseTime(readyEvent.occurred_at);

    // Exit: verified release OR terminal state (done/completed/accepted/released).
    let exitTime = null;
    for (const e of list) {
      const t = parseTime(e.occurred_at);
      if (t === null) continue;
      if (e.event_type === 'release_recorded') {
        const ev = e.release_evidence;
        if (ev && ev.verifier_pass === true && ev.post_deploy_verified === true) {
          exitTime = t;
          break;
        }
      }
      if (['done', 'completed', 'accepted', 'released'].includes(e.to_state)) {
        exitTime = t;
        break;
      }
    }

    // Clamp to window.
    const spanStart = Math.max(entryTime, windowStartMs);
    const spanEnd = exitTime !== null ? Math.min(exitTime, windowEndMs) : windowEndMs;
    if (spanStart < spanEnd) {
      taskSpans.push({ start: spanStart, end: spanEnd });
    }
  }

  if (taskSpans.length === 0) {
    return { L: INSUFFICIENT_DATA, adequate_observation: false, note: 'no tasks with trustworthy entry/exit in window' };
  }

  // Collect all event timestamps within the window to define time slices.
  const timestamps = new Set([windowStartMs, windowEndMs]);
  for (const span of taskSpans) {
    timestamps.add(span.start);
    timestamps.add(span.end);
  }
  const sortedTimes = [...timestamps].sort((a, b) => a - b);

  // For each slice [t_i, t_{i+1}], count active tasks and weight by duration.
  let weightedSum = 0;
  for (let i = 0; i < sortedTimes.length - 1; i++) {
    const sliceStart = sortedTimes[i];
    const sliceEnd = sortedTimes[i + 1];
    const sliceDuration = sliceEnd - sliceStart;
    if (sliceDuration <= 0) continue;

    // Count tasks active during this slice.
    let activeCount = 0;
    for (const span of taskSpans) {
      if (span.start <= sliceStart && span.end >= sliceEnd) {
        activeCount += 1;
      }
    }
    weightedSum += activeCount * sliceDuration;
  }

  const L = weightedSum / windowMs;

  // Adequate observation: at least 7 days, and at least 3 distinct event times.
  const windowDays = windowMs / (24 * 3600 * 1000);
  const adequateObservation = windowDays >= 7 && sortedTimes.length >= 3;

  return {
    L,
    adequate_observation: adequateObservation,
    note: adequateObservation
      ? 'time-average WIP computed from event trajectory'
      : `window ${windowDays.toFixed(1)} days, ${sortedTimes.length} event times; consider extending observation`,
  };
}

/**
 * Little's Law components for the V1 ready-to-verified-production-release
 * population, with a strict common-population boundary and fail-closed
 * coverage (OPS-06A-R1 findings B and C).
 *
 * Population boundary (L, lambda, and W share it):
 *   - Entry: trustworthy transition into `ready` with a real timestamp.
 *   - Exit: a verified `release_recorded` event with verifier_pass == true AND
 *     post_deploy_verified == true.
 *   - `accepted`, `card_completed`, `done`, `completed`, an ordinary `released`
 *     state, branch creation, merge, and HTTP success do NOT count as exits.
 *
 * Fail-closed (computable=false, residual=insufficient_data) when:
 *   - the opening WIP population is unknown (a task already in-system at the
 *     window start, or left-censored at start);
 *   - any task departs through a non-release terminal outcome (cancellation,
 *     abandonment, or a terminal state without a verified release) — non-release
 *     departures are never silently mixed into release throughput;
 *   - observation coverage is materially incomplete (window < 7 days or too few
 *     distinct timestamps);
 *   - any required component is missing.
 *
 * Returns explicit fields: opening_state_known, left_censored_at_start,
 * nonrelease_departures, coverage_state, boundary_compatible, computable,
 * insufficiency_reasons, plus L, lambda_per_week, W_hours, residual.
 */
function littlesLawComponents(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  const windowMs = windowEndMs - windowStartMs;

  const insufficiencyReasons = [];
  let openingStateKnown = true;
  let leftCensoredAtStart = 0;
  let nonreleaseDepartures = 0;
  let boundaryCompatible = true;

  const releaseSpans = [];
  let inFlightAtEnd = 0;
  let releasedInWindow = 0;
  const flowTimesMs = [];

  if (windowMs <= 0) {
    insufficiencyReasons.push('invalid window (non-positive duration)');
  }

  const NONRELEASE_TERMINAL = ['cancelled', 'canceled', 'abandoned', 'archived', 'rejected', 'card_completed', 'done', 'completed', 'accepted', 'released'];

  for (const [, list] of byTask) {
    const readyEvent = list.find((e) => e.to_state === 'ready' && parseTime(e.occurred_at) !== null);
    if (!readyEvent) continue; // no trustworthy entry into the modeled population
    const entryTime = parseTime(readyEvent.occurred_at);
    const leftCensored = isLeftCensored(list);

    const releaseEvent = list.find((e) => {
      if (e.event_type !== 'release_recorded') return false;
      const ev = e.release_evidence;
      return !!(ev && ev.verifier_pass === true && ev.post_deploy_verified === true);
    });
    const releaseTime = releaseEvent ? parseTime(releaseEvent.occurred_at) : null;

    // Non-release terminal departure: a terminal state reached WITHOUT a
    // verified release. accepted/card_completed/done/completed/released do not
    // independently count as releases for this population.
    let nonreleaseTerminalTime = null;
    for (const e of list) {
      if (releaseTime !== null) break; // a verified release supersedes
      const t = parseTime(e.occurred_at);
      if (t !== null && NONRELEASE_TERMINAL.includes(e.to_state)) {
        nonreleaseTerminalTime = t;
        break;
      }
    }

    // Opening-state detection: was this task already in-system at window start?
    if (entryTime < windowStartMs) {
      openingStateKnown = false; // in-system before window; true opening WIP unknown
      if (leftCensored) leftCensoredAtStart += 1;
    } else if (leftCensored) {
      leftCensoredAtStart += 1;
      openingStateKnown = false;
    }

    // Classify the departure.
    if (releaseTime !== null) {
      if (releaseTime >= windowStartMs && releaseTime <= windowEndMs) {
        releasedInWindow += 1;
        flowTimesMs.push(releaseTime - entryTime);
        releaseSpans.push({ start: Math.max(entryTime, windowStartMs), end: releaseTime });
      } else if (releaseTime > windowEndMs) {
        inFlightAtEnd += 1;
        releaseSpans.push({ start: Math.max(entryTime, windowStartMs), end: windowEndMs });
      }
    } else if (nonreleaseTerminalTime !== null && nonreleaseTerminalTime >= windowStartMs && nonreleaseTerminalTime <= windowEndMs) {
      nonreleaseDepartures += 1;
      boundaryCompatible = false;
    } else {
      inFlightAtEnd += 1;
      releaseSpans.push({ start: Math.max(entryTime, windowStartMs), end: windowEndMs });
    }
  }

  // Time-average WIP (L) over the release-population spans.
  let L = INSUFFICIENT_DATA;
  if (windowMs > 0 && releaseSpans.length) {
    const timestamps = new Set([windowStartMs, windowEndMs]);
    for (const span of releaseSpans) {
      timestamps.add(span.start);
      timestamps.add(span.end);
    }
    const sortedTimes = [...timestamps].sort((a, b) => a - b);
    let weightedSum = 0;
    for (let i = 0; i < sortedTimes.length - 1; i += 1) {
      const sliceStart = sortedTimes[i];
      const sliceEnd = sortedTimes[i + 1];
      const sliceDuration = sliceEnd - sliceStart;
      if (sliceDuration <= 0) continue;
      let activeCount = 0;
      for (const span of releaseSpans) {
        if (span.start <= sliceStart && span.end >= sliceEnd) activeCount += 1;
      }
      weightedSum += activeCount * sliceDuration;
    }
    L = weightedSum / windowMs;
  }

  // Coverage state: do NOT treat "at least one event in window" as complete.
  const windowDays = windowMs / (24 * 3600 * 1000);
  const distinctTimes = new Set(events.map((e) => parseTime(e.occurred_at)).filter((t) => t !== null && t >= windowStartMs && t <= windowEndMs)).size;
  let coverageState;
  if (windowMs <= 0) coverageState = 'invalid_window';
  else if (windowDays >= 7 && distinctTimes >= 3 && openingStateKnown) coverageState = 'adequate';
  else coverageState = 'inadequate';

  if (!boundaryCompatible) insufficiencyReasons.push(`${nonreleaseDepartures} non-release departure(s) in window; release-population boundary incompatible`);
  if (!openingStateKnown) insufficiencyReasons.push('opening WIP population unknown (task in-system at window start or left-censored at start)');
  if (coverageState !== 'adequate') insufficiencyReasons.push(`observation coverage ${coverageState} (window ${windowDays.toFixed(1)} days, ${distinctTimes} distinct timestamps)`);

  const lambdaPerWeek = windowMs > 0 ? releasedInWindow / (windowMs / (7 * 24 * 3600 * 1000)) : INSUFFICIENT_DATA;
  const WHours = flowTimesMs.length ? flowTimesMs.reduce((a, v) => a + v, 0) / flowTimesMs.length / (3600 * 1000) : INSUFFICIENT_DATA;

  const computable = boundaryCompatible && openingStateKnown && coverageState === 'adequate'
    && typeof L === 'number' && typeof lambdaPerWeek === 'number' && typeof WHours === 'number';

  let residual = INSUFFICIENT_DATA;
  if (computable) {
    const WWeeks = WHours / (24 * 7);
    residual = L - lambdaPerWeek * WWeeks;
  }

  return {
    population_definition: 'ready -> verified production release (verifier_pass && post_deploy_verified)',
    opening_state_known: openingStateKnown,
    left_censored_at_start: leftCensoredAtStart,
    nonrelease_departures: nonreleaseDepartures,
    in_flight_at_end: inFlightAtEnd,
    released_in_window: releasedInWindow,
    coverage_state: coverageState,
    boundary_compatible: boundaryCompatible,
    computable,
    insufficiency_reasons: insufficiencyReasons,
    L,
    lambda_per_week: lambdaPerWeek,
    W_hours: WHours,
    residual,
  };
}

/**
 * Little's Law reconciliation. Reports L (avg WIP), lambda (throughput), W
 * (avg flow time), residual L - lambda*W, the population definition, window,
 * and a coverage warning. A mechanically computable triple is NOT presented as
 * confident; if coverage is doubtful the warning says so.
 *
 * If L, lambda, or W is INSUFFICIENT_DATA, returns computable=false.
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
  timeAverageWip,
  littlesLawComponents,
  littlesLaw,
  observationCoverage,
};

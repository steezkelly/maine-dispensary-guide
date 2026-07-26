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
 * M1: verified production release throughput (OPS-06A-R2 finding B).
 *
 * The occurrence window (windowStartMs..windowEndMs) is applied on the release
 * event's occurred_at. `events` is expected to be the FULL validated history
 * (the caller loads it via ledger.listAll and applies the occurrence window
 * here); pre-window lifecycle history is therefore available and never silently
 * dropped (finding A).
 *
 * Measurement state (do NOT infer full-window instrumentation from a single
 * historical release event):
 *   - measured_nonzero: >=1 qualifying release in the occurrence window.
 *   - measured_zero: explicit instrumentation/collector coverage PROVES the
 *     release emitter was active throughout the requested window (a supplied,
 *     validated coverage contract with state 'complete' covering the window),
 *     AND no qualifying release occurred.
 *   - instrumentation_missing / insufficient_data: full-window instrumentation
 *     coverage cannot be proven. Zero-release windows FAIL CLOSED until OPS-06B
 *     supplies structured lifecycle-emission coverage evidence.
 *
 * `instrumentationCoverage` (optional) is a synthetic/validated coverage
 * contract: { state: 'complete'|'partial'|'unmeasured', window_start,
 * window_end, source }. The production source of this evidence is OPS-06B; R2
 * accepts a synthetic contract for testing and internal use only.
 */
function verifiedReleaseThroughput(events, { windowStartMs, windowEndMs, includeTaskIds = false, instrumentationCoverage = null }) {
  const byTask = indexByTask(events);
  let releases = 0;
  let releaseEventCount = 0;
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
      releaseEventCount += 1;
      releaseTaskIds.push(taskId);
    }
  }

  const windowMs = windowEndMs - windowStartMs;
  const windowWeeks = windowMs / (7 * 24 * 3600 * 1000);
  const windowDays = windowMs / (24 * 3600 * 1000);

  // Instrumentation coverage assessment (finding B).
  const insufficiencyReasons = [];
  let instrumentationCoverageState;
  let coverageWindow = null;
  let coverageProvesFullWindow = false;

  if (windowMs <= 0) {
    instrumentationCoverageState = 'invalid_window';
    insufficiencyReasons.push('invalid window (non-positive duration)');
  } else if (!instrumentationCoverage || typeof instrumentationCoverage !== 'object') {
    instrumentationCoverageState = 'unmeasured';
    insufficiencyReasons.push('no instrumentation/collector coverage evidence supplied');
  } else {
    const cState = instrumentationCoverage.state;
    const cStart = parseTime(instrumentationCoverage.window_start);
    const cEnd = parseTime(instrumentationCoverage.window_end);
    coverageWindow = `${instrumentationCoverage.window_start ?? '-'} .. ${instrumentationCoverage.window_end ?? '-'}`;
    const coversWindow = cStart !== null && cEnd !== null && cStart <= windowStartMs && cEnd >= windowEndMs;
    if (cState === 'complete' && coversWindow) {
      instrumentationCoverageState = 'complete';
      coverageProvesFullWindow = true;
    } else if (cState === 'partial') {
      instrumentationCoverageState = 'partial';
      insufficiencyReasons.push('instrumentation coverage is partial; full-window emitter activity not proven');
    } else {
      instrumentationCoverageState = cState === 'complete' ? 'complete_window_mismatch' : (cState || 'unmeasured');
      insufficiencyReasons.push(`instrumentation coverage (${instrumentationCoverageState}) does not prove full-window emitter activity`);
    }
  }

  // Measurement state.
  let measurementState;
  if (windowMs <= 0) {
    measurementState = 'insufficient_data';
  } else if (releases > 0) {
    measurementState = 'measured_nonzero';
  } else if (coverageProvesFullWindow) {
    measurementState = 'measured_zero';
  } else {
    measurementState = 'instrumentation_missing';
    if (!insufficiencyReasons.some((r) => /coverage/.test(r))) {
      insufficiencyReasons.push('zero releases in window but full-window instrumentation coverage not proven');
    }
  }

  const ratePerWeek = (measurementState === 'measured_nonzero' || measurementState === 'measured_zero') && windowWeeks > 0
    ? releases / windowWeeks
    : INSUFFICIENT_DATA;

  // Minimum-evidence warning.
  let minimumEvidenceWarning = null;
  if (measurementState === 'measured_nonzero' && releases < 5) {
    minimumEvidenceWarning = 'fewer than 5 releases; rate estimate has high variance';
  } else if (measurementState === 'measured_zero') {
    minimumEvidenceWarning = 'measured zero releases with proven full-window coverage';
  } else if (measurementState === 'instrumentation_missing') {
    minimumEvidenceWarning = 'cannot prove instrumentation; zero-release window fails closed (OPS-06B will supply coverage evidence)';
  }

  const result = {
    measurement_state: measurementState,
    releases,
    rate_per_week: ratePerWeek,
    release_event_count: releaseEventCount,
    instrumentation_coverage_state: instrumentationCoverageState,
    coverage_window: coverageWindow,
    window_days: windowDays,
    minimum_evidence_warning: minimumEvidenceWarning,
    insufficiency_reasons: insufficiencyReasons,
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
 * Ready-to-release flow time within the occurrence window (OPS-06A-R3 finding D).
 *
 * Completed primary cohort: tasks released INSIDE the window
 * (windowStartMs <= t_release <= windowEndMs). Flow time = t_release - t_ready.
 *
 * Right-censored (reported separately, excluded from the primary distribution):
 *   - tasks ready at or before window_end with NO release by window_end;
 *   - tasks whose release is AFTER window_end (a release after the cutoff counts
 *     as right-censored for that historical window — NOT silently dropped).
 *
 * Excluded from the historical report:
 *   - tasks entering ready AFTER window_end (not part of this window's report);
 *   - tasks completed (released) BEFORE window_start.
 *
 * Left-censored (unknown ready-entry) and missing-ready tasks remain explicit
 * in separate buckets. Missing ready time is NEVER substituted with creation.
 */
function readyToReleaseFlowTime(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  const flowTimes = [];
  let leftCensored = 0;
  let rightCensored = 0;
  let missingReady = 0;
  let enteredAfterWindow = 0;
  let completedBeforeWindow = 0;

  for (const [, list] of byTask) {
    const censored = isLeftCensored(list);
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

    const tReady = parseTime(readyEvent.occurred_at);
    if (tReady === null) { missingReady += 1; continue; }

    // Task entered ready after the window end -> excluded from this report.
    if (tReady > windowEndMs) { enteredAfterWindow += 1; continue; }

    const tRelease = releaseEvent ? parseTime(releaseEvent.occurred_at) : null;

    // Completed (released) before the window start -> excluded.
    if (tRelease !== null && tRelease < windowStartMs) { completedBeforeWindow += 1; continue; }

    // No release, or release after window end -> right-censored for this window.
    if (tRelease === null || tRelease > windowEndMs) { rightCensored += 1; continue; }

    // Released inside the window -> completed primary cohort.
    flowTimes.push(tRelease - tReady);
  }

  const summary = summarize(flowTimes);
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
    entered_after_window_excluded: enteredAfterWindow,
    completed_before_window_excluded: completedBeforeWindow,
    mean_hours: meanHours,
    p50_hours: toHours(summary.p50),
    p85_hours: toHours(summary.p85),
    p95_hours: toHours(summary.p95),
    windowed: true,
    basis: 'occurred_at',
  };
}

// ---------------------------------------------------------------------------
// M3: first-pass verification yield
// ---------------------------------------------------------------------------

/**
 * FPY = (tasks whose FIRST verification is PASS) / (tasks receiving a first
 * verification), within the occurrence window (OPS-06A-R3 finding D).
 *
 * - The denominator is tasks whose FIRST verification `occurred_at` is inside
 *   [windowStartMs, windowEndMs].
 * - A task whose first verification is AFTER the cutoff is absent from this
 *   historical report.
 * - Later verifications do NOT rewrite a historical first-pass result: the
 *   first verification fixes the outcome for that window.
 * - Missing verifier evidence is NOT a pass. A repeated verification counts as
 *   rework, not a first pass.
 * - Windowed metric.
 */
function firstPassVerificationYield(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  let verified = 0;
  let firstPass = 0;
  for (const [, list] of byTask) {
    const verifications = list.filter((e) => e.event_type === 'verification_completed');
    if (verifications.length === 0) continue;
    const first = verifications[0]; // indexByTask sorts per-task timelines by occurred_at
    const firstAt = parseTime(first.occurred_at);
    if (firstAt === null || firstAt < windowStartMs || firstAt > windowEndMs) continue; // first verification outside window
    verified += 1;
    if (first.outcome === 'pass') firstPass += 1;
  }
  if (verified === 0) {
    return { verified_tasks: 0, first_pass: 0, fpy: INSUFFICIENT_DATA, windowed: true, basis: 'occurred_at' };
  }
  return { verified_tasks: verified, first_pass: firstPass, fpy: firstPass / verified, windowed: true, basis: 'occurred_at' };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Arrivals within the occurrence window (OPS-06A-R3 finding D).
 *
 * - Uses `occurred_at` (NOT `observed_at`) — historical imports are assigned by
 *   occurred_at, so a card created in-window but imported later still counts.
 * - Counts `task_created_observed` ONLY. `task_observed` (a left-censored
 *   preexisting card first seen without a creation event) is EXCLUDED — it is
 *   not a genuine arrival in the window.
 * - Windowed metric: only creations whose occurred_at is inside
 *   [windowStartMs, windowEndMs] count.
 */
function arrivals(events, { windowStartMs, windowEndMs }) {
  const seen = new Set();
  for (const e of events) {
    if (e.event_type !== 'task_created_observed') continue;
    const t = parseTime(e.occurred_at);
    if (t === null || t < windowStartMs || t > windowEndMs) continue;
    seen.add(e.task_id);
  }
  return { count: seen.size, windowed: true, basis: 'occurred_at', event_type: 'task_created_observed' };
}

/**
 * WIP by state at the window-end cutoff (OPS-06A-R3 finding D).
 *
 * - Uses the latest state-bearing event at or before `windowEndMs`.
 * - Skips tasks with NO event at or before the cutoff — future-created tasks
 *   must not appear as `unknown` in a historical (windowed) report.
 * - Windowed metric: a future state change does not rewrite the cutoff view.
 */
function wipByState(events, { windowEndMs }) {
  const byTask = indexByTask(events);
  const counts = {};
  for (const [, list] of byTask) {
    let lastState = null;
    for (const e of list) {
      const t = parseTime(e.occurred_at);
      if (t !== null && t <= windowEndMs && e.to_state) lastState = e.to_state;
    }
    if (lastState === null) continue; // no state at/before cutoff -> not in this report
    counts[lastState] = (counts[lastState] || 0) + 1;
  }
  return counts;
}

/**
 * Rework loops within the occurrence window (OPS-06A-R3 finding D).
 *
 * - Counts `needs_fix` transitions and failed `verification_completed` events
 *   whose `occurred_at` is inside [windowStartMs, windowEndMs].
 * - Reports distinct affected tasks IN THE WINDOW — not lifetime rework under a
 *   windowed report label.
 * - Windowed metric: rework after the cutoff is not counted in this report.
 */
function reworkLoops(events, { windowStartMs, windowEndMs }) {
  const byTask = indexByTask(events);
  let total = 0;
  const perTask = {};
  for (const [taskId, list] of byTask) {
    const needsFix = list.filter((e) => {
      const t = parseTime(e.occurred_at);
      if (t === null || t < windowStartMs || t > windowEndMs) return false;
      return e.to_state === 'needs_fix' || (e.event_type === 'verification_completed' && e.outcome === 'fail');
    }).length;
    if (needsFix > 0) {
      perTask[taskId] = needsFix;
      total += needsFix;
    }
  }
  return { total, tasks_with_rework: Object.keys(perTask).length, windowed: true, basis: 'occurred_at' };
}

/**
 * Blocked age at the window-end cutoff (OPS-06A-R3 finding D).
 *
 * - Uses ONLY block/unblock transitions at or before `windowEndMs`.
 * - A FUTURE unblock (after the cutoff) must NOT rewrite an earlier historical
 *   report: a task blocked at the cutoff stays blocked in this report.
 * - A FUTURE block (after the cutoff) is ignored, so it cannot produce a
 *   negative age.
 * - Unknown blocked-entry time (blocked at the cutoff but no trustworthy
 *   task_blocked timestamp, e.g. first observed already blocked) is reported as
 *   `unknown_entry`, NOT a zero age.
 * - Windowed metric.
 */
function blockedAge(events, { windowEndMs }) {
  const byTask = indexByTask(events);
  const ages = [];
  let unknownEntry = 0;
  for (const [, list] of byTask) {
    let blockedAt = null;
    let currentlyBlocked = false;
    for (const e of list) {
      const t = parseTime(e.occurred_at);
      if (t === null || t > windowEndMs) continue; // only transitions at/before cutoff
      if (e.event_type === 'task_blocked') {
        blockedAt = t;
        currentlyBlocked = true;
      } else if (e.event_type === 'task_unblocked') {
        currentlyBlocked = false;
        blockedAt = null;
      } else if (e.to_state === 'blocked' && !currentlyBlocked) {
        // Observed entering blocked without a task_blocked timestamp -> unknown entry.
        currentlyBlocked = true;
        blockedAt = null;
      }
    }
    if (currentlyBlocked) {
      if (blockedAt !== null) ages.push(windowEndMs - blockedAt);
      else unknownEntry += 1; // unknown blocked-entry time -> unknown, not zero
    }
  }
  const summary = summarize(ages);
  const toHours = (v) => (v === INSUFFICIENT_DATA ? INSUFFICIENT_DATA : v / (3600 * 1000));
  return {
    currently_blocked: ages.length + unknownEntry,
    unknown_entry: unknownEntry,
    oldest_hours: toHours(summary.max === undefined ? INSUFFICIENT_DATA : summary.max),
    p50_hours: toHours(summary.p50),
    windowed: true,
    basis: 'occurred_at',
  };
}

// ---------------------------------------------------------------------------
// Little's Law: L = lambda * W, with preconditions and residual
// ---------------------------------------------------------------------------

/**
 * Little's Law components for the V1 ready-to-verified-production-release
 * population — the SINGLE authoritative implementation (OPS-06A-R2 finding C).
 *
 * `events` is the FULL validated history; the occurrence window
 * (windowStartMs..windowEndMs) is applied on occurred_at. Pre-window lifecycle
 * history is available and never silently dropped (finding A).
 *
 * Population boundary (L, lambda, and W share it):
 *   - Entry: trustworthy transition into `ready` with a real timestamp.
 *   - Exit: a verified `release_recorded` event with verifier_pass == true AND
 *     post_deploy_verified == true.
 *   - `accepted`, `card_completed`, `done`, `completed`, an ordinary `released`
 *     state, branch creation, merge, and HTTP success do NOT count as exits.
 *
 * Carry-in / opening-state rules (finding C):
 *   - A task FULLY COMPLETED (released or terminally departed) before the window
 *     start is IGNORED — it does not poison opening state.
 *   - A task ACTIVE at the window start (carry-in) is INCLUDED. If opening state
 *     is trustworthy (`openingStateTrustworthy=true`, i.e. a snapshot/coverage
 *     proves the in-system set at window start), it is counted without forcing
 *     computable=false. If opening state is NOT trustworthy, the result fails
 *     closed (computable=false) — a carry-in release can never silently
 *     disappear, but it cannot be reconciled without trustworthy opening WIP.
 *   - A task that releases inside the window but entered before it is NEVER
 *     silently dropped: its release and flow time are counted.
 *
 * Fail closed (computable=false, residual=insufficient_data) when:
 *   - the opening WIP population is not trustworthy;
 *   - any task departs through a non-release terminal outcome;
 *   - observation coverage is inadequate (window < 7 days or too few distinct
 *     timestamps) — "at least one event" is NOT complete coverage;
 *   - any required component is missing.
 *
 * W is the arithmetic mean flow time. Returns explicit fields:
 * opening_state_known, left_censored_at_start, nonrelease_departures,
 * in_flight_at_end, released_in_window, carry_in_releases, coverage_state,
 * boundary_compatible, computable, insufficiency_reasons, plus L,
 * lambda_per_week, W_hours, residual.
 */
function littlesLawComponents(events, { windowStartMs, windowEndMs, openingStateTrustworthy = false }) {
  const byTask = indexByTask(events);
  const windowMs = windowEndMs - windowStartMs;

  const insufficiencyReasons = [];
  let openingStateKnown = true;
  let leftCensoredAtStart = 0;
  let nonreleaseDepartures = 0;
  let boundaryCompatible = true;
  let carryInReleases = 0;

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

    // First non-release terminal departure time (without a verified release).
    let nonreleaseTerminalTime = null;
    for (const e of list) {
      if (releaseTime !== null) break; // a verified release supersedes
      const t = parseTime(e.occurred_at);
      if (t !== null && NONRELEASE_TERMINAL.includes(e.to_state)) {
        nonreleaseTerminalTime = t;
        break;
      }
    }

    // Departure time = verified release, else non-release terminal, else null
    // (still active / right-censored).
    const departureTime = releaseTime !== null ? releaseTime : nonreleaseTerminalTime;

    // IGNORE tasks fully completed before the window start: they do not poison
    // opening state and are not part of the windowed population (finding C).
    if (departureTime !== null && departureTime < windowStartMs) {
      continue;
    }

    const isCarryIn = entryTime < windowStartMs;

    // Opening-state handling for carry-in / left-censored tasks.
    if (isCarryIn) {
      if (leftCensored) leftCensoredAtStart += 1;
      if (!openingStateTrustworthy) {
        // A task active at window start with untrustworthy opening WIP fails
        // closed. It is still counted below (never silently dropped), but the
        // reconciliation cannot be claimed.
        openingStateKnown = false;
      }
    } else if (leftCensored) {
      leftCensoredAtStart += 1;
      openingStateKnown = false;
    }

    // Classify the departure (carry-in spans start at windowStartMs).
    const spanStart = Math.max(entryTime, windowStartMs);
    if (releaseTime !== null) {
      if (releaseTime >= windowStartMs && releaseTime <= windowEndMs) {
        releasedInWindow += 1;
        if (isCarryIn) carryInReleases += 1;
        flowTimesMs.push(releaseTime - entryTime);
        releaseSpans.push({ start: spanStart, end: releaseTime });
      } else if (releaseTime > windowEndMs) {
        inFlightAtEnd += 1;
        releaseSpans.push({ start: spanStart, end: windowEndMs });
      }
    } else if (nonreleaseTerminalTime !== null && nonreleaseTerminalTime >= windowStartMs && nonreleaseTerminalTime <= windowEndMs) {
      nonreleaseDepartures += 1;
      boundaryCompatible = false;
    } else {
      inFlightAtEnd += 1;
      releaseSpans.push({ start: spanStart, end: windowEndMs });
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
  if (!openingStateKnown) insufficiencyReasons.push('opening WIP population not trustworthy (carry-in or left-censored task at window start without trustworthy opening evidence)');
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
    carry_in_releases: carryInReleases,
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

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

/**
 * Observation/collection coverage (OPS-06A-R2 finding D).
 *
 * Coverage is about whether the OBSERVATION process actually covered the
 * window — NOT about whether some event happened to fall in it. The previous
 * rule "complete when inWindow > 0" is REMOVED: the mere presence of an event
 * in the window does not prove the observer was active throughout it.
 *
 * Coverage must be based on actual expected-observation evidence:
 *   - normalized snapshot observations;
 *   - observer heartbeat/attempt records;
 *   - explicit schedule/cadence evidence;
 *   - or a supplied, validated coverage contract.
 *
 * If the current ledger cannot prove cadence, the state is `unmeasured` (or
 * `insufficient_data` when there is nothing at all) — NEVER `complete`.
 *
 * `coverageEvidence` (optional) is a validated coverage contract:
 *   { state: 'complete'|'partial'|'unmeasured', window_start, window_end,
 *     source }. When supplied and it covers the window with state 'complete',
 *     coverage is reported as complete; otherwise it is partial/unmeasured.
 *
 * This keeps the top-level `coverage:` line consistent with the Little's Law
 * coverage field (both derive from real evidence, never from inWindow > 0).
 */
function observationCoverage(events, { windowStartMs, windowEndMs, coverageEvidence = null }) {
  const windowMs = windowEndMs - windowStartMs;
  const times = events.map((e) => parseTime(e.observed_at)).filter((t) => t !== null);
  const first = times.length ? Math.min(...times) : null;
  const last = times.length ? Math.max(...times) : null;
  const inWindow = times.filter((t) => t >= windowStartMs && t <= windowEndMs).length;

  const base = {
    first_observed_at: first !== null ? new Date(first).toISOString() : null,
    last_observed_at: last !== null ? new Date(last).toISOString() : null,
    event_count: events.length,
    events_in_window: inWindow,
  };

  if (windowMs <= 0) {
    return { ...base, state: 'invalid_window', coverage_source: null };
  }

  // Evidence-based coverage. Without a validated coverage contract proving
  // cadence across the window, coverage is unmeasured — never complete.
  if (coverageEvidence && typeof coverageEvidence === 'object') {
    const cStart = parseTime(coverageEvidence.window_start);
    const cEnd = parseTime(coverageEvidence.window_end);
    const coversWindow = cStart !== null && cEnd !== null && cStart <= windowStartMs && cEnd >= windowEndMs;
    if (coverageEvidence.state === 'complete' && coversWindow) {
      return { ...base, state: 'complete', coverage_source: coverageEvidence.source || 'supplied_contract' };
    }
    if (coverageEvidence.state === 'partial' || (coverageEvidence.state === 'complete' && !coversWindow)) {
      return { ...base, state: 'partial', coverage_source: coverageEvidence.source || 'supplied_contract' };
    }
    return { ...base, state: 'unmeasured', coverage_source: coverageEvidence.source || 'supplied_contract' };
  }

  // No coverage contract: the ledger alone cannot prove cadence.
  if (!events.length) {
    return { ...base, state: INSUFFICIENT_DATA, coverage_source: null };
  }
  return { ...base, state: 'unmeasured', coverage_source: null };
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
  littlesLawComponents,
  observationCoverage,
};

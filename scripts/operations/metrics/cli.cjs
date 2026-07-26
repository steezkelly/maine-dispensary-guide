#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations metrics CLI.
 *
 *   npm run ops:metrics -- --from <ISO> --to <ISO> [--format summary|json]
 *     [--detailed <path>] [--instrumentation-coverage <json>]
 *     [--coverage-evidence <json>] [--opening-state-evidence <json>]
 *
 * Window semantics (OPS-06A-R2-A, R3-D):
 *   - The COMPLETE validated event history is loaded (ledger.listAll). Pre-window
 *     lifecycle history is never silently discarded.
 *   - --from/--to define the OPERATIONAL OCCURRENCE WINDOW, applied on event
 *     occurred_at by EVERY reported metric (rate, release, flow-time, FPY,
 *     rework, WIP-by-state, blocked-age). observed_at is used ONLY for
 *     observation/collection coverage, never to truncate lifecycle history.
 *
 * Versioned, type-safe coverage contracts (R3-A, R3-B):
 *   - --instrumentation-coverage <json>: a validated coverage contract of kind
 *     `release_emitter` proving the release emitter was active across the
 *     window. Without it, zero-release windows fail closed
 *     (instrumentation_missing). Production source: OPS-06B.
 *   - --coverage-evidence <json>: a validated coverage contract of kind
 *     `observation`. Without it, observation coverage is reported as unmeasured
 *     (never "complete" merely because an event fell in the window).
 *   - --opening-state-evidence <json>: a validated coverage contract of kind
 *     `opening_state` proving the active in-system set at the window start.
 *     Little's Law may be computable ONLY when validated `observation` coverage
 *     is complete AND validated `opening_state` evidence proves the opening
 *     in-system set AND all other population/censoring/math preconditions hold.
 *     The bare --opening-state-trustworthy assertion was REMOVED (R3-B).
 *   All contracts are validated against mdg-operations-coverage-v1 (schema
 *   discriminator, kind, state enum, UTC window with start<end, non-empty
 *   source, kind-mismatch guards, strict field allowlist). Lifecycle-event
 *   density is NOT observation coverage.
 *
 * Reads ONLY the validated private event store (OPS-02 ledger). Prints
 * aggregates only (console). Task-level detail is never emitted to stdout
 * unless --detailed <path> is provided, which writes a detailed report
 * (including task IDs) to a fail-closed-validated path beneath MDG_OPS_ROOT
 * with owner-only permissions (shared private-output helper, findings E/F).
 *
 * Never writes to Hermes, Git, or the Hub.
 */

const path = require('node:path');
const fs = require('node:fs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');
const metrics = require('./mdg-ops-metrics.cjs');
const privateOutput = require('../private/mdg-ops-private-output.cjs');
const coverageContract = require('../coverage/mdg-ops-coverage-contract.cjs');

function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${a}`);
      args.set(key, value);
      i += 1;
    }
  }
  return args;
}

/**
 * Load and VALIDATE a versioned coverage contract of a required kind from a
 * private path beneath MDG_OPS_ROOT (R3-A). Fail-closed: rejects unsafe
 * paths/symlinks/permissions (shared helper) and any contract that fails
 * structural validation or the kind-mismatch guard. JSON.parse alone is NOT
 * validation.
 */
function loadCoverageContract(root, contractPath, requiredKind, label) {
  const safePath = privateOutput.validatePrivateReadPath(root, contractPath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(safePath, 'utf8'));
  } catch (err) {
    throw new Error(`OPS_${label}_INVALID: cannot parse ${label} contract: ${err.message}`);
  }
  const result = coverageContract.requireKind(parsed, requiredKind);
  if (!result.ok) {
    throw new Error(`OPS_${label}_INVALID: ${label} contract failed validation: ${result.errors.join('; ')}`);
  }
  return result.contract;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot();
  const root = ledger.resolveRoot({ repoRoot });
  const from = args.get('from');
  const to = args.get('to');
  const format = args.get('format') || 'summary';
  const detailedPath = args.get('detailed');

  const windowStartMs = from ? Date.parse(from) : 0;
  const windowEndMs = to ? Date.parse(to) : Date.now();
  const window = { windowStartMs, windowEndMs };

  // R2-A: load the COMPLETE validated history (no observed_at truncation).
  const rows = ledger.listAll(root);
  const events = rows.map((r) => r.event);

  // Optional VALIDATED, type-specific coverage contracts (R3-A, R3-B).
  const instrumentationCoveragePath = args.get('instrumentation-coverage');
  const coverageEvidencePath = args.get('coverage-evidence');
  const openingStateEvidencePath = args.get('opening-state-evidence');
  const instrumentationCoverage = instrumentationCoveragePath
    ? loadCoverageContract(root, instrumentationCoveragePath, 'release_emitter', 'INSTRUMENTATION_COVERAGE')
    : null;
  const coverageEvidence = coverageEvidencePath
    ? loadCoverageContract(root, coverageEvidencePath, 'observation', 'COVERAGE_EVIDENCE')
    : null;
  const openingStateEvidence = openingStateEvidencePath
    ? loadCoverageContract(root, openingStateEvidencePath, 'opening_state', 'OPENING_STATE_EVIDENCE')
    : null;

  // R3-B: Little's Law binds to the SAME validated evidence. Observation coverage
  // is complete only with a validated `observation` contract spanning the window;
  // opening state is trustworthy only with a validated `opening_state` contract
  // spanning the window. Lifecycle density is never sufficient.
  const observationCoverageComplete = !!(coverageEvidence && coverageContract.coversWindow(coverageEvidence, windowStartMs, windowEndMs));
  const openingStateTrustworthy = !!(openingStateEvidence && coverageContract.coversWindow(openingStateEvidence, windowStartMs, windowEndMs));

  // Determine whether to include task IDs (only in detailed mode).
  const includeTaskIds = !!detailedPath;

  const report = {
    window: { from: from || null, to: to || null, semantics: 'occurrence (occurred_at); observed_at used for coverage only' },
    coverage: metrics.observationCoverage(events, { ...window, coverageEvidence }),
    arrivals: metrics.arrivals(events, window),
    verified_release_throughput: metrics.verifiedReleaseThroughput(events, { ...window, includeTaskIds, instrumentationCoverage }),
    ready_to_release_flow_time: metrics.readyToReleaseFlowTime(events, window),
    first_pass_verification_yield: metrics.firstPassVerificationYield(events, window),
    wip_by_state: metrics.wipByState(events, window),
    rework_loops: metrics.reworkLoops(events, window),
    blocked_age: metrics.blockedAge(events, window),
  };

  // Little's Law: the single authoritative ready->verified-release
  // implementation (R2-C, R3-B, R3-C). W is the arithmetic mean flow time.
  // Computable ONLY with validated complete observation coverage AND validated
  // opening-state evidence AND all population/censoring/math preconditions.
  report.littles_law = metrics.littlesLawComponents(events, { ...window, openingStateTrustworthy, observationCoverageComplete });

  // Detailed mode: write through the shared fail-closed private-output helper
  // (findings E/F). chmod stops at the private root; 0700 dirs; 0600 file.
  if (detailedPath) {
    privateOutput.writePrivateFile(root, detailedPath, `${JSON.stringify(report, null, 2)}\n`, repoRoot);
    process.stdout.write(`detailed report written beneath private root (owner-only)\n`);
  }

  if (format === 'json') {
    // Strip task IDs from stdout JSON (they are only in the detailed file).
    const stdoutReport = JSON.parse(JSON.stringify(report));
    if (stdoutReport.verified_release_throughput.releaseTaskIds) {
      delete stdoutReport.verified_release_throughput.releaseTaskIds;
    }
    process.stdout.write(`${JSON.stringify(stdoutReport, null, 2)}\n`);
  } else {
    process.stdout.write(`${summarizeReport(report)}\n`);
  }
}

function summarizeReport(r) {
  const lines = [];
  lines.push(`MDG operations metrics — occurrence window ${r.window.from || '-inf'} .. ${r.window.to || 'now'}`);
  lines.push(`window semantics: ALL metrics below are occurrence-window metrics (basis: occurred_at) unless labeled lifetime; observed_at is used only for coverage`);
  lines.push(`coverage: ${r.coverage.state} (source: ${r.coverage.coverage_source || 'none'}; ${r.coverage.event_count} events, ${r.coverage.events_in_window ?? 0} in window)`);
  lines.push(`arrivals [windowed]: ${r.arrivals.count} (task_created_observed by occurred_at; excludes task_observed/left-censored preexisting)`);
  const m1 = r.verified_release_throughput;
  lines.push(`verified releases [windowed]: ${m1.releases} (rate/week: ${fmt(m1.rate_per_week)}) [${m1.measurement_state}; instrumentation: ${m1.instrumentation_coverage_state}]`);
  if (m1.minimum_evidence_warning) {
    lines.push(`  warning: ${m1.minimum_evidence_warning}`);
  }
  if (m1.insufficiency_reasons && m1.insufficiency_reasons.length) {
    lines.push(`  insufficiency: ${m1.insufficiency_reasons.join('; ')}`);
  }
  const ft = r.ready_to_release_flow_time;
  lines.push(`flow time hours [windowed]: mean=${fmt(ft.mean_hours)} p50=${fmt(ft.p50_hours)} p85=${fmt(ft.p85_hours)} p95=${fmt(ft.p95_hours)} (eligible=${ft.eligible}, left-censored=${ft.left_censored_excluded}, right-censored=${ft.right_censored_excluded}, missing-ready=${ft.missing_ready_excluded}, entered-after-window=${ft.entered_after_window_excluded}, completed-before-window=${ft.completed_before_window_excluded})`);
  lines.push(`first-pass yield [windowed]: ${fmt(r.first_pass_verification_yield.fpy)} (${r.first_pass_verification_yield.first_pass}/${r.first_pass_verification_yield.verified_tasks}; first verification in window)`);
  lines.push(`wip by state [at window-end cutoff]: ${JSON.stringify(r.wip_by_state)}`);
  lines.push(`rework loops [windowed]: ${r.rework_loops.total} across ${r.rework_loops.tasks_with_rework} tasks (needs_fix/failed-verification by occurred_at in window)`);
  lines.push(`blocked [at window-end cutoff]: ${r.blocked_age.currently_blocked} (oldest hours: ${fmt(r.blocked_age.oldest_hours)}, unknown-entry: ${r.blocked_age.unknown_entry ?? 0})`);
  const ll = r.littles_law;
  lines.push(`Little's Law [windowed]: computable=${ll.computable} L=${fmt(ll.L)} lambda/week=${fmt(ll.lambda_per_week)} W_hours=${fmt(ll.W_hours)} residual=${fmt(ll.residual)}`);
  lines.push(`  population: ${ll.population_definition}`);
  lines.push(`  coverage=${ll.coverage_state} (derived from the same observation contract as the top-level coverage line) boundary_compatible=${ll.boundary_compatible} opening_state_known=${ll.opening_state_known} opening_state_complete=${ll.opening_state_complete} flow_time_population_complete=${ll.flow_time_population_complete}`);
  lines.push(`  carry_in_releases=${ll.carry_in_releases} nonrelease_departures=${ll.nonrelease_departures} left_censored_at_start=${ll.left_censored_at_start} active_left_censored_without_entry=${ll.active_left_censored_without_entry} unknown_entry_tasks=${ll.unknown_entry_tasks} in_flight_at_end=${ll.in_flight_at_end}`);
  if (ll.insufficiency_reasons && ll.insufficiency_reasons.length) {
    lines.push(`  insufficiency: ${ll.insufficiency_reasons.join('; ')}`);
  }
  return lines.join('\n');
}

function fmt(v) {
  if (v === metrics.INSUFFICIENT_DATA) return 'insufficient_data';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  return String(v);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}

#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations metrics CLI.
 *
 *   npm run ops:metrics -- --from <ISO> --to <ISO> [--format summary|json]
 *     [--detailed <path>] [--instrumentation-coverage <json>]
 *     [--coverage-evidence <json>] [--opening-state-trustworthy]
 *
 * Window semantics (OPS-06A-R2 finding A):
 *   - The COMPLETE validated event history is loaded (ledger.listAll). Pre-window
 *     lifecycle history is never silently discarded.
 *   - --from/--to define the OPERATIONAL OCCURRENCE WINDOW, applied on event
 *     occurred_at by the metric functions (rate, release, flow-time, queue).
 *   - observed_at is used ONLY for observation/collection coverage, never to
 *     truncate lifecycle history.
 *
 * Coverage / instrumentation contracts (findings B and D):
 *   - --instrumentation-coverage <json>: a validated coverage contract proving
 *     the release emitter was active across the window. Without it, zero-release
 *     windows fail closed (instrumentation_missing). Production source: OPS-06B.
 *   - --coverage-evidence <json>: a validated observation-coverage contract.
 *     Without it, observation coverage is reported as unmeasured (never
 *     "complete" merely because an event fell in the window).
 *   - --opening-state-trustworthy: asserts a trustworthy opening-WIP snapshot at
 *     window start, allowing carry-in tasks to be reconciled by Little's Law.
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
  const flags = new Set(['opening-state-trustworthy']);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (flags.has(key)) {
        args.set(key, true);
        continue;
      }
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${a}`);
      args.set(key, value);
      i += 1;
    }
  }
  return args;
}

/**
 * Load a validated JSON contract from a private path beneath MDG_OPS_ROOT.
 * Fail-closed: rejects unsafe paths/symlinks/permissions (shared helper).
 */
function loadPrivateContract(root, contractPath, label) {
  const safePath = privateOutput.validatePrivateReadPath(root, contractPath);
  try {
    return JSON.parse(fs.readFileSync(safePath, 'utf8'));
  } catch (err) {
    throw new Error(`OPS_${label}_INVALID: cannot parse ${label} contract at ${contractPath}: ${err.message}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot();
  const root = ledger.resolveRoot({ repoRoot });
  const from = args.get('from');
  const to = args.get('to');
  const format = args.get('format') || 'summary';
  const detailedPath = args.get('detailed');
  const openingStateTrustworthy = args.get('opening-state-trustworthy') === true;

  const windowStartMs = from ? Date.parse(from) : 0;
  const windowEndMs = to ? Date.parse(to) : Date.now();
  const window = { windowStartMs, windowEndMs };

  // R2-A: load the COMPLETE validated history (no observed_at truncation).
  const rows = ledger.listAll(root);
  const events = rows.map((r) => r.event);

  // Optional validated coverage contracts (findings B and D).
  const instrumentationCoveragePath = args.get('instrumentation-coverage');
  const coverageEvidencePath = args.get('coverage-evidence');
  const instrumentationCoverage = instrumentationCoveragePath
    ? loadPrivateContract(root, instrumentationCoveragePath, 'INSTRUMENTATION_COVERAGE')
    : null;
  const coverageEvidence = coverageEvidencePath
    ? loadPrivateContract(root, coverageEvidencePath, 'COVERAGE_EVIDENCE')
    : null;

  // Determine whether to include task IDs (only in detailed mode).
  const includeTaskIds = !!detailedPath;

  const report = {
    window: { from: from || null, to: to || null, semantics: 'occurrence (occurred_at); observed_at used for coverage only' },
    coverage: metrics.observationCoverage(events, { ...window, coverageEvidence }),
    arrivals: metrics.arrivals(events, window),
    verified_release_throughput: metrics.verifiedReleaseThroughput(events, { ...window, includeTaskIds, instrumentationCoverage }),
    ready_to_release_flow_time: metrics.readyToReleaseFlowTime(events, window),
    first_pass_verification_yield: metrics.firstPassVerificationYield(events),
    wip_by_state: metrics.wipByState(events, window),
    rework_loops: metrics.reworkLoops(events),
    blocked_age: metrics.blockedAge(events, window),
  };

  // Little's Law: the single authoritative ready->verified-release
  // implementation (R2-C). W is the arithmetic mean flow time. Fails closed on
  // inadequate coverage, untrustworthy opening WIP, or non-release departures.
  report.littles_law = metrics.littlesLawComponents(events, { ...window, openingStateTrustworthy });

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
  lines.push(`coverage: ${r.coverage.state} (source: ${r.coverage.coverage_source || 'none'}; ${r.coverage.event_count} events, ${r.coverage.events_in_window ?? 0} in window)`);
  lines.push(`arrivals: ${r.arrivals.count}`);
  const m1 = r.verified_release_throughput;
  lines.push(`verified releases: ${m1.releases} (rate/week: ${fmt(m1.rate_per_week)}) [${m1.measurement_state}; instrumentation: ${m1.instrumentation_coverage_state}]`);
  if (m1.minimum_evidence_warning) {
    lines.push(`  warning: ${m1.minimum_evidence_warning}`);
  }
  if (m1.insufficiency_reasons && m1.insufficiency_reasons.length) {
    lines.push(`  insufficiency: ${m1.insufficiency_reasons.join('; ')}`);
  }
  const ft = r.ready_to_release_flow_time;
  lines.push(`flow time hours: mean=${fmt(ft.mean_hours)} p50=${fmt(ft.p50_hours)} p85=${fmt(ft.p85_hours)} p95=${fmt(ft.p95_hours)} (eligible=${ft.eligible}, left-censored=${ft.left_censored_excluded}, right-censored=${ft.right_censored_excluded}, missing-ready=${ft.missing_ready_excluded})`);
  lines.push(`first-pass yield: ${fmt(r.first_pass_verification_yield.fpy)} (${r.first_pass_verification_yield.first_pass}/${r.first_pass_verification_yield.verified_tasks})`);
  lines.push(`wip by state: ${JSON.stringify(r.wip_by_state)}`);
  lines.push(`rework loops: ${r.rework_loops.total} across ${r.rework_loops.tasks_with_rework} tasks`);
  lines.push(`blocked: ${r.blocked_age.currently_blocked} (oldest hours: ${fmt(r.blocked_age.oldest_hours)})`);
  const ll = r.littles_law;
  lines.push(`Little's Law: computable=${ll.computable} L=${fmt(ll.L)} lambda/week=${fmt(ll.lambda_per_week)} W_hours=${fmt(ll.W_hours)} residual=${fmt(ll.residual)}`);
  lines.push(`  population: ${ll.population_definition}`);
  lines.push(`  coverage=${ll.coverage_state} boundary_compatible=${ll.boundary_compatible} opening_state_known=${ll.opening_state_known} carry_in_releases=${ll.carry_in_releases} nonrelease_departures=${ll.nonrelease_departures} left_censored_at_start=${ll.left_censored_at_start} in_flight_at_end=${ll.in_flight_at_end}`);
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

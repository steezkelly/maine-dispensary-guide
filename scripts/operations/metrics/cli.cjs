#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations metrics CLI.
 *
 *   npm run ops:metrics -- --from <ISO> --to <ISO> [--format summary|json] [--detailed <path>]
 *
 * Reads ONLY the validated private event store (OPS-02 ledger). Prints
 * aggregates only (console). Task-level detail is never emitted to stdout
 * unless --detailed <path> is provided, which writes a detailed report
 * (including task IDs) to the specified path beneath MDG_OPS_ROOT with
 * owner-only permissions.
 *
 * Never writes to Hermes, Git, or the Hub.
 */

const path = require('node:path');
const fs = require('node:fs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');
const metrics = require('./mdg-ops-metrics.cjs');

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
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${a}`);
      args.set(a.slice(2), value);
      i += 1;
    }
  }
  return args;
}

/**
 * Fail-closed private-output path validation (OPS-06A-R1 finding F), equivalent
 * to the ledger's safety model. Rejects:
 *   - a repository-local destination;
 *   - an output path whose existing symlink ancestor escapes MDG_OPS_ROOT;
 *   - an output file that is itself an unsafe symlink;
 * and ensures parent directories remain beneath the real private root.
 * Returns the resolved absolute path (beneath the real root).
 */
function validatePrivateOutputPath(root, detailedPath, repoRoot) {
  const realRoot = fs.realpathSync(path.resolve(root));
  const resolved = path.resolve(detailedPath);

  // Lexical containment first (catches `..` escapes without touching the fs).
  if (resolved !== realRoot && !resolved.startsWith(realRoot + path.sep)) {
    throw new Error(`OPS_OUTPUT_ESCAPE: output path ${detailedPath} is not beneath private root ${realRoot}`);
  }

  // Reject a repository-local destination.
  if (repoRoot) {
    const realRepo = fs.realpathSync(path.resolve(repoRoot));
    if (resolved === realRepo || resolved.startsWith(realRepo + path.sep)) {
      throw new Error(`OPS_OUTPUT_INSIDE_REPO: output path ${detailedPath} is inside repository ${realRepo}`);
    }
  }

  // Reject an output file that is itself an unsafe symlink.
  if (fs.existsSync(resolved)) {
    const st = fs.lstatSync(resolved);
    if (st.isSymbolicLink()) {
      const linkReal = fs.realpathSync(resolved);
      if (linkReal !== realRoot && !linkReal.startsWith(realRoot + path.sep)) {
        throw new Error(`OPS_OUTPUT_SYMLINK_ESCAPE: output file ${detailedPath} is a symlink escaping the private root`);
      }
    }
  }

  // Reject an existing symlink ancestor that escapes the private root.
  let cursor = path.dirname(resolved);
  while (cursor !== path.dirname(cursor)) {
    if (fs.existsSync(cursor)) {
      const realAncestor = fs.realpathSync(cursor);
      if (realAncestor !== realRoot && !realAncestor.startsWith(realRoot + path.sep) && !realRoot.startsWith(realAncestor + path.sep)) {
        throw new Error(`OPS_OUTPUT_ANCESTOR_ESCAPE: ancestor ${cursor} resolves outside the private root`);
      }
    }
    cursor = path.dirname(cursor);
  }

  return resolved;
}

/**
 * Write the detailed report through a temporary owner-only file and atomic
 * rename. Parent directories are created 0700; the final file is 0600 even when
 * replacing a pre-existing 0644 file. Never prints task IDs or report bodies.
 */
function writePrivateReport(filePath, report) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  let cursor = dir;
  while (cursor && cursor !== path.dirname(cursor)) {
    try { fs.chmodSync(cursor, 0o700); } catch { /* ignore */ }
    cursor = path.dirname(cursor);
  }
  const tmp = path.join(dir, `.tmp.${process.pid}.${require('node:crypto').randomBytes(6).toString('hex')}`);
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, filePath);
    fs.chmodSync(filePath, 0o600); // enforce 0600 even over a pre-existing 0644
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* tmp may not exist after rename */ }
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

  const windowStartMs = from ? Date.parse(from) : 0;
  const windowEndMs = to ? Date.parse(to) : Date.now();
  const window = { windowStartMs, windowEndMs };

  const rows = ledger.list(root, { from, to });
  const events = rows.map((r) => r.event);

  // Determine whether to include task IDs (only in detailed mode).
  const includeTaskIds = !!detailedPath;

  const report = {
    window: { from: from || null, to: to || null },
    coverage: metrics.observationCoverage(events, window),
    arrivals: metrics.arrivals(events, window),
    verified_release_throughput: metrics.verifiedReleaseThroughput(events, { ...window, includeTaskIds }),
    ready_to_release_flow_time: metrics.readyToReleaseFlowTime(events, window),
    first_pass_verification_yield: metrics.firstPassVerificationYield(events),
    wip_by_state: metrics.wipByState(events, window),
    rework_loops: metrics.reworkLoops(events),
    blocked_age: metrics.blockedAge(events, window),
  };

  // Little's Law: use the strict ready->verified-release population components
  // (OPS-06A-R1 findings B and C). W is the arithmetic mean flow time, NOT a
  // percentile (finding A). Fails closed on inadequate coverage, unknown
  // opening WIP, or non-release departures.
  report.littles_law = metrics.littlesLawComponents(events, window);

  // Detailed mode: write to a fail-closed-validated path beneath the real
  // private root (MDG_OPS_ROOT) with owner-only permissions (finding F).
  if (detailedPath) {
    const safePath = validatePrivateOutputPath(root, detailedPath, repoRoot);
    writePrivateReport(safePath, report);
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
  lines.push(`MDG operations metrics — window ${r.window.from || '-inf'} .. ${r.window.to || 'now'}`);
  lines.push(`coverage: ${r.coverage.state} (${r.coverage.event_count} events, ${r.coverage.events_in_window ?? 0} in window)`);
  lines.push(`arrivals: ${r.arrivals.count}`);
  const m1 = r.verified_release_throughput;
  lines.push(`verified releases: ${m1.releases} (rate/week: ${fmt(m1.rate_per_week)}) [${m1.measurement_state}]`);
  if (m1.minimum_evidence_warning) {
    lines.push(`  warning: ${m1.minimum_evidence_warning}`);
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
  lines.push(`  coverage=${ll.coverage_state} boundary_compatible=${ll.boundary_compatible} opening_state_known=${ll.opening_state_known} nonrelease_departures=${ll.nonrelease_departures} left_censored_at_start=${ll.left_censored_at_start} in_flight_at_end=${ll.in_flight_at_end}`);
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

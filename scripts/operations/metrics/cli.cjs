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

  // Little's Law: use time-average WIP (L) from the event trajectory.
  const timeAvgWip = metrics.timeAverageWip(events, window);
  const throughput = report.verified_release_throughput.rate_per_week;
  const flowP50 = report.ready_to_release_flow_time.p50_hours;
  const avgFlowWeeks = typeof flowP50 === 'number' ? flowP50 / (24 * 7) : null;

  report.littles_law = metrics.littlesLaw({
    avgWip: typeof timeAvgWip.L === 'number' ? timeAvgWip.L : null,
    throughputPerWeek: typeof throughput === 'number' ? throughput : null,
    avgFlowTimeWeeks: avgFlowWeeks,
    populationDefinition: 'tasks with trustworthy ready-entry and verified release in window',
    windowLabel: `${from || '-inf'} .. ${to || 'now'}`,
    coverageAdequate: timeAvgWip.adequate_observation && report.coverage.state === 'complete',
    coverageNote: timeAvgWip.note,
  });

  // Detailed mode: write to file under MDG_OPS_ROOT with owner-only permissions.
  if (detailedPath) {
    const resolved = path.resolve(detailedPath);
    const rootResolved = path.resolve(root);
    if (!resolved.startsWith(rootResolved + path.sep)) {
      throw new Error(`--detailed path must be beneath MDG_OPS_ROOT (${root})`);
    }
    fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    process.stdout.write(`detailed report written to ${resolved} (owner-only)\n`);
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
  lines.push(`flow time hours: p50=${fmt(ft.p50_hours)} p85=${fmt(ft.p85_hours)} p95=${fmt(ft.p95_hours)} (eligible=${ft.eligible}, left-censored=${ft.left_censored_excluded}, right-censored=${ft.right_censored_excluded}, missing-ready=${ft.missing_ready_excluded})`);
  lines.push(`first-pass yield: ${fmt(r.first_pass_verification_yield.fpy)} (${r.first_pass_verification_yield.first_pass}/${r.first_pass_verification_yield.verified_tasks})`);
  lines.push(`wip by state: ${JSON.stringify(r.wip_by_state)}`);
  lines.push(`rework loops: ${r.rework_loops.total} across ${r.rework_loops.tasks_with_rework} tasks`);
  lines.push(`blocked: ${r.blocked_age.currently_blocked} (oldest hours: ${fmt(r.blocked_age.oldest_hours)})`);
  const ll = r.littles_law;
  lines.push(`Little's Law: computable=${ll.computable} L=${fmt(ll.L)} lambda=${fmt(ll.lambda)} W=${fmt(ll.W)} residual=${fmt(ll.residual)}`);
  lines.push(`  population: ${ll.population_definition}`);
  lines.push(`  coverage warning: ${ll.coverage_warning}`);
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

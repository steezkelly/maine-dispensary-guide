#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations metrics CLI.
 *
 *   npm run ops:metrics -- --from <ISO> --to <ISO> [--format summary|json]
 *
 * Reads ONLY the validated private event store (OPS-02 ledger). Prints
 * aggregates only (console). Task-level detail is never emitted to stdout.
 * Never writes to Hermes, Git, or the Hub.
 */

const path = require('node:path');
const ledger = require('../ledger/mdg-ops-ledger.cjs');
const metrics = require('./mdg-ops-metrics.cjs');

function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (require('node:fs').existsSync(path.join(dir, '.git'))) return dir;
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

  const windowStartMs = from ? Date.parse(from) : 0;
  const windowEndMs = to ? Date.parse(to) : Date.now();
  const window = { windowStartMs, windowEndMs };

  const rows = ledger.list(root, { from, to });
  const events = rows.map((r) => r.event);

  const report = {
    window: { from: from || null, to: to || null },
    coverage: metrics.observationCoverage(events, window),
    arrivals: metrics.arrivals(events, window),
    verified_release_throughput: metrics.verifiedReleaseThroughput(events, window),
    ready_to_release_flow_time: metrics.readyToReleaseFlowTime(events, window),
    first_pass_verification_yield: metrics.firstPassVerificationYield(events),
    wip_by_state: metrics.wipByState(events, window),
    rework_loops: metrics.reworkLoops(events),
    blocked_age: metrics.blockedAge(events, window),
  };

  // Little's Law: only if all three components are numeric.
  const wipValues = Object.values(report.wip_by_state);
  const avgWip = wipValues.length ? wipValues.reduce((a, b) => a + b, 0) / Math.max(1, wipValues.length) : null;
  const throughput = report.verified_release_throughput.rate_per_week;
  const flowP50 = report.ready_to_release_flow_time.p50_hours;
  const avgFlowWeeks = typeof flowP50 === 'number' ? flowP50 / (24 * 7) : null;
  report.littles_law = metrics.littlesLaw({
    avgWip: typeof avgWip === 'number' ? avgWip : null,
    throughputPerWeek: typeof throughput === 'number' ? throughput : null,
    avgFlowTimeWeeks: avgFlowWeeks,
    populationDefinition: 'tasks with trustworthy ready-entry and verified release in window',
    windowLabel: `${from || '-inf'} .. ${to || 'now'}`,
    coverageAdequate: report.coverage.state === 'complete',
    coverageNote: report.coverage.state === 'complete' ? null : `coverage ${report.coverage.state}`,
  });

  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${summarizeReport(report)}\n`);
  }
}

function summarizeReport(r) {
  const lines = [];
  lines.push(`MDG operations metrics — window ${r.window.from || '-inf'} .. ${r.window.to || 'now'}`);
  lines.push(`coverage: ${r.coverage.state} (${r.coverage.event_count} events, ${r.coverage.events_in_window ?? 0} in window)`);
  lines.push(`arrivals: ${r.arrivals.count}`);
  lines.push(`verified releases: ${r.verified_release_throughput.releases} (rate/week: ${fmt(r.verified_release_throughput.rate_per_week)})`);
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

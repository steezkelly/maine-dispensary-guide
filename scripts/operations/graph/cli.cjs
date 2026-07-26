#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations graph CLI.
 *
 *   npm run ops:graph -- --board-state <json> [--json]
 *
 * Reads a board-state JSON file (array of cards with id/depends_on/status) and
 * prints dependency-graph analysis. Read-only; never writes to Hermes/Git/Hub.
 */

const fs = require('node:fs');
const path = require('node:path');
const graph = require('./mdg-ops-graph.cjs');

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') { args.set('json', true); continue; }
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
  const boardPath = args.get('board-state');
  if (!boardPath) throw new Error('ops:graph requires --board-state <path>');
  const tasks = JSON.parse(fs.readFileSync(path.resolve(boardPath), 'utf8'));
  const list = Array.isArray(tasks) ? tasks : (tasks.tasks || []);

  const cycles = graph.findCycles(list);
  const result = {
    task_count: list.length,
    missing_dependencies: graph.missingDependencies(list),
    cycles,
    topological_order: cycles.length ? null : graph.topologicalOrder(list),
    longest_chain: cycles.length ? null : graph.longestChain(list),
    tasks_unlocking_ready_work: graph.tasksUnlockingReadyWork(list),
  };

  if (args.get('json') === true) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`tasks: ${result.task_count}\n`);
    process.stdout.write(`missing dependencies: ${result.missing_dependencies.length}\n`);
    for (const m of result.missing_dependencies) process.stdout.write(`  ${m.task_id} -> ${m.missing_dependency} (absent)\n`);
    process.stdout.write(`cycles: ${cycles.length}\n`);
    for (const c of cycles) process.stdout.write(`  ${c.join(' -> ')}\n`);
    if (result.topological_order) process.stdout.write(`topological order: ${result.topological_order.join(', ')}\n`);
    if (result.longest_chain) process.stdout.write(`longest chain: ${result.longest_chain.length} hops (deepest: ${result.longest_chain.deepest_task})\n`);
    process.stdout.write(`tasks unlocking ready work: ${result.tasks_unlocking_ready_work.join(', ') || '(none)'}\n`);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}

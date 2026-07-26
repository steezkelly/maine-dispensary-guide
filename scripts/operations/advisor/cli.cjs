#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG shadow dispatch advisor CLI.
 *
 *   npm run ops:advise -- --board-state <json> [--compare-current] [--json]
 *
 * Ranks ONLY currently-eligible tasks by a transparent shadow score and
 * compares against the live first-eligible selection (continuity-check).
 * Read-only: never writes to Hermes, acquires a lease, or dispatches.
 */

const fs = require('node:fs');
const path = require('node:path');
const advisor = require('./mdg-ops-advisor.cjs');

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') { args.set('json', true); continue; }
    if (a === '--compare-current') { args.set('compare', true); continue; }
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
  if (!boardPath) throw new Error('ops:advise requires --board-state <path>');
  const tasks = JSON.parse(fs.readFileSync(path.resolve(boardPath), 'utf8'));
  const list = Array.isArray(tasks) ? tasks : (tasks.tasks || []);

  const result = advisor.advise(list, { now: args.get('now') });

  if (args.get('json') === true) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`eligible tasks: ${result.eligible_count}\n`);
  process.stdout.write(`first-eligible (live continuity): ${result.first_eligible_selection || '(none)'}\n`);
  process.stdout.write(`advisory selection: ${result.advisory_selection || '(none)'}\n`);
  process.stdout.write(`agreement: ${result.agreement}\n`);
  if (result.disagreement_reason) process.stdout.write(`reason: ${result.disagreement_reason}\n`);
  if (args.get('compare') === true) {
    process.stdout.write('ranking:\n');
    for (const r of result.ranking) {
      if (r.scoring === 'scored') {
        process.stdout.write(`  ${r.task_id} score=${r.score.toFixed(3)} benefit=${r.benefit.toFixed(3)} ${JSON.stringify(r.components)}\n`);
      } else {
        process.stdout.write(`  ${r.task_id} ${r.scoring}\n`);
      }
    }
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}

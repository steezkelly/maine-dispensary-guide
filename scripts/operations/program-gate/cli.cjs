#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — outcome-aware program gate CLI (OPS-06A-2).
 *
 *   # Evaluate whether predecessors unlock a downstream task:
 *   node scripts/operations/program-gate/cli.cjs evaluate \
 *     --predecessors <json> [--required-outcome <OUTCOME>]
 *
 *     <json> is an array of { task_id, status, outcome } predecessor records.
 *
 *   # Render a structured blocked-card annotation:
 *   node scripts/operations/program-gate/cli.cjs annotate \
 *     --gated <id> --predecessor <id> --evidence <ref> \
 *     --next-action <text> --resume-trigger <text> [--required-outcome <OUTCOME>]
 *
 * Exit codes: 0 = dispatchable/ok, 1 = not dispatchable/error.
 * Pure decision support: never writes to Hermes/Git/Hub. The control plane
 * applies the decision. The analytics ledger is never authoritative.
 */

const fs = require('node:fs');
const path = require('node:path');
const gate = require('./mdg-ops-program-gate.cjs');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${a}`);
      args[a.slice(2)] = value;
      i += 1;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function cmdEvaluate(args) {
  if (!args.predecessors) throw new Error('evaluate requires --predecessors <json-path>');
  const predecessors = JSON.parse(fs.readFileSync(path.resolve(args.predecessors), 'utf8'));
  const list = Array.isArray(predecessors) ? predecessors : (predecessors.predecessors || []);
  const result = gate.evaluateGate(list, { requiredOutcome: args['required-outcome'] || null });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.dispatchable) {
    process.stderr.write(`NOT DISPATCHABLE: ${result.unsatisfied.length} predecessor(s) unsatisfied\n`);
    process.exitCode = 1;
  }
}

function cmdAnnotate(args) {
  if (!args.gated) throw new Error('annotate requires --gated');
  if (!args.predecessor) throw new Error('annotate requires --predecessor');
  if (!args.evidence) throw new Error('annotate requires --evidence');
  const annotation = gate.blockAnnotation({
    gatedTaskId: args.gated,
    predecessorTaskId: args.predecessor,
    evidenceRef: args.evidence,
    requiredOutcome: args['required-outcome'] || null,
    nextAction: args['next-action'] || null,
    resumeTrigger: args['resume-trigger'] || null,
    blockerOwner: args['blocker-owner'] || null,
  });
  process.stdout.write(`${JSON.stringify(annotation, null, 2)}\n`);
}

function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const args = parseArgs(argv.slice(1));
  if (command === 'evaluate') return cmdEvaluate(args);
  if (command === 'annotate') return cmdAnnotate(args);
  throw new Error(`unknown command ${JSON.stringify(command)} (expected evaluate|annotate)`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}

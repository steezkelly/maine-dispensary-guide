#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations ledger CLI.
 *
 *   npm run ops:ledger -- init
 *   npm run ops:ledger -- append --event <event-json-path>
 *   npm run ops:ledger -- check
 *   npm run ops:ledger -- health
 *   npm run ops:ledger -- list --from <date> --to <date> --json
 *
 * Prints aggregates/status only (health/check) or operator-requested event
 * data (list). Never writes to Hermes, Git, or the Hub.
 */

const fs = require('node:fs');
const path = require('node:path');
const ledger = require('./mdg-ops-ledger.cjs');

function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadSchema() {
  const repoRoot = findRepoRoot();
  if (!repoRoot) return null;
  const schemaPath = path.join(repoRoot, 'docs', 'governance', 'schemas', 'mdg-operations-event-v1.schema.json');
  if (!fs.existsSync(schemaPath)) return null;
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function parseArgs(argv) {
  const args = new Map();
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') { args.set('json', true); continue; }
    if (a === '--force') { args.set('force', true); continue; }
    if (a.startsWith('--')) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${a}`);
      args.set(a.slice(2), value);
      i += 1;
    } else {
      positionals.push(a);
    }
  }
  return { args, positionals };
}

function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0];
  const repoRoot = findRepoRoot();
  const root = ledger.resolveRoot({ repoRoot });
  const schema = loadSchema();

  switch (command) {
    case 'init': {
      const result = ledger.init(root, { force: args.get('force') === true });
      process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
      break;
    }
    case 'append': {
      const eventPath = args.get('event');
      if (!eventPath) throw new Error('append requires --event <path>');
      const event = JSON.parse(fs.readFileSync(path.resolve(eventPath), 'utf8'));
      const result = ledger.appendEvent(root, event, { schema });
      process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
      break;
    }
    case 'check': {
      const result = ledger.check(root, { schema });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.ok ? 0 : 1;
      break;
    }
    case 'health': {
      const result = ledger.health(root);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      break;
    }
    case 'list': {
      const rows = ledger.list(root, { from: args.get('from'), to: args.get('to') });
      if (args.get('json') === true) {
        process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
      } else {
        for (const r of rows) {
          process.stdout.write(`${r.seq}\t${r.observed_at}\t${r.event.event_type}\t${r.event_id}\n`);
        }
      }
      break;
    }
    default:
      process.stderr.write('usage: ops:ledger <init|append|check|health|list> [options]\n');
      process.exitCode = 2;
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}

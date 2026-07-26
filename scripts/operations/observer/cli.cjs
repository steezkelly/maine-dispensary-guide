#!/usr/bin/env node
'use strict';

/**
 * cli.cjs — MDG operations observer CLI.
 *
 *   # Live snapshot-diff (reads FILES; never invokes Hermes itself):
 *   npm run ops:observe -- observe \
 *     --board-state <private-json> \
 *     --observed-at <ISO-time>
 *
 *   # One-time historical import from the board SQLite:
 *   npm run ops:observe -- import-history \
 *     --db <board-kanban.db> \
 *     --import-batch <label> \
 *     [--cutoff-epoch <seconds>] \
 *     --observed-at <ISO-time>
 *
 * The observer derives events and hands them to the OPS-02 ledger. It never
 * writes to Hermes, Git, or the Hub. Console output is aggregates only.
 */

const fs = require('node:fs');
const path = require('node:path');
const observer = require('./mdg-ops-observer.cjs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');

function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadSchema(repoRoot) {
  if (!repoRoot) return null;
  const p = path.join(repoRoot, 'docs', 'governance', 'schemas', 'mdg-operations-event-v1.schema.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function parseArgs(argv) {
  const args = new Map();
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
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

function snapshotsDir(root) {
  return path.join(root, 'snapshots');
}

function lastSnapshotPath(root) {
  return path.join(snapshotsDir(root), 'last-snapshot.json');
}

function readPriorTasks(root) {
  const p = lastSnapshotPath(root);
  if (!fs.existsSync(p)) return [];
  const snap = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Array.isArray(snap.tasks) ? snap.tasks : [];
}

function saveSnapshot(root, tasks, observedAt, sourceSha) {
  fs.mkdirSync(snapshotsDir(root), { recursive: true, mode: 0o700 });
  const payload = { observed_at: observedAt, source_sha256: sourceSha, tasks };
  const tmp = path.join(snapshotsDir(root), `.tmp.${process.pid}`);
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, lastSnapshotPath(root));
}

function appendAll(root, events, schema) {
  let appended = 0;
  let noop = 0;
  for (const event of events) {
    const res = ledger.appendEvent(root, event, { schema });
    if (res.outcome === 'appended') appended += 1;
    else noop += 1;
  }
  return { appended, noop };
}

function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0];
  const repoRoot = findRepoRoot();
  const root = ledger.resolveRoot({ repoRoot });
  const schema = loadSchema(repoRoot);
  const observedAt = args.get('observed-at') || new Date().toISOString();

  switch (command) {
    case 'observe': {
      const boardPath = args.get('board-state');
      if (!boardPath) throw new Error('observe requires --board-state <path>');
      const raw = fs.readFileSync(path.resolve(boardPath), 'utf8');
      const sourceSha = require('node:crypto').createHash('sha256').update(raw, 'utf8').digest('hex');
      const cards = JSON.parse(raw);
      const priorTasks = readPriorTasks(root);
      const isFirst = priorTasks.length === 0;
      const currentTasks = observer.normalizeBoardState(cards, { isFirst });
      const events = observer.diffToEvents({
        priorTasks, currentTasks, observedAt, sourceSha, provenance: 'live_observer',
      });
      const { appended, noop } = appendAll(root, events, schema);
      saveSnapshot(root, currentTasks, observedAt, sourceSha);
      process.stdout.write(`${JSON.stringify({
        ok: true, mode: 'observe', first: isFirst,
        tasks: currentTasks.length, events_emitted: events.length,
        appended, duplicate_noop: noop,
      })}\n`);
      break;
    }
    case 'import-history': {
      const dbPath = args.get('db');
      const importBatch = args.get('import-batch');
      if (!dbPath) throw new Error('import-history requires --db <path>');
      if (!importBatch) throw new Error('import-history requires --import-batch <label>');
      const cutoffEpoch = args.get('cutoff-epoch') ? Number(args.get('cutoff-epoch')) : null;
      const { events, totalRows, skippedBeforeCutoff } = observer.readHistoricalEvents(
        path.resolve(dbPath), { observedAt, importBatch, cutoffEpoch },
      );
      const { appended, noop } = appendAll(root, events, schema);
      process.stdout.write(`${JSON.stringify({
        ok: true, mode: 'import-history', import_batch: importBatch,
        rows_read: totalRows, skipped_before_cutoff: skippedBeforeCutoff,
        events_mapped: events.length, appended, duplicate_noop: noop,
      })}\n`);
      break;
    }
    default:
      process.stderr.write('usage: ops:observe <observe|import-history> [options]\n');
      process.exitCode = 2;
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}

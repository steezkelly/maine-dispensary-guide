#!/usr/bin/env node
'use strict';

/**
 * Private, append-only coordination ledger for intentional n8n live-state
 * changes. It never queries or changes n8n; operators and agents record intent
 * before changing workflow activation state, then other actors can fail closed
 * when a current state has no recent explanation.
 *
 * Usage:
 *   node scripts/operations/live-state-ledger.cjs record --workflow W14 --action activate --actor operator --reason "..." [--source ui]
 *   node scripts/operations/live-state-ledger.cjs check --workflow W14 [--max-age-hours 24]
 *   node scripts/operations/live-state-ledger.cjs tail [--limit 10]
 *
 * Set MDG_LIVE_STATE_LEDGER_PATH to an absolute, private external path. The
 * default is ~/.hermes/data/mdg-ops/live-state-ledger.jsonl; repository paths
 * are rejected so changing live state never creates merge-conflict data.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const ACTIONS = new Set(['activate', 'deactivate', 'update', 'delete']);
const SOURCES = new Set(['ui', 'api', 'n8n-cli', 'operator-shell', 'agent']);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function fail(code) {
  throw new Error(code);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const name = token.slice(2);
    const value = argv[index + 1];
    if (!name || value === undefined || value.startsWith('--')) fail(`LIVE_STATE_LEDGER_MISSING_VALUE:${token}`);
    if (!['workflow', 'action', 'actor', 'reason', 'source', 'max-age-hours', 'limit'].includes(name)) {
      fail(`LIVE_STATE_LEDGER_UNKNOWN_OPTION:${token}`);
    }
    args[name] = value;
    index += 1;
  }
  if (args._.length !== 1) fail('LIVE_STATE_LEDGER_USAGE');
  return args;
}

function assertOutsideRepo(candidate) {
  const relative = path.relative(REPO_ROOT, candidate);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..')) {
    fail('LIVE_STATE_LEDGER_PATH_INSIDE_REPO');
  }
}

function resolveLedgerPath(env = process.env) {
  const configured = env.MDG_LIVE_STATE_LEDGER_PATH;
  const candidate = configured || path.join(os.homedir(), '.hermes', 'data', 'mdg-ops', 'live-state-ledger.jsonl');
  if (!path.isAbsolute(candidate)) fail('LIVE_STATE_LEDGER_PATH_NOT_ABSOLUTE');
  const resolved = path.resolve(candidate);
  assertOutsideRepo(resolved);

  // Resolve the nearest existing ancestor before creating anything. A harmless-
  // looking external path such as /tmp/alias/ledger.jsonl can otherwise follow
  // an alias into the repository when its parent is a symlink.
  let ancestor = resolved;
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) fail('LIVE_STATE_LEDGER_PATH_UNRESOLVABLE');
    ancestor = parent;
  }
  const canonical = path.resolve(fs.realpathSync(ancestor), path.relative(ancestor, resolved));
  assertOutsideRepo(canonical);
  return canonical;
}

function assertPrivateRegularFile(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return;
  const stat = fs.lstatSync(ledgerPath);
  if (!stat.isFile()) fail('LIVE_STATE_LEDGER_PATH_NOT_REGULAR_FILE');
  // A hard link cannot be recognized through realpath. Reject every linked
  // inode rather than risk appending to a repository file through an alias.
  if (stat.nlink !== 1) fail('LIVE_STATE_LEDGER_PATH_HARDLINKED');
}

function ensurePrivatePath(ledgerPath) {
  const directory = path.dirname(ledgerPath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  assertPrivateRegularFile(ledgerPath);
  const fd = fs.openSync(ledgerPath, fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
  const stat = fs.fstatSync(fd);
  if (!stat.isFile()) {
    fs.closeSync(fd);
    fail('LIVE_STATE_LEDGER_PATH_NOT_REGULAR_FILE');
  }
  if (stat.nlink !== 1) {
    fs.closeSync(fd);
    fail('LIVE_STATE_LEDGER_PATH_HARDLINKED');
  }
  fs.fchmodSync(fd, 0o600);
  return fd;
}

function isValidEntry(entry, now = Date.now()) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id)) return false;
  if (typeof entry.timestamp !== 'string') return false;
  const timestamp = Date.parse(entry.timestamp);
  if (!Number.isFinite(timestamp) || timestamp > now) return false;
  if (typeof entry.workflow !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(entry.workflow)) return false;
  if (!ACTIONS.has(entry.action)) return false;
  if (typeof entry.actor !== 'string' || !/^(operator|agent:[A-Za-z0-9._:-]{1,128})$/.test(entry.actor)) return false;
  if (typeof entry.reason !== 'string' || !entry.reason.trim() || entry.reason.length > 1000) return false;
  return SOURCES.has(entry.source);
}

function readEntries(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return [];
  assertPrivateRegularFile(ledgerPath);
  const contents = fs.readFileSync(ledgerPath, 'utf8').trim();
  if (!contents) return [];
  return contents.split('\n').map((line, index) => {
    try {
      const entry = JSON.parse(line);
      if (!entry || typeof entry !== 'object') fail(`LIVE_STATE_LEDGER_MALFORMED_ENTRY:${index + 1}`);
      return entry;
    } catch (error) {
      if (String(error.message).startsWith('LIVE_STATE_LEDGER_')) throw error;
      fail(`LIVE_STATE_LEDGER_MALFORMED_ENTRY:${index + 1}`);
    }
  });
}

function requireString(args, name) {
  const value = args[name];
  if (typeof value !== 'string' || !value.trim()) fail(`LIVE_STATE_LEDGER_MISSING_${name.toUpperCase().replaceAll('-', '_')}`);
  return value.trim();
}

function validateWorkflow(workflow) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(workflow)) fail('LIVE_STATE_LEDGER_INVALID_WORKFLOW');
}

function validateActor(actor) {
  if (!/^(operator|agent:[A-Za-z0-9._:-]{1,128})$/.test(actor)) fail('LIVE_STATE_LEDGER_INVALID_ACTOR');
}

function parsePositiveInteger(value, code, fallback) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1) fail(code);
  return Number(value);
}

function record(args, ledgerPath) {
  const workflow = requireString(args, 'workflow');
  const action = requireString(args, 'action');
  const actor = requireString(args, 'actor');
  const reason = requireString(args, 'reason');
  const source = (args.source || 'agent').trim();
  validateWorkflow(workflow);
  validateActor(actor);
  if (!ACTIONS.has(action)) fail('LIVE_STATE_LEDGER_INVALID_ACTION');
  if (!SOURCES.has(source)) fail('LIVE_STATE_LEDGER_INVALID_SOURCE');
  if (reason.length > 1000) fail('LIVE_STATE_LEDGER_REASON_TOO_LONG');

  const fd = ensurePrivatePath(ledgerPath);
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    workflow,
    action,
    actor,
    reason,
    source,
  };
  try {
    fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8');
  } finally {
    fs.closeSync(fd);
  }
  return { outcome: 'recorded', entry };
}

function check(args, ledgerPath) {
  const workflow = requireString(args, 'workflow');
  validateWorkflow(workflow);
  const maxAgeHours = parsePositiveInteger(args['max-age-hours'], 'LIVE_STATE_LEDGER_INVALID_MAX_AGE_HOURS', 24);
  const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  const now = Date.now();
  const entry = readEntries(ledgerPath)
    .filter((candidate) => isValidEntry(candidate, now) && candidate.workflow === workflow && Date.parse(candidate.timestamp) >= cutoff)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  return entry ? { outcome: 'recent-entry', entry } : { outcome: 'no-recent-entry', workflow };
}

function tail(args, ledgerPath) {
  const limit = parsePositiveInteger(args.limit, 'LIVE_STATE_LEDGER_INVALID_LIMIT', 10);
  return { entries: readEntries(ledgerPath).slice(-limit).reverse() };
}

function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const ledgerPath = resolveLedgerPath(env);
  const command = args._[0];
  let response;
  let exitCode = 0;
  if (command === 'record') response = record(args, ledgerPath);
  else if (command === 'check') {
    response = check(args, ledgerPath);
    if (response.outcome !== 'recent-entry') exitCode = 1;
  } else if (command === 'tail') response = tail(args, ledgerPath);
  else fail('LIVE_STATE_LEDGER_UNKNOWN_COMMAND');
  return { response, exitCode };
}

if (require.main === module) {
  try {
    const { response, exitCode } = main();
    process.stdout.write(`${JSON.stringify(response)}\n`);
    process.exitCode = exitCode;
  } catch (error) {
    process.stderr.write(`${String(error && error.message ? error.message : 'LIVE_STATE_LEDGER_FAILED')}\n`);
    process.exitCode = 1;
  }
}

module.exports = { ACTIONS, check, main, readEntries, record, resolveLedgerPath, tail };

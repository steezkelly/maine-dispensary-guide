#!/usr/bin/env node
'use strict';

/**
 * Verified-candidate integrity gate CLI (OPS-06A-1, hardened by OPS-06A-R2-F).
 *
 * capture-evidence: snapshot the verifier-approved worktree/commit.
 * bind-candidate: bind that snapshot to the coordinator-created commit.
 * verify: fail-closed integration check against base, PR/head, CI, and worktree.
 * worktree-status: report whether the integration worktree is clean.
 *
 * Private-evidence safety (OPS-06A-R2 finding F): integrity evidence is Tier 0
 * operational data. capture-evidence and bind-candidate REQUIRE an explicit
 * --out path validated beneath the real MDG_OPS_ROOT (shared private-output
 * helper): repository-local output, lexical escape, symlink-ancestor escape, and
 * unsafe output-file symlinks are rejected; directories are created 0700 (stopping
 * at the private root); the file is written through an owner-only temp file and
 * atomic rename and enforced 0600. Stdout carries ONLY a redacted confirmation
 * and the evidence SHA-256 — never the task ID, changed-path manifest, acceptance
 * commands, or full evidence body.
 *
 * Evidence reads are validated beneath MDG_OPS_ROOT, reject unsafe symlinks, and
 * fail closed on group/other-readable permissions.
 */

const fs = require('node:fs');
const path = require('node:path');
const integrity = require('./mdg-ops-integrity.cjs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');
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
  const args = { _: [], accept: [], authorizedUntracked: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--accept' || argument === '--authorized-untracked') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${argument}`);
      args[argument === '--accept' ? 'accept' : 'authorizedUntracked'].push(value);
      index += 1;
      continue;
    }
    if (argument.startsWith('--')) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${argument}`);
      args[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    args._.push(argument);
  }
  return args;
}

function requireArg(args, name, command) {
  if (!args[name]) throw new Error(`${command} requires --${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  return args[name];
}

function acceptanceCommands(entries) {
  return entries.map((entry) => {
    const separator = entry.lastIndexOf('=');
    if (separator < 1) throw new Error(`--accept must use command=exit-code: ${entry}`);
    const exitCode = Number(entry.slice(separator + 1));
    if (!Number.isInteger(exitCode)) throw new Error(`--accept exit code must be an integer: ${entry}`);
    return { command: entry.slice(0, separator), exit_code: exitCode };
  });
}

/**
 * Resolve the real private root (MDG_OPS_ROOT) for evidence I/O.
 */
function privateRoot(args) {
  const repoRoot = args.repo ? path.resolve(args.repo) : findRepoRoot();
  return ledger.resolveRoot({ repoRoot });
}

/**
 * Write evidence to a REQUIRED, validated private --out path. Prints only a
 * redacted confirmation and the evidence SHA-256 (never the body, task ID,
 * changed paths, or acceptance commands). Fails closed if --out is missing or
 * unsafe (OPS-06A-R2 finding F).
 */
function writeEvidence(args, command, value) {
  const outPath = args.out;
  if (!outPath) {
    throw new Error(`${command} requires --out <path> beneath MDG_OPS_ROOT (Tier 0 evidence is never printed to stdout)`);
  }
  const root = privateRoot(args);
  const repoRoot = args.repo ? path.resolve(args.repo) : findRepoRoot();
  const safePath = privateOutput.writePrivateFile(root, outPath, `${JSON.stringify(value, null, 2)}\n`, repoRoot);
  process.stdout.write(`evidence written beneath private root (owner-only)\n`);
  process.stdout.write(`evidence_sha256: ${value.evidence_sha256}\n`);
  process.stdout.write(`changed_paths: ${Array.isArray(value.changed_paths) ? value.changed_paths.length : 0}\n`);
  void safePath;
}

/**
 * Read evidence from a validated private path (beneath MDG_OPS_ROOT, no unsafe
 * symlinks, owner-only permissions). Fails closed (OPS-06A-R2 finding F).
 */
function readEvidence(args, command) {
  const evidencePath = requireArg(args, 'evidence', command);
  const root = privateRoot(args);
  const safePath = privateOutput.validatePrivateReadPath(root, evidencePath);
  return JSON.parse(fs.readFileSync(safePath, 'utf8'));
}

function captureEvidence(args) {
  const command = 'capture-evidence';
  const evidence = integrity.captureEvidence(args.repo || process.cwd(), {
    task_id: requireArg(args, 'taskId', command),
    acceptance_commands: acceptanceCommands(args.accept),
    verification_timestamp: requireArg(args, 'timestamp', command),
    verifier_outcome: requireArg(args, 'outcome', command),
  }, {
    base: requireArg(args, 'base', command),
    authorizedUntrackedPaths: args.authorizedUntracked,
  });
  writeEvidence(args, command, evidence);
}

function bindCandidate(args) {
  const command = 'bind-candidate';
  const evidence = integrity.bindAcceptedCandidate(
    args.repo || process.cwd(),
    readEvidence(args, command),
    requireArg(args, 'candidate', command),
  );
  writeEvidence(args, command, evidence);
}

function verify(args) {
  const command = 'verify';
  const checksPath = requireArg(args, 'checks', command);
  const root = privateRoot(args);
  const safeChecks = privateOutput.validatePrivateReadPath(root, checksPath);
  const checks = JSON.parse(fs.readFileSync(safeChecks, 'utf8'));
  const requiredChecks = Array.isArray(checks) ? checks : checks.checks;
  const result = integrity.verifyCandidate(
    args.repo || process.cwd(),
    readEvidence(args, command),
    requireArg(args, 'candidate', command),
    {
      expectedBaseSha: requireArg(args, 'expectedBase', command),
      currentHeadSha: requireArg(args, 'currentHead', command),
      requiredChecks,
    },
  );
  // verify output is an accept/reject signal, not Tier 0 evidence; it carries no
  // task IDs, changed paths, or evidence bodies.
  process.stdout.write(`${JSON.stringify({ ok: result.ok, reasons: result.reasons }, null, 2)}\n`);
  if (!result.ok) {
    process.stderr.write(`REJECTED: ${result.reasons.length} reason(s)\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('ACCEPTED: candidate matches verifier evidence exactly\n');
  }
}

function worktreeStatus(args) {
  const status = integrity.worktreeStatus(args.repo || process.cwd());
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
  if (!status.clean) process.exitCode = 1;
}

function main() {
  const [command, ...argv] = process.argv.slice(2);
  const args = parseArgs(argv);
  if (command === 'capture-evidence') return captureEvidence(args);
  if (command === 'bind-candidate') return bindCandidate(args);
  if (command === 'verify') return verify(args);
  if (command === 'worktree-status') return worktreeStatus(args);
  throw new Error('expected capture-evidence|bind-candidate|verify|worktree-status');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

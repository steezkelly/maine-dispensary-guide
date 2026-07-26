#!/usr/bin/env node
'use strict';

/**
 * Verified-candidate integrity gate CLI (OPS-06A-1).
 *
 * capture-evidence: snapshot the verifier-approved unstaged worktree.
 * bind-candidate: bind that snapshot to the coordinator-created commit.
 * verify: fail-closed integration check against base, PR/head, CI, and worktree.
 */

const fs = require('node:fs');
const path = require('node:path');
const integrity = require('./mdg-ops-integrity.cjs');

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

function writeJson(value, outputPath) {
  const document = `${JSON.stringify(value, null, 2)}\n`;
  if (!outputPath) {
    process.stdout.write(document);
    return;
  }
  fs.writeFileSync(path.resolve(outputPath), document, { mode: 0o600 });
  process.stdout.write(`evidence written to ${outputPath}\n`);
  process.stdout.write(`evidence_sha256: ${value.evidence_sha256}\n`);
}

function readEvidence(args, command) {
  return JSON.parse(fs.readFileSync(path.resolve(requireArg(args, 'evidence', command)), 'utf8'));
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
  writeJson(evidence, args.out);
}

function bindCandidate(args) {
  const command = 'bind-candidate';
  const evidence = integrity.bindAcceptedCandidate(
    args.repo || process.cwd(),
    readEvidence(args, command),
    requireArg(args, 'candidate', command),
  );
  writeJson(evidence, args.out);
}

function verify(args) {
  const command = 'verify';
  const checks = JSON.parse(fs.readFileSync(path.resolve(requireArg(args, 'checks', command)), 'utf8'));
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

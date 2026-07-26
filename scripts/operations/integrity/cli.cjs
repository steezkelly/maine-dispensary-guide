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
  emitRedactedResult(args, command, result.ok, result.reasons, { successMessage: 'ACCEPTED: candidate matches verifier evidence exactly' });
}

function worktreeStatus(args) {
  const status = integrity.worktreeStatus(args.repo || process.cwd());
  // R3-F: redact dirty-worktree detail (paths) from ordinary stdout. Full detail
  // goes only to an explicitly requested, validated Tier-0 private file.
  const problems = Array.isArray(status.problems) ? status.problems : [];
  emitRedactedResult(args, 'worktree-status', status.clean, problems, { failurePrefix: 'WORKTREE_DIRTY', fixedCode: 'DIRTY_WORKTREE' });
}

/**
 * Classify a detailed reason string into a STABLE redacted reason code
 * (OPS-06A-R3 finding F). Codes carry no filenames, paths, SHAs, check names,
 * acceptance commands, or evidence bodies — only a stable category.
 */
function reasonCode(reason) {
  const r = String(reason);
  if (/omitted/.test(r)) return 'CANDIDATE_FILE_OMITTED';
  if (/unexpected additional/.test(r)) return 'CANDIDATE_FILE_ADDED';
  if (/changed-path manifest differs/.test(r)) return 'CANDIDATE_MANIFEST_ORDER';
  if (/mode\/type changed/.test(r)) return 'CANDIDATE_MODE_TYPE_MISMATCH';
  if (/changed after verification/.test(r)) return 'CANDIDATE_CONTENT_MISMATCH';
  if (/canonical diff hash/.test(r)) return 'CANDIDATE_CANONICAL_HASH_MISMATCH';
  if (/worktree is dirty/.test(r)) return 'DIRTY_WORKTREE';
  if (/required checks pending/.test(r)) return 'REQUIRED_CHECK_PENDING';
  if (/required checks failing/.test(r)) return 'REQUIRED_CHECK_FAILING';
  if (/not self-consistent/.test(r)) return 'EVIDENCE_NOT_SELF_CONSISTENT';
  if (/unsupported evidence schema/.test(r)) return 'EVIDENCE_SCHEMA_UNSUPPORTED';
  if (/verifier_outcome/.test(r)) return 'EVIDENCE_VERIFIER_OUTCOME_NOT_PASS';
  if (/acceptance commands did not exit 0/.test(r)) return 'ACCEPTANCE_COMMAND_NONZERO';
  if (/not bound to an accepted candidate/.test(r)) return 'EVIDENCE_NOT_BOUND';
  if (/cannot resolve candidate ref/.test(r)) return 'CANDIDATE_REF_UNRESOLVABLE';
  if (/candidate SHA .* != accepted SHA/.test(r)) return 'CANDIDATE_SHA_MISMATCH';
  if (/expected integration base SHA is missing/.test(r)) return 'EXPECTED_BASE_MISSING';
  if (/expected base SHA .* != recorded base/.test(r)) return 'BASE_SHA_MISMATCH';
  if (/cannot resolve expected base SHA/.test(r)) return 'EXPECTED_BASE_UNRESOLVABLE';
  if (/current PR\/head SHA is missing/.test(r)) return 'CURRENT_HEAD_MISSING';
  if (/current PR\/head SHA .* != accepted SHA/.test(r)) return 'HEAD_SHA_MISMATCH';
  if (/cannot resolve current PR\/head SHA/.test(r)) return 'CURRENT_HEAD_UNRESOLVABLE';
  if (/cannot compute candidate manifest/.test(r)) return 'MANIFEST_COMPUTATION_FAILED';
  return 'INTEGRITY_CHECK_FAILED';
}

/**
 * Emit a REDACTED accept/reject result (OPS-06A-R3 finding F). Ordinary stdout
 * carries only stable information: { ok, reason_count, reason_codes }. The full
 * detailed reasons (which may contain filenames, paths, SHAs, check names) are
 * written ONLY to an explicitly requested, validated Tier-0 private file
 * (--detail-out). Nothing sensitive is ever printed to stdout/stderr.
 */
function emitRedactedResult(args, command, ok, detailedReasons, { successMessage, failurePrefix, fixedCode } = {}) {
  const reasons = Array.isArray(detailedReasons) ? detailedReasons : [];
  const reasonCodes = fixedCode ? reasons.map(() => fixedCode) : reasons.map(reasonCode);
  const redacted = { ok: !!ok, reason_count: reasons.length, reason_codes: reasonCodes };
  process.stdout.write(`${JSON.stringify(redacted, null, 2)}\n`);

  const detailOut = args.detailOut;
  if (detailOut) {
    const root = privateRoot(args);
    const repoRoot = args.repo ? path.resolve(args.repo) : findRepoRoot();
    const payload = { command, ok: !!ok, reason_count: reasons.length, reason_codes: reasonCodes, reasons };
    privateOutput.writePrivateFile(root, detailOut, `${JSON.stringify(payload, null, 2)}\n`, repoRoot);
    process.stdout.write(`detailed reasons written beneath private root (owner-only)\n`);
  }

  if (!ok) {
    const prefix = failurePrefix || 'REJECTED';
    process.stderr.write(`${prefix}: ${reasons.length} reason(s); codes: ${reasonCodes.join(', ') || 'none'}\n`);
    process.exitCode = 1;
  } else if (successMessage) {
    process.stdout.write(`${successMessage}\n`);
  }
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
  // R3-F: redact failure output. Ordinary stderr carries only a stable code,
  // never a private path, repo path, filename, or evidence detail. The full
  // message is not printed (it may contain paths/SHAs from validation errors).
  const msg = String(error && error.message ? error.message : 'unknown error');
  let code = 'INTEGRITY_COMMAND_FAILED';
  if (/^OPS_EVIDENCE_/.test(msg)) code = 'EVIDENCE_READ_REJECTED';
  else if (/^OPS_OUTPUT_/.test(msg)) code = 'OUTPUT_PATH_REJECTED';
  else if (/^OPS_PRIVATE_/.test(msg)) code = 'PRIVATE_WRITE_REJECTED';
  else if (/requires --out/.test(msg)) code = 'MISSING_REQUIRED_OUT';
  else if (/requires --/.test(msg)) code = 'MISSING_REQUIRED_ARG';
  else if (/self-consistent/.test(msg)) code = 'EVIDENCE_NOT_SELF_CONSISTENT';
  else if (/verifier PASS/.test(msg)) code = 'BIND_REQUIRES_VERIFIER_PASS';
  else if (/non-zero acceptance/.test(msg)) code = 'ACCEPTANCE_COMMAND_NONZERO';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}

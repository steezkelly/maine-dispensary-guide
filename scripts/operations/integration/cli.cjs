#!/usr/bin/env node
'use strict';

/**
 * Canonical Integrator gate (OPS-06B-P1 Child 2).
 *
 * ONE documented pre-merge command that composes the verified-candidate
 * integrity checks into a single mechanically fail-closed gate. It is the
 * smallest wrapper that makes the LOCAL integration path fail-closed when used
 * (category B locally). It does NOT automate the merge and does NOT provide
 * GitHub-wide enforcement — that requires the Child-3 ruleset (category B
 * GitHub-wide is not achieved until a required status/ruleset prevents bypass
 * through the web interface or another client).
 *
 * Usage:
 *   node scripts/operations/integration/cli.cjs \
 *     --evidence <private-json-path> \
 *     --checks <private-checks-json-path> \
 *     --candidate <exact-candidate-sha> \
 *     --expected-base <exact-base-sha> \
 *     --current-head <exact-remote-pr-head-sha> \
 *     [--repo <path>] [--detail-out <private-json-path>]
 *
 * Required inputs (fail nonzero before any merge if any is missing):
 *   --evidence       private bound verifier evidence (Tier 0)
 *   --checks         required-checks manifest (Tier 0)
 *   --candidate      exact candidate SHA
 *   --expected-base  exact expected base SHA
 *   --current-head   exact current remote PR head SHA
 *
 * Fails nonzero BEFORE any merge operation when:
 *   - evidence is missing or its permissions are unsafe;
 *   - candidate / head / base identity differs;
 *   - the candidate tree differs from the bound evidence;
 *   - a required check is pending or failing;
 *   - the integration worktree is dirty.
 *
 * Output is REDACTED by default: ordinary stdout/stderr carry only stable codes
 * ({ ok, reason_count, reason_codes }) — never task IDs, repository paths,
 * changed filenames, acceptance commands, check names, evidence bodies, or
 * private paths. Full detailed reasons are written ONLY to an explicitly
 * requested, validated Tier-0 private file (--detail-out).
 *
 * This wrapper delegates all cryptographic checks to the existing integrity
 * library (scripts/operations/integrity/mdg-ops-integrity.cjs) and the shared
 * private-output helper; it adds NO new trust surface and NO merge automation.
 */

const fs = require('node:fs');
const path = require('node:path');
const integrity = require('../integrity/mdg-ops-integrity.cjs');
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
  const args = { _: [] };
  const toCamel = (key) => key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith('--')) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${argument}`);
      args[toCamel(argument.slice(2))] = value;
      index += 1;
      continue;
    }
    args._.push(argument);
  }
  return args;
}

function requireArg(args, name) {
  if (!args[name]) {
    const flag = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    throw new Error(`GATE_MISSING_ARG:--${flag}`);
  }
  return args[name];
}

/**
 * Classify a detailed reason string into a STABLE redacted code (mirrors the
 * integrity CLI's reasonCode; kept in sync so the wrapper and the verify
 * subcommand emit identical codes).
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
 * Run the canonical gate. Returns { ok, reason_count, reason_codes, reasons }.
 * Every check is fail-closed: any failure aborts before a merge could proceed.
 */
function runGate(args) {
  // Validate ALL required arguments FIRST, before any repo/root resolution, so
  // a missing argument always surfaces as a stable GATE_MISSING_ARG code
  // (independent of repo topology).
  const evidencePath = requireArg(args, 'evidence');
  const checksPath = requireArg(args, 'checks');
  const candidate = requireArg(args, 'candidate');
  const expectedBase = requireArg(args, 'expectedBase');
  const currentHead = requireArg(args, 'currentHead');

  const repoDir = args.repo ? path.resolve(args.repo) : findRepoRoot();
  if (!repoDir) throw new Error('GATE_NO_REPO');
  const root = ledger.resolveRoot({ repoRoot: repoDir });

  // 1. Read + validate the private evidence (fail closed on missing/unsafe perms).
  const safeEvidence = privateOutput.validatePrivateReadPath(root, evidencePath);
  const evidence = JSON.parse(fs.readFileSync(safeEvidence, 'utf8'));

  // 2. Read + validate the required-checks manifest (Tier 0).
  const safeChecks = privateOutput.validatePrivateReadPath(root, checksPath);
  const checks = JSON.parse(fs.readFileSync(safeChecks, 'utf8'));
  const requiredChecks = Array.isArray(checks) ? checks : checks.checks;

  // 3. Clean integration worktree (fail closed if dirty).
  const status = integrity.worktreeStatus(repoDir);
  if (!status.clean) {
    const problems = Array.isArray(status.problems) ? status.problems : [];
    return { ok: false, reasons: [`integration worktree is dirty: ${problems.join(', ')}`] };
  }

  // 4. Candidate identity / tree / base / head / checks — delegate to the gate.
  const result = integrity.verifyCandidate(repoDir, evidence, candidate, {
    expectedBaseSha: expectedBase,
    currentHeadSha: currentHead,
    requiredChecks,
  });

  return { ok: !!result.ok, reasons: Array.isArray(result.reasons) ? result.reasons : [] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runGate(args);
  const reasonCodes = result.reasons.map(reasonCode);
  const redacted = { ok: result.ok, reason_count: result.reasons.length, reason_codes: reasonCodes };
  process.stdout.write(`${JSON.stringify(redacted, null, 2)}\n`);

  // Full detail ONLY to an explicitly requested, validated Tier-0 file.
  if (args.detailOut) {
    const repoDir = args.repo ? path.resolve(args.repo) : findRepoRoot();
    const root = ledger.resolveRoot({ repoRoot: repoDir });
    const payload = {
      command: 'integration-gate',
      ok: result.ok,
      reason_count: result.reasons.length,
      reason_codes: reasonCodes,
      reasons: result.reasons,
    };
    privateOutput.writePrivateFile(root, args.detailOut, `${JSON.stringify(payload, null, 2)}\n`, repoDir);
    process.stdout.write(`detailed reasons written beneath private root (owner-only)\n`);
  }

  if (!result.ok) {
    process.stderr.write(`GATE_REJECTED: ${result.reasons.length} reason(s); codes: ${reasonCodes.join(', ') || 'none'}\n`);
    process.stderr.write(`GATE_REJECTED: do NOT merge. Re-run with --detail-out <private-path> for full reasons (Tier 0).\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('GATE_ACCEPTED: candidate matches verifier evidence; cleared for the authorized merge operation\n');
  }
}

try {
  main();
} catch (error) {
  // Redact failure output: emit only a stable code, never the raw message
  // (which may contain private paths/SHAs from validation errors).
  const msg = String(error && error.message ? error.message : 'unknown error');
  let code = 'GATE_FAILED';
  if (/^GATE_MISSING_ARG:/.test(msg)) code = msg; // already a stable code+flag
  else if (msg === 'GATE_NO_REPO') code = 'GATE_NO_REPO';
  else if (/^OPS_ROOT_INSIDE_REPO/.test(msg)) code = 'GATE_ROOT_INSIDE_REPO';
  else if (/^OPS_EVIDENCE_/.test(msg)) code = 'EVIDENCE_READ_REJECTED';
  else if (/^OPS_OUTPUT_/.test(msg)) code = 'OUTPUT_PATH_REJECTED';
  else if (/^OPS_PRIVATE_/.test(msg)) code = 'PRIVATE_WRITE_REJECTED';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}

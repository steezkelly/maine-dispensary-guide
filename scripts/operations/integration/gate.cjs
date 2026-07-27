'use strict';

/**
 * Canonical Integrator gate core logic (OPS-06B-P1 Child 2; hardened by
 * OPS-06B-P1-R1). Side-effect-free module: the CLI (cli.cjs) is a thin wrapper
 * that supplies the real git/gh runners; tests supply mocked runners.
 *
 * Binds the verified-candidate integrity checks to the ACTUAL local + remote
 * state. See cli.cjs header for the full contract.
 */

const fs = require('node:fs');
const path = require('node:path');
const integrity = require('../integrity/mdg-ops-integrity.cjs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');
const privateOutput = require('../private/mdg-ops-private-output.cjs');
const { resolveRemoteState } = require('./remote-state.cjs');
const { evaluateRequiredChecks } = require('./check-rollup.cjs');

function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function requireArg(args, name) {
  if (!args[name]) {
    const flag = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    throw new Error(`GATE_MISSING_ARG:--${flag}`);
  }
  return args[name];
}

/** Classify a detailed reason into a stable redacted code. */
function reasonCode(reason) {
  const r = String(reason);
  // Pass through already-stable codes (UPPER_SNAKE, optionally with a :detail suffix).
  if (/^[A-Z][A-Z0-9_]*(:.*)?$/.test(r)) return r.split(':')[0];
  if (/worktree is dirty/.test(r)) return 'DIRTY_WORKTREE';
  if (/canonical diff hash/.test(r)) return 'CANDIDATE_CANONICAL_HASH_MISMATCH';
  if (/changed after verification/.test(r)) return 'CANDIDATE_CONTENT_MISMATCH';
  if (/mode\/type changed/.test(r)) return 'CANDIDATE_MODE_TYPE_MISMATCH';
  if (/omitted/.test(r)) return 'CANDIDATE_FILE_OMITTED';
  if (/unexpected additional/.test(r)) return 'CANDIDATE_FILE_ADDED';
  if (/not self-consistent/.test(r)) return 'EVIDENCE_NOT_SELF_CONSISTENT';
  if (/unsupported evidence schema/.test(r)) return 'EVIDENCE_SCHEMA_UNSUPPORTED';
  if (/verifier_outcome/.test(r)) return 'EVIDENCE_VERIFIER_OUTCOME_NOT_PASS';
  if (/not bound to an accepted candidate/.test(r)) return 'EVIDENCE_NOT_BOUND';
  if (/required check/.test(r)) return 'REQUIRED_CHECK_NOT_SATISFIED';
  return 'INTEGRITY_CHECK_FAILED';
}

/**
 * Run the canonical gate, binding to actual local + remote state.
 *
 * @param {object} args parsed CLI args (repoFullName, prNumber, evidence, ...)
 * @param {object} runners { git, ghApi } — injectable for tests
 * @returns {object} { ok, reasons, detail, reasonCodes }
 */
function runGate(args, runners) {
  const { git, ghApi, env = process.env } = runners;

  // Validate required args FIRST (independent of repo topology).
  const repoFullName = requireArg(args, 'repoFullName');
  const prNumber = requireArg(args, 'prNumber');
  const evidencePath = requireArg(args, 'evidence');
  const baseBranch = args.baseBranch || 'main';

  const repoDir = args.repo ? path.resolve(args.repo) : findRepoRoot();
  if (!repoDir) throw new Error('GATE_NO_REPO');
  const root = ledger.resolveRoot({ repoRoot: repoDir, env });

  // Read + validate the private bound verifier evidence (Tier 0).
  const safeEvidence = privateOutput.validatePrivateReadPath(root, evidencePath);
  const evidence = JSON.parse(fs.readFileSync(safeEvidence, 'utf8'));
  if (!integrity.evidenceSelfConsistent(evidence)) {
    return finalize(false, ['evidence document is not self-consistent (evidence_sha256 mismatch)'], { evidencePath: safeEvidence });
  }
  const evidenceCandidate = evidence.accepted_candidate_sha;
  const evidenceBase = evidence.base_sha;
  if (!evidenceCandidate) {
    return finalize(false, ['evidence is not bound to an accepted candidate SHA'], {});
  }

  const expectCandidate = args.expectCandidate || null;
  const expectBase = args.expectBase || null;

  const reasons = [];
  const detail = { repoFullName, prNumber, baseBranch, evidencePath: safeEvidence };

  // R1-A: resolve the ACTUAL remote + PR state (fail closed).
  let remote;
  try {
    remote = resolveRemoteState({ repoDir, repoFullName, prNumber, baseBranch, git, ghApi });
  } catch (error) {
    return finalize(false, [error.message], detail);
  }
  detail.remote = remote;

  if (remote.prState !== 'open') reasons.push(`REMOTE_PR_NOT_OPEN:${remote.prState}`);
  if (remote.prMerged) reasons.push('REMOTE_PR_ALREADY_MERGED');
  if (remote.baseRef !== baseBranch) reasons.push(`REMOTE_PR_WRONG_BASE:${remote.baseRef}`);

  // R1-A.4: actual PR head SHA must equal the evidence-bound candidate.
  if (remote.headSha !== evidenceCandidate) reasons.push('REMOTE_PR_HEAD_MISMATCH');
  if (expectCandidate && remote.headSha !== expectCandidate) reasons.push('REMOTE_PR_HEAD_MISMATCH_EXPECTED');

  // R1-A.5: actual origin/<base> must equal the evidence base (drift check).
  if (remote.actualBaseSha !== evidenceBase) reasons.push('REMOTE_BASE_DRIFT');
  if (remote.baseSha !== remote.actualBaseSha) reasons.push('REMOTE_PR_BASE_STALE');
  if (expectBase && remote.actualBaseSha !== expectBase) reasons.push('REMOTE_BASE_DRIFT_EXPECTED');

  // R1-A.6/7: local integration checkout must be clean and at the exact tree.
  const status = integrity.worktreeStatus(repoDir);
  if (!status.clean) {
    reasons.push(`integration worktree is dirty: ${(status.problems || []).join(', ')}`);
  }
  let localHead;
  let localTree;
  let candidateTree;
  try {
    localHead = git(repoDir, ['rev-parse', 'HEAD']);
    localTree = git(repoDir, ['rev-parse', 'HEAD^{tree}']);
    candidateTree = git(repoDir, ['rev-parse', `${evidenceCandidate}^{tree}`]);
  } catch (error) {
    reasons.push('LOCAL_HEAD_UNRESOLVABLE');
  }
  detail.localHead = localHead;
  detail.localTree = localTree;
  detail.candidateTree = candidateTree;
  if (localTree && candidateTree && localTree !== candidateTree) {
    reasons.push('LOCAL_TREE_MISMATCH');
  }

  // R1-A.8: candidate must be compatible with the current base (merge-base).
  try {
    const mergeBase = git(repoDir, ['merge-base', remote.actualBaseSha, evidenceCandidate]);
    detail.mergeBase = mergeBase;
    if (mergeBase !== remote.actualBaseSha) {
      reasons.push('CANDIDATE_NOT_BASED_ON_BASE');
    }
  } catch (error) {
    reasons.push('CANDIDATE_BASE_INCOMPATIBLE');
  }

  // Candidate tree identity vs evidence (cryptographic, from git objects).
  try {
    const manifest = integrity.computeCommitManifest(repoDir, evidenceBase, evidenceCandidate, []);
    detail.canonicalDiffSha256 = manifest.canonical_diff_sha256;
    if (manifest.canonical_diff_sha256 !== evidence.canonical_diff_sha256) {
      reasons.push(`canonical diff hash ${manifest.canonical_diff_sha256} != recorded ${evidence.canonical_diff_sha256}`);
    }
  } catch (error) {
    reasons.push('MANIFEST_COMPUTATION_FAILED');
  }

  // R1-B: evaluate the LIVE required-check rollup for the exact PR head.
  let checks;
  try {
    checks = evaluateRequiredChecks({
      repoFullName,
      prNumber,
      headSha: remote.headSha,
      baseSha: remote.actualBaseSha,
      repoDir,
      baseBranch,
      git,
      ghApi,
    });
  } catch (error) {
    reasons.push('CHECK_ROLLUP_FAILED');
  }
  if (checks) {
    detail.checks = checks;
    if (!checks.ok) {
      for (const r of checks.reasons) reasons.push(r);
    }
  }

  return finalize(reasons.length === 0, reasons, detail);
}

function finalize(ok, reasons, detail) {
  return { ok, reasons, detail, reasonCodes: reasons.map(reasonCode) };
}

module.exports = { runGate, reasonCode, requireArg, findRepoRoot };

'use strict';

/**
 * Canonical Integrator gate core logic.
 * (OPS-06B-P1 Child 2; hardened by OPS-06B-P1-R1 and OPS-06B-P1-R2.)
 *
 * Side-effect-free module: the CLI (cli.cjs) supplies the real git/gh runners;
 * tests supply mocked runners. Binds the verified-candidate integrity checks to
 * the ACTUAL local + remote state.
 *
 * R2-A — COMPLETE EVIDENCE-SEMANTIC VERIFICATION. Instead of partially
 * reimplementing the integrity checks, the gate invokes the authoritative shared
 * verifier integrity.verifyCandidate() with independently derived actual remote
 * values. This validates the evidence schema, verifier_outcome == PASS, every
 * acceptance command exit_code == 0, the accepted candidate binding, base/head
 * identity, and the full manifest (changed paths, canonical diff, file content,
 * git mode/type), plus a clean worktree. A REQUIRED --expect-evidence-sha256
 * argument is the local A+ manual trust anchor: the gate compares the
 * operator-authorized digest with the evidence document's exact bound
 * evidence_sha256. Self-consistency alone is insufficient because anyone able to
 * rewrite the document can recompute an unkeyed internal hash.
 *
 * R2-B — EXACT LOCAL HEAD IN CANONICAL MODE. Canonical GitHub-merge mode requires
 * git rev-parse HEAD == evidence-bound candidate SHA AND HEAD^{tree} ==
 * candidate^{tree}. A clean different commit with the same tree fails canonical
 * mode (tree-equivalent transport commits are emergency-mode only).
 *
 * R2-D — EXPLICIT PR MERGEABILITY. A draft PR is allowed only with --allow-draft
 * (the canonical order runs the gate before marking the PR ready). mergeable ==
 * false, a dirty/blocked/incompatible mergeable_state, or unknown/null
 * mergeability beyond a bounded retry all fail closed; closed/merged PRs, a
 * non-main base, and base drift fail closed.
 */

const fs = require('node:fs');
const path = require('node:path');
const integrity = require('../integrity/mdg-ops-integrity.cjs');
const ledger = require('../ledger/mdg-ops-ledger.cjs');
const privateOutput = require('../private/mdg-ops-private-output.cjs');
const { resolveRemoteState, SHA_RE } = require('./remote-state.cjs');
const { evaluateRequiredChecks } = require('./check-rollup.cjs');

const HEX64_RE = /^[0-9a-f]{64}$/;
/** mergeable_state values that mean the PR cannot be cleanly merged right now. */
const BAD_MERGEABLE_STATES = new Set(['dirty', 'blocked', 'behind', 'has_hooks', 'unknown_invalid']);

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
  if (/acceptance commands/.test(r)) return 'EVIDENCE_ACCEPTANCE_FAILED';
  if (/not bound to an accepted candidate/.test(r)) return 'EVIDENCE_NOT_BOUND';
  if (/required check/.test(r)) return 'REQUIRED_CHECK_NOT_SATISFIED';
  return 'INTEGRITY_CHECK_FAILED';
}

/**
 * R2-D: enforce PR mergeability with bounded retry for the async "unknown" case.
 * GitHub computes mergeability asynchronously; mergeable may be null on first
 * read. Re-query the PR (via ghApi) up to maxRetries times until mergeable is a
 * boolean, then enforce.
 */
function enforceMergeability(remote, opts) {
  const { repoFullName, prNumber, ghApi, maxRetries = 3, delayMs = 0 } = opts;
  let mergeable = remote.mergeable;
  let mergeableState = remote.mergeableState;
  let attempts = 0;
  while (mergeable === null && attempts < maxRetries) {
    if (delayMs > 0) {
      const until = Date.now() + delayMs;
      while (Date.now() < until) { /* bounded busy-wait; delayMs is small/test-zero */ }
    }
    attempts += 1;
    try {
      const pr = ghApi(`repos/${repoFullName}/pulls/${prNumber}`);
      mergeable = pr && pr.mergeable === undefined ? null : pr.mergeable;
      mergeableState = pr && pr.mergeable_state === undefined ? null : pr.mergeable_state;
    } catch (error) {
      return { ok: false, reasons: ['REMOTE_PR_UNAVAILABLE'], mergeable, mergeableState, attempts };
    }
  }
  if (mergeable === null) {
    return { ok: false, reasons: ['REMOTE_MERGEABILITY_UNKNOWN'], mergeable, mergeableState, attempts };
  }
  if (mergeable === false) {
    return { ok: false, reasons: ['REMOTE_NOT_MERGEABLE'], mergeable, mergeableState, attempts };
  }
  if (mergeableState && BAD_MERGEABLE_STATES.has(mergeableState)) {
    return { ok: false, reasons: [`REMOTE_MERGEABLE_STATE:${mergeableState}`], mergeable, mergeableState, attempts };
  }
  return { ok: true, reasons: [], mergeable, mergeableState, attempts };
}

/**
 * Run the canonical gate, binding to actual local + remote state.
 *
 * @param {object} args parsed CLI args
 * @param {object} runners { git, ghApi, env, ghApiCheckRuns, delayMs, maxMergeRetries }
 * @returns {object} { ok, reasons, detail, reasonCodes }
 */
function runGate(args, runners) {
  const { git, ghApi, env = process.env, ghApiCheckRuns, delayMs = 0, maxMergeRetries = 3 } = runners;

  // Validate required args FIRST (independent of repo topology).
  const repoFullName = requireArg(args, 'repoFullName');
  const prNumber = requireArg(args, 'prNumber');
  const evidencePath = requireArg(args, 'evidence');
  // R2-A: REQUIRED manual trust anchor.
  const expectEvidenceSha256 = requireArg(args, 'expectEvidenceSha256');
  if (!HEX64_RE.test(expectEvidenceSha256)) throw new Error('GATE_EXPECT_EVIDENCE_DIGEST_INVALID');
  const baseBranch = args.baseBranch || 'main';
  const allowDraft = args.allowDraft === true || args.allowDraft === 'true';

  const repoDir = args.repo ? path.resolve(args.repo) : findRepoRoot();
  if (!repoDir) throw new Error('GATE_NO_REPO');
  const root = ledger.resolveRoot({ repoRoot: repoDir, env });

  // Read + validate the private bound verifier evidence (Tier 0).
  const safeEvidence = privateOutput.validatePrivateReadPath(root, evidencePath);
  const evidence = JSON.parse(fs.readFileSync(safeEvidence, 'utf8'));
  if (!integrity.evidenceSelfConsistent(evidence)) {
    return finalize(false, ['evidence document is not self-consistent (evidence_sha256 mismatch)'], { evidencePath: safeEvidence });
  }

  // R2-A: compare the operator-authorized digest with the evidence document's
  // exact bound evidence_sha256 (the local A+ manual trust anchor).
  if (String(evidence.evidence_sha256).toLowerCase() !== expectEvidenceSha256.toLowerCase()) {
    return finalize(false, ['EVIDENCE_DIGEST_MISMATCH'], { evidencePath: safeEvidence });
  }

  const reasons = [];
  const detail = { repoFullName, prNumber, baseBranch, evidencePath: safeEvidence, expectEvidenceSha256 };

  // R1-A/R2-C: resolve the ACTUAL remote + PR state (origin binding, fail closed).
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

  // R2-D: draft requires explicit allowance (canonical pre-ready mode).
  if (remote.prDraft && !allowDraft) reasons.push('REMOTE_PR_DRAFT_NOT_ALLOWED');

  // R2-A.4: actual PR head SHA must equal the evidence-bound candidate.
  if (remote.headSha !== evidence.accepted_candidate_sha) reasons.push('REMOTE_PR_HEAD_MISMATCH');
  // R1-A.5: actual origin/<base> must equal the evidence base (drift check).
  if (remote.actualBaseSha !== evidence.base_sha) reasons.push('REMOTE_BASE_DRIFT');
  if (remote.baseSha !== remote.actualBaseSha) reasons.push('REMOTE_PR_BASE_STALE');

  // R2-D: enforce mergeability (bounded retry for the async unknown case).
  const merge = enforceMergeability(remote, { repoFullName, prNumber, ghApi, maxRetries: maxMergeRetries, delayMs });
  detail.mergeable = merge.mergeable;
  detail.mergeableState = merge.mergeableState;
  detail.mergeAttempts = merge.attempts;
  if (!merge.ok) reasons.push(...merge.reasons);

  // R2-B: exact local HEAD == evidence-bound candidate (canonical mode), AND tree.
  let localHead;
  let localTree;
  let candidateTree;
  try {
    localHead = git(repoDir, ['rev-parse', 'HEAD']);
    localTree = git(repoDir, ['rev-parse', 'HEAD^{tree}']);
    candidateTree = git(repoDir, ['rev-parse', `${evidence.accepted_candidate_sha}^{tree}`]);
  } catch (error) {
    reasons.push('LOCAL_HEAD_UNRESOLVABLE');
  }
  detail.localHead = localHead;
  detail.localTree = localTree;
  detail.candidateTree = candidateTree;
  if (localHead && localHead !== evidence.accepted_candidate_sha) {
    reasons.push('LOCAL_HEAD_MISMATCH'); // clean different commit (even same tree) fails canonical mode
  }
  if (localTree && candidateTree && localTree !== candidateTree) {
    reasons.push('LOCAL_TREE_MISMATCH');
  }

  // R2-A: authoritative shared verifier with independently derived actual values.
  // requiredChecks is passed empty so verifyCandidate's name-only check is a no-op;
  // the LIVE authenticated rollup (R2-E) is evaluated separately below.
  const verification = integrity.verifyCandidate(repoDir, evidence, remote.headSha, {
    expectedBaseSha: remote.actualBaseSha,
    currentHeadSha: remote.headSha,
    requireCleanWorktree: true,
    requiredChecks: [],
  });
  detail.canonicalDiffSha256 = verification.manifest ? verification.manifest.canonical_diff_sha256 : null;
  for (const r of verification.reasons) reasons.push(r);

  // R2-E/R2-F: evaluate the LIVE authenticated required-check rollup.
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
      ghApiCheckRuns,
    });
  } catch (error) {
    reasons.push(error.message && /^CHECK_POLICY_/.test(error.message) ? error.message : 'CHECK_ROLLUP_FAILED');
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

module.exports = { runGate, reasonCode, requireArg, findRepoRoot, enforceMergeability, HEX64_RE, BAD_MERGEABLE_STATES };

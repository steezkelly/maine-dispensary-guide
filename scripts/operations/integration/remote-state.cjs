'use strict';

/**
 * Remote-state resolution for the canonical Integrator gate (OPS-06B-P1-R1 finding A).
 *
 * Resolves the ACTUAL repository + pull-request state from live sources (git +
 * the GitHub API). The gate must bind to these independently-derived values,
 * NOT to caller-supplied --candidate / --expected-base / --current-head, which
 * are untrusted assertions.
 *
 * Every lookup is fail-closed: any unavailable, ambiguous, stale, or
 * inconsistent result throws a stable-coded error so the gate rejects before
 * any merge could proceed.
 *
 * git/gh runners are dependency-injected so the binding logic is unit-testable
 * with mocked responses; the CLI supplies real spawnSync-backed runners, and at
 * least one integration test exercises a real isolated bare remote.
 */

const { execFileSync } = require('node:child_process');

const SHA_RE = /^[0-9a-f]{40}$/;

/** Real git runner (cwd-scoped, no terminal prompt). */
function defaultGit(repoDir, args) {
  return execFileSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

/** Real GitHub API runner via the gh CLI (returns parsed JSON). */
function defaultGhApi(apiPath) {
  const out = execFileSync('gh', ['api', apiPath], { encoding: 'utf8' });
  return JSON.parse(out);
}

/**
 * Resolve the actual remote + PR state.
 *
 * @param {object} opts
 * @param {string} opts.repoDir       local repository/worktree path
 * @param {string} opts.repoFullName  e.g. "steezkelly/maine-dispensary-guide"
 * @param {number|string} opts.prNumber
 * @param {string} [opts.baseBranch]  expected base branch (default "main")
 * @param {Function} [opts.git]       injectable git runner (repoDir, args[]) => string
 * @param {Function} [opts.ghApi]     injectable GitHub API runner (apiPath) => object
 * @returns {object} actual state (see below)
 * @throws {Error} stable-coded error on any unavailable/ambiguous/inconsistent lookup
 */
function resolveRemoteState(opts) {
  const {
    repoDir,
    repoFullName,
    prNumber,
    baseBranch = 'main',
    git = defaultGit,
    ghApi = defaultGhApi,
  } = opts;

  if (!repoFullName || !/^[^/\s]+\/[^/\s]+$/.test(repoFullName)) {
    throw new Error('REMOTE_REPO_NAME_INVALID');
  }
  if (prNumber === undefined || prNumber === null || prNumber === '') {
    throw new Error('REMOTE_PR_NUMBER_MISSING');
  }
  const retrievedAt = new Date().toISOString();

  // 1. fetch origin with pruning (drops stale remote-tracking refs).
  try {
    git(repoDir, ['fetch', 'origin', '--prune']);
  } catch (error) {
    throw new Error('REMOTE_FETCH_FAILED');
  }

  // 2. resolve the ACTUAL current origin/<baseBranch> SHA from live git.
  let actualBaseSha;
  try {
    actualBaseSha = git(repoDir, ['rev-parse', `origin/${baseBranch}`]);
  } catch (error) {
    throw new Error('REMOTE_BASE_UNRESOLVABLE');
  }
  if (!SHA_RE.test(actualBaseSha || '')) throw new Error('REMOTE_BASE_AMBIGUOUS');

  // 3. query the ACTUAL PR from the GitHub API.
  let pr;
  try {
    pr = ghApi(`repos/${repoFullName}/pulls/${prNumber}`);
  } catch (error) {
    throw new Error('REMOTE_PR_UNAVAILABLE');
  }
  if (!pr || typeof pr !== 'object' || Array.isArray(pr)) throw new Error('REMOTE_PR_UNAVAILABLE');

  const headSha = pr.head && pr.head.sha;
  const baseSha = pr.base && pr.base.sha;
  const baseRef = pr.base && pr.base.ref;

  // 4. validate the PR response is complete and unambiguous.
  if (!SHA_RE.test(headSha || '')) throw new Error('REMOTE_PR_HEAD_AMBIGUOUS');
  if (!SHA_RE.test(baseSha || '')) throw new Error('REMOTE_PR_BASE_AMBIGUOUS');
  if (!baseRef) throw new Error('REMOTE_PR_BASE_REF_MISSING');
  if (!pr.state) throw new Error('REMOTE_PR_STATE_MISSING');

  return {
    retrievedAt,
    repoFullName,
    prNumber: pr.number !== undefined ? pr.number : Number(prNumber),
    prState: pr.state, // "open" | "closed"
    prDraft: !!pr.draft,
    prMerged: !!pr.merged,
    baseRef,
    baseSha, // PR's recorded base SHA
    headRef: pr.head && pr.head.ref,
    headSha, // actual current PR head SHA (the candidate)
    mergeable: pr.mergeable === undefined ? null : pr.mergeable,
    mergeableState: pr.mergeable_state === undefined ? null : pr.mergeable_state,
    actualBaseSha, // live origin/<baseBranch>
    expectedBaseBranch: baseBranch,
  };
}

module.exports = { resolveRemoteState, defaultGit, defaultGhApi, SHA_RE };

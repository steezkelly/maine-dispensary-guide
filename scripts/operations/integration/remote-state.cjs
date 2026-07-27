'use strict';

/**
 * Remote-state resolution for the canonical Integrator gate.
 * (OPS-06B-P1-R1 finding A; hardened by OPS-06B-P1-R2 findings C and D.)
 *
 * Resolves the ACTUAL repository + pull-request state from live sources (git +
 * the GitHub API). The gate must bind to these independently-derived values,
 * NOT to caller-supplied --candidate / --expected-base / --current-head, which
 * are untrusted assertions.
 *
 * R2-C: the local `origin` remote is canonicalized and proven to correspond
 * exactly to the requested --repo-full-name (rejecting forks, other repos,
 * missing/ambiguous/malformed origins). --pr-number is validated as a positive
 * integer (no arbitrary API-path fragments).
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
/** Strict GitHub repository full name: owner/repo, GitHub-legal characters. */
const REPO_FULL_NAME_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

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
 * Hosts accepted as the GitHub origin. Always includes github.com; may include
 * an explicitly configured GitHub Enterprise hostname via MDG_GITHUB_HOST
 * (comma-separated). A wrong host (e.g. a fork host or example.invalid) is
 * rejected so an attacker-controlled or lookalike remote cannot satisfy the
 * origin binding (t_abf7bf45 origin-host binding).
 */
function allowedGitHubHosts() {
  const hosts = new Set(['github.com']);
  const extra = String(process.env.MDG_GITHUB_HOST || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const h of extra) hosts.add(h);
  return hosts;
}

/**
 * Canonicalize a git remote URL to an `owner/repo` full name.
 * Supports:
 *   https://github.com/owner/repo[.git]
 *   git@github.com:owner/repo[.git]            (scp-like)
 *   ssh://git@github.com[:port]/owner/repo[.git]
 *   git://github.com/owner/repo[.git]
 * Returns null when the URL is malformed, the host is not an accepted GitHub
 * host, or the path does not yield a valid full name.
 */
function canonicalizeRepoFullName(url) {
  if (typeof url !== 'string') return null;
  const s = url.trim();
  if (!s) return null;

  let host = null;
  let pathPart = null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(s)) {
    // Has a scheme:// (https, ssh, git) → parse as a URL.
    try {
      const u = new URL(s);
      host = u.hostname;
      pathPart = u.pathname;
    } catch (error) {
      return null;
    }
  } else {
    // scp-like: [user@]host:path  (e.g. git@github.com:owner/repo.git)
    const m = s.match(/^(?:[A-Za-z0-9._-]+@)?([A-Za-z0-9._-]+):(.+)$/);
    if (!m) return null;
    host = m[1];
    pathPart = m[2];
  }
  if (!host || !pathPart) return null;

  // Origin-host binding: the host must be an accepted GitHub host. Rejects
  // wrong hosts such as https://example.invalid/owner/repo.git or fork hosts.
  if (!allowedGitHubHosts().has(host.toLowerCase())) return null;

  let p = pathPart.replace(/^\/+/, '').replace(/\/+$/, '');
  p = p.replace(/\.git$/i, '').replace(/\/+$/, '');
  if (!REPO_FULL_NAME_RE.test(p)) return null;
  return p;
}

/**
 * Validate --pr-number is a positive integer (rejects non-numeric, zero,
 * negative, and arbitrary API-path fragments containing '/', spaces, or letters).
 * @returns {number} the validated positive integer
 * @throws {Error} REMOTE_PR_NUMBER_INVALID
 */
function validatePrNumber(prNumber) {
  const s = String(prNumber === undefined || prNumber === null ? '' : prNumber).trim();
  if (!/^[0-9]+$/.test(s)) throw new Error('REMOTE_PR_NUMBER_INVALID');
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) throw new Error('REMOTE_PR_NUMBER_INVALID');
  return n;
}

/**
 * R2-C: bind the local `origin` remote to the requested repository full name.
 * Reads all origin URLs, canonicalizes each, and proves the single canonical
 * form equals repoFullName.
 * @throws {Error} REMOTE_ORIGIN_MISSING | REMOTE_ORIGIN_MALFORMED |
 *                 REMOTE_ORIGIN_AMBIGUOUS | REMOTE_ORIGIN_MISMATCH
 */
function resolveOriginBinding(repoDir, repoFullName, git = defaultGit) {
  let urls;
  try {
    const out = git(repoDir, ['remote', 'get-url', '--all', 'origin']);
    urls = String(out).split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (error) {
    throw new Error('REMOTE_ORIGIN_MISSING');
  }
  if (!urls.length) throw new Error('REMOTE_ORIGIN_MISSING');
  const canonical = new Set(urls.map(canonicalizeRepoFullName));
  if (canonical.has(null)) throw new Error('REMOTE_ORIGIN_MALFORMED');
  if (canonical.size > 1) throw new Error('REMOTE_ORIGIN_AMBIGUOUS');
  const actual = [...canonical][0];
  if (actual !== repoFullName) throw new Error('REMOTE_ORIGIN_MISMATCH');
  return { originUrls: urls, canonicalRepoFullName: actual };
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

  // R2-C: strict repository full-name validation.
  if (!repoFullName || !REPO_FULL_NAME_RE.test(repoFullName)) {
    throw new Error('REMOTE_REPO_NAME_INVALID');
  }
  // R2-C: positive-integer PR number (no API-path fragments).
  const prNumberInt = validatePrNumber(prNumber);

  // R2-C: bind the local origin to the requested repository.
  const originBinding = resolveOriginBinding(repoDir, repoFullName, git);

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
    pr = ghApi(`repos/${repoFullName}/pulls/${prNumberInt}`);
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
    prNumber: pr.number !== undefined ? pr.number : prNumberInt,
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
    originBinding, // R2-C: { originUrls, canonicalRepoFullName }
  };
}

module.exports = {
  resolveRemoteState,
  resolveOriginBinding,
  canonicalizeRepoFullName,
  validatePrNumber,
  defaultGit,
  defaultGhApi,
  SHA_RE,
  REPO_FULL_NAME_RE,
};

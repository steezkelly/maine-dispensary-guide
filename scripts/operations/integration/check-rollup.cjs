'use strict';

/**
 * Live required-check rollup for the canonical Integrator gate
 * (OPS-06B-P1-R1 finding B).
 *
 * Replaces the caller-authored --checks JSON manifest (which an empty array or
 * fabricated success records could satisfy). Required-check evidence is now
 * derived from the LIVE GitHub check-run rollup for the exact PR head, evaluated
 * against a trusted policy.
 *
 * Trust model for the policy:
 *   - A NON-NEGOTIABLE FLOOR of required contexts is hardcoded here and can
 *     never be weakened by any policy file (the candidate cannot drop its own
 *     required checks).
 *   - Additional required contexts and the skipped-allowlist may be defined in
 *     ONE versioned policy read from the trusted BASE branch (origin/main),
 *     never from the candidate (a candidate that could edit its own policy could
 *     weaken its own requirements).
 *
 * Evaluation is fail-closed: empty required set, missing context, pending,
 * failure, cancelled, timed_out, stale (another SHA), duplicate/conflicting
 * contexts, and skipped (unless explicitly allowlisted) all fail.
 *
 * The result is bound to repository, PR number, candidate/head SHA, base SHA,
 * the exact check-run IDs evaluated, and a retrieval timestamp.
 */

const { execFileSync } = require('node:child_process');

const POLICY_SCHEMA = 'mdg-operations-check-policy-v1';

/**
 * NON-NEGOTIABLE required contexts. These can never be removed by a policy file.
 * A candidate cannot weaken its own required checks.
 */
const REQUIRED_CONTEXT_FLOOR = Object.freeze(['Operations Suite', 'Build']);

/** Conclusions that count as a passing check. */
const PASS_CONCLUSIONS = Object.freeze(['success', 'neutral']);
/** Conclusions that are an explicit failure. */
const FAIL_CONCLUSIONS = Object.freeze(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure']);

function defaultGhApi(apiPath) {
  const out = execFileSync('gh', ['api', apiPath], { encoding: 'utf8' });
  return JSON.parse(out);
}

/** Read the trusted check policy from the base branch (origin/main), if present. */
function readTrustedPolicy(git, repoDir, baseBranch) {
  let raw;
  try {
    raw = git(repoDir, ['show', `origin/${baseBranch}:scripts/operations/integration/check-policy.json`]);
  } catch (error) {
    return null; // no policy file on the trusted base -> floor only
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('CHECK_POLICY_MALFORMED');
  }
  if (parsed.schema !== POLICY_SCHEMA) throw new Error('CHECK_POLICY_SCHEMA');
  return parsed;
}

/**
 * Compute the effective required-context set: floor UNION policy.required.
 * The floor can never be subtracted.
 */
function effectiveRequired(policy) {
  const required = new Set(REQUIRED_CONTEXT_FLOOR);
  if (policy && Array.isArray(policy.required_contexts)) {
    for (const ctx of policy.required_contexts) {
      if (typeof ctx === 'string' && ctx.trim()) required.add(ctx.trim());
    }
  }
  return [...required];
}

/** Skipped-allowlist comes only from the trusted policy (default: none). */
function skippedAllowlist(policy) {
  if (policy && Array.isArray(policy.skipped_allowlist)) {
    return new Set(policy.skipped_allowlist.filter((c) => typeof c === 'string'));
  }
  return new Set();
}

/**
 * Evaluate the live check-run rollup for the exact candidate head.
 *
 * @param {object} opts
 * @param {string} opts.repoFullName
 * @param {number|string} opts.prNumber
 * @param {string} opts.headSha        exact candidate / PR head SHA (binding)
 * @param {string} opts.baseSha        exact base SHA (binding)
 * @param {string} opts.repoDir        local repo (to read the trusted policy from origin/main)
 * @param {string} [opts.baseBranch]   default "main"
 * @param {Function} [opts.ghApi]      injectable GitHub API runner
 * @param {Function} [opts.git]        injectable git runner (for policy read)
 * @returns {object} { ok, required, evaluated, reasons, binding }
 */
function evaluateRequiredChecks(opts) {
  const {
    repoFullName,
    prNumber,
    headSha,
    baseSha,
    repoDir,
    baseBranch = 'main',
    ghApi = defaultGhApi,
    git,
  } = opts;

  const retrievedAt = new Date().toISOString();
  const reasons = [];

  // Trusted policy from the base branch (floor is always enforced regardless).
  const policy = git ? readTrustedPolicy(git, repoDir, baseBranch) : null;
  const required = effectiveRequired(policy);
  const allowSkipped = skippedAllowlist(policy);

  if (required.length === 0) {
    // Defense-in-depth: the floor guarantees this never happens, but fail closed.
    return fail('REQUIRED_CHECK_SET_EMPTY', { required, retrievedAt, repoFullName, prNumber, headSha, baseSha });
  }

  // Fetch the live check runs for the exact candidate head.
  let checkRuns;
  try {
    const resp = ghApi(`repos/${repoFullName}/commits/${headSha}/check-runs?per_page=100`);
    checkRuns = resp && Array.isArray(resp.check_runs) ? resp.check_runs : null;
  } catch (error) {
    return fail('CHECK_RUNS_UNAVAILABLE', { required, retrievedAt, repoFullName, prNumber, headSha, baseSha });
  }
  if (!checkRuns) {
    return fail('CHECK_RUNS_UNAVAILABLE', { required, retrievedAt, repoFullName, prNumber, headSha, baseSha });
  }

  // Bind to the exact head SHA: only consider runs whose head_sha matches.
  // Runs from another SHA are stale and must not satisfy a requirement.
  const evaluated = [];
  const byContext = new Map();
  for (const run of checkRuns) {
    if (!run || typeof run.name !== 'string') continue;
    if (run.head_sha !== headSha) continue; // stale / wrong SHA -> ignored (cannot satisfy)
    evaluated.push({
      name: run.name,
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      head_sha: run.head_sha,
      app: run.app && run.app.slug,
      html_url: run.html_url,
      started_at: run.started_at,
      completed_at: run.completed_at,
    });
    if (!byContext.has(run.name)) byContext.set(run.name, []);
    byContext.get(run.name).push(run);
  }

  // Evaluate each required context.
  for (const ctx of required) {
    const runs = byContext.get(ctx);
    if (!runs || runs.length === 0) {
      reasons.push(`required check missing: ${ctx}`);
      continue;
    }
    // Duplicate/conflicting contexts fail closed.
    const conclusions = new Set(runs.map((r) => r.conclusion));
    if (runs.length > 1 && conclusions.size > 1) {
      reasons.push(`required check has conflicting duplicate results: ${ctx}`);
      continue;
    }
    // Multiple identical runs are tolerated; evaluate the conclusion.
    const run = runs[0];
    if (run.status !== 'completed') {
      reasons.push(`required check not completed (pending): ${ctx}`);
      continue;
    }
    if (PASS_CONCLUSIONS.includes(run.conclusion)) continue; // satisfied
    if (run.conclusion === 'skipped') {
      if (allowSkipped.has(ctx)) continue; // explicitly allowlisted in trusted policy
      reasons.push(`required check skipped (not allowlisted): ${ctx}`);
      continue;
    }
    // failure / cancelled / timed_out / action_required / startup_failure / null
    reasons.push(`required check not successful: ${ctx}`);
  }

  const binding = { repoFullName, prNumber, headSha, baseSha, checkRunIds: evaluated.map((e) => e.id), retrievedAt };
  return { ok: reasons.length === 0, required, evaluated, reasons, binding };
}

function fail(code, binding) {
  return { ok: false, required: binding ? effectiveRequired(null) : [], evaluated: [], reasons: [code], binding: { ...binding, code } };
}

module.exports = {
  evaluateRequiredChecks,
  readTrustedPolicy,
  effectiveRequired,
  skippedAllowlist,
  REQUIRED_CONTEXT_FLOOR,
  POLICY_SCHEMA,
  PASS_CONCLUSIONS,
  FAIL_CONCLUSIONS,
  defaultGhApi,
};

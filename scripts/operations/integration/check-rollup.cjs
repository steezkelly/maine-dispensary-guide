'use strict';

/**
 * Live required-check rollup for the canonical Integrator gate.
 * (OPS-06B-P1-R1 finding B; hardened by OPS-06B-P1-R2 findings E and F.)
 *
 * Required-check evidence is derived from the LIVE GitHub check-run rollup for
 * the exact PR head, evaluated against immutable floor specifications and an
 * optional trusted policy read from the base branch.
 *
 * R2-E — AUTHENTICATE CHECK PRODUCERS. The floor is a set of immutable
 * specifications, not bare names. A floor context is satisfied ONLY when a
 * check-run matches on exact name, exact trusted app (slug + integration id),
 * exact candidate head SHA, status completed, and conclusion exactly "success".
 * neutral/skipped are insufficient; a policy cannot allowlist a floor context as
 * skipped; another app producing the same check name cannot satisfy the floor.
 * The app id/slug are bound into the private detailed rollup record.
 *
 * R2-F — STRICT TRUSTED POLICY. The base-branch check policy has a versioned
 * strict schema and fails closed on unknown fields, wrong types, duplicate
 * contexts, blank names, floor contexts in the skipped allowlist, malformed
 * allowlist, or unsupported schema version. A malformed policy on origin/main
 * blocks integration rather than silently falling back to the floor — except
 * when the policy file is genuinely absent (documented floor-only policy).
 * Check-run pagination is handled: every page is retrieved, or the rollup fails
 * closed when a page is incomplete, so a conflicting duplicate beyond the first
 * page cannot be ignored.
 *
 * Trust model: the NON-NEGOTIABLE FLOOR is hardcoded here and can never be
 * weakened by any policy file (the candidate cannot drop its own required
 * checks). Additional required contexts and the skipped-allowlist may be defined
 * in ONE versioned policy read from the trusted BASE branch (origin/main), never
 * from the candidate.
 *
 * The result is bound to repository, PR number, candidate/head SHA, base SHA,
 * the exact check-run IDs evaluated (with app id/slug), and a retrieval
 * timestamp.
 */

const { execFileSync } = require('node:child_process');

const POLICY_SCHEMA = 'mdg-operations-check-policy-v1';

/**
 * NON-NEGOTIABLE floor specifications. These can never be removed or weakened by
 * a policy file. The app id/slug are verified from live check-run objects
 * (GitHub Actions integration id 15368, slug "github-actions"); a check-run from
 * any other app cannot satisfy a floor context.
 */
const REQUIRED_CONTEXT_FLOOR = Object.freeze([
  Object.freeze({ name: 'Operations Suite', app_slug: 'github-actions', app_id: 15368, required_conclusion: 'success' }),
  Object.freeze({ name: 'Build', app_slug: 'github-actions', app_id: 15368, required_conclusion: 'success' }),
]);

const FLOOR_NAMES = Object.freeze(REQUIRED_CONTEXT_FLOOR.map((s) => s.name));

function defaultGhApi(apiPath) {
  const out = execFileSync('gh', ['api', apiPath], { encoding: 'utf8' });
  return JSON.parse(out);
}

/**
 * The exact `gh api` argument list used to retrieve paginated check runs
 * (t_b7c5d622 pagination robustness, gh-2.45 compatible).
 *
 * `--paginate --jq '<per-page object>'` makes gh run the jq expression once PER
 * page and emit one compact JSON object per line (NDJSON). This gives
 * unambiguous page boundaries (each line is exactly one page), works on gh
 * 2.45.0 (which has NO --slurp flag), and preserves total_count + every
 * check_run (including producer/app and head_sha fields) on every page.
 *
 * Frozen and exported so the deterministic regression test can assert the real
 * argument list and fail if `--slurp` is ever reintroduced.
 */
const CHECK_RUNS_JQ = '{total_count: .total_count, check_runs: .check_runs}';
const CHECK_RUNS_GH_ARGS = Object.freeze(['api', '--paginate', '--jq', CHECK_RUNS_JQ]);

/**
 * Parse + flatten + validate the NDJSON output of the paginated check-runs
 * command (t_b7c5d622 pagination robustness). Each non-empty line must be a
 * self-contained page object `{ total_count, check_runs: [...] }`. Pure so the
 * fail-closed behavior is directly testable. Fails closed:
 *   - CHECK_RUNS_PAGE_MALFORMED      a line is not valid JSON;
 *   - CHECK_RUNS_PAGE_INCOMPLETE     no pages, or a page lacks a check_runs array;
 *   - CHECK_RUNS_TOTAL_COUNT_MISMATCH total_count disagrees across pages, or the
 *                                     flattened run count != total_count.
 * A truncated/partial pagination therefore cannot silently drop a conflicting
 * duplicate that appears on a later page.
 * @param {string} rawOutput stdout of the paginated check-runs command (NDJSON)
 * @returns {{ check_runs: object[], pages: number }}
 */
function parseCheckRunPages(rawOutput) {
  if (typeof rawOutput !== 'string') throw new Error('CHECK_RUNS_PAGE_MALFORMED');
  const lines = rawOutput.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error('CHECK_RUNS_PAGE_INCOMPLETE');
  const checkRuns = [];
  let expectedTotal = null;
  for (const line of lines) {
    let page;
    try {
      page = JSON.parse(line);
    } catch (error) {
      throw new Error('CHECK_RUNS_PAGE_MALFORMED');
    }
    if (!page || typeof page !== 'object' || Array.isArray(page) || !Array.isArray(page.check_runs)) {
      throw new Error('CHECK_RUNS_PAGE_INCOMPLETE');
    }
    if (typeof page.total_count === 'number') {
      if (expectedTotal === null) expectedTotal = page.total_count;
      else if (page.total_count !== expectedTotal) throw new Error('CHECK_RUNS_TOTAL_COUNT_MISMATCH');
    }
    checkRuns.push(...page.check_runs);
  }
  if (expectedTotal !== null && checkRuns.length !== expectedTotal) {
    throw new Error('CHECK_RUNS_TOTAL_COUNT_MISMATCH');
  }
  return { check_runs: checkRuns, pages: lines.length };
}

/**
 * Paginated check-run retrieval (t_b7c5d622 pagination robustness). Runs
 * `gh api --paginate --jq '<per-page object>' <endpoint>` (see CHECK_RUNS_GH_ARGS)
 * and delegates parsing/validation to parseCheckRunPages so a truncated,
 * malformed, or inconsistent pagination fails closed. gh-2.45 compatible: it
 * deliberately does NOT use --slurp (unsupported on gh 2.45.0).
 * @param {Function} [ghRunner] injectable runner (args[]) => stdout, for tests
 * @returns {{ check_runs: object[], pages: number }}
 */
function defaultGhApiCheckRuns(repoFullName, headSha, ghRunner) {
  const run = ghRunner || ((args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const args = [...CHECK_RUNS_GH_ARGS, `repos/${repoFullName}/commits/${headSha}/check-runs`];
  let out;
  try {
    out = run(args);
  } catch (error) {
    throw new Error('CHECK_RUNS_PAGE_INCOMPLETE');
  }
  return parseCheckRunPages(out);
}

/**
 * R2-F: strictly validate the trusted check policy.
 * @returns {object|null} parsed policy, or null when the file is genuinely absent
 * @throws {Error} CHECK_POLICY_* on any malformation (fail closed)
 */
function readTrustedPolicy(git, repoDir, baseBranch) {
  let raw;
  try {
    raw = git(repoDir, ['show', `origin/${baseBranch}:scripts/operations/integration/check-policy.json`]);
  } catch (error) {
    // Genuinely absent policy file -> documented floor-only policy.
    const msg = String(error && error.message ? error.message : '');
    if (/does not exist|exists on disk|not in|fatal: path/i.test(msg) || /exit code 128/i.test(msg)) {
      return null;
    }
    // Any other read failure is ambiguous -> fail closed.
    throw new Error('CHECK_POLICY_READ_FAILED');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('CHECK_POLICY_MALFORMED');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('CHECK_POLICY_MALFORMED');

  // Strict schema: exactly these fields, no unknown fields.
  const allowed = new Set(['schema', 'required_contexts', 'skipped_allowlist']);
  for (const key of Object.keys(parsed)) {
    if (!allowed.has(key)) throw new Error('CHECK_POLICY_UNKNOWN_FIELD');
  }
  if (parsed.schema !== POLICY_SCHEMA) throw new Error('CHECK_POLICY_SCHEMA');

  // required_contexts: array of non-blank unique strings.
  const required = parsed.required_contexts;
  if (required !== undefined) {
    if (!Array.isArray(required)) throw new Error('CHECK_POLICY_REQUIRED_CONTEXTS_TYPE');
    const seen = new Set();
    for (const ctx of required) {
      if (typeof ctx !== 'string') throw new Error('CHECK_POLICY_REQUIRED_CONTEXTS_TYPE');
      if (!ctx.trim()) throw new Error('CHECK_POLICY_BLANK_CONTEXT');
      if (seen.has(ctx)) throw new Error('CHECK_POLICY_DUPLICATE_CONTEXT');
      seen.add(ctx);
    }
  }

  // skipped_allowlist: array of non-blank unique strings; must NOT contain a
  // floor context (a policy cannot allowlist a floor check as skipped).
  const allow = parsed.skipped_allowlist;
  if (allow !== undefined) {
    if (!Array.isArray(allow)) throw new Error('CHECK_POLICY_ALLOWLIST_TYPE');
    const seen = new Set();
    for (const ctx of allow) {
      if (typeof ctx !== 'string') throw new Error('CHECK_POLICY_ALLOWLIST_TYPE');
      if (!ctx.trim()) throw new Error('CHECK_POLICY_BLANK_CONTEXT');
      if (seen.has(ctx)) throw new Error('CHECK_POLICY_DUPLICATE_CONTEXT');
      if (FLOOR_NAMES.includes(ctx)) throw new Error('CHECK_POLICY_FLOOR_IN_ALLOWLIST');
      seen.add(ctx);
    }
  }

  return parsed;
}

/**
 * Effective required specs: floor UNION policy.required_contexts.
 * Floor specs keep their immutable app binding; policy-added contexts are
 * app-agnostic (any producer) but still must be completed + success.
 */
function effectiveRequired(policy) {
  const specs = REQUIRED_CONTEXT_FLOOR.map((s) => ({ ...s, source: 'floor' }));
  const have = new Set(FLOOR_NAMES);
  if (policy && Array.isArray(policy.required_contexts)) {
    for (const ctx of policy.required_contexts) {
      if (!have.has(ctx)) {
        specs.push({ name: ctx, app_slug: null, app_id: null, required_conclusion: 'success', source: 'policy' });
        have.add(ctx);
      }
    }
  }
  return specs;
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
 * @param {Function} [opts.ghApiCheckRuns] injectable paginated check-run runner
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
    ghApiCheckRuns = defaultGhApiCheckRuns,
    git,
  } = opts;

  const retrievedAt = new Date().toISOString();
  const reasons = [];

  // Trusted policy from the base branch (fail closed on malformation; floor-only
  // when genuinely absent). The floor is always enforced regardless.
  let policy = null;
  if (git) {
    policy = readTrustedPolicy(git, repoDir, baseBranch); // throws on malformation
  }
  const required = effectiveRequired(policy);
  const allowSkipped = skippedAllowlist(policy);

  if (required.length === 0) {
    return fail('REQUIRED_CHECK_SET_EMPTY', { retrievedAt, repoFullName, prNumber, headSha, baseSha });
  }

  // Fetch ALL pages of the live check runs for the exact candidate head.
  let resp;
  try {
    resp = ghApiCheckRuns(repoFullName, headSha);
  } catch (error) {
    const code = String(error && error.message ? error.message : '');
    return fail(code === 'CHECK_RUNS_PAGE_INCOMPLETE' ? 'CHECK_RUNS_PAGE_INCOMPLETE' : 'CHECK_RUNS_UNAVAILABLE',
      { retrievedAt, repoFullName, prNumber, headSha, baseSha });
  }
  const checkRuns = resp && Array.isArray(resp.check_runs) ? resp.check_runs : null;
  if (!checkRuns) {
    return fail('CHECK_RUNS_UNAVAILABLE', { retrievedAt, repoFullName, prNumber, headSha, baseSha });
  }

  // Bind to the exact head SHA: only consider runs whose head_sha matches.
  // Runs from another SHA are stale and cannot satisfy a requirement.
  const evaluated = [];
  const byContext = new Map();
  for (const run of checkRuns) {
    if (!run || typeof run.name !== 'string') continue;
    if (run.head_sha !== headSha) continue; // stale / wrong SHA -> ignored
    const appId = run.app && typeof run.app.id === 'number' ? run.app.id : null;
    const appSlug = run.app && typeof run.app.slug === 'string' ? run.app.slug : null;
    evaluated.push({
      name: run.name,
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      head_sha: run.head_sha,
      app_id: appId,
      app_slug: appSlug,
      html_url: run.html_url,
      started_at: run.started_at,
      completed_at: run.completed_at,
    });
    if (!byContext.has(run.name)) byContext.set(run.name, []);
    byContext.get(run.name).push({ run, appId, appSlug });
  }

  // Evaluate each required spec.
  for (const spec of required) {
    const entries = byContext.get(spec.name);
    if (!entries || entries.length === 0) {
      reasons.push(`required check missing: ${spec.name}`);
      continue;
    }

    // R2-E: for floor contexts, the producer must be the exact trusted app.
    // A check with the same name from another app does not satisfy the floor.
    let matching = entries;
    if (spec.app_id !== null) {
      matching = entries.filter((e) => e.appId === spec.app_id && e.appSlug === spec.app_slug);
      if (matching.length === 0) {
        reasons.push(`required check producer not trusted: ${spec.name}`);
        continue;
      }
    }

    // Duplicate/conflicting contexts fail closed (across the trusted-producer set).
    const conclusions = new Set(matching.map((e) => e.run.conclusion));
    if (matching.length > 1 && conclusions.size > 1) {
      reasons.push(`required check has conflicting duplicate results: ${spec.name}`);
      continue;
    }

    const entry = matching[0];
    const run = entry.run;
    if (run.status !== 'completed') {
      reasons.push(`required check not completed (pending): ${spec.name}`);
      continue;
    }
    // R2-E: conclusion must be EXACTLY the required conclusion (success).
    // neutral and skipped are insufficient for a floor context.
    if (run.conclusion === spec.required_conclusion) continue; // satisfied
    if (run.conclusion === 'skipped') {
      // A policy may allowlist skipping for POLICY-added contexts only; a floor
      // context can never be allowlisted as skipped (enforced in policy validation).
      if (spec.app_id === null && allowSkipped.has(spec.name)) continue;
      reasons.push(`required check skipped (not sufficient): ${spec.name}`);
      continue;
    }
    reasons.push(`required check not successful: ${spec.name}`);
  }

  const binding = {
    repoFullName,
    prNumber,
    headSha,
    baseSha,
    checkRunIds: evaluated.map((e) => e.id),
    apps: evaluated.map((e) => ({ id: e.app_id, slug: e.app_slug })),
    retrievedAt,
  };
  return { ok: reasons.length === 0, required, evaluated, reasons, binding };
}

function fail(code, binding) {
  return { ok: false, required: effectiveRequired(null), evaluated: [], reasons: [code], binding: { ...binding, code } };
}

module.exports = {
  evaluateRequiredChecks,
  readTrustedPolicy,
  effectiveRequired,
  skippedAllowlist,
  REQUIRED_CONTEXT_FLOOR,
  FLOOR_NAMES,
  POLICY_SCHEMA,
  defaultGhApi,
  defaultGhApiCheckRuns,
  parseCheckRunPages,
  CHECK_RUNS_GH_ARGS,
  CHECK_RUNS_JQ,
};

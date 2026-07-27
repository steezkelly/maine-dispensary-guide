#!/usr/bin/env node
'use strict';

/**
 * OPS-06B-P1-R2 — evidence semantics, manual authorization digest binding,
 * exact-HEAD canonical mode, local-origin binding, PR mergeability/draft,
 * required-check producer authentication, and strict trusted-policy validation.
 *
 * Exercises the side-effect-free gate core and its modules with injected
 * git/gh runners. Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../../..');
const GATE = require('../integration/gate.cjs');
const ROLLUP = require('../integration/check-rollup.cjs');
const REMOTE = require('../integration/remote-state.cjs');
const INTEGRITY = require('../integrity/mdg-ops-integrity.cjs');
const INTEGRITY_CLI = path.resolve(__dirname, '../integrity/cli.cjs');

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.t', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2x-root-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function makeRepoWithCandidate() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2x-repo-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'base');
  const base = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'checkout', '-q', '-b', 'candidate');
  fs.writeFileSync(path.join(repo, 'impl.cjs'), 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'candidate');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  return { repo, base, candidate };
}

function captureEvidence(repo, base, root, { outcome = 'PASS', accept = 'node --test impl.test.cjs=0' } = {}) {
  const out = path.join(root, 'evidence.json');
  const cap = spawnSync(process.execPath, [
    INTEGRITY_CLI, 'capture-evidence', '--repo', repo, '--taskId', 't_r2x', '--base', base,
    '--timestamp', '2026-07-27T00:00:00Z', '--outcome', outcome,
    '--accept', accept, '--out', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root } });
  assert.equal(cap.status, 0, cap.stderr);
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const bind = spawnSync(process.execPath, [
    INTEGRITY_CLI, 'bind-candidate', '--repo', repo, '--evidence', out, '--candidate', candidate, '--out', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root } });
  assert.equal(bind.status, 0, bind.stderr);
  return { evidence: out, candidate };
}

/** Load evidence, mutate it, re-seal so it stays self-consistent (R2-A). */
function mutateEvidence(evidencePath, mutator) {
  const ev = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  mutator(ev);
  const sealed = INTEGRITY.sealEvidence(ev);
  fs.writeFileSync(evidencePath, JSON.stringify(sealed, null, 2));
  return sealed;
}

function readDigest(evidencePath) {
  return JSON.parse(fs.readFileSync(evidencePath, 'utf8')).evidence_sha256;
}

function isPolicyShow(args) {
  return args[0] === 'show' && /check-policy\.json$/.test(args[1] || '');
}
function throwPolicyAbsent() {
  throw new Error("fatal: path 'scripts/operations/integration/check-policy.json' does not exist in 'origin/main'");
}

function realGit(repo, baseSha, { policyJson = null } = {}) {
  return (repoDir, args) => {
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return baseSha;
    if (args[0] === 'remote' && args[1] === 'get-url') return 'https://github.com/steezkelly/maine-dispensary-guide.git';
    if (isPolicyShow(args)) {
      if (policyJson === null) throwPolicyAbsent();
      return policyJson;
    }
    return git(repoDir, ...args);
  };
}

function prObject({ head, base, baseRef = 'main', state = 'open', draft = false, merged = false, mergeable = true, mergeableState = 'clean' }) {
  return {
    number: 999, state, draft, merged,
    head: { sha: head, ref: 'candidate' },
    base: { sha: base, ref: baseRef },
    mergeable, mergeable_state: mergeableState,
  };
}

function checkRun(name, conclusion, head, opts = {}) {
  return {
    name,
    id: opts.id || Math.floor(Math.random() * 1e9),
    status: opts.status || 'completed',
    conclusion,
    head_sha: head,
    app: { slug: opts.appSlug || 'github-actions', id: opts.appId !== undefined ? opts.appId : 15368 },
    html_url: `https://example/run/${name}`,
    started_at: '2026-07-27T00:00:00Z',
    completed_at: '2026-07-27T00:05:00Z',
  };
}

function passingChecks(head) {
  return [checkRun('Operations Suite', 'success', head), checkRun('Build', 'success', head)];
}

function mockGh({ pr, checkRunsByHead }) {
  return (apiPath) => {
    if (/\/pulls\/\d+$/.test(apiPath)) {
      if (!pr) throw new Error('404');
      return pr;
    }
    const m = apiPath.match(/\/commits\/([0-9a-f]{40})\/check-runs/);
    if (m) return { check_runs: (checkRunsByHead && checkRunsByHead[m[1]]) || [] };
    throw new Error(`unexpected api path: ${apiPath}`);
  };
}

function wrapGhCheckRuns(ghApiFn) {
  return (repoFullName, headSha) => {
    const resp = ghApiFn(`repos/${repoFullName}/commits/${headSha}/check-runs?per_page=100`);
    return { check_runs: resp.check_runs, pages: 1 };
  };
}

function gateArgs(repo, root, evidence, extra = {}) {
  return {
    repoFullName: 'steezkelly/maine-dispensary-guide',
    prNumber: '999',
    evidence,
    expectEvidenceSha256: readDigest(evidence),
    repo,
    baseBranch: 'main',
    ...extra,
  };
}

function makeRunners(repo, base, ghApiFn, gitOpts = {}) {
  return {
    env: { ...process.env, MDG_OPS_ROOT: makeRoot() },
    git: realGit(repo, base, gitOpts),
    ghApi: ghApiFn,
    ghApiCheckRuns: wrapGhCheckRuns(ghApiFn),
  };
}

function cleanup(repo, root) {
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
}

// ===========================================================================
// R2-A — complete evidence-semantic verification + manual digest binding
// ===========================================================================

test('R2-A: ACCEPT with valid evidence + matching --expect-evidence-sha256', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-A: REJECT when --expect-evidence-sha256 differs (modified evidence, recomputed digest)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const operatorDigest = readDigest(evidence);
  // Attacker rewrites a field and recomputes the unkeyed internal hash -> still
  // self-consistent, but the operator-authorized digest no longer matches.
  mutateEvidence(evidence, (ev) => { ev.task_id = 't_forged'; });
  assert.equal(INTEGRITY.evidenceSelfConsistent(JSON.parse(fs.readFileSync(evidence, 'utf8'))), true,
    'recomputed digest must remain self-consistent (the attack the digest anchor defeats)');
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence, { expectEvidenceSha256: operatorDigest }), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('EVIDENCE_DIGEST_MISMATCH'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-A: REJECT unsupported evidence schema', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  mutateEvidence(evidence, (ev) => { ev.schema = 'mdg-ops-bogus-v9'; });
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('EVIDENCE_SCHEMA_UNSUPPORTED'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-A: REJECT verifier_outcome FAIL', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  mutateEvidence(evidence, (ev) => { ev.verifier_outcome = 'FAIL'; });
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('EVIDENCE_VERIFIER_OUTCOME_NOT_PASS'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-A: REJECT a nonzero acceptance command exit code', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  mutateEvidence(evidence, (ev) => { ev.acceptance_commands[0].exit_code = 1; });
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('EVIDENCE_ACCEPTANCE_FAILED'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-A: REJECT missing accepted candidate', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  mutateEvidence(evidence, (ev) => { ev.accepted_candidate_sha = null; });
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('EVIDENCE_NOT_BOUND'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-A: --expect-evidence-sha256 is REQUIRED (missing arg fails closed)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const args = gateArgs(repo, root, evidence);
  delete args.expectEvidenceSha256;
  assert.throws(() => GATE.runGate(args, runners), /GATE_MISSING_ARG:--expect-evidence-sha256/);
  cleanup(repo, root);
});

test('R2-A: a malformed --expect-evidence-sha256 (non-hex) fails closed', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  assert.throws(() => GATE.runGate(gateArgs(repo, root, evidence, { expectEvidenceSha256: 'not-a-digest' }), runners),
    /GATE_EXPECT_EVIDENCE_DIGEST_INVALID/);
  cleanup(repo, root);
});

// ===========================================================================
// R2-B — exact local HEAD in canonical mode (same-tree wrong-HEAD must fail)
// ===========================================================================

test('R2-B: a clean DIFFERENT commit with the SAME tree fails canonical mode (HEAD != candidate)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  // Create an empty commit E whose tree equals the candidate tree, checkout E.
  git(repo, 'commit', '-q', '--allow-empty', '-m', 'empty transport commit');
  const emptyCommit = git(repo, 'rev-parse', 'HEAD');
  const emptyTree = git(repo, 'rev-parse', `${emptyCommit}^{tree}`);
  const candidateTree = git(repo, 'rev-parse', `${candidate}^{tree}`);
  assert.equal(emptyTree, candidateTree, 'precondition: empty commit tree must equal candidate tree');
  assert.notEqual(emptyCommit, candidate, 'precondition: empty commit is a different SHA');
  // Worktree is clean and at E (tree == candidate tree), but HEAD != candidate.
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('LOCAL_HEAD_MISMATCH'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

// ===========================================================================
// R2-C — local-origin / repository binding
// ===========================================================================

test('R2-C: canonicalizeRepoFullName handles https / ssh / ssh:// / git:// forms', () => {
  const { canonicalizeRepoFullName } = REMOTE;
  assert.equal(canonicalizeRepoFullName('https://github.com/owner/repo.git'), 'owner/repo');
  assert.equal(canonicalizeRepoFullName('https://github.com/owner/repo'), 'owner/repo');
  assert.equal(canonicalizeRepoFullName('git@github.com:owner/repo.git'), 'owner/repo');
  assert.equal(canonicalizeRepoFullName('ssh://git@github.com/owner/repo.git'), 'owner/repo');
  assert.equal(canonicalizeRepoFullName('ssh://git@github.com:22/owner/repo.git'), 'owner/repo');
  assert.equal(canonicalizeRepoFullName('git://github.com/owner/repo.git'), 'owner/repo');
});

test('R2-C: canonicalizeRepoFullName rejects malformed URLs', () => {
  const { canonicalizeRepoFullName } = REMOTE;
  assert.equal(canonicalizeRepoFullName(''), null);
  assert.equal(canonicalizeRepoFullName('not a url'), null);
  assert.equal(canonicalizeRepoFullName('https://github.com/owner'), null); // no repo
  assert.equal(canonicalizeRepoFullName('https://github.com/'), null);
  assert.equal(canonicalizeRepoFullName('https://github.com/a/b/c'), null); // too many segments
});

test('R2-C: validatePrNumber accepts positive integers, rejects the rest', () => {
  const { validatePrNumber } = REMOTE;
  assert.equal(validatePrNumber('218'), 218);
  assert.equal(validatePrNumber(7), 7);
  assert.throws(() => validatePrNumber('0'), /REMOTE_PR_NUMBER_INVALID/);
  assert.throws(() => validatePrNumber('-3'), /REMOTE_PR_NUMBER_INVALID/);
  assert.throws(() => validatePrNumber('abc'), /REMOTE_PR_NUMBER_INVALID/);
  assert.throws(() => validatePrNumber('218/../../admin'), /REMOTE_PR_NUMBER_INVALID/); // API-path fragment
  assert.throws(() => validatePrNumber('12 34'), /REMOTE_PR_NUMBER_INVALID/);
});

test('R2-C: REJECT when the local origin is a different repository (fork/other)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const mockGit = (repoDir, args) => {
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return base;
    if (args[0] === 'remote' && args[1] === 'get-url') return 'https://github.com/someone-else/maine-dispensary-guide.git';
    if (isPolicyShow(args)) throwPolicyAbsent();
    return git(repoDir, ...args);
  };
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: mockGit, ghApi: ghApiFn, ghApiCheckRuns: wrapGhCheckRuns(ghApiFn) };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_ORIGIN_MISMATCH'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-C: REJECT when there is no origin remote', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const mockGit = (repoDir, args) => {
    if (args[0] === 'remote' && args[1] === 'get-url') throw new Error('fatal: No such remote: origin');
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return base;
    if (isPolicyShow(args)) throwPolicyAbsent();
    return git(repoDir, ...args);
  };
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: mockGit, ghApi: ghApiFn, ghApiCheckRuns: wrapGhCheckRuns(ghApiFn) };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_ORIGIN_MISSING'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-C: REJECT a malformed --repo-full-name', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence, { repoFullName: 'not a repo' }), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_REPO_NAME_INVALID'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

// ===========================================================================
// R2-D — PR mergeability + explicit draft allowance
// ===========================================================================

test('R2-D: a draft PR is REJECTED without --allow-draft', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, draft: true }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_PR_DRAFT_NOT_ALLOWED'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-D: a draft PR is ACCEPTED with explicit --allow-draft (canonical pre-ready mode)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, draft: true }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence, { allowDraft: true }), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-D: REJECT when mergeable == false (conflict)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, mergeable: false, mergeableState: 'dirty' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_NOT_MERGEABLE'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-D: REJECT a blocked mergeable_state', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, mergeable: true, mergeableState: 'blocked' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.some((c) => c.startsWith('REMOTE_MERGEABLE_STATE')), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-D: REJECT unknown mergeability beyond bounded retry', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  // mergeable stays null on every read -> bounded retry exhausted -> fail closed.
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, mergeable: null, mergeableState: 'unknown' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  runners.maxMergeRetries = 2;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_MERGEABILITY_UNKNOWN'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-D: a normal clean PR (mergeable true, clean state) is ACCEPTED', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, mergeable: true, mergeableState: 'clean' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  cleanup(repo, root);
});

// ===========================================================================
// R2-E — required-check producer authentication
// ===========================================================================

test('R2-E: ACCEPT correct context from GitHub Actions (app_id 15368)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-E: REJECT the same context name from a DIFFERENT app', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [
    checkRun('Operations Suite', 'success', candidate, { appId: 99999, appSlug: 'evil-app' }),
    checkRun('Build', 'success', candidate),
  ];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check producer not trusted: Operations Suite/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-E: REJECT a floor check with missing app identity', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [
    { name: 'Operations Suite', id: 1, status: 'completed', conclusion: 'success', head_sha: candidate, app: null },
    checkRun('Build', 'success', candidate),
  ];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check producer not trusted: Operations Suite/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-E: REJECT a neutral floor result (neutral is not sufficient)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [checkRun('Operations Suite', 'neutral', candidate), checkRun('Build', 'success', candidate)];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check not successful: Operations Suite/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-E: REJECT a skipped floor result even if a policy tries to allowlist it', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  // A policy that attempts to allowlist a floor context as skipped is itself
  // rejected at policy-validation time (fail closed), so the gate rejects.
  const badPolicy = JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, skipped_allowlist: ['Operations Suite'] });
  const runs = [checkRun('Operations Suite', 'skipped', candidate), checkRun('Build', 'success', candidate)];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn, { policyJson: badPolicy });
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.some((c) => c === 'CHECK_POLICY_FLOOR_IN_ALLOWLIST' || /skipped/.test(c)),
    result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-E: REJECT duplicate same-name checks from different apps with conflicting conclusions', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [
    checkRun('Operations Suite', 'success', candidate, { id: 1, appId: 15368, appSlug: 'github-actions' }),
    checkRun('Operations Suite', 'success', candidate, { id: 2, appId: 15368, appSlug: 'github-actions' }),
    checkRun('Build', 'success', candidate),
  ];
  // Same app, same conclusion duplicates are tolerated; but conflicting ones fail.
  const runsConflict = [
    checkRun('Operations Suite', 'success', candidate, { id: 1 }),
    checkRun('Operations Suite', 'failure', candidate, { id: 2 }),
    checkRun('Build', 'success', candidate),
  ];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runsConflict } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /conflicting duplicate results: Operations Suite/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-E: REJECT success from a stale SHA', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const stale = 'e'.repeat(40);
  const runs = [checkRun('Operations Suite', 'success', stale), checkRun('Build', 'success', candidate)];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check missing: Operations Suite/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-E: ACCEPT correct current-head success and bind app id/slug into the record', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  // The detailed rollup record binds app id/slug for each evaluated check.
  assert.ok(result.detail.checks.binding.apps.every((a) => a.id === 15368 && a.slug === 'github-actions'),
    'app id/slug must be bound into the private rollup record');
  cleanup(repo, root);
});

// ===========================================================================
// R2-F — strict trusted-policy validation + pagination
// ===========================================================================

test('R2-F: readTrustedPolicy returns null for a genuinely-absent policy file', () => {
  const { repo, base } = makeRepoWithCandidate();
  const g = realGit(repo, base, { policyJson: null });
  assert.equal(ROLLUP.readTrustedPolicy(g, repo, 'main'), null);
  cleanup(repo, makeRoot());
});

test('R2-F: readTrustedPolicy fails closed on malformed / strict-schema violations', () => {
  const { repo, base } = makeRepoWithCandidate();
  const cases = [
    ['{ not json', 'CHECK_POLICY_MALFORMED'],
    [JSON.stringify({ schema: 'wrong-version' }), 'CHECK_POLICY_SCHEMA'],
    [JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, bogus_field: 1 }), 'CHECK_POLICY_UNKNOWN_FIELD'],
    [JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: 'not-an-array' }), 'CHECK_POLICY_REQUIRED_CONTEXTS_TYPE'],
    [JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: ['a', 'a'] }), 'CHECK_POLICY_DUPLICATE_CONTEXT'],
    [JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: ['  '] }), 'CHECK_POLICY_BLANK_CONTEXT'],
    [JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, skipped_allowlist: ['Build'] }), 'CHECK_POLICY_FLOOR_IN_ALLOWLIST'],
    [JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, skipped_allowlist: 'x' }), 'CHECK_POLICY_ALLOWLIST_TYPE'],
  ];
  for (const [policyJson, code] of cases) {
    const g = realGit(repo, base, { policyJson });
    assert.throws(() => ROLLUP.readTrustedPolicy(g, repo, 'main'), new RegExp(code), `expected ${code} for ${policyJson}`);
  }
  cleanup(repo, makeRoot());
});

test('R2-F: a malformed policy on origin/main blocks integration (no silent floor fallback)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const badPolicy = JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, unknown: true });
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn, { policyJson: badPolicy });
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('CHECK_POLICY_UNKNOWN_FIELD'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

test('R2-F: a valid policy ADDS a required context (floor still enforced)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const goodPolicy = JSON.stringify({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: ['Extra Check'] });
  // Extra Check is missing -> gate rejects (policy-added context enforced).
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn, { policyJson: goodPolicy });
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check missing: Extra Check/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-F: pagination — a conflicting duplicate beyond the first page fails closed', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  // Simulate two pages: page 1 has a passing Operations Suite; page 2 has a
  // conflicting failure for the same context. The paginated runner must flatten
  // both pages so the conflict is detected.
  const ghApiCheckRuns = () => ({
    check_runs: [
      checkRun('Operations Suite', 'success', candidate, { id: 1 }),
      checkRun('Build', 'success', candidate, { id: 3 }),
      checkRun('Operations Suite', 'failure', candidate, { id: 2 }), // from "page 2"
    ],
    pages: 2,
  });
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: {} });
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: realGit(repo, base), ghApi: ghApiFn, ghApiCheckRuns };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /conflicting duplicate results: Operations Suite/.test(r)), result.reasons.join('; '));
  cleanup(repo, root);
});

test('R2-F: an incomplete check-run page fails closed', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiCheckRuns = () => { throw new Error('CHECK_RUNS_PAGE_INCOMPLETE'); };
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: {} });
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: realGit(repo, base), ghApi: ghApiFn, ghApiCheckRuns };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('CHECK_RUNS_PAGE_INCOMPLETE'), result.reasonCodes.join(','));
  cleanup(repo, root);
});

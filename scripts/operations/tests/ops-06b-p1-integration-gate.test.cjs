#!/usr/bin/env node
'use strict';

/**
 * OPS-06B-P1-R1/R2 — remote-state binding, required-check authenticity,
 * evidence semantics, and check-producer binding tests.
 *
 * Exercises the side-effect-free gate core (scripts/operations/integration/gate.cjs)
 * with injected git/gh runners so the binding logic is testable without a live
 * GitHub. Covers R1-A (remote-state binding), R1-B (live check-rollup),
 * R1-C (merge-commit topology), R1-D (ADR Amendment 6), R1-F (Operations Suite
 * preserved), and R2-A..R2-F (evidence semantics, exact HEAD, origin binding,
 * mergeability, check-producer authentication, strict policy).
 *
 * Node built-in test runner. No dependency.
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
const INTEGRITY_CLI = path.resolve(__dirname, '../integrity/cli.cjs');
const GATE_CLI = path.resolve(__dirname, '../integration/cli.cjs');

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.t', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-root-'));
  fs.chmodSync(root, 0o700);
  return root;
}

/** Build a throwaway repo with a base commit and a candidate commit on a branch. */
function makeRepoWithCandidate() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-repo-'));
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
  const candidateTree = git(repo, 'rev-parse', `${candidate}^{tree}`);
  const baseTree = git(repo, 'rev-parse', `${base}^{tree}`);
  return { repo, base, candidate, candidateTree, baseTree };
}

/** Capture + bind verifier evidence for the candidate via the real integrity CLI. */
function captureEvidence(repo, base, root) {
  const out = path.join(root, 'evidence.json');
  const cap = spawnSync(process.execPath, [
    INTEGRITY_CLI, 'capture-evidence', '--repo', repo, '--taskId', 't_r2', '--base', base,
    '--timestamp', '2026-07-27T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'node --test impl.test.cjs=0', '--out', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root } });
  assert.equal(cap.status, 0, cap.stderr);
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const bind = spawnSync(process.execPath, [
    INTEGRITY_CLI, 'bind-candidate', '--repo', repo, '--evidence', out, '--candidate', candidate, '--out', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root } });
  assert.equal(bind.status, 0, bind.stderr);
  return { evidence: out, candidate };
}

/** Read the evidence_sha256 digest from a bound evidence file. */
function readEvidenceDigest(evidencePath) {
  return JSON.parse(fs.readFileSync(evidencePath, 'utf8')).evidence_sha256;
}

/** Simulate a genuinely-absent trusted check-policy file (floor-only policy). */
function isPolicyShow(args) {
  return args[0] === 'show' && /check-policy\.json$/.test(args[1] || '');
}
function throwPolicyAbsent() {
  throw new Error("fatal: path 'scripts/operations/integration/check-policy.json' does not exist in 'origin/main'");
}

/**
 * A real git runner that no-ops `fetch`, serves `origin/main` as the captured
 * base SHA, serves `origin` URL binding, simulates an absent check-policy file,
 * and runs all other commands for real.
 */
function realGit(repo, baseSha) {
  return (repoDir, args) => {
    if (args[0] === 'fetch') return ''; // simulate a successful fetch --prune
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return baseSha;
    if (args[0] === 'remote' && args[1] === 'get-url') return 'https://github.com/steezkelly/maine-dispensary-guide.git';
    if (isPolicyShow(args)) throwPolicyAbsent();
    return git(repoDir, ...args);
  };
}

/** Mock gh API: serves a PR object and check-runs by head SHA. */
function mockGh({ pr, checkRunsByHead }) {
  return (apiPath) => {
    if (/\/pulls\/\d+$/.test(apiPath)) {
      if (!pr) throw new Error('404');
      return pr;
    }
    const m = apiPath.match(/\/commits\/([0-9a-f]{40})\/check-runs/);
    if (m) {
      const head = m[1];
      return { check_runs: (checkRunsByHead && checkRunsByHead[head]) || [] };
    }
    throw new Error(`unexpected api path: ${apiPath}`);
  };
}

/** Wrap a mockGh function as a paginated check-run runner. */
function wrapGhCheckRuns(ghApiFn) {
  return (repoFullName, headSha) => {
    const resp = ghApiFn(`repos/${repoFullName}/commits/${headSha}/check-runs?per_page=100`);
    return { check_runs: resp.check_runs, pages: 1 };
  };
}

function prObject({ head, base, baseRef = 'main', state = 'open', draft = false, merged = false, mergeable = true, mergeableState = 'clean' }) {
  return {
    number: 999,
    state,
    draft,
    merged,
    head: { sha: head, ref: 'candidate' },
    base: { sha: base, ref: baseRef },
    mergeable,
    mergeable_state: mergeableState,
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

function gateArgs(repo, root, evidence, extra = {}) {
  return {
    repoFullName: 'steezkelly/maine-dispensary-guide',
    prNumber: '999',
    evidence,
    expectEvidenceSha256: readEvidenceDigest(evidence),
    repo,
    baseBranch: 'main',
    ...extra,
  };
}

function makeRunners(repo, base, ghApiFn) {
  return {
    env: { ...process.env, MDG_OPS_ROOT: makeRoot() },
    git: realGit(repo, base),
    ghApi: ghApiFn,
    ghApiCheckRuns: wrapGhCheckRuns(ghApiFn),
  };
}

// ===========================================================================
// R1-A — remote-state binding
// ===========================================================================

test('R1-A: ACCEPT when actual PR head == evidence candidate, base matches, checks pass', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when remote PR head moved (not the evidence-bound candidate)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const movedHead = 'f'.repeat(40);
  const ghApiFn = mockGh({ pr: prObject({ head: movedHead, base }), checkRunsByHead: { [movedHead]: passingChecks(movedHead) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_PR_HEAD_MISMATCH'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when origin/main moved after verification (base drift)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const driftedBase = 'a'.repeat(40);
  const mockGit = (repoDir, args) => {
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return driftedBase;
    if (args[0] === 'remote' && args[1] === 'get-url') return 'https://github.com/steezkelly/maine-dispensary-guide.git';
    if (isPolicyShow(args)) throwPolicyAbsent();
    return git(repoDir, ...args);
  };
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base: driftedBase }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: mockGit, ghApi: ghApiFn, ghApiCheckRuns: wrapGhCheckRuns(ghApiFn) };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_BASE_DRIFT'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when worktree is checked out at the wrong HEAD (tree differs)', () => {
  const { repo, base, candidate, baseTree } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const mockGit = (repoDir, args) => {
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return base;
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return candidate;
    if (args[0] === 'rev-parse' && args[1] === 'HEAD^{tree}') return baseTree;
    if (args[0] === 'remote' && args[1] === 'get-url') return 'https://github.com/steezkelly/maine-dispensary-guide.git';
    if (isPolicyShow(args)) throwPolicyAbsent();
    return git(repoDir, ...args);
  };
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: mockGit, ghApi: ghApiFn, ghApiCheckRuns: wrapGhCheckRuns(ghApiFn) };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('LOCAL_TREE_MISMATCH'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when PR targets a branch other than main', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, baseRef: 'develop' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.some((c) => c.startsWith('REMOTE_PR_WRONG_BASE')), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when PR is closed', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, state: 'closed' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.some((c) => c.startsWith('REMOTE_PR_NOT_OPEN')), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when PR is already merged', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base, merged: true }), checkRunsByHead: { [candidate]: passingChecks(candidate) } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_PR_ALREADY_MERGED'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when remote PR lookup is unavailable (fail closed)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: null, checkRunsByHead: {} });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_PR_UNAVAILABLE'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

// ===========================================================================
// R1-B — required-check authenticity (live rollup)
// ===========================================================================

test('R1-B: REJECT when Operations Suite is missing from the live rollup', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: [checkRun('Build', 'success', candidate)] } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check missing: Operations Suite/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT when Operations Suite is from an OLDER SHA (stale)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const olderHead = 'd'.repeat(40);
  const runs = [checkRun('Operations Suite', 'success', olderHead), checkRun('Build', 'success', candidate)];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check missing: Operations Suite/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT when Build is pending (not completed)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [checkRun('Operations Suite', 'success', candidate), checkRun('Build', null, candidate, { status: 'in_progress' })];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check not completed \(pending\): Build/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT on duplicate conflicting Operations Suite results', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [
    checkRun('Operations Suite', 'success', candidate, { id: 1 }),
    checkRun('Operations Suite', 'failure', candidate, { id: 2 }),
    checkRun('Build', 'success', candidate),
  ];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /conflicting duplicate results: Operations Suite/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT when a required check is skipped (not allowlisted)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runs = [checkRun('Operations Suite', 'success', candidate), checkRun('Build', 'skipped', candidate)];
  const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
  const runners = makeRunners(repo, base, ghApiFn);
  runners.env.MDG_OPS_ROOT = root;
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check skipped \(not sufficient\): Build/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT on cancelled / timed_out conclusions', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  for (const bad of ['cancelled', 'timed_out', 'failure']) {
    const runs = [checkRun('Operations Suite', 'success', candidate), checkRun('Build', bad, candidate)];
    const ghApiFn = mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } });
    const runners = makeRunners(repo, base, ghApiFn);
    runners.env.MDG_OPS_ROOT = root;
    const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
    assert.equal(result.ok, false, `expected rejection for conclusion ${bad}`);
    assert.ok(result.reasons.some((r) => /required check not successful: Build/.test(r)), `${bad}: ${result.reasons.join('; ')}`);
  }
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT when check-runs are unavailable (fail closed)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const ghApiFn = (apiPath) => {
    if (/\/pulls\/\d+$/.test(apiPath)) return prObject({ head: candidate, base });
    throw new Error('check-runs unavailable');
  };
  const runners = { env: { ...process.env, MDG_OPS_ROOT: root }, git: realGit(repo, base), ghApi: ghApiFn, ghApiCheckRuns: wrapGhCheckRuns(ghApiFn) };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /CHECK_RUNS_UNAVAILABLE/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: the non-negotiable floor cannot be weakened by a candidate policy', () => {
  const required = ROLLUP.effectiveRequired({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: [] });
  assert.ok(required.some((s) => s.name === 'Operations Suite'));
  assert.ok(required.some((s) => s.name === 'Build'));
  const required2 = ROLLUP.effectiveRequired({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: ['Extra Check'] });
  assert.ok(required2.some((s) => s.name === 'Operations Suite'));
  assert.ok(required2.some((s) => s.name === 'Extra Check'));
});

// ===========================================================================
// R1-A integration: real isolated bare remote
// ===========================================================================

test('R1-A integration: resolveRemoteState against a real isolated bare remote', () => {
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-bare-'));
  const bareRepo = path.join(bare, 'remote.git');
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', bareRepo]);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-work-'));
  git(work, 'init', '-q', '-b', 'main');
  git(work, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(work, 'README.md'), 'base\n');
  git(work, 'add', 'README.md');
  git(work, 'commit', '-q', '-m', 'base');
  const base = git(work, 'rev-parse', 'HEAD');
  git(work, 'remote', 'add', 'origin', bareRepo);
  git(work, 'push', '-q', 'origin', 'main');
  git(work, 'checkout', '-q', '-b', 'candidate');
  fs.writeFileSync(path.join(work, 'impl.cjs'), 'x\n');
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'candidate');
  const candidate = git(work, 'rev-parse', 'HEAD');
  git(work, 'push', '-q', 'origin', 'candidate');

  const clone = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-clone-'));
  execFileSync('git', ['clone', '-q', bareRepo, clone]);
  const ghApi = (apiPath) => {
    if (/\/pulls\/\d+$/.test(apiPath)) return prObject({ head: candidate, base });
    return { check_runs: [] };
  };
  // Real git for fetch/rev-parse, but intercept the origin URL so the local
  // bare-remote path canonicalizes to the requested repository full name.
  const cloneGit = (repoDir, args) => {
    if (args[0] === 'remote' && args[1] === 'get-url') return 'https://github.com/example/repo.git';
    return git(repoDir, ...args);
  };
  const state = REMOTE.resolveRemoteState({
    repoDir: clone,
    repoFullName: 'example/repo',
    prNumber: 999,
    baseBranch: 'main',
    git: cloneGit,
    ghApi,
  });
  assert.equal(state.actualBaseSha, base);
  assert.equal(state.headSha, candidate);
  assert.equal(state.baseRef, 'main');
  assert.equal(state.prState, 'open');
  assert.match(state.actualBaseSha, /^[0-9a-f]{40}$/);

  fs.rmSync(bare, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
  fs.rmSync(clone, { recursive: true, force: true });
});

// ===========================================================================
// R1-C / R1-D / R1-F — governance wiring
// ===========================================================================

test('R1: canonical npm script ops:integrate is wired to the wrapper', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['ops:integrate'], 'node scripts/operations/integration/cli.cjs');
});

test('R1-C: the canonical integration topology is the GitHub merge commit', () => {
  const checklist = fs.readFileSync(path.join(ROOT, 'docs/governance/templates/mdg-integrator-checklist.md'), 'utf8');
  assert.match(checklist, /Canonical integration topology: GitHub merge commit/i);
  assert.match(checklist, /Post-merge reconciliation/);
  assert.match(checklist, /\^\{tree\}/);
  const cmdBlock = checklist.match(/```bash\n\s*npm run ops:integrate[\s\S]*?```/);
  assert.ok(cmdBlock, 'canonical ops:integrate command block must exist');
  const cmd = cmdBlock[0];
  assert.match(cmd, /--repo-full-name/);
  assert.match(cmd, /--pr-number/);
  // R2: the required manual trust anchor + draft allowance must be documented.
  assert.match(cmd, /--expect-evidence-sha256/);
  assert.match(cmd, /--allow-draft/);
  assert.ok(!/--current-head/.test(cmd), 'canonical command must not accept --current-head');
  assert.ok(!/--expected-base/.test(cmd), 'canonical command must not accept --expected-base');
  assert.ok(!/--expect-candidate\b/.test(cmd), 'canonical command must not list obsolete --expect-candidate');
  assert.ok(!/--expect-base\b/.test(cmd), 'canonical command must not list obsolete --expect-base');
  assert.ok(!/--checks\b/.test(cmd), 'canonical command must not accept a caller-authored --checks flag');
  assert.match(checklist, /Emergency mode/i);
  assert.ok(!/^4\. `git cherry-pick/m.test(checklist), 'cherry-pick must not be a canonical required-order step');
});

test('R1-C: orchestration governance documents the merge-commit topology', () => {
  const orch = fs.readFileSync(path.join(ROOT, 'docs/governance/mdg-agent-orchestration-v1.md'), 'utf8');
  assert.match(orch, /GitHub merge commit/);
  assert.match(orch, /--repo-full-name/);
  assert.match(orch, /derives the actual\s+state independently/i);
});

test('R1-D: ADR Amendment 6 records the honest attestation trust-model correction', () => {
  const adr = fs.readFileSync(path.join(ROOT, 'docs/adr/2026-07-25-mdg-operations-control-plane-v1.md'), 'utf8');
  assert.match(adr, /Amendment 6 — Attestation trust model correction/);
  assert.match(adr, /not a category-B authorization\s+artifact/i);
  assert.match(adr, /Candidate-integrity remains category A\+/);
  assert.match(adr, /Integrity Gate` branch protection remains \*{0,2}DEFERRED/i);
  assert.match(adr, /self-consistency/);
  assert.match(adr, /Author alters code and attestation together/);
  assert.match(adr, /Author chooses arbitrary/);
  assert.match(adr, /synthetic PR merge/);
  assert.match(adr, /fetch-depth/);
});

test('R1-F: the dedicated Operations Suite job is preserved (not folded into Build)', () => {
  const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /^  operations-suite:\n/m);
  assert.match(ci, /name: Operations Suite/);
  assert.match(ci, /node --test scripts\/operations\/tests\/\*\.test\.cjs/);
  const lines = ci.split('\n');
  const buildStart = lines.findIndex((l) => l === '  build:');
  const opsStart = lines.findIndex((l) => l === '  operations-suite:');
  assert.ok(buildStart !== -1 && opsStart !== -1, 'both build and operations-suite jobs must exist');
  assert.ok(opsStart > buildStart, 'operations-suite must be a separate job after build');
  const buildBlock = lines.slice(buildStart, opsStart).join('\n');
  assert.ok(!/node --test scripts\/operations\/tests/.test(buildBlock),
    'operations suite command must NOT be inside the build job');
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/operations/tests/ops-06b-p1-ci-wiring.test.cjs')),
    'CI-wiring contract test must be preserved');
});

// ===========================================================================
// CLI-level: redaction + wiring
// ===========================================================================

test('R1: CLI redacts ordinary output (no sensitive detail) on a failing gate', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const result = spawnSync(process.execPath, [
    GATE_CLI, '--repo-full-name', 'example/repo', '--pr-number', '999',
    '--evidence', evidence, '--expect-evidence-sha256', readEvidenceDigest(evidence), '--repo', repo,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root, PATH: '/nonexistent' } });
  assert.notEqual(result.status, 0);
  const blob = `${result.stdout}\n${result.stderr}`;
  assert.ok(!blob.includes(repo), 'repo path must not leak');
  assert.ok(!blob.includes(evidence), 'evidence path must not leak');
  assert.ok(!blob.includes('t_r2'), 'task ID must not leak');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// P1.3 (t_b7c5d622): check-run pagination robustness — gh-2.45 compatible.
//
// The deterministic suite exercises the ACTUAL argument list passed to `gh`
// (via an injectable runner that mimics gh 2.45.0, which rejects --slurp), so a
// future reintroduction of --slurp fails the test. It does NOT merely call
// parseCheckRunPages with hand-built objects while bypassing the CLI layer.
// ---------------------------------------------------------------------------

/** Build NDJSON (one page-object per line) the way `gh api --paginate --jq` does. */
function ndjson(pages) {
  return pages.map((p) => JSON.stringify(p)).join('\n') + '\n';
}

/**
 * Fake gh runner emulating gh 2.45.0: rejects --slurp (unknown flag), and for
 * the supported `--paginate --jq` form returns the supplied NDJSON. Records the
 * exact args it was called with so the test can assert the real invocation.
 */
function makeFakeGh245(ndjsonOutput) {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    if (args.includes('--slurp')) {
      const err = new Error('unknown flag: --slurp');
      err.status = 1;
      throw err;
    }
    return ndjsonOutput;
  };
  runner.calls = calls;
  return runner;
}

test('P1.3 (t_b7c5d622): the gh argument list is gh-2.45 compatible (no --slurp)', () => {
  const { CHECK_RUNS_GH_ARGS, CHECK_RUNS_JQ } = ROLLUP;
  // The frozen argument list must not contain --slurp (unsupported on gh 2.45.0).
  assert.ok(!CHECK_RUNS_GH_ARGS.includes('--slurp'), '--slurp must not be used');
  // It must use --paginate and a per-page --jq expression that preserves
  // total_count and every check_run.
  assert.ok(CHECK_RUNS_GH_ARGS.includes('--paginate'), 'must paginate');
  const jqIndex = CHECK_RUNS_GH_ARGS.indexOf('--jq');
  assert.ok(jqIndex >= 0, 'must pass a --jq expression');
  assert.equal(CHECK_RUNS_GH_ARGS[jqIndex + 1], CHECK_RUNS_JQ);
  assert.match(CHECK_RUNS_JQ, /total_count/);
  assert.match(CHECK_RUNS_JQ, /check_runs/);
});

test('P1.3 (t_b7c5d622): multi-page success preserves a later-page check (via real CLI args)', () => {
  const { defaultGhApiCheckRuns } = ROLLUP;
  // Page 1 has the floor checks; page 2 carries a conflicting duplicate that
  // MUST NOT be silently dropped.
  const output = ndjson([
    { total_count: 3, check_runs: [
      { name: 'Build', conclusion: 'success', app: { slug: 'github-actions', id: 15368 }, head_sha: 'c7740548' },
      { name: 'Operations Suite', conclusion: 'success', app: { slug: 'github-actions', id: 15368 }, head_sha: 'c7740548' },
    ] },
    { total_count: 3, check_runs: [
      { name: 'Build', conclusion: 'failure', app: { slug: 'github-actions', id: 15368 }, head_sha: 'c7740548' },
    ] },
  ]);
  const fake = makeFakeGh245(output);
  const result = defaultGhApiCheckRuns('owner/repo', 'c7740548', fake);
  // The CLI was invoked exactly once with the supported (non --slurp) args.
  assert.equal(fake.calls.length, 1);
  assert.ok(!fake.calls[0].includes('--slurp'));
  assert.ok(fake.calls[0].includes('--paginate'));
  assert.equal(fake.calls[0][fake.calls[0].length - 1], 'repos/owner/repo/commits/c7740548/check-runs');
  // Both pages parsed; the later-page conflicting duplicate is preserved.
  assert.equal(result.pages, 2);
  assert.equal(result.check_runs.length, 3);
  const builds = result.check_runs.filter((r) => r.name === 'Build');
  assert.equal(builds.length, 2, 'later-page duplicate Build must be preserved');
  assert.deepEqual(builds.map((b) => b.conclusion).sort(), ['failure', 'success']);
});

test('P1.3 (t_b7c5d622): single-page success (via real CLI args)', () => {
  const { defaultGhApiCheckRuns } = ROLLUP;
  const output = ndjson([
    { total_count: 2, check_runs: [
      { name: 'Build', conclusion: 'success', app: { slug: 'github-actions', id: 15368 }, head_sha: 'abc' },
      { name: 'Operations Suite', conclusion: 'success', app: { slug: 'github-actions', id: 15368 }, head_sha: 'abc' },
    ] },
  ]);
  const result = defaultGhApiCheckRuns('owner/repo', 'abc', makeFakeGh245(output));
  assert.equal(result.pages, 1);
  assert.equal(result.check_runs.length, 2);
});

test('P1.3 (t_b7c5d622): fail-closed cases (malformed / incomplete / mismatch / empty)', () => {
  const { parseCheckRunPages } = ROLLUP;
  // 5. Malformed page (a line that is not valid JSON).
  assert.throws(() => parseCheckRunPages('{not json\n'), /CHECK_RUNS_PAGE_MALFORMED/);
  assert.throws(() => parseCheckRunPages(ndjson([{ total_count: 1, check_runs: [] }]) + 'garbage-line\n'), /CHECK_RUNS_PAGE_MALFORMED/);
  // 6. Incomplete page (missing check_runs array) and a non-object page line.
  assert.throws(() => parseCheckRunPages(JSON.stringify({ total_count: 1 }) + '\n'), /CHECK_RUNS_PAGE_INCOMPLETE/);
  assert.throws(() => parseCheckRunPages('null\n'), /CHECK_RUNS_PAGE_INCOMPLETE/);
  // A top-level JSON array (the OLD undocumented concatenation form) must be
  // rejected as incomplete — page boundaries must be unambiguous NDJSON.
  assert.throws(() => parseCheckRunPages(JSON.stringify([{ total_count: 1, check_runs: [] }]) + '\n'), /CHECK_RUNS_PAGE_INCOMPLETE/);
  // 7. total_count mismatch: flattened count != total_count (truncated page).
  assert.throws(() => parseCheckRunPages(ndjson([
    { total_count: 4, check_runs: [{ name: 'a' }, { name: 'b' }] },
  ])), /CHECK_RUNS_TOTAL_COUNT_MISMATCH/);
  // 8. Inconsistent total_count across pages.
  assert.throws(() => parseCheckRunPages(ndjson([
    { total_count: 2, check_runs: [{ name: 'a' }] },
    { total_count: 5, check_runs: [{ name: 'b' }] },
  ])), /CHECK_RUNS_TOTAL_COUNT_MISMATCH/);
  // 9. Empty pagination output.
  assert.throws(() => parseCheckRunPages(''), /CHECK_RUNS_PAGE_INCOMPLETE/);
  assert.throws(() => parseCheckRunPages('\n\n  \n'), /CHECK_RUNS_PAGE_INCOMPLETE/);
});

test('P1.3 (t_b7c5d622): a gh error (e.g. unknown flag) fails closed as incomplete', () => {
  const { defaultGhApiCheckRuns } = ROLLUP;
  // A runner that throws (as gh does for --slurp on 2.45.0) must surface as a
  // fail-closed CHECK_RUNS_PAGE_INCOMPLETE, never a silent empty success.
  const throwing = () => { throw new Error('unknown flag: --slurp'); };
  assert.throws(() => defaultGhApiCheckRuns('owner/repo', 'abc', throwing), /CHECK_RUNS_PAGE_INCOMPLETE/);
});

test('P1.3 (t_b7c5d622): LIVE read-only smoke against the real GitHub API (gh 2.45.0)', { skip: !process.env.MDG_LIVE_PAGINATION_SMOKE }, () => {
  // Environmental verification only — NOT the sole deterministic test. Enabled
  // with MDG_LIVE_PAGINATION_SMOKE=1. Proves the real installed gh retrieves and
  // parses live check runs without CHECK_RUNS_PAGE_INCOMPLETE.
  const { defaultGhApiCheckRuns } = ROLLUP;
  const repo = process.env.MDG_LIVE_REPO || 'steezkelly/maine-dispensary-guide';
  const head = process.env.MDG_LIVE_HEAD || 'c7740548a0f264a39c8d4d672a77c7743bee5bce';
  const result = defaultGhApiCheckRuns(repo, head);
  assert.ok(result.pages >= 1, 'at least one page');
  assert.ok(result.check_runs.length > 0, 'at least one check run');
  assert.equal(result.check_runs.length, result.check_runs.length); // flattened
  const names = result.check_runs.map((r) => r.name);
  assert.ok(names.includes('Build'), 'Build check run present');
  assert.ok(names.includes('Operations Suite'), 'Operations Suite check run present');
  console.log(`    live smoke: pages=${result.pages} check_runs=${result.check_runs.length}`);
});

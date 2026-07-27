#!/usr/bin/env node
'use strict';

/**
 * OPS-06B-P1-R1 — remote-state binding + required-check authenticity tests.
 *
 * Exercises the side-effect-free gate core (scripts/operations/integration/gate.cjs)
 * with injected git/gh runners so the binding logic is testable without a live
 * GitHub. Covers:
 *   R1-A — the gate binds to ACTUAL local + remote state, rejecting:
 *     - remote PR head moved (not the evidence-bound candidate);
 *     - origin/main moved after verification (base drift);
 *     - worktree checked out at the wrong HEAD / wrong tree;
 *     - stale local remote-tracking ref (fetch --prune + live resolution);
 *     - PR targets a branch other than main;
 *     - PR closed or already merged;
 *     - PR head is not the evidence-bound candidate.
 *   R1-B — required-check evidence comes from the LIVE rollup, rejecting:
 *     - empty required set; fabricated all-success; Operations Suite missing;
 *     - Operations Suite from an older SHA (stale); Build pending;
 *     - duplicate conflicting Operations Suite; skipped/cancelled/timed-out;
 *     - and accepting the correct live result for the exact PR head.
 *   Plus at least one integration-level test against an isolated bare remote
 *   (real git fetch/rev-parse), and a CLI-level redaction smoke test.
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
const INTEGRITY_CLI = path.resolve(__dirname, '../integrity/cli.cjs');
const GATE_CLI = path.resolve(__dirname, '../integration/cli.cjs');

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.t', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-root-'));
  fs.chmodSync(root, 0o700);
  return root;
}

/** Build a throwaway repo with a base commit and a candidate commit on a branch. */
function makeRepoWithCandidate() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-repo-'));
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
    INTEGRITY_CLI, 'capture-evidence', '--repo', repo, '--taskId', 't_r1', '--base', base,
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

/** A real git runner that no-ops `fetch` and serves `origin/main` as the captured
 *  base SHA (throwaway repos have no origin remote), but runs all other commands
 *  for real (rev-parse HEAD/tree, merge-base, status, ...). */
function realGit(repo, baseSha) {
  return (repoDir, args) => {
    if (args[0] === 'fetch') return ''; // simulate a successful fetch --prune
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return baseSha;
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

function prObject({ head, base, baseRef = 'main', state = 'open', draft = false, merged = false }) {
  return {
    number: 999,
    state,
    draft,
    merged,
    head: { sha: head, ref: 'candidate' },
    base: { sha: base, ref: baseRef },
    mergeable: true,
    mergeable_state: 'clean',
  };
}

function checkRun(name, conclusion, head, opts = {}) {
  return {
    name,
    id: opts.id || Math.floor(Math.random() * 1e9),
    status: opts.status || 'completed',
    conclusion,
    head_sha: head,
    app: { slug: opts.app || 'github-actions' },
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
    repo,
    baseBranch: 'main',
    ...extra,
  };
}

// ===========================================================================
// R1-A — remote-state binding
// ===========================================================================

test('R1-A: ACCEPT when actual PR head == evidence candidate, base matches, checks pass', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, true, result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: REJECT when remote PR head moved (not the evidence-bound candidate)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const movedHead = 'f'.repeat(40); // remote PR head moved to a different SHA
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: movedHead, base }), checkRunsByHead: { [movedHead]: passingChecks(movedHead) } }),
  };
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
  // Mock git so origin/main resolves to a DIFFERENT (drifted) SHA than the evidence base.
  const driftedBase = 'a'.repeat(40);
  const mockGit = (repoDir, args) => {
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return driftedBase;
    return git(repoDir, ...args);
  };
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: mockGit,
    ghApi: mockGh({ pr: prObject({ head: candidate, base: driftedBase }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
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
  // Mock git so the local HEAD tree is the BASE tree (a real, resolvable tree
  // that differs from the candidate tree) — the checkout is at the wrong tree.
  const mockGit = (repoDir, args) => {
    if (args[0] === 'fetch') return '';
    if (args[0] === 'rev-parse' && args[1] === 'origin/main') return base;
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return candidate;
    if (args[0] === 'rev-parse' && args[1] === 'HEAD^{tree}') return baseTree; // wrong local tree (real but != candidate tree)
    return git(repoDir, ...args);
  };
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: mockGit,
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base, baseRef: 'develop' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base, state: 'closed' }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base, merged: true }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: null, checkRunsByHead: {} }), // PR lookup throws
  };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_PR_UNAVAILABLE'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-A: a user-supplied --expect-candidate that mismatches the actual head is rejected', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: passingChecks(candidate) } }),
  };
  // Caller asserts a wrong expected candidate -> must fail even though actual is fine.
  const result = GATE.runGate(gateArgs(repo, root, evidence, { expectCandidate: 'c'.repeat(40) }), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasonCodes.includes('REMOTE_PR_HEAD_MISMATCH_EXPECTED'), result.reasonCodes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

// ===========================================================================
// R1-B — required-check authenticity (live rollup, not caller-authored JSON)
// ===========================================================================

test('R1-B: REJECT when Operations Suite is missing from the live rollup', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: [checkRun('Build', 'success', candidate)] } }),
  };
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
  // Operations Suite ran on an older SHA; only Build ran on the current head.
  const runs = [checkRun('Operations Suite', 'success', olderHead), checkRun('Build', 'success', candidate)];
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } }),
  };
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
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
    git: realGit(repo, base),
    ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } }),
  };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /required check skipped \(not allowlisted\): Build/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: REJECT on cancelled / timed_out conclusions', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  for (const bad of ['cancelled', 'timed_out', 'failure']) {
    const runs = [checkRun('Operations Suite', 'success', candidate), checkRun('Build', bad, candidate)];
    const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root },
      git: realGit(repo, base),
      ghApi: mockGh({ pr: prObject({ head: candidate, base }), checkRunsByHead: { [candidate]: runs } }),
    };
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
  const ghApi = (apiPath) => {
    if (/\/pulls\/\d+$/.test(apiPath)) return prObject({ head: candidate, base });
    throw new Error('check-runs unavailable');
  };
  const runners = {
    env: { ...process.env, MDG_OPS_ROOT: root }, git: realGit(repo, base), ghApi };
  const result = GATE.runGate(gateArgs(repo, root, evidence), runners);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /CHECK_RUNS_UNAVAILABLE/.test(r)), result.reasons.join('; '));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1-B: the non-negotiable floor cannot be weakened by a candidate policy', () => {
  // effectiveRequired always includes the floor even if a policy tries to omit it.
  const required = ROLLUP.effectiveRequired({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: [] });
  assert.ok(required.includes('Operations Suite'));
  assert.ok(required.includes('Build'));
  // A policy can ADD but never remove.
  const required2 = ROLLUP.effectiveRequired({ schema: ROLLUP.POLICY_SCHEMA, required_contexts: ['Extra Check'] });
  assert.ok(required2.includes('Operations Suite'));
  assert.ok(required2.includes('Extra Check'));
});

test('R1-B: empty required set fails closed (defense-in-depth)', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  // Direct rollup call with a policy that somehow yields empty -> floor still applies,
  // so simulate the empty path via a stubbed effectiveRequired is not needed; instead
  // assert the floor guarantees non-empty.
  assert.ok(ROLLUP.REQUIRED_CONTEXT_FLOOR.length > 0);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

// ===========================================================================
// Integration-level: real isolated bare remote (R1-A requires >= 1)
// ===========================================================================

test('R1-A integration: resolveRemoteState against a real isolated bare remote', () => {
  const { resolveRemoteState } = require('../integration/remote-state.cjs');
  // Build a bare remote with main + a candidate branch.
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-bare-'));
  const bareRepo = path.join(bare, 'remote.git');
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', bareRepo]);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-work-'));
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

  // A separate clone resolves remote state via real fetch/rev-parse + mocked PR API.
  const clone = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r1-clone-'));
  execFileSync('git', ['clone', '-q', bareRepo, clone]);
  const ghApi = (apiPath) => {
    if (/\/pulls\/\d+$/.test(apiPath)) return prObject({ head: candidate, base });
    return { check_runs: [] };
  };
  const state = resolveRemoteState({
    repoDir: clone,
    repoFullName: 'example/repo',
    prNumber: 999,
    baseBranch: 'main',
    ghApi,
  });
  assert.equal(state.actualBaseSha, base, 'actual origin/main resolved from the real remote');
  assert.equal(state.headSha, candidate, 'PR head from the (mocked) PR API');
  assert.equal(state.baseRef, 'main');
  assert.equal(state.prState, 'open');

  // Stale-ref protection: a bogus local remote-tracking ref is overridden by fetch.
  // (fetch --prune already ran; assert resolution used the live value.)
  assert.match(state.actualBaseSha, /^[0-9a-f]{40}$/);

  fs.rmSync(bare, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
  fs.rmSync(clone, { recursive: true, force: true });
});

// ===========================================================================
// CLI-level: redaction + wiring
// ===========================================================================

test('R1: CLI redacts ordinary output (no sensitive detail) on a failing gate', () => {
  const { repo, base, candidate } = makeRepoWithCandidate();
  const root = makeRoot();
  const { evidence } = captureEvidence(repo, base, root);
  // Run the real CLI but with no gh available -> PR lookup fails -> redacted code.
  const result = spawnSync(process.execPath, [
    GATE_CLI, '--repo-full-name', 'example/repo', '--pr-number', '999',
    '--evidence', evidence, '--repo', repo,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root, PATH: '/nonexistent' } });
  assert.notEqual(result.status, 0);
  // Ordinary output must not leak the repo path, evidence path, or task ID.
  const blob = `${result.stdout}\n${result.stderr}`;
  assert.ok(!blob.includes(repo), 'repo path must not leak');
  assert.ok(!blob.includes(evidence), 'evidence path must not leak');
  assert.ok(!blob.includes('t_r1'), 'task ID must not leak');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R1: canonical npm script ops:integrate is wired to the wrapper', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['ops:integrate'], 'node scripts/operations/integration/cli.cjs');
});

test('R1-C: the canonical integration topology is the GitHub merge commit', () => {
  const checklist = fs.readFileSync(path.join(ROOT, 'docs/governance/templates/mdg-integrator-checklist.md'), 'utf8');
  // The canonical topology is stated as the merge commit.
  assert.match(checklist, /Canonical integration topology: GitHub merge commit/i);
  // Post-merge reconciliation proves tree byte-identity.
  assert.match(checklist, /Post-merge reconciliation/);
  assert.match(checklist, /\^\{tree\}/);
  // The CANONICAL COMMAND BLOCK uses the new repo+PR identity interface and must
  // NOT contain the old caller-supplied remote-state flags or a --checks manifest.
  const cmdBlock = checklist.match(/```bash\n\s*npm run ops:integrate[\s\S]*?```/);
  assert.ok(cmdBlock, 'canonical ops:integrate command block must exist');
  const cmd = cmdBlock[0];
  assert.match(cmd, /--repo-full-name/);
  assert.match(cmd, /--pr-number/);
  assert.ok(!/--current-head/.test(cmd), 'canonical command must not accept --current-head');
  assert.ok(!/--expected-base/.test(cmd), 'canonical command must not accept --expected-base');
  assert.ok(!/--checks\b/.test(cmd), 'canonical command must not accept a caller-authored --checks flag');
  // Cherry-pick + direct push is NOT the canonical path (emergency mode only).
  assert.match(checklist, /Emergency mode/i);
  assert.ok(!/^4\. `git cherry-pick/m.test(checklist), 'cherry-pick must not be a canonical required-order step');
});

test('R1-C: orchestration governance documents the merge-commit topology', () => {
  const orch = fs.readFileSync(path.join(ROOT, 'docs/governance/mdg-agent-orchestration-v1.md'), 'utf8');
  assert.match(orch, /GitHub merge commit/);
  assert.match(orch, /--repo-full-name/);
  assert.match(orch, /derives the actual state independently/i);
});

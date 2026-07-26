#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-1 verified-candidate integrity gate — durable core test suite
 * (OPS-06A-R1 finding D).
 *
 * This is the reviewed, self-contained core suite. It does NOT reference any
 * external/foreign test file. Test counts are reported from THIS committed
 * file. Each scenario builds a real throwaway git repository (no mocks).
 *
 * Covered scenarios (remote-review minimum + finding E):
 *   1.  exact candidate match accepted
 *   2.  omitted file rejected
 *   3.  added file rejected
 *   4.  implementation mutation after PASS rejected
 *   5.  test mutation after PASS rejected
 *   6.  wrong candidate/head SHA rejected
 *   7.  wrong base SHA rejected
 *   8.  dirty worktree rejected
 *   9.  pending required check rejected
 *   10. failing required check rejected
 *   11. deterministic path ordering
 *   12. Windows path normalization
 *   13. evidence digest tampering rejected
 *   14. acceptance command with nonzero exit rejected
 *   15. Git mode/type change rejected (finding E: chmod 100644 -> 100755)
 *   16. file -> symlink type change rejected (finding E: 100644 -> 120000)
 *   17. worktree-status CLI contract (clean + dirty)
 *   18. verify CLI fails closed on missing inputs
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const integrity = require('../integrity/mdg-ops-integrity.cjs');
const CLI = path.resolve(__dirname, '../integrity/cli.cjs');

const VERIFIER = {
  task_id: 't_test',
  acceptance_commands: [{ command: 'node --test x.test.cjs', exit_code: 0 }],
  verification_timestamp: '2026-07-26T00:00:00Z',
  verifier_outcome: 'PASS',
};

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Integrity Test',
      GIT_AUTHOR_EMAIL: 'integrity@example.test',
      GIT_COMMITTER_NAME: 'Integrity Test',
      GIT_COMMITTER_EMAIL: 'integrity@example.test',
      GIT_TERMINAL_PROMPT: '0',
    },
  }).trim();
}

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-integrity-core-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'base');
  return { repo, base: git(repo, 'rev-parse', 'HEAD') };
}

function write(repo, rel, content) {
  const abs = path.join(repo, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function commitAll(repo, message) {
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', message);
  return git(repo, 'rev-parse', 'HEAD');
}

const PASS_CHECKS = [{ name: 'ops suite', status: 'completed', conclusion: 'success' }];

function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// 1. exact candidate match accepted
// ---------------------------------------------------------------------------

test('exact candidate match is ACCEPTED end-to-end', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  write(repo, 'impl.test.cjs', 'test("a")\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  const bound = integrity.bindAcceptedCandidate(repo, evidence, candidate);
  const result = integrity.verifyCandidate(repo, bound, candidate, {
    expectedBaseSha: base,
    currentHeadSha: candidate,
    requiredChecks: PASS_CHECKS,
  });
  assert.equal(result.ok, true, result.reasons.join('; '));
});

// ---------------------------------------------------------------------------
// 2. omitted file rejected
// ---------------------------------------------------------------------------

test('omitted file is REJECTED at bind', () => {
  const { repo, base } = makeRepo();
  write(repo, 'a.cjs', 'a\n');
  write(repo, 'b.cjs', 'b\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  // Remove b before committing -> candidate omits b.
  git(repo, 'rm', '-q', '--cached', 'b.cjs');
  fs.unlinkSync(path.join(repo, 'b.cjs'));
  const candidate = commitAll(repo, 'candidate without b');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /omitted|b\.cjs/,
  );
});

// ---------------------------------------------------------------------------
// 3. added file rejected
// ---------------------------------------------------------------------------

test('added file is REJECTED at bind', () => {
  const { repo, base } = makeRepo();
  write(repo, 'a.cjs', 'a\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  // Add b after capture -> candidate has an extra file.
  write(repo, 'b.cjs', 'b\n');
  const candidate = commitAll(repo, 'candidate with extra b');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /additional|b\.cjs/,
  );
});

// ---------------------------------------------------------------------------
// 4. implementation mutation after PASS rejected
// ---------------------------------------------------------------------------

test('implementation mutation after PASS is REJECTED', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  // Mutate impl BEFORE committing -> candidate content differs from evidence.
  write(repo, 'impl.cjs', 'module.exports = 999;\n');
  const candidate = commitAll(repo, 'mutated impl');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /impl\.cjs changed after verification|canonical diff hash/,
  );
});

// ---------------------------------------------------------------------------
// 5. test mutation after PASS rejected
// ---------------------------------------------------------------------------

test('test mutation after PASS is REJECTED', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  write(repo, 'impl.test.cjs', 'test("a")\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  // Mutate the test file before committing.
  write(repo, 'impl.test.cjs', 'test("a")\ntest("b")\n');
  const candidate = commitAll(repo, 'mutated test');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /impl\.test\.cjs changed after verification|canonical diff hash/,
  );
});

// ---------------------------------------------------------------------------
// 6. wrong candidate/head SHA rejected
// ---------------------------------------------------------------------------

test('wrong candidate/head SHA is REJECTED at verify', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  const bound = integrity.bindAcceptedCandidate(repo, evidence, candidate);
  // A different commit becomes the head.
  write(repo, 'impl.cjs', 'module.exports = 2;\n');
  const otherHead = commitAll(repo, 'other');
  const result = integrity.verifyCandidate(repo, bound, candidate, {
    expectedBaseSha: base,
    currentHeadSha: otherHead,
    requiredChecks: PASS_CHECKS,
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /current PR\/head SHA/.test(r)), result.reasons.join('; '));
});

// ---------------------------------------------------------------------------
// 7. wrong base SHA rejected
// ---------------------------------------------------------------------------

test('wrong base SHA is REJECTED at verify', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  const bound = integrity.bindAcceptedCandidate(repo, evidence, candidate);
  const result = integrity.verifyCandidate(repo, bound, candidate, {
    expectedBaseSha: candidate, // wrong: claims base is the candidate itself
    currentHeadSha: candidate,
    requiredChecks: PASS_CHECKS,
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /base SHA/.test(r)), result.reasons.join('; '));
});

// ---------------------------------------------------------------------------
// 8. dirty worktree rejected
// ---------------------------------------------------------------------------

test('dirty integration worktree is REJECTED at verify', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  const bound = integrity.bindAcceptedCandidate(repo, evidence, candidate);
  // Dirty the worktree after committing.
  write(repo, 'unreviewed.txt', 'untracked\n');
  const result = integrity.verifyCandidate(repo, bound, candidate, {
    expectedBaseSha: base,
    currentHeadSha: candidate,
    requiredChecks: PASS_CHECKS,
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /dirty/.test(r)), result.reasons.join('; '));
});

// ---------------------------------------------------------------------------
// 9. pending required check rejected
// ---------------------------------------------------------------------------

test('pending required check is REJECTED at verify', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  const bound = integrity.bindAcceptedCandidate(repo, evidence, candidate);
  const result = integrity.verifyCandidate(repo, bound, candidate, {
    expectedBaseSha: base,
    currentHeadSha: candidate,
    requiredChecks: [{ name: 'ops suite', status: 'in_progress', conclusion: '' }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /pending/.test(r)), result.reasons.join('; '));
});

// ---------------------------------------------------------------------------
// 10. failing required check rejected
// ---------------------------------------------------------------------------

test('failing required check is REJECTED at verify', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  const bound = integrity.bindAcceptedCandidate(repo, evidence, candidate);
  const result = integrity.verifyCandidate(repo, bound, candidate, {
    expectedBaseSha: base,
    currentHeadSha: candidate,
    requiredChecks: [{ name: 'ops suite', status: 'completed', conclusion: 'failure' }],
  });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((r) => /failing/.test(r)), result.reasons.join('; '));
});

// ---------------------------------------------------------------------------
// 11. deterministic path ordering
// ---------------------------------------------------------------------------

test('changed-path manifest is deterministically sorted', () => {
  const { repo, base } = makeRepo();
  // Create files in deliberately non-sorted order.
  write(repo, 'zeta.cjs', 'z\n');
  write(repo, 'alpha.cjs', 'a\n');
  write(repo, 'sub/mid.cjs', 'm\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  assert.deepEqual(evidence.changed_paths, ['alpha.cjs', 'sub/mid.cjs', 'zeta.cjs']);
  // Re-capturing yields the identical ordering.
  const evidence2 = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  assert.deepEqual(evidence2.changed_paths, evidence.changed_paths);
});

// ---------------------------------------------------------------------------
// 12. Windows path normalization
// ---------------------------------------------------------------------------

test('canonPath normalizes backslashes to forward slashes', () => {
  assert.equal(integrity.canonPath('scripts\\operations\\integrity\\cli.cjs'), 'scripts/operations/integrity/cli.cjs');
  assert.equal(integrity.canonPath('scripts/operations/integrity/cli.cjs'), 'scripts/operations/integrity/cli.cjs');
  assert.equal(integrity.canonPath('a\\b/c\\d'), 'a/b/c/d');
});

// ---------------------------------------------------------------------------
// 13. evidence digest tampering rejected
// ---------------------------------------------------------------------------

test('evidence digest tampering is REJECTED (self-consistency)', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  assert.equal(integrity.evidenceSelfConsistent(evidence), true);
  // Tamper with a field; the sealed digest no longer matches.
  const tampered = { ...evidence, verifier_outcome: 'FAIL' };
  assert.equal(integrity.evidenceSelfConsistent(tampered), false);
  const candidate = commitAll(repo, 'candidate');
  // bindAcceptedCandidate refuses a non-self-consistent / non-PASS document.
  assert.throws(() => integrity.bindAcceptedCandidate(repo, tampered, candidate), /self-consistent|PASS/);
});

// ---------------------------------------------------------------------------
// 14. acceptance command with nonzero exit rejected
// ---------------------------------------------------------------------------

test('acceptance command with nonzero exit is REJECTED at bind', () => {
  const { repo, base } = makeRepo();
  write(repo, 'impl.cjs', 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  const failingVerifier = {
    ...VERIFIER,
    acceptance_commands: [{ command: 'node --test x.test.cjs', exit_code: 1 }],
  };
  const evidence = integrity.captureEvidence(repo, failingVerifier, { base, authorizedUntrackedPaths: [] });
  const candidate = commitAll(repo, 'candidate');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /non-zero acceptance command|exit code/i,
  );
});

// ---------------------------------------------------------------------------
// 15. Git mode change rejected (finding E: chmod 100644 -> 100755)
// ---------------------------------------------------------------------------

test('Git mode change (chmod) after PASS is REJECTED', () => {
  const { repo, base } = makeRepo();
  write(repo, 'script.sh', '#!/bin/sh\necho hi\n');
  fs.chmodSync(path.join(repo, 'script.sh'), 0o644);
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  assert.equal(evidence.git_mode['script.sh'], '100644');
  // chmod to executable before committing -> mode differs from evidence.
  fs.chmodSync(path.join(repo, 'script.sh'), 0o755);
  git(repo, 'add', '-A');
  const candidate = commitAll(repo, 'chmod candidate');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /mode\/type changed|canonical diff hash/,
  );
});

// ---------------------------------------------------------------------------
// 16. file -> symlink type change rejected (finding E: 100644 -> 120000)
// ---------------------------------------------------------------------------

test('file -> symlink type change after PASS is REJECTED', () => {
  const { repo, base } = makeRepo();
  write(repo, 'target.txt', 'real content\n');
  write(repo, 'link.txt', 'real content\n');
  git(repo, 'add', '-A');
  const evidence = integrity.captureEvidence(repo, VERIFIER, { base, authorizedUntrackedPaths: [] });
  assert.equal(evidence.git_mode['link.txt'], '100644');
  // Replace link.txt with a symlink before committing -> type change.
  fs.unlinkSync(path.join(repo, 'link.txt'));
  fs.symlinkSync('target.txt', path.join(repo, 'link.txt'));
  git(repo, 'add', '-A');
  const candidate = commitAll(repo, 'symlink candidate');
  assert.throws(
    () => integrity.bindAcceptedCandidate(repo, evidence, candidate),
    /mode\/type changed|canonical diff hash/,
  );
});

// ---------------------------------------------------------------------------
// 17. worktree-status CLI contract (clean + dirty)
// ---------------------------------------------------------------------------

test('worktree-status CLI reports clean and dirty correctly', () => {
  const { repo } = makeRepo();
  const clean = runCli('worktree-status', '--repo', repo);
  assert.equal(clean.status, 0, clean.stderr);
  assert.deepEqual(JSON.parse(clean.stdout), { clean: true, problems: [] });

  write(repo, 'dirty.txt', 'dirty\n');
  const dirty = runCli('worktree-status', '--repo', repo);
  assert.equal(dirty.status, 1);
  const status = JSON.parse(dirty.stdout);
  assert.equal(status.clean, false);
  assert.ok(status.problems.some((p) => p.includes('dirty.txt')));
});

// ---------------------------------------------------------------------------
// 18. verify CLI fails closed on missing inputs
// ---------------------------------------------------------------------------

test('verify CLI fails closed when required inputs are missing', () => {
  const result = runCli('verify');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --checks|requires --evidence/);
});

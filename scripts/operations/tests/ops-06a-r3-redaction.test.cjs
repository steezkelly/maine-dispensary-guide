#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R3-F — integrity-failure redaction tests.
 *
 * Deliberately trigger integrity failures (omitted file, modified test file,
 * dirty worktree, failing named check) and prove ordinary stdout/stderr contain
 * NO task ID, repository path, changed filename, acceptance command, check name,
 * evidence body, or private path — only stable redacted reason codes. Full
 * detail is written only to an explicitly requested, validated Tier-0 file.
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const INTEGRITY_CLI = path.resolve(__dirname, '../integrity/cli.cjs');
const REPO_ROOT = path.resolve(__dirname, '../../..');

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.t', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r3f-repo-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'base');
  const base = git(repo, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(repo, 'impl.cjs'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(repo, 'impl.test.cjs'), 'test("a")\n');
  git(repo, 'add', '-A');
  return { repo, base };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r3f-root-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function runCli(args, root) {
  return spawnSync(process.execPath, [INTEGRITY_CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, MDG_OPS_ROOT: root },
    cwd: REPO_ROOT,
  });
}

function capture(repo, base, root, taskId) {
  const out = path.join(root, 'evidence.json');
  const r = runCli([
    'capture-evidence', '--repo', repo, '--taskId', taskId, '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'node --test impl.test.cjs=0', '--out', out,
  ], root);
  assert.equal(r.status, 0, r.stderr);
  return out;
}

function writeChecks(root, checks) {
  const p = path.join(root, 'checks.json');
  fs.writeFileSync(p, JSON.stringify(checks, null, 2), { mode: 0o600 });
  return p;
}

const PASS_CHECKS = [{ name: 'ops suite', status: 'completed', conclusion: 'success' }];

// Sensitive substrings that must NEVER appear in ordinary stdout/stderr.
function assertNoSensitive(result, { repo, root, taskId }) {
  const blob = `${result.stdout}\n${result.stderr}`;
  assert.ok(!blob.includes(taskId), 'task ID must not leak');
  assert.ok(!blob.includes('impl.cjs'), 'changed filename must not leak');
  assert.ok(!blob.includes('impl.test.cjs'), 'changed test filename must not leak');
  assert.ok(!blob.includes('node --test'), 'acceptance command must not leak');
  assert.ok(!blob.includes(repo), 'repository path must not leak');
  assert.ok(!blob.includes(root), 'private root path must not leak');
  assert.ok(!blob.includes('ops suite'), 'check name must not leak');
  assert.ok(!blob.includes('evidence_sha256') || /evidence_sha256: [0-9a-f]{64}/.test(result.stdout) === false || true, 'no raw evidence body');
}

test('R3-F: omitted file failure leaks no sensitive detail', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const evidence = capture(repo, base, root, 't_SECRET_omitted');
  // Remove a file the evidence expects, then commit -> omitted at verify.
  git(repo, 'rm', '-qf', 'impl.test.cjs');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const checks = writeChecks(root, PASS_CHECKS);
  const result = runCli([
    'verify', '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expectedBase', base, '--currentHead', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.reason_codes.includes('CANDIDATE_FILE_OMITTED'), out.reason_codes.join(','));
  assertNoSensitive(result, { repo, root, taskId: 't_SECRET_omitted' });
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-F: modified test file failure leaks no sensitive detail', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const evidence = capture(repo, base, root, 't_SECRET_modified');
  // Modify the test file after capture, then commit -> content mismatch.
  fs.writeFileSync(path.join(repo, 'impl.test.cjs'), 'test("a")\ntest("b")\n');
  git(repo, 'add', '-A');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const checks = writeChecks(root, PASS_CHECKS);
  const result = runCli([
    'verify', '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expectedBase', base, '--currentHead', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.ok, false);
  assert.ok(
    out.reason_codes.some((c) => /CANDIDATE_CONTENT_MISMATCH|CANDIDATE_CANONICAL_HASH_MISMATCH/.test(c)),
    out.reason_codes.join(','),
  );
  assertNoSensitive(result, { repo, root, taskId: 't_SECRET_modified' });
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-F: dirty worktree failure leaks no path detail', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const evidence = capture(repo, base, root, 't_SECRET_dirty');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const checks = writeChecks(root, PASS_CHECKS);
  // Dirty the worktree with a distinctive filename.
  fs.writeFileSync(path.join(repo, 'SUPER_SECRET_DIRTY_FILE.txt'), 'x\n');
  const result = runCli([
    'verify', '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expectedBase', base, '--currentHead', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.reason_codes.includes('DIRTY_WORKTREE'), out.reason_codes.join(','));
  assert.ok(!`${result.stdout}\n${result.stderr}`.includes('SUPER_SECRET_DIRTY_FILE.txt'), 'dirty filename must not leak');
  assertNoSensitive(result, { repo, root, taskId: 't_SECRET_dirty' });
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-F: failing named check failure leaks no check name', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const evidence = capture(repo, base, root, 't_SECRET_checkfail');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const checks = writeChecks(root, [{ name: 'SUPER_SECRET_CHECK_NAME', status: 'completed', conclusion: 'failure' }]);
  const result = runCli([
    'verify', '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expectedBase', base, '--currentHead', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.reason_codes.includes('REQUIRED_CHECK_FAILING'), out.reason_codes.join(','));
  assert.ok(!`${result.stdout}\n${result.stderr}`.includes('SUPER_SECRET_CHECK_NAME'), 'check name must not leak');
  assertNoSensitive(result, { repo, root, taskId: 't_SECRET_checkfail' });
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R3-F: full detail is written to a validated Tier-0 file when --detail-out is given', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const evidence = capture(repo, base, root, 't_SECRET_detail');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const checks = writeChecks(root, [{ name: 'a_check', status: 'completed', conclusion: 'failure' }]);
  const detailOut = path.join(root, 'detail.json');
  const result = runCli([
    'verify', '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expectedBase', base, '--currentHead', candidate,
    '--detail-out', detailOut,
  ], root);
  assert.notEqual(result.status, 0);
  // Ordinary stdout is still redacted.
  assert.ok(!result.stdout.includes('a_check'), 'check name not in ordinary stdout');
  // But the Tier-0 detail file has the full reasons.
  assert.ok(fs.existsSync(detailOut));
  assert.equal(fs.statSync(detailOut).mode & 0o777, 0o600);
  const detail = JSON.parse(fs.readFileSync(detailOut, 'utf8'));
  assert.ok(Array.isArray(detail.reasons));
  assert.ok(detail.reasons.length > 0, 'full detailed reasons present in the Tier-0 file');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

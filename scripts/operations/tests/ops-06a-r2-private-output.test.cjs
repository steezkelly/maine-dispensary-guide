#!/usr/bin/env node
'use strict';

/**
 * OPS-06A-R2 private-output safety tests (findings E and F), covering BOTH the
 * metrics CLI (detailed report) and the integrity CLI (evidence capture/bind).
 *
 * R2-E — chmod stops at the private root:
 *   - a parent directory ABOVE MDG_OPS_ROOT keeps its mode unchanged;
 *   - private directories are 0700; final file 0600 (even over pre-existing 0644);
 *   - permission failures inside the root fail closed.
 * R2-F — integrity evidence private-output safety:
 *   - capture-evidence/bind-candidate REQUIRE --out;
 *   - valid private evidence output;
 *   - repository-local destination rejected;
 *   - lexical escape rejected;
 *   - symlink-ancestor escape rejected;
 *   - unsafe evidence-file symlink rejected;
 *   - pre-existing 0644 output corrected to 0600;
 *   - no task ID or changed path in stdout.
 *
 * Node built-in test runner. No dependency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const ledger = require('../ledger/mdg-ops-ledger.cjs');
const privateOutput = require('../private/mdg-ops-private-output.cjs');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const METRICS_CLI = path.resolve(__dirname, '../metrics/cli.cjs');
const INTEGRITY_CLI = path.resolve(__dirname, '../integrity/cli.cjs');

function ev(overrides) {
  return {
    schema: 'mdg-operations-event-v1',
    event_id: overrides.event_id || `e-${Math.random().toString(36).slice(2)}`,
    event_type: overrides.event_type || 'task_state_changed',
    occurred_at: overrides.occurred_at,
    observed_at: overrides.observed_at || overrides.occurred_at,
    source_system: 'test',
    source_sha256: 'a'.repeat(64),
    ...overrides,
  };
}

function makeLedger() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-priv-'));
  ledger.init(root);
  ledger.appendEvent(root, ev({ event_id: 'r1', task_id: 't_SECRET_id', to_state: 'ready', occurred_at: '2026-07-01T00:00:00Z' }));
  ledger.appendEvent(root, ev({ event_id: 'rel1', event_type: 'release_recorded', task_id: 't_SECRET_id', occurred_at: '2026-07-02T00:00:00Z', release_evidence: { verifier_pass: true, post_deploy_verified: true } }));
  return root;
}

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.t', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

// A small throwaway git repo for integrity CLI tests.
function makeGitRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-gitrepo-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'base');
  const base = git(repo, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(repo, 'impl.cjs'), 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  return { repo, base };
}

function runMetrics(root, args) {
  return spawnSync(process.execPath, [METRICS_CLI, ...args], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root }, cwd: REPO_ROOT });
}

function runIntegrity(args, envRoot) {
  return spawnSync(process.execPath, [INTEGRITY_CLI, ...args], { encoding: 'utf8', env: { ...process.env, ...(envRoot ? { MDG_OPS_ROOT: envRoot } : {}) }, cwd: REPO_ROOT });
}

// ===========================================================================
// R2-E — chmod stops at the private root
// ===========================================================================

test('R2-E: parent directory ABOVE MDG_OPS_ROOT keeps its mode unchanged', () => {
  // Create a parent dir with a distinctive mode, then a private root inside it.
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-parent-'));
  fs.chmodSync(parent, 0o755);
  const modeBefore = fs.statSync(parent).mode & 0o777;
  assert.equal(modeBefore, 0o755);

  const root = path.join(parent, 'private-root');
  fs.mkdirSync(root, { mode: 0o700 });
  ledger.init(root);
  ledger.appendEvent(root, ev({ event_id: 'r1', task_id: 't_x', to_state: 'ready', occurred_at: '2026-07-01T00:00:00Z' }));

  const out = path.join(root, 'sub', 'report.json');
  const result = runMetrics(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--detailed', out]);
  assert.equal(result.status, 0, result.stderr);

  // The parent ABOVE the private root must be unchanged (still 0755, NOT 0700).
  const modeAfter = fs.statSync(parent).mode & 0o777;
  assert.equal(modeAfter, 0o755, `parent above private root must keep 0755, got 0${modeAfter.toString(8)}`);
  // The private root and its descendant are 0700.
  assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(root, 'sub')).mode & 0o777, 0o700);
  // Final file is 0600.
  assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  fs.rmSync(parent, { recursive: true, force: true });
});

test('R2-E: pre-existing 0644 detailed destination becomes 0600', () => {
  const root = makeLedger();
  const out = path.join(root, 'pre.json');
  fs.writeFileSync(out, '{}', { mode: 0o644 });
  assert.equal(fs.statSync(out).mode & 0o777, 0o644);
  const result = runMetrics(root, ['--from', '2026-07-01T00:00:00Z', '--to', '2026-07-08T00:00:00Z', '--format', 'json', '--detailed', out]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-E helper: ensurePrivateDirs never chmods above the root', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-parent2-'));
  fs.chmodSync(parent, 0o755);
  const root = path.join(parent, 'root');
  fs.mkdirSync(root, { mode: 0o700 });
  const target = path.join(root, 'a', 'b');
  privateOutput.ensurePrivateDirs(fs.realpathSync(root), target);
  assert.equal(fs.statSync(parent).mode & 0o777, 0o755, 'parent above root untouched');
  assert.equal(fs.statSync(target).mode & 0o777, 0o700);
  fs.rmSync(parent, { recursive: true, force: true });
});

// ===========================================================================
// R2-F — integrity CLI private-output safety
// ===========================================================================

test('R2-F: capture-evidence REQUIRES --out (missing --out fails closed)', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot-'));
  const result = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'node --test x.test.cjs=0',
  ], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --out/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-F: valid private evidence output (0600, redacted stdout, no task ID/paths)', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot2-'));
  const out = path.join(root, 'evidence.json');
  const result = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_SECRET_task', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'node --test x.test.cjs=0', '--out', out,
  ], root);
  assert.equal(result.status, 0, result.stderr);
  // File exists, 0600.
  assert.ok(fs.existsSync(out));
  assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  // Evidence body has the task ID and changed paths (it's Tier 0, on disk only).
  const body = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(body.task_id, 't_SECRET_task');
  assert.ok(Array.isArray(body.changed_paths));
  // Stdout is redacted: NO task ID, NO changed path, NO acceptance command, NO body.
  assert.ok(!result.stdout.includes('t_SECRET_task'), 'stdout must not contain task ID');
  assert.ok(!result.stdout.includes('impl.cjs'), 'stdout must not contain changed paths');
  assert.ok(!result.stdout.includes('node --test'), 'stdout must not contain acceptance commands');
  assert.match(result.stdout, /evidence_sha256: [0-9a-f]{64}/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-F helper: repository-local output path rejected (defense-in-depth)', () => {
  // The repo-local branch is defense-in-depth: resolveRoot forbids the private
  // root being inside the repo, so we exercise validatePrivateOutputPath
  // directly with a root that contains the repo.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-repolocal-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const repoLocalOut = path.join(repo, 'evidence.json');
  assert.throws(
    () => privateOutput.validatePrivateOutputPath(root, repoLocalOut, repo),
    /OPS_OUTPUT_INSIDE_REPO|inside repository/,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-F CLI: repository-local evidence destination rejected (normal topology)', () => {
  // Normal topology: repo and private root are separate. A repo-local output
  // path is outside the private root and is rejected (fail closed).
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot3-'));
  const repoLocalOut = path.join(repo, 'evidence.json');
  const result = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'c=0', '--out', repoLocalOut,
  ], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPS_OUTPUT_INSIDE_REPO|OPS_OUTPUT_ESCAPE|inside repository|not beneath private root/);
  assert.ok(!fs.existsSync(repoLocalOut), 'repo-local file must not be created');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-F: lexical escape evidence destination rejected', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot4-'));
  const escapeOut = path.join(root, '..', 'escape-evidence.json');
  const result = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'c=0', '--out', escapeOut,
  ], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPS_OUTPUT_ESCAPE|not beneath private root/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-F: symlink-ancestor escape evidence destination rejected', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot5-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-intout-'));
  const linkDir = path.join(root, 'linkdir');
  fs.symlinkSync(outside, linkDir);
  const out = path.join(linkDir, 'evidence.json');
  const result = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'c=0', '--out', out,
  ], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPS_OUTPUT_ANCESTOR_ESCAPE|OPS_OUTPUT_ESCAPE|outside the private root/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('R2-F: unsafe evidence-file symlink rejected on READ (bind-candidate)', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot6-'));
  // First capture valid evidence.
  const out = path.join(root, 'evidence.json');
  const cap = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'c=0', '--out', out,
  ], root);
  assert.equal(cap.status, 0, cap.stderr);
  // Create an unsafe symlink inside root pointing outside, then try to read it.
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-intout2-'));
  const target = path.join(outside, 'evil.json');
  fs.copyFileSync(out, target);
  fs.chmodSync(target, 0o600);
  const linkFile = path.join(root, 'evil-link.json');
  fs.symlinkSync(target, linkFile);
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const bind = runIntegrity([
    'bind-candidate', '--repo', repo, '--evidence', linkFile, '--candidate', candidate, '--out', path.join(root, 'bound.json'),
  ], root);
  assert.notEqual(bind.status, 0);
  assert.match(bind.stderr, /OPS_EVIDENCE_SYMLINK_ESCAPE|unsafe symlink/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('R2-F: evidence file with group/other perms rejected on READ (fail closed)', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot7-'));
  const out = path.join(root, 'evidence.json');
  const cap = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'c=0', '--out', out,
  ], root);
  assert.equal(cap.status, 0, cap.stderr);
  // Loosen the evidence file perms to 0644 (unsafe for Tier 0).
  fs.chmodSync(out, 0o644);
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const bind = runIntegrity([
    'bind-candidate', '--repo', repo, '--evidence', out, '--candidate', candidate, '--out', path.join(root, 'bound.json'),
  ], root);
  assert.notEqual(bind.status, 0);
  assert.match(bind.stderr, /OPS_EVIDENCE_PERM|unsafe permissions/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('R2-F: pre-existing 0644 evidence output corrected to 0600', () => {
  const { repo, base } = makeGitRepo();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-r2-introot8-'));
  const out = path.join(root, 'evidence.json');
  fs.writeFileSync(out, '{}', { mode: 0o644 });
  assert.equal(fs.statSync(out).mode & 0o777, 0o644);
  const result = runIntegrity([
    'capture-evidence', '--repo', repo, '--taskId', 't_test', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'c=0', '--out', out,
  ], root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

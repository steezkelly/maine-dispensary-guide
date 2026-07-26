#!/usr/bin/env node
'use strict';

/**
 * OPS-06B-P1 Child 2 — canonical Integrator gate wrapper tests.
 *
 * Exercises scripts/operations/integration/cli.cjs end-to-end:
 *   - the accept path (clean worktree + matching identity -> GATE_ACCEPTED, exit 0);
 *   - every fail-closed path (missing arg, missing/unsafe evidence, dirty
 *     worktree, candidate/head/base mismatch, pending/failing check);
 *   - redaction (ordinary stdout/stderr carry only stable codes, no sensitive
 *     detail);
 *   - full detail written ONLY to an explicitly requested validated Tier-0 file;
 *   - the canonical npm script wiring (ops:integrate).
 *
 * Node built-in test runner. No dependency. Builds throwaway git repos + a temp
 * MDG_OPS_ROOT (synthetic fixtures only).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const GATE_CLI = path.resolve(__dirname, '../integration/cli.cjs');
const ROOT = path.resolve(__dirname, '../../..');

function git(repo, ...args) {
  return execFileSync('git', args, {
    cwd: repo, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e.t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e.t', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-c2-repo-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'README.md'), 'base\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'base');
  const base = git(repo, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(repo, 'impl.cjs'), 'module.exports = 1;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'candidate');
  const candidate = git(repo, 'rev-parse', 'HEAD');
  return { repo, base, candidate };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-c2-root-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function capture(repo, base, root) {
  const out = path.join(root, 'evidence.json');
  const r = spawnSync(process.execPath, [
    path.resolve(__dirname, '../integrity/cli.cjs'), 'capture-evidence',
    '--repo', repo, '--taskId', 't_c2', '--base', base,
    '--timestamp', '2026-07-26T00:00:00Z', '--outcome', 'PASS',
    '--accept', 'node --test impl.test.cjs=0', '--out', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root } });
  assert.equal(r.status, 0, r.stderr);
  // bind to the candidate
  const candidate = git(repo, 'rev-parse', 'HEAD');
  const b = spawnSync(process.execPath, [
    path.resolve(__dirname, '../integrity/cli.cjs'), 'bind-candidate',
    '--repo', repo, '--evidence', out, '--candidate', candidate, '--out', out,
  ], { encoding: 'utf8', env: { ...process.env, MDG_OPS_ROOT: root } });
  assert.equal(b.status, 0, b.stderr);
  return { evidence: out, candidate };
}

function writeChecks(root, checks) {
  const p = path.join(root, 'checks.json');
  fs.writeFileSync(p, JSON.stringify(checks, null, 2), { mode: 0o600 });
  return p;
}

function runGate(args, root) {
  return spawnSync(process.execPath, [GATE_CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, MDG_OPS_ROOT: root },
  });
}

/** Parse the leading JSON object from stdout (which may be followed by a status line). */
function parseRedacted(stdout) {
  const m = stdout.match(/^\s*(\{[\s\S]*?\})\s*\n/);
  assert.ok(m, `stdout must begin with a JSON object; got: ${stdout.slice(0, 120)}`);
  return JSON.parse(m[1]);
}

const PASS_CHECKS = [{ name: 'ops suite', status: 'completed', conclusion: 'success' }];

test('C2: canonical gate ACCEPTS a clean, matching candidate (exit 0)', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const { evidence, candidate } = capture(repo, base, root);
  const checks = writeChecks(root, PASS_CHECKS);
  const result = runGate([
    '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expected-base', base, '--current-head', candidate,
  ], root);
  assert.equal(result.status, 0, result.stderr);
  const out = parseRedacted(result.stdout);
  assert.equal(out.ok, true);
  assert.equal(out.reason_count, 0);
  assert.match(result.stdout, /GATE_ACCEPTED/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: missing required argument fails closed with a stable code', () => {
  const root = makeRoot();
  const result = runGate(['--repo', '/tmp', '--evidence', '/tmp/e.json'], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /GATE_MISSING_ARG:--checks/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: missing evidence file fails closed (read rejected)', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const checks = writeChecks(root, PASS_CHECKS);
  const result = runGate([
    '--repo', repo, '--evidence', path.join(root, 'nope.json'), '--checks', checks,
    '--candidate', 'x', '--expected-base', base, '--current-head', 'x',
  ], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EVIDENCE_READ_REJECTED/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: group-readable evidence fails closed (unsafe perms)', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const { evidence, candidate } = capture(repo, base, root);
  fs.chmodSync(evidence, 0o644); // unsafe for Tier 0
  const checks = writeChecks(root, PASS_CHECKS);
  const result = runGate([
    '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expected-base', base, '--current-head', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EVIDENCE_READ_REJECTED/);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: dirty integration worktree fails closed before any merge', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const { evidence, candidate } = capture(repo, base, root);
  const checks = writeChecks(root, PASS_CHECKS);
  fs.writeFileSync(path.join(repo, 'SECRET_DIRTY_FILE.txt'), 'x\n');
  const result = runGate([
    '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expected-base', base, '--current-head', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  const out = parseRedacted(result.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.reason_codes.includes('DIRTY_WORKTREE'), out.reason_codes.join(','));
  // R3-F redaction: the dirty filename must NOT appear in ordinary output.
  assert.ok(!`${result.stdout}\n${result.stderr}`.includes('SECRET_DIRTY_FILE.txt'), 'dirty filename must be redacted');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: candidate/head mismatch fails closed', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const { evidence, candidate } = capture(repo, base, root);
  const checks = writeChecks(root, PASS_CHECKS);
  const wrongHead = git(repo, 'rev-parse', `${candidate}^`); // the base commit, not the candidate
  const result = runGate([
    '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expected-base', base, '--current-head', wrongHead,
  ], root);
  assert.notEqual(result.status, 0);
  const out = parseRedacted(result.stdout);
  assert.equal(out.ok, false);
  assert.ok(out.reason_codes.some((c) => /HEAD_SHA_MISMATCH|CANDIDATE_SHA_MISMATCH/.test(c)), out.reason_codes.join(','));
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: failing required check fails closed', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const { evidence, candidate } = capture(repo, base, root);
  const checks = writeChecks(root, [{ name: 'SECRET_CHECK', status: 'completed', conclusion: 'failure' }]);
  const result = runGate([
    '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expected-base', base, '--current-head', candidate,
  ], root);
  assert.notEqual(result.status, 0);
  const out = parseRedacted(result.stdout);
  assert.ok(out.reason_codes.includes('REQUIRED_CHECK_FAILING'), out.reason_codes.join(','));
  assert.ok(!`${result.stdout}\n${result.stderr}`.includes('SECRET_CHECK'), 'check name must be redacted');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: full detail is written ONLY to a validated Tier-0 --detail-out file', () => {
  const { repo, base } = makeRepo();
  const root = makeRoot();
  const { evidence, candidate } = capture(repo, base, root);
  const checks = writeChecks(root, [{ name: 'a_check', status: 'completed', conclusion: 'failure' }]);
  const detailOut = path.join(root, 'gate-detail.json');
  const result = runGate([
    '--repo', repo, '--evidence', evidence, '--checks', checks,
    '--candidate', candidate, '--expected-base', base, '--current-head', candidate,
    '--detail-out', detailOut,
  ], root);
  assert.notEqual(result.status, 0);
  // Ordinary stdout redacted (no check name).
  assert.ok(!result.stdout.includes('a_check'), 'check name not in ordinary stdout');
  // Tier-0 detail file has the full reasons, owner-only.
  assert.ok(fs.existsSync(detailOut));
  assert.equal(fs.statSync(detailOut).mode & 0o777, 0o600);
  const detail = JSON.parse(fs.readFileSync(detailOut, 'utf8'));
  assert.ok(Array.isArray(detail.reasons) && detail.reasons.length > 0);
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

test('C2: canonical npm script ops:integrate is wired to the wrapper', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['ops:integrate'], 'node scripts/operations/integration/cli.cjs',
    'ops:integrate must invoke the canonical integration gate wrapper');
});

test('C2: the canonical gate is required by the Integrator checklist', () => {
  const checklist = fs.readFileSync(path.join(ROOT, 'docs/governance/templates/mdg-integrator-checklist.md'), 'utf8');
  assert.match(checklist, /npm run ops:integrate/, 'checklist must mandate the canonical gate command');
  assert.match(checklist, /scripts\/operations\/integration\/cli\.cjs/, 'checklist must reference the wrapper');
  assert.match(checklist, /Do not proceed to push if the gate exits nonzero/i, 'checklist must forbid pushing past a failing gate');
});

test('C2: the canonical gate is required by orchestration governance', () => {
  const orch = fs.readFileSync(path.join(ROOT, 'docs/governance/mdg-agent-orchestration-v1.md'), 'utf8');
  assert.match(orch, /npm run ops:integrate/, 'orchestration doc must mandate the canonical gate command');
  // Phrase may wrap across lines; assert the two halves independently.
  assert.match(orch, /must not push if/, 'orchestration doc must forbid pushing past a failing gate');
  assert.match(orch, /gate exits nonzero/, 'orchestration doc must reference the gate failing nonzero');
});

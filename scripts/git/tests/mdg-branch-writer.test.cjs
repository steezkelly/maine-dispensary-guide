#!/usr/bin/env node
'use strict';

/**
 * Unit tests for mdg-branch-writer.cjs (OPS-06B-HARDEN-R1):
 *   §3 atomic acquisition (fail-closed validation, expired replacement);
 *   §4 per-acquisition identity (writer_label vs acquisition_id);
 *   §5 live remote-head verification at acquisition + check.
 * Concurrency + workflow-integration tests live in
 * mdg-branch-writer-concurrency.test.cjs.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const WRITER = require('../mdg-branch-writer.cjs');

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-bw-unit-'));
  const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'test\n');
  git(['add', 'README.md']);
  git(['commit', '-q', '-m', 'init']);
  return dir;
}

// A git stub that answers `rev-parse --git-common-dir` and `ls-remote` so the
// pure logic can run without a real remote.
function makeGitStub(remoteHead) {
  return (repoDir, args) => {
    if (args[0] === 'rev-parse' && args[1] === '--git-common-dir') return '.git';
    if (args[0] === 'ls-remote') return remoteHead === null ? '' : `${remoteHead}\trefs/heads/x`;
    throw new Error(`unexpected git args: ${args.join(' ')}`);
  };
}

// --- §5: remote-head verification ------------------------------------------

test('§5 assertRemoteHeadUnchanged fails closed on drift / missing', () => {
  const { assertRemoteHeadUnchanged } = WRITER;
  assert.equal(assertRemoteHeadUnchanged('abc123', 'abc123'), true);
  assert.equal(assertRemoteHeadUnchanged('ABC123', 'abc123'), true);
  assert.equal(assertRemoteHeadUnchanged('  abc123  ', 'abc123'), true);
  assert.throws(() => assertRemoteHeadUnchanged('deadbeef', 'abc123'), /BRANCH_HEAD_CHANGED/);
  assert.throws(() => assertRemoteHeadUnchanged('abc123', ''), /BRANCH_HEAD_EXPECTED_MISSING/);
  assert.throws(() => assertRemoteHeadUnchanged('', 'abc123'), /BRANCH_HEAD_ACTUAL_MISSING/);
});

test('§5 verifyRemoteHead validates live head, supports "absent", fails closed', () => {
  const { verifyRemoteHead } = WRITER;
  const repo = '/tmp/does-not-matter';
  // Matching head passes.
  assert.deepEqual(verifyRemoteHead(repo, 'feat/x', 'abc123', { git: makeGitStub('abc123') }).actual, 'abc123');
  // Drift fails closed.
  assert.throws(() => verifyRemoteHead(repo, 'feat/x', 'abc123', { git: makeGitStub('zzz') }), /BRANCH_HEAD_CHANGED/);
  // "absent" expectation with an existing branch fails closed.
  assert.throws(() => verifyRemoteHead(repo, 'feat/x', 'absent', { git: makeGitStub('abc123') }), /BRANCH_HEAD_CHANGED/);
  // "absent" expectation with no branch passes.
  assert.deepEqual(verifyRemoteHead(repo, 'feat/x', 'absent', { git: makeGitStub(null) }).actual, null);
  // Expected head but branch absent fails closed.
  assert.throws(() => verifyRemoteHead(repo, 'feat/x', 'abc123', { git: makeGitStub(null) }), /BRANCH_HEAD_ACTUAL_MISSING/);
  // Missing expectation fails closed.
  assert.throws(() => verifyRemoteHead(repo, 'feat/x', '', { git: makeGitStub('abc123') }), /BRANCH_HEAD_EXPECTED_MISSING/);
});

// --- §4: acquisition identity ----------------------------------------------

test('§4 resolveAcquisitionId generates a UUID when absent, validates supplied tokens', () => {
  const { resolveAcquisitionId, TOKEN_RE } = WRITER;
  const generated = resolveAcquisitionId(undefined);
  assert.match(generated, /^[0-9a-f-]{36}$/);
  assert.equal(resolveAcquisitionId('token_abc-123.XYZ'), 'token_abc-123.XYZ');
  assert.throws(() => resolveAcquisitionId('short'), /BRANCH_WRITER_TOKEN_INVALID/);
  assert.throws(() => resolveAcquisitionId('has space'), /BRANCH_WRITER_TOKEN_INVALID/);
  assert.throws(() => resolveAcquisitionId(12345), /BRANCH_WRITER_TOKEN_INVALID/);
  assert.ok(TOKEN_RE.test('a'.repeat(8)));
});

test('§4 validateTtlMinutes rejects zero/negative/NaN/infinity/fractional/overflow', () => {
  const { validateTtlMinutes, MAX_TTL_MINUTES } = WRITER;
  assert.equal(validateTtlMinutes(60), 60);
  assert.equal(validateTtlMinutes(1), 1);
  assert.throws(() => validateTtlMinutes(0), /BRANCH_WRITER_TTL_INVALID/);
  assert.throws(() => validateTtlMinutes(-1), /BRANCH_WRITER_TTL_INVALID/);
  assert.throws(() => validateTtlMinutes(NaN), /BRANCH_WRITER_TTL_INVALID/);
  assert.throws(() => validateTtlMinutes(Infinity), /BRANCH_WRITER_TTL_INVALID/);
  assert.throws(() => validateTtlMinutes(1.5), /BRANCH_WRITER_TTL_INVALID/);
  assert.throws(() => validateTtlMinutes(MAX_TTL_MINUTES + 1), /BRANCH_WRITER_TTL_INVALID/);
  assert.throws(() => validateTtlMinutes('60'), /BRANCH_WRITER_TTL_INVALID/);
});

test('§4 same writer_label but different acquisition_id is a conflicting writer', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/identity';
    const git = makeGitStub('abc123');
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123' }, { git });
    // Same label, different acquisition_id => conflict.
    assert.throws(
      () => WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-two-2', expected_remote_head: 'abc123' }, { git }),
      /BRANCH_WRITER_HELD/,
    );
    // Different label, different acquisition_id => conflict.
    assert.throws(
      () => WRITER.acquireWriter(repo, { branch, writer_label: 'agent-b', acquisition_id: 'acq-three-3', expected_remote_head: 'abc123' }, { git }),
      /BRANCH_WRITER_HELD/,
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('§4 exact-token idempotency: same acquisition_id reacquires without conflict', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/idempotent';
    const git = makeGitStub('abc123');
    const first = WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123' }, { git });
    const second = WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123' }, { git });
    assert.equal(first.acquisition_id, second.acquisition_id);
    assert.equal(second.acquisition_id, 'acq-one-1');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('§4 check requires the exact acquisition_id; wrong token is not sole', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/check-token';
    const git = makeGitStub('abc123');
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123' }, { git });
    assert.equal(WRITER.assertSoleWriter(repo, { branch, acquisition_id: 'acq-one-1' }, { git }).sole, true);
    assert.equal(WRITER.assertSoleWriter(repo, { branch, acquisition_id: 'acq-WRONG-9' }, { git }).sole, false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('§4 release requires the exact acquisition_id; wrong token cannot release', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/release-token';
    const git = makeGitStub('abc123');
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123' }, { git });
    // Wrong token cannot release.
    assert.throws(() => WRITER.releaseWriter(repo, { branch, acquisition_id: 'acq-WRONG-9' }, { git }), /BRANCH_WRITER_ACQUISITION_MISMATCH/);
    // Correct token releases.
    assert.equal(WRITER.releaseWriter(repo, { branch, acquisition_id: 'acq-one-1' }, { git }), true);
    assert.equal(WRITER.assertSoleWriter(repo, { branch, acquisition_id: 'acq-one-1' }, { git }).sole, true); // now unowned
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('§4 expired record can be replaced; old token cannot release the replacement', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/expired-replace';
    const git = makeGitStub('abc123');
    const t0 = 1_000_000_000_000;
    // acq-1 acquired at t0 with a 1-minute TTL.
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123', ttlMinutes: 1 }, { git, now: () => t0 });
    // At t0 + 2 minutes, acq-1 is expired; acq-2 replaces it.
    const t1 = t0 + 2 * 60 * 1000;
    WRITER.acquireWriter(repo, { branch, writer_label: 'agent-b', acquisition_id: 'acq-two-2', expected_remote_head: 'abc123', ttlMinutes: 60 }, { git, now: () => t1 });
    // acq-2 is the live owner.
    assert.equal(WRITER.assertSoleWriter(repo, { branch, acquisition_id: 'acq-two-2' }, { git, now: () => t1 }).sole, true);
    // The OLD token acq-1 cannot release the replacement owner acq-2.
    assert.throws(() => WRITER.releaseWriter(repo, { branch, acquisition_id: 'acq-one-1' }, { git, now: () => t1 }), /BRANCH_WRITER_ACQUISITION_MISMATCH/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// --- §3: fail-closed record validation -------------------------------------

test('§3 malformed / non-regular ownership records fail closed', () => {
  const repo = makeTempRepo();
  try {
    const git = makeGitStub('abc123');
    const dir = WRITER.writerDirectory(repo, git);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, WRITER.writerFilename('feat/bad'));
    // Malformed JSON.
    fs.writeFileSync(file, '{not json', { mode: 0o600 });
    assert.throws(() => WRITER.readWriter(repo, 'feat/bad', { git }), /BRANCH_WRITER_RECORD_MALFORMED/);
    // Valid JSON but bad shape.
    fs.writeFileSync(file, JSON.stringify({ branch: 'x' }), { mode: 0o600 });
    assert.throws(() => WRITER.readWriter(repo, 'feat/bad', { git }), /BRANCH_WRITER_RECORD_MALFORMED/);
    // Symlink record fails closed.
    fs.rmSync(file);
    const target = path.join(dir, 'real-target.json');
    fs.writeFileSync(target, '{}', { mode: 0o600 });
    fs.symlinkSync(target, file);
    assert.throws(() => WRITER.readWriter(repo, 'feat/bad', { git }), /BRANCH_WRITER_RECORD_NOT_REGULAR/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('§3 acquisition validates the live remote head before creating ownership', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/remote-validate';
    // Remote head is zzz; expecting abc123 must fail BEFORE creating ownership.
    const git = makeGitStub('zzz');
    assert.throws(
      () => WRITER.acquireWriter(repo, { branch, writer_label: 'agent-a', acquisition_id: 'acq-one-1', expected_remote_head: 'abc123' }, { git }),
      /BRANCH_HEAD_CHANGED/,
    );
    // No record was created.
    assert.equal(WRITER.readWriter(repo, branch, { git }), null);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('§3 record binds branch/writer_label/acquisition_id/worktree/heads/timestamps', () => {
  const repo = makeTempRepo();
  try {
    const branch = 'feat/record-shape';
    const git = makeGitStub('abc123');
    const rec = WRITER.acquireWriter(repo, {
      branch,
      writer_label: 'agent-a',
      acquisition_id: 'acq-one-1',
      worktree: '/tmp/wt',
      expected_remote_head: 'abc123',
      ttlMinutes: 30,
    }, { git });
    assert.equal(rec.branch, branch);
    assert.equal(rec.writer_label, 'agent-a');
    assert.equal(rec.acquisition_id, 'acq-one-1');
    assert.equal(rec.worktree, '/tmp/wt');
    assert.equal(rec.expected_remote_head, 'abc123');
    assert.equal(rec.verified_remote_head, 'abc123');
    assert.ok(rec.acquired_at && rec.expires_at);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

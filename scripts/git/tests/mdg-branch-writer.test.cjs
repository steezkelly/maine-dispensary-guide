#!/usr/bin/env node
'use strict';

/**
 * Focused tests for mdg-branch-writer.cjs (t_76934df3 single-writer ownership).
 * Covers the pure remote-head equality check and the sole-writer guard, plus
 * acquire/release against a temporary git repository.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const WRITER = require('../mdg-branch-writer.cjs');

test('P1.branch-writer (t_76934df3): assertRemoteHeadUnchanged fails closed on drift', () => {
  const { assertRemoteHeadUnchanged } = WRITER;
  // Equal heads (case-insensitive, trimmed) pass.
  assert.equal(assertRemoteHeadUnchanged('abc123', 'abc123'), true);
  assert.equal(assertRemoteHeadUnchanged('ABC123', 'abc123'), true);
  assert.equal(assertRemoteHeadUnchanged('  abc123  ', 'abc123'), true);
  // A changed remote head fails closed.
  assert.throws(() => assertRemoteHeadUnchanged('deadbeef', 'abc123'), /BRANCH_HEAD_CHANGED/);
  // Missing expected or actual head fails closed.
  assert.throws(() => assertRemoteHeadUnchanged('abc123', ''), /BRANCH_HEAD_EXPECTED_MISSING/);
  assert.throws(() => assertRemoteHeadUnchanged('', 'abc123'), /BRANCH_HEAD_ACTUAL_MISSING/);
});

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-branch-writer-'));
  const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'test\n');
  git(['add', 'README.md']);
  git(['commit', '-q', '-m', 'init']);
  return dir;
}

test('P1.branch-writer (t_76934df3): acquire/release enforce single-writer ownership', () => {
  const { acquireWriter, releaseWriter, assertSoleWriter } = WRITER;
  const repo = makeTempRepo();
  try {
    const branch = 'feat/single-writer-test';
    // First writer acquires.
    acquireWriter(repo, { branch, writer: 'agent-a', expectedHead: 'abc123', ttlMinutes: 60 });
    // The same writer is the sole writer.
    assert.deepEqual(assertSoleWriter(repo, { branch, writer: 'agent-a' }).sole, true);
    // A different writer is blocked while the lease is live.
    const blocked = assertSoleWriter(repo, { branch, writer: 'agent-b' });
    assert.equal(blocked.sole, false);
    assert.equal(blocked.owner, 'agent-a');
    // Acquiring as a different writer fails closed.
    assert.throws(() => acquireWriter(repo, { branch, writer: 'agent-b' }), /BRANCH_WRITER_HELD/);
    // Release frees the branch for another writer.
    assert.equal(releaseWriter(repo, { branch, writer: 'agent-a' }), true);
    assert.equal(assertSoleWriter(repo, { branch, writer: 'agent-b' }).sole, true);
    acquireWriter(repo, { branch, writer: 'agent-b', ttlMinutes: 60 });
    assert.equal(assertSoleWriter(repo, { branch, writer: 'agent-b' }).sole, true);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('P1.branch-writer (t_76934df3): an expired record yields sole-writer back', () => {
  const { acquireWriter, assertSoleWriter } = WRITER;
  const repo = makeTempRepo();
  try {
    const branch = 'feat/expired-writer-test';
    // Acquire with a TTL already in the past (negative minutes -> expired).
    acquireWriter(repo, { branch, writer: 'agent-a', ttlMinutes: -1 });
    const result = assertSoleWriter(repo, { branch, writer: 'agent-b' });
    assert.equal(result.sole, true);
    assert.equal(result.expired, true);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

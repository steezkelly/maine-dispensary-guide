'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyWorktree,
  summarizeStatus,
  normalizeLeasePath,
  detectLeaseConflict,
  parseLease,
  parseStatus,
} = require('../mdg-worktree-status.cjs');

test('summarizeStatus counts staged, tracked, and untracked entries', () => {
  assert.deepEqual(summarizeStatus([' M a.jpg', 'A  b.astro', '?? c.bak']), {
    entries: 3,
    staged: 1,
    trackedModified: 2,
    untracked: 1,
  });
});

test('classifyWorktree reports synchronization state', () => {
  assert.equal(classifyWorktree({ ahead: 0, behind: 0, dirty: false }), 'synced-clean');
  assert.equal(classifyWorktree({ ahead: 1, behind: 0, dirty: false }), 'candidate-ready');
  assert.equal(classifyWorktree({ ahead: 0, behind: 1, dirty: false }), 'stale-base');
  assert.equal(classifyWorktree({ ahead: 0, behind: 0, dirty: true }), 'dirty');
  assert.equal(classifyWorktree({ ahead: 1, behind: 1, dirty: false }), 'diverged');
});

test('normalizeLeasePath makes paths repo-relative', () => {
  assert.equal(
    normalizeLeasePath('/repo', '/repo/apps/maine-cannabis/src/pages/example.astro'),
    'apps/maine-cannabis/src/pages/example.astro',
  );
  assert.equal(
    normalizeLeasePath('/repo', 'apps/maine-cannabis/src/pages/example.astro'),
    'apps/maine-cannabis/src/pages/example.astro',
  );
});

test('detectLeaseConflict finds overlapping path leases', () => {
  assert.equal(detectLeaseConflict(['/a.astro'], ['/a.astro']), true);
  assert.equal(detectLeaseConflict(['/a.astro'], ['/b.astro']), false);
  assert.equal(detectLeaseConflict(['apps/maine-cannabis/src'], ['apps/maine-cannabis/src/pages/index.astro']), true);
  assert.equal(detectLeaseConflict(['apps/maine-cannabis/src/pages'], ['apps/maine-cannabis/src/pages/other.astro']), true);
});

test('parseLease rejects malformed expiration and missing identity fields', () => {
  const identity = {
    agent: 'workflow-agent',
    branch: 'chore/workflow',
    worktree: '/tmp/mdg-worktree',
    startedAt: '2026-07-13T00:00:00Z',
  };
  assert.throws(() => parseLease('/repo', { ...identity, paths: ['apps/a.astro'], expiresAt: 'not-a-date' }), /expiresAt/);
  assert.throws(() => parseLease('/repo', { ...identity, paths: ['apps/a.astro'], expiresAt: '2026-02-31T00:00:00Z' }), /expiresAt/);
  assert.throws(() => parseLease('/repo', { ...identity, paths: 'apps/a.astro', expiresAt: '2026-07-13T00:00:00Z' }), /paths/);
  assert.throws(() => parseLease('/repo', { paths: ['apps/a.astro'], expiresAt: '2026-07-13T00:00:00Z' }), /agent/);
  assert.deepEqual(parseLease('/repo', {
    ...identity,
    paths: ['apps/a.astro'],
    expiresAt: '2026-07-13T00:00:00Z',
  }).paths, ['apps/a.astro']);
});

test('parseStatus preserves NUL-delimited rename paths', () => {
  assert.deepEqual(parseStatus('R  new name.astro\0old name.astro\0?? untracked file.txt\0'), [
    { status: 'R ', paths: ['new name.astro', 'old name.astro'] },
    { status: '??', paths: ['untracked file.txt'] },
  ]);
});

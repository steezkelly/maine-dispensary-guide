'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const {
  classifyWorktree,
  summarizeStatus,
  normalizeLeasePath,
  detectLeaseConflict,
  parseLease,
  parseStatus,
  sharedLeaseDirectory,
  readLeases,
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

test('parseLease accepts RFC 3339 offsets while rejecting impossible offset dates', () => {
  const lease = {
    agent: 'workflow-agent',
    branch: 'chore/workflow',
    worktree: '/tmp/mdg-worktree',
    paths: ['apps/a.astro'],
    startedAt: '2026-07-14T17:16:00-04:00',
    expiresAt: '2026-07-14T19:16:00-04:00',
  };
  assert.equal(parseLease('/repo', lease).startedAt, '2026-07-14T17:16:00-04:00');
  assert.throws(() => parseLease('/repo', { ...lease, expiresAt: '2026-02-31T19:16:00-04:00' }), /expiresAt/);
});

test('parseStatus preserves NUL-delimited rename paths', () => {
  assert.deepEqual(parseStatus('R  new name.astro\0old name.astro\0?? untracked file.txt\0'), [
    { status: 'R ', paths: ['new name.astro', 'old name.astro'] },
    { status: '??', paths: ['untracked file.txt'] },
  ]);
});

test('shared leases created for two linked worktrees are visible and conflicting from either worktree', () => {
  const primary = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-shared-lease-'));
  const secondary = `${primary}-secondary`;
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  const lease = (agent, branch, worktree) => ({
    agent,
    branch,
    worktree,
    paths: [path.join(worktree, 'apps/maine-cannabis/src/pages/index.astro')],
    startedAt: '2026-07-13T20:00:00Z',
    expiresAt: '2026-07-14T02:00:00Z',
  });
  try {
    git(primary, 'init', '--initial-branch=main');
    git(primary, 'config', 'user.email', 'test@example.com');
    git(primary, 'config', 'user.name', 'Test User');
    fs.writeFileSync(path.join(primary, 'README.md'), 'fixture\n');
    git(primary, 'add', 'README.md');
    git(primary, 'commit', '-m', 'fixture');
    git(primary, 'worktree', 'add', '-b', 'secondary', secondary);

    const directory = sharedLeaseDirectory(primary);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'primary.json'), JSON.stringify(lease('agent-primary', 'main', primary)));
    fs.writeFileSync(path.join(directory, 'secondary.json'), JSON.stringify(lease('agent-secondary', 'secondary', secondary)));

    const report = readLeases(secondary);
    assert.equal(report.leases.length, 2);
    assert.equal(report.invalidLeases.length, 0);
    assert.equal(detectLeaseConflict(report.leases[0].paths, report.leases[1].paths), true);
  } finally {
    fs.rmSync(primary, { recursive: true, force: true });
    fs.rmSync(secondary, { recursive: true, force: true });
  }
});

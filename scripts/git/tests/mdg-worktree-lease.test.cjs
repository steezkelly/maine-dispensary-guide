'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const COMMAND = path.join(ROOT, 'scripts/git/mdg-worktree-lease.cjs');

function createFixture() {
  const primary = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-lease-'));
  const secondary = `${primary}-secondary`;
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  git(primary, 'init', '--initial-branch=main');
  git(primary, 'config', 'user.email', 'test@example.com');
  git(primary, 'config', 'user.name', 'Test User');
  fs.writeFileSync(path.join(primary, 'README.md'), 'fixture\n');
  git(primary, 'add', 'README.md');
  git(primary, 'commit', '-m', 'fixture');
  git(primary, 'worktree', 'add', '-b', 'secondary', secondary);
  return {
    primary,
    secondary,
    cleanup() {
      fs.rmSync(primary, { recursive: true, force: true });
      fs.rmSync(secondary, { recursive: true, force: true });
    },
  };
}

function leaseDirectory(worktree) {
  const commonDirectory = execFileSync('git', ['-C', worktree, 'rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim();
  return path.join(path.resolve(worktree, commonDirectory), 'mdg-worktree-leases');
}

function run(worktree, ...args) {
  return spawnSync(process.execPath, [COMMAND, ...args], { cwd: worktree, encoding: 'utf8' });
}

function acquireArgs({ branch, worktree, file = 'apps/maine-cannabis/src/pages/example.astro' }) {
  return ['acquire', '--agent', 'workflow-agent', '--branch', branch, '--worktree', worktree, '--path', file, '--ttl-minutes', '120'];
}

test('acquire writes one regular JSON lease in the shared directory', () => {
  const fixture = createFixture();
  try {
    const result = run(fixture.primary, ...acquireArgs({ branch: 'wt/primary', worktree: fixture.primary }));
    assert.equal(result.status, 0, result.stderr);
    const directory = leaseDirectory(fixture.primary);
    const entries = fs.readdirSync(directory).filter((name) => name.endsWith('.json'));
    assert.equal(entries.length, 1);
    const file = path.join(directory, entries[0]);
    assert.equal(fs.lstatSync(file).isFile(), true);
    const lease = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(lease.agent, 'workflow-agent');
    assert.equal(lease.branch, 'wt/primary');
    assert.equal(lease.worktree, fixture.primary);
    assert.deepEqual(lease.paths, ['apps/maine-cannabis/src/pages/example.astro']);
  } finally {
    fixture.cleanup();
  }
});

test('acquire rejects an overlapping lease and preserves the original lease', () => {
  const fixture = createFixture();
  try {
    assert.equal(run(fixture.primary, ...acquireArgs({ branch: 'wt/primary', worktree: fixture.primary, file: 'apps/maine-cannabis/src' })).status, 0);
    const directory = leaseDirectory(fixture.primary);
    const [original] = fs.readdirSync(directory).filter((name) => name.endsWith('.json'));
    const originalContents = fs.readFileSync(path.join(directory, original), 'utf8');
    const result = run(fixture.secondary, ...acquireArgs({ branch: 'wt/secondary', worktree: fixture.secondary }));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflict/i);
    assert.equal(fs.readFileSync(path.join(directory, original), 'utf8'), originalContents);
    assert.equal(fs.readdirSync(directory).filter((name) => name.endsWith('.json')).length, 1);
  } finally {
    fixture.cleanup();
  }
});

test('release deletes only the lease matching its branch and worktree', () => {
  const fixture = createFixture();
  try {
    assert.equal(run(fixture.primary, ...acquireArgs({ branch: 'wt/primary', worktree: fixture.primary, file: 'apps/primary.astro' })).status, 0);
    assert.equal(run(fixture.secondary, ...acquireArgs({ branch: 'wt/secondary', worktree: fixture.secondary, file: 'apps/secondary.astro' })).status, 0);
    const result = run(fixture.secondary, 'release', '--branch', 'wt/secondary', '--worktree', fixture.secondary);
    assert.equal(result.status, 0, result.stderr);
    const leases = fs.readdirSync(leaseDirectory(fixture.primary)).filter((name) => name.endsWith('.json'));
    assert.equal(leases.length, 1);
    const remaining = JSON.parse(fs.readFileSync(path.join(leaseDirectory(fixture.primary), leases[0]), 'utf8'));
    assert.equal(remaining.branch, 'wt/primary');
    assert.equal(remaining.worktree, fixture.primary);
  } finally {
    fixture.cleanup();
  }
});

test('acquire does not overwrite an expired matching lease', () => {
  const fixture = createFixture();
  try {
    assert.equal(run(fixture.primary, ...acquireArgs({ branch: 'wt/primary', worktree: fixture.primary })).status, 0);
    const directory = leaseDirectory(fixture.primary);
    const [file] = fs.readdirSync(directory).filter((name) => name.endsWith('.json'));
    const leasePath = path.join(directory, file);
    const expired = { ...JSON.parse(fs.readFileSync(leasePath, 'utf8')), expiresAt: '2020-01-01T00:00:00Z' };
    const originalContents = JSON.stringify(expired, null, 2);
    fs.writeFileSync(leasePath, originalContents);
    const result = run(fixture.primary, ...acquireArgs({ branch: 'wt/primary', worktree: fixture.primary }));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/i);
    assert.equal(fs.readFileSync(leasePath, 'utf8'), originalContents);
  } finally {
    fixture.cleanup();
  }
});

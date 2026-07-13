'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');

function git(...args) {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
}

function ignored(repoPath) {
  return spawnSync('git', ['-C', ROOT, 'check-ignore', '-q', repoPath]).status === 0;
}

test('agent operational directories are ignored', () => {
  for (const repoPath of ['.worktrees/', '.agents/leases/', '.hermes/']) {
    assert.equal(ignored(repoPath), true, `${repoPath} must be ignored`);
  }
});

test('agent boundary preserves non-operational source and documentation paths', () => {
  for (const repoPath of ['.agents/product-marketing.md', '.agents/rewrites/example.md', 'apps/maine-cannabis/src/pages/index.astro']) {
    assert.equal(ignored(repoPath), false, `${repoPath} must remain visible to Git`);
  }
});

test('agent operational directories are not tracked', () => {
  const tracked = git('ls-files').split('\n').filter(Boolean);
  assert.equal(
    tracked.some((repoPath) => (
      repoPath.startsWith('.worktrees/')
      || repoPath.startsWith('.agents/leases/')
      || repoPath.startsWith('.hermes/')
    )),
    false,
  );
});

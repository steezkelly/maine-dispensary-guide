'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { isInside, assertResolvedInside, discoverWorkspacePaths, existsOrSymlink } = require('../assert-worktree-isolation.cjs');

test('isInside accepts paths inside the active worktree', () => {
  assert.equal(isInside('/repo', '/repo/packages/ui/src/AnimatedBackdrop.astro'), true);
});

test('isInside rejects paths from another checkout', () => {
  assert.equal(isInside('/repo', '/other-repo/packages/ui/src/AnimatedBackdrop.astro'), false);
  assert.throws(
    () => assertResolvedInside('/repo', '/other-repo/packages/ui/package.json'),
    /outside active checkout/,
  );
});

test('discoverWorkspacePaths includes every declared MDG workspace package', () => {
  const root = path.resolve(__dirname, '../../..');
  const paths = discoverWorkspacePaths(root);
  assert.ok(paths.includes('packages/scripts'));
  assert.ok(paths.includes('packages/ui'));
  assert.ok(paths.includes('apps/maine-cannabis'));
});

test('existsOrSymlink detects dangling symlinks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-isolation-'));
  const link = path.join(directory, 'output');
  fs.symlinkSync(path.join(directory, 'missing-target'), link);
  try {
    assert.equal(existsOrSymlink(link), true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

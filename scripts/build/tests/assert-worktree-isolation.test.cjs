'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { isInside, assertResolvedInside } = require('../assert-worktree-isolation.cjs');

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

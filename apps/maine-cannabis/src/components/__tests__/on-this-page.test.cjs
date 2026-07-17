// Task 7 — OnThisPage sticky TOC component tests.
//
// Per spec §17.6 #5 + spec §18 R6:
//   - Sticky table of contents visible while reading a long-form guide.
//   - Collapsible via <details> (mobile-friendly default-collapse).
//   - Visited anchors get a ✦ glyph + aria-current="location" (R6).
//   - prefers-reduced-motion respected.
//   - Hairline border, NOT shadow (per §6.3 — shadow only for overlays).
//
// Per the rollout plan ordering, this test file is the RED target for
// Task 7. The component lives at:
//   apps/maine-cannabis/src/components/OnThisPage.astro
//
// The deployment on the Portland guide is intentionally deferred to
// Task 9 (which adds stable id="" to every H2/H3 — Task 9 is the
// "stable heading IDs + R1/TOC prerequisite" ticket). This ordering
// avoids dead anchors from Task 7 having to know about IDs Task 9
// adds later.

const test = require('node:test');
const assert = require('node:assert');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const COMP = resolve(
  __dirname,
  '..',
  'OnThisPage.astro',
);

test('OnThisPage component file exists', () => {
  assert.ok(existsSync(COMP), `${COMP} should exist`);
});

test('OnThisPage declares a Props interface accepting headings + optional title', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /interface Props/, 'should have a Props interface');
  assert.match(src, /headings:\s*TocItem\[\]/, 'should accept a headings array of TocItem');
  assert.match(src, /title\?:\s*string/, 'should accept an optional title string');
});

test('OnThisPage uses <details> for mobile-friendly collapsibility', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /<details/, 'should use <details> for collapsibility');
  assert.match(src, /<summary>/, 'should have a <summary> element');
  assert.match(
    src,
    /aria-label="Table of contents"/,
    'TOC nav should have table-of-contents aria-label',
  );
});

test('OnThisPage uses CSS sticky positioning (not position: fixed)', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /position:\s*sticky/, 'should use position: sticky');
  assert.match(src, /top:\s*\d+px/, 'should pin to a specific top offset');
});

test('OnThisPage marks visited anchors with aria-current="location" (R6)', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /aria-current="location"/, 'should set aria-current="location"');
});

test('OnThisPage observes H2/H3 sections via IntersectionObserver (R6 visited detection)', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /IntersectionObserver/, 'should use IntersectionObserver for scroll tracking');
});

test('OnThisPage ✦ glyph for visited anchors renders (R6 visual signal)', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /✦|visited-mark/, 'should render ✦ or .visited-mark on visited anchors');
});

test('OnThisPage respects prefers-reduced-motion (§6.9 motion rule)', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(
    src,
    /prefers-reduced-motion/,
    'should respect prefers-reduced-motion per §6.9',
  );
});

test('OnThisPage uses hairline border, not shadow (per §6.3)', () => {
  const src = readFileSync(COMP, 'utf8');
  assert.match(src, /border:\s*1px solid/, 'should have a hairline border');
  // Match only CSS `box-shadow:` declarations, not the spec-rule comments
  // that mention "box-shadow" as documentation.
  assert.doesNotMatch(
    src,
    /^[\s.<\w-]*box-shadow\s*:/m,
    'should NOT have a box-shadow CSS declaration per §6.3',
  );
});

test('OnThisPage uses the Phase 1 token layer (no hardcoded colors)', () => {
  const src = readFileSync(COMP, 'utf8');
  // Per Phase 1 + Task M1 discipline: components should reference
  // tokens (--color-rule, --color-primary, etc.) not hardcoded hex.
  // At least one token reference is the minimum expectation.
  const tokenUses = (src.match(/var\(--color-[a-z-]+\)/g) || []).length;
  assert.ok(
    tokenUses >= 2,
    `expected at least 2 token references (--color-*); found ${tokenUses}`,
  );
});

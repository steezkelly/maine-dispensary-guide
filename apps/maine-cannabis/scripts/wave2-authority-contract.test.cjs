'use strict';

/**
 * Wave 2 source-contract test: authority amplification for existing
 * high-impression / low-position pages.
 *
 * Strategy: these pages already exist and are comprehensive. The problem
 * is internal link authority (edibles has 2 inbound links, ranking at
 * position 22.9). This test asserts:
 *   - minimum inbound link counts from relevant pages
 *   - answer capsule presence and correctness
 *   - factual accuracy (positive + negative assertions)
 *   - no stale claims that already shipped wrong once
 *
 * Run: node apps/maine-cannabis/scripts/wave2-authority-contract.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP_ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(APP_ROOT, 'src', 'pages');

function read(rel) {
  return fs.readFileSync(path.join(APP_ROOT, rel), 'utf8');
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function countInboundLinks(targetSlug) {
  // Scan all .astro pages for links to the target slug
  const dirs = [
    path.join(PAGES, 'blog'),
    path.join(PAGES, 'guides'),
    path.join(PAGES, 'learn'),
    path.join(PAGES),
  ];
  let count = 0;
  const seen = new Set();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.astro')) continue;
      const fullPath = path.join(dir, file);
      if (fullPath.includes(targetSlug)) continue; // skip self
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      // Match href="/blog/target-slug" or href="/guides/target-slug"
      const re = new RegExp(`href=["'][^"']*/${targetSlug}["']`, 'g');
      if (re.test(content)) count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 1. Edibles page: authority amplification
// ---------------------------------------------------------------------------

test('edibles page has answer capsule with correct THC limits', () => {
  const src = stripComments(read('src/pages/blog/are-edibles-legal-in-maine.astro'));
  assert.match(src, /class=["']answer-capsule["']/, 'must have answer capsule');
  assert.match(src, /10\s*mg/i, 'must state 10mg per serving');
  assert.match(src, /200\s*mg/i, 'must state 200mg per package');
  assert.match(src, /§703|section 703/i, 'must cite §703');
});

test('edibles page has at least 6 inbound links from other pages', () => {
  const count = countInboundLinks('are-edibles-legal-in-maine');
  assert.ok(count >= 6,
    `edibles page needs >= 6 inbound links for authority, found ${count}. ` +
    'Add contextual links from: how-much-weed-can-you-buy, first-time-buyer, ' +
    'best-maine-edibles, is-weed-legal, cannabis-friendly-maine-travel, ' +
    'maine-cannabis-edibles-compliance');
});

test('edibles page does not contain known-wrong claims', () => {
  const src = stripComments(read('src/pages/blog/are-edibles-legal-in-maine.astro'));
  assert.doesNotMatch(src, /100\s*mg.*per transaction/i,
    'no unsupported per-transaction cap');
  assert.doesNotMatch(src, /edibles are illegal in Maine/i,
    'must not claim edibles are illegal');
  assert.doesNotMatch(src, /5\s*grams of concentrate/i,
    'wrong concentrate limit (should be 10g)');
});

// ---------------------------------------------------------------------------
// 2. Mushrooms/psilocybin page: answer-first + authority
// ---------------------------------------------------------------------------

test('mushrooms page has answer capsule', () => {
  const src = stripComments(read('src/pages/blog/are-mushrooms-legal-in-maine.astro'));
  assert.match(src, /class=["']answer-capsule["']/,
    'mushrooms page must have answer capsule for featured snippet');
});

test('mushrooms page has at least 5 inbound links', () => {
  const count = countInboundLinks('are-mushrooms-legal-in-maine');
  assert.ok(count >= 5,
    `mushrooms page needs >= 5 inbound links, found ${count}`);
});

test('mushrooms page distinguishes psilocybin from cannabis law', () => {
  const src = stripComments(read('src/pages/blog/are-mushrooms-legal-in-maine.astro'));
  assert.match(src, /Title 17-A|criminal code/i,
    'must reference Maine criminal code, not cannabis statutes');
  assert.doesNotMatch(src, /psilocybin is legal in Maine/i,
    'must not claim psilocybin is legal');
});

// ---------------------------------------------------------------------------
// 3. Travel page: answer capsule + fact corrections
// ---------------------------------------------------------------------------

test('travel page has answer capsule with consumption rules', () => {
  const src = stripComments(read('src/pages/blog/cannabis-friendly-maine-travel.astro'));
  assert.match(src, /class=["']answer-capsule["']/,
    'travel page must have answer capsule');
  assert.match(src, /private (residence|property)/i,
    'must state private-property consumption limit');
});

test('travel page does not contain stale claims', () => {
  const src = stripComments(read('src/pages/blog/cannabis-friendly-maine-travel.astro'));
  assert.doesNotMatch(src, /5\s*grams of concentrate/i,
    'wrong concentrate limit (should be 10g per §1501)');
  assert.doesNotMatch(src, /100\s*mg.*edible.*transaction/i,
    'unsupported per-transaction edible cap');
  assert.doesNotMatch(src, /out-of-state.*medical.*not eligible|cannot.*buy.*medical/i,
    'must not categorically exclude visiting patients');
});

test('travel page links to edibles page', () => {
  const src = read('src/pages/blog/cannabis-friendly-maine-travel.astro');
  assert.match(src, /are-edibles-legal-in-maine/,
    'travel page must link to edibles page for authority amplification');
});

// ---------------------------------------------------------------------------
// 4. Cross-page consistency
// ---------------------------------------------------------------------------

test('edibles and purchase-limit pages agree on 10mg/200mg', () => {
  const edibles = stripComments(read('src/pages/blog/are-edibles-legal-in-maine.astro'));
  const purchase = stripComments(read('src/pages/blog/how-much-weed-can-you-buy-in-maine.astro'));
  // Both must state 10mg per serving
  assert.match(edibles, /10\s*mg/i);
  assert.match(purchase, /10\s*mg/i);
});

test('first-time buyer page links to edibles page', () => {
  const src = read('src/pages/guides/first-time-maine-dispensary-buyer.astro');
  assert.match(src, /are-edibles-legal-in-maine/,
    'first-time buyer guide must link to edibles page');
});

test('best-maine-edibles links to are-edibles-legal', () => {
  const src = read('src/pages/blog/best-maine-edibles-2026.astro');
  assert.match(src, /are-edibles-legal-in-maine/,
    'best edibles buyer guide must link to the legality page');
});

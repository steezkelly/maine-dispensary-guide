'use strict';

/**
 * Tests for apps/maine-cannabis/src/components/signal/CrossLinkFromGuide.ts
 *
 * The component must:
 *   - emit exactly one link to /signal/<city>/
 *   - include the city name in the visible label so the link reads
 *     naturally when scanned
 *   - default to rel="nofollow" so the prototype /signal/ URLs do not
 *     receive artificial PageRank from the canonical MDG guides
 *   - throw when slug or city is missing
 *   - include the MDG-DATA release id fragment when supplied
 *
 * Pure function, no DOM.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

let buildCrossLinkFromGuide;
try {
  ({ buildCrossLinkFromGuide } = require('../CrossLinkFromGuide.ts'));
} catch (_) {
  const fs = require('node:fs');
  const path = require('node:path');
  const esbuild = require('/home/steve/projects/maine-dispensary-guide/node_modules/esbuild');
  const src = fs.readFileSync(path.join(__dirname, '..', 'CrossLinkFromGuide.ts'), 'utf8');
  const out = esbuild.transformSync(src, { loader: 'ts', format: 'cjs', target: 'node22' });
  const tmp = path.join(__dirname, '.CrossLinkFromGuide.shim.cjs');
  fs.writeFileSync(tmp, out.code);
  ({ buildCrossLinkFromGuide } = require(tmp));
}

test('buildCrossLinkFromGuide: emits one /signal/<city>/ link with city in label', () => {
  const out = buildCrossLinkFromGuide({ slug: 'portland', city: 'Portland' });
  assert.equal(out.href, 'https://mainedispensaryguide.com/signal/portland');
  assert.match(out.label, /Portland/);
  assert.match(out.blurb, /Portland/);
});

test('buildCrossLinkFromGuide: defaults to rel=nofollow for prototype safety', () => {
  const out = buildCrossLinkFromGuide({ slug: 'portland', city: 'Portland' });
  assert.equal(out.nofollow, true);
});

test('buildCrossLinkFromGuide: caller can opt out of nofollow', () => {
  const out = buildCrossLinkFromGuide({ slug: 'portland', city: 'Portland', nofollow: false });
  assert.equal(out.nofollow, false);
});

test('buildCrossLinkFromGuide: includes MDG-DATA release fragment when supplied', () => {
  const out = buildCrossLinkFromGuide({
    slug: 'kittery',
    city: 'Kittery',
    releaseId: 'ded381696bddf56f',
  });
  assert.match(out.blurb, /release ded3816/);
  assert.match(out.href, /\/signal\/kittery$/);
});

test('buildCrossLinkFromGuide: strips trailing slash from siteUrl', () => {
  const out = buildCrossLinkFromGuide({
    slug: 'auburn',
    city: 'Auburn',
    siteUrl: 'https://mainedispensaryguide.com/',
  });
  assert.equal(out.href, 'https://mainedispensaryguide.com/signal/auburn');
});

test('buildCrossLinkFromGuide: throws when slug is missing', () => {
  assert.throws(() => buildCrossLinkFromGuide({ city: 'Portland' }), /slug and city are required/);
});

test('buildCrossLinkFromGuide: throws when city is missing', () => {
  assert.throws(() => buildCrossLinkFromGuide({ slug: 'portland' }), /slug and city are required/);
});

test('buildCrossLinkFromGuide: eyebrow is "Research data"', () => {
  const out = buildCrossLinkFromGuide({ slug: 'auburn', city: 'Auburn' });
  assert.equal(out.eyebrow, 'Research data');
});

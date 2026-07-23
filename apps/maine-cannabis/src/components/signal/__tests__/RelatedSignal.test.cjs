'use strict';

/**
 * Tests for apps/maine-cannabis/src/components/signal/RelatedSignal.ts
 *
 * The component must produce a small "Related MDG content" rail that
 * links from /signal/<city>/ to the canonical MDG surfaces that cover
 * the same city — the per-city dispensary guide, the OCP license map,
 * the opt-in tracker, market-stats, and find-a-dispensary. This is the
 * load-bearing fix for dark-spot #3 in the 2026-07-23 self-critique:
 * /signal/ was orphaned because every link target was another /signal/
 * URL or the (still fictional) /data/methodology/ page.
 *
 * Pure function, no Astro dependencies.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

let buildRelatedSignal;
try {
  ({ buildRelatedSignal } = require('../RelatedSignal.ts'));
} catch (_) {
  const fs = require('node:fs');
  const path = require('node:path');
  const esbuild = require('/home/steve/projects/maine-dispensary-guide/node_modules/esbuild');
  const src = fs.readFileSync(path.join(__dirname, '..', 'RelatedSignal.ts'), 'utf8');
  const out = esbuild.transformSync(src, { loader: 'ts', format: 'cjs', target: 'node22' });
  const tmp = path.join(__dirname, '.RelatedSignal.shim.cjs');
  fs.writeFileSync(tmp, out.code);
  ({ buildRelatedSignal } = require(tmp));
}

const base = {
  siteName: 'Maine Dispensary Guide',
  siteUrl: 'https://mainedispensaryguide.com',
};

test('buildRelatedSignal: city subject links to its dispensary guide', () => {
  const out = buildRelatedSignal({ ...base, slug: 'portland', city: 'Portland' });
  const hrefs = out.links.map((l) => l.href);
  assert.ok(hrefs.includes('/guides/portland-dispensary-guide/'),
    `expected city guide link; got ${JSON.stringify(hrefs)}`);
});

test('buildRelatedSignal: always links to the canonical MDG surfaces', () => {
  const out = buildRelatedSignal({ ...base, slug: 'brunswick', city: 'Brunswick' });
  const hrefs = out.links.map((l) => l.href);
  for (const canonical of [
    '/guides/maine-cannabis-opt-in-tracker',
    '/guides/maine-ocp-license-map',
    '/find-a-dispensary',
    '/market-stats',
    '/blog/how-many-dispensaries-in-maine',
  ]) {
    assert.ok(hrefs.includes(canonical), `missing canonical link ${canonical}`);
  }
});

test('buildRelatedSignal: city slug is slugified (South Portland → south-portland)', () => {
  const out = buildRelatedSignal({ ...base, slug: 'south-portland', city: 'South Portland' });
  const cityGuide = out.links.find((l) => l.href.includes('-dispensary-guide'));
  assert.equal(cityGuide.href, '/guides/south-portland-dispensary-guide/');
});

test('buildRelatedSignal: when city does not have a guide, the city-guide link is omitted', () => {
  const out = buildRelatedSignal({ ...base, slug: 'imaginary-city', city: 'Imaginary City' });
  const hrefs = out.links.map((l) => l.href);
  // The 5 canonical links remain; the city guide is dropped.
  for (const canonical of [
    '/guides/maine-cannabis-opt-in-tracker',
    '/guides/maine-ocp-license-map',
    '/find-a-dispensary',
    '/market-stats',
    '/blog/how-many-dispensaries-in-maine',
  ]) {
    assert.ok(hrefs.includes(canonical), `missing canonical link ${canonical}`);
  }
  assert.equal(out.links.find((l) => l.href.includes('imaginary-city')), undefined,
    'city-guide link must be omitted when no guide exists');
});

test('buildRelatedSignal: every link carries a label and aria-label', () => {
  const out = buildRelatedSignal({ ...base, slug: 'portland', city: 'Portland' });
  for (const link of out.links) {
    assert.ok(typeof link.label === 'string' && link.label.length > 0);
    assert.ok(typeof link.ariaLabel === 'string' && link.ariaLabel.length > 0);
  }
});

test('buildRelatedSignal: index page (no city) returns a stripped "explore the slice" rail', () => {
  const out = buildRelatedSignal({ ...base, slug: null, city: null });
  // No per-city link, but still the canonical surfaces.
  assert.equal(out.links.find((l) => l.href.includes('-dispensary-guide')), undefined);
  const hrefs = out.links.map((l) => l.href);
  for (const canonical of ['/guides/maine-cannabis-opt-in-tracker', '/market-stats', '/find-a-dispensary']) {
    assert.ok(hrefs.includes(canonical), `missing canonical link ${canonical}`);
  }
});

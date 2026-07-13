'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DIST = path.join(ROOT, 'dist');
const PILOT_ROUTES = [
  '/guides/maine-dispensary-license',
  '/guides/maine-cannabis-opt-in-tracker',
  '/guides/maine-cannabis-zoning-requirements',
  '/guides/maine-cannabis-site-selection',
  '/guides/maine-cannabis-inventory-management',
  '/guides/maine-metrc-compliance-guide',
  '/blog/best-maine-edibles-2026',
  '/blog/best-maine-dispensaries-2026',
  '/blog/maine-dispensary-gift-cards',
  '/guides/machias-dispensary-guide',
];

function html(route) {
  const file = path.join(DIST, route.slice(1), 'index.html');
  assert.ok(fs.existsSync(file), `missing built route: ${route}`);
  return fs.readFileSync(file, 'utf8');
}

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('built pilot routes render editorial, action, and one discovery rail in order', () => {
  for (const route of PILOT_ROUTES) {
    const source = html(route);
    const editorialAt = source.indexOf('class="editorial-next-step"');
    const actionAt = source.indexOf('class="contextual-action"');
    const discoveryAt = source.indexOf('class="auto-related"', actionAt);

    assert.ok(editorialAt >= 0 && actionAt > editorialAt && discoveryAt > actionAt, `${route}: continuation order`);
    assert.equal(occurrences(source, 'class="editorial-next-step"'), 1, `${route}: editorial count`);
    assert.equal(occurrences(source, 'class="contextual-action"'), 1, `${route}: action count`);
    assert.equal(occurrences(source, 'class="auto-related"'), 1, `${route}: AutoRelated count`);
    assert.equal(occurrences(source, 'Get the 2026 Maine Launch Checklist'), 0, `${route}: no legacy CTA`);
    assert.equal(occurrences(source, 'class="related-articles"'), 0, `${route}: no hard-coded RelatedArticles`);
    assert.equal((source.match(/data-cta-id="(?:editorial-next|contextual-action)-/g) || []).length, 2, `${route}: stable CTA IDs`);
    assert.doesNotMatch(
      source,
      /class="(?:further-reading|related-content)"/,
      `${route}: no page-level manual discovery rail`,
    );
    assert.doesNotMatch(
      source,
      /<(?:section|div)[^>]*class="(?:related-guides|further-reading)"[^>]*>\s*<\/(?:section|div)>/,
      `${route}: no empty legacy continuation wrapper`,
    );
    assert.match(source, /prefers-reduced-motion\s*:\s*reduce/, `${route}: reduced-motion CSS`);
  }
});

test('built legacy controls preserve their prior page-bottom behavior', () => {
  const guide = html('/guides/maine-cannabis-regulations');
  assert.equal(occurrences(guide, 'Get the 2026 Maine Launch Checklist'), 1);
  assert.equal(occurrences(guide, 'class="related-articles"'), 1);
  assert.equal(occurrences(guide, 'class="editorial-next-step"'), 0);
  assert.equal(occurrences(guide, 'class="contextual-action"'), 0);

  const blog = html('/blog/maine-rso-guide');
  assert.equal(occurrences(blog, 'Get the 2026 Maine Launch Checklist'), 0);
  assert.equal(occurrences(blog, 'class="related-articles"'), 0);
  assert.equal(occurrences(blog, 'class="editorial-next-step"'), 0);
  assert.equal(occurrences(blog, 'class="contextual-action"'), 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('OperatorPathways renders a vertical ordered sequence rather than equal cards', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../OperatorPathways.astro'), 'utf8');
  assert.match(source, /<ol class="operator-pathways__list">/);
  assert.match(source, /aria-labelledby="pathways-title"/);
  assert.match(source, /<p class="operator-pathways__number" aria-hidden="true">\{pathway\.number\}<\/p>/);
  assert.match(source, /<a class="editorial-text-link" href=\{pathway\.href\} data-cta-id=\{pathway\.ctaId\}>/);
});

test('FeaturedAnalysis renders one linked source-captioned article without carousel behavior', () => {
  const fa = fs.readFileSync(path.resolve(__dirname, '../FeaturedAnalysis.astro'), 'utf8');
  assert.match(fa, /<article class="featured-analysis">/);
  assert.doesNotMatch(fa, /setInterval|requestAnimationFrame|carousel|swipe/i);
  assert.match(fa, /aria-labelledby="featured-title"/);
  assert.match(fa, /<dl class="featured-analysis__figure">/);
  assert.match(fa, /<a class="featured-analysis__image-link" href=\{story\.href\} aria-label=\{`Read \$\{story\.title\}`\}>/);
});
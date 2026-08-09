const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(
  __dirname,
  '../../apps/maine-cannabis/src/pages/blog/maine-dispensary-roi-what-to-expect-2026.astro',
);
const source = () => fs.readFileSync(pagePath, 'utf8');

function assertBalancedTag(tag) {
  const page = source();
  const opens = page.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) || [];
  const closes = page.match(new RegExp(`</${tag}\\s*>`, 'g')) || [];
  assert.equal(closes.length, opens.length, `${tag} element count`);
}

test('ROI blog markup balances strong elements for Astro 7 compilation', () => {
  assertBalancedTag('strong');
  assert.doesNotMatch(source(), /\$900,000<\/strong><\/li>/);
});

test('ROI blog markup balances div elements for Astro 7 compilation', () => {
  assertBalancedTag('div');
  assert.doesNotMatch(
    source(),
    /currentPath="\/blog\/maine-dispensary-roi-what-to-expect-2026"[^>]*\/\>\s*<\/div>\s*<\/section>/,
  );
});

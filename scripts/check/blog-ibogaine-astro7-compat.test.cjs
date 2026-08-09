const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(
  __dirname,
  '../../apps/maine-cannabis/src/pages/blog/ibogaine-federal-executive-order-maine-2026.astro',
);

test('ibogaine blog markup balances div elements for Astro 7 compilation', () => {
  const source = fs.readFileSync(pagePath, 'utf8');
  const opens = source.match(/<div\b[^>]*>/g) || [];
  const closes = source.match(/<\/div\s*>/g) || [];

  assert.equal(closes.length, opens.length);
  assert.doesNotMatch(
    source,
    /<AutoRelated[\s\S]*?\/>\s*<\/div>\s*<\/section>/,
  );
});

const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PAGE = resolve(
  __dirname,
  '..', '..',
  'pages/guides/portland-dispensary-guide.astro',
);

test('Portland guide headings have unique stable IDs', () => {
  const source = readFileSync(PAGE, 'utf8');
  const headings = [...source.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/g)];
  assert.ok(headings.length >= 2, 'expected Portland guide to contain H2/H3 headings');

  const ids = headings.map(([, , attrs]) => attrs.match(/\bid="([^"]+)"/)?.[1]);
  assert.ok(ids.every(Boolean), 'every Portland H2/H3 requires an explicit id');
  assert.strictEqual(new Set(ids).size, ids.length, 'heading IDs must be unique');
  assert.ok(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)), 'IDs must be stable lowercase kebab-case');
});

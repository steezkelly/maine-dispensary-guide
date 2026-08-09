const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(
  path.resolve(__dirname, '../../apps/maine-cannabis/src/pages/blog/maine-cannabis-microbusiness-license-2026.astro'),
  'utf8',
);

test('microbusiness blog closes its AutoRelated section without an unmatched div', () => {
  assert.doesNotMatch(
    page,
    /currentPath="\/blog\/maine-cannabis-microbusiness-license-2026"[^>]*\/\>\s*<\/div>\s*<\/section>/,
  );
});

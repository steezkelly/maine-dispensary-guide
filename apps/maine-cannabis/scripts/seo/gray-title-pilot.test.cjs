const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pagePath = path.join(
  __dirname,
  '../../src/pages/guides/gray-dispensary-guide.astro',
);
const source = fs.readFileSync(pagePath, 'utf8');
const expectedTitle = 'Gray, ME Dispensaries: High Road & Token Cannabis (2026)';

test('Gray corrective pilot keeps an untruncated title-only contract', () => {
  assert.equal(expectedTitle.length, 56);
  assert.ok(source.includes(`title="${expectedTitle}"`));
  assert.doesNotMatch(source, /title="Gray, ME Dispensaries: High Road, Token Cannabis Co\. & More \(2026 List\)"/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('EvidenceStrip renders source-linked evidence as a rule-led definition list', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../EvidenceStrip.astro'), 'utf8');
  assert.match(source, /<dl class="evidence-strip__list">/);
  assert.match(source, /aria-labelledby="evidence-title"/);
  assert.match(source, /<dt>\{item\.label\}<\/dt>/);
  assert.match(source, /<a class="editorial-text-link" href=\{item\.href\}>\{item\.source\}<\/a>/);
  assert.match(source, /border-block-start:\s*1px solid var\(--color-rule\)/);
});
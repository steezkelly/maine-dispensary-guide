const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('MunicipalityExplorer keeps guide discovery searchable, evidence-led, and crawlable without JavaScript', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../MunicipalityExplorer.astro'), 'utf8');
  assert.match(source, /aria-labelledby="municipality-title"/);
  assert.match(source, /<input type="search" data-municipality-search/);
  assert.match(source, /data-municipality-row/);
  assert.match(source, /<a class="municipality-explorer__link" href=\{row\.href\}>\{row\.name\}, \{row\.county\}<\/a>/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /<p class="municipality-explorer__note">\{row\.regulatoryNote\}<\/p>/);
  assert.doesNotMatch(source, /client:only|import\.meta\.env\.SSR/);
});

test('MaineMapReference is an orientation-only non-clickable reference after the guide list', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../MaineMapReference.astro'), 'utf8');
  assert.match(source, /<svg[^>]+aria-label="Outline of the state of Maine"/);
  assert.match(source, /pointer-events:\s*none/);
  assert.match(source, /Orientation-only map/);
  assert.doesNotMatch(source, /<a [^>]*href=|<button/);
});
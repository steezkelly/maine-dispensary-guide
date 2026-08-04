const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ROUTE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'dist',
  'blog',
  'trail-magic-cannabis-appalachian-trail-maine',
  'index.html',
);

function readRoute() {
  return readFileSync(ROUTE, 'utf8');
}

function readJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, value]) => JSON.parse(value));
}

test('built trail-magic route keeps rendered citation targets and plain FAQ JSON-LD', () => {
  const html = readRoute();
  const bodyCitationLinks = [...html.matchAll(/<a class="citation-link" href="#source-(\d+)"/g)].map(([, id]) => Number(id));
  const faqCitationLinks = [...html.matchAll(/<a class="faq-citation" href="#source-(\d+)"/g)].map(([, id]) => Number(id));
  const sourceIds = new Set([...html.matchAll(/<li id="source-(\d+)"/g)].map(([, id]) => Number(id)));
  const faqSchema = readJsonLd(html).find((schema) => schema['@type'] === 'FAQPage');

  assert.equal(bodyCitationLinks.length, 25);
  assert.equal(faqCitationLinks.length, 12);
  assert.deepEqual([...new Set(faqCitationLinks)].sort((a, b) => a - b), [1, 4, 7, 9, 10, 11]);
  assert.ok(faqCitationLinks.every((id) => sourceIds.has(id)));
  assert.equal(faqSchema.mainEntity.length, 6);
  assert.ok(faqSchema.mainEntity.every(({ acceptedAnswer }) => !/<(?:a|script)\b/i.test(acceptedAnswer.text)));
  assert.ok(faqSchema.mainEntity[0].acceptedAnswer.text.includes('[1]'));
});
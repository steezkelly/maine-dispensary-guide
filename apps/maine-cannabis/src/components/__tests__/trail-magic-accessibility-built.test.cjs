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

function citationIds(html, className) {
  const classPattern = new RegExp(`\\bclass="[^"]*\\b${className}\\b[^"]*"`);
  return [...html.matchAll(/<a\b[^>]*>/g)]
    .map(([tag]) => ({ tag, hasClass: classPattern.test(tag) }))
    .filter(({ hasClass }) => hasClass)
    .map(({ tag }) => tag.match(/\bhref="#source-(\d+)"/))
    .filter(Boolean)
    .map(([, id]) => Number(id));
}

test('built trail-magic route keeps rendered citation targets and plain FAQ JSON-LD', () => {
  const html = readRoute();
  const bodyCitationLinks = citationIds(html, 'citation-link');
  const faqCitationLinks = citationIds(html, 'faq-citation');
  const sourceIds = new Set([...html.matchAll(/<li\b[^>]*\bid="source-(\d+)"/g)].map(([, id]) => Number(id)));
  const faqSchema = readJsonLd(html).find((schema) => schema['@type'] === 'FAQPage');

  assert.equal(bodyCitationLinks.length, 25);
  assert.equal(faqCitationLinks.length, 12);
  assert.deepEqual([...new Set(faqCitationLinks)].sort((a, b) => a - b), [1, 4, 7, 9, 10, 11]);
  assert.ok(bodyCitationLinks.every((id) => sourceIds.has(id)));
  assert.ok(faqCitationLinks.every((id) => sourceIds.has(id)));
  assert.equal(faqSchema.mainEntity.length, 6);
  assert.ok(faqSchema.mainEntity.every(({ acceptedAnswer }) => !/<[^>]+>/i.test(acceptedAnswer.text)));
  assert.ok(faqSchema.mainEntity[0].acceptedAnswer.text.includes('[1]'));
});

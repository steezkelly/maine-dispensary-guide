const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ARTICLE = resolve(__dirname, '..', '..', 'pages', 'blog', 'trail-magic-cannabis-appalachian-trail-maine.astro');
const LOCAL_FAQ = resolve(__dirname, '..', 'Faq.astro');
const UI_FAQ = resolve(__dirname, '..', '..', '..', '..', '..', 'packages', 'ui', 'src', 'components', 'Faq.astro');
const CALLOUT = resolve(__dirname, '..', '..', '..', '..', '..', 'packages', 'ui', 'src', 'components', 'Callout.astro');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('trail-magic article exposes keyboard-navigable inline source markers and opts FAQ answers into source links', () => {
  const article = read(ARTICLE);
  const localFaq = read(LOCAL_FAQ);
  const uiFaq = read(UI_FAQ);

  assert.match(article, /<a class="citation-link" href="#source-1"[^>]*>\[1\]<\/a>/);
  assert.match(article, /Katahdin sits inside Baxter State Park\.\s*<a class="citation-link" href="#source-3"[^>]*>\[3\]<\/a>/);
  assert.match(article, /<Faq faqs=\{faqItems\} citationLinks=\{true\} \/>/);
  assert.match(localFaq, /citationLinks\?: boolean/);
  assert.match(localFaq, /citationLinks/);
  assert.match(uiFaq, /citationLinks\?: boolean/);
  assert.match(uiFaq, /href=\{`#source-\$\{part\}`\}/);
  assert.match(uiFaq, /class="faq-citation"/);
});

test('Callout decorative glyphs are hidden from assistive technology', () => {
  const callout = read(CALLOUT);
  assert.match(callout, /<span class="callout-icon"[^>]*aria-hidden="true"/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(
  __dirname,
  '..',
  'blog',
  'cannabis-friendly-maine-travel.astro',
);
const page = fs.readFileSync(pagePath, 'utf8');
const homepagePath = path.resolve(__dirname, '..', 'index.astro');
const homepage = fs.readFileSync(homepagePath, 'utf8');

function stripComments(src) {
  return src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

test('travel title targets the camp/lodging cluster, not the legality head query', () => {
  const layoutTitle = page.match(/title="([^"]+)"/);
  assert.ok(layoutTitle, 'travel page must declare a Layout title');
  assert.match(layoutTitle[1], /camp/i, 'title must lead with the camp/lodging cluster the page actually earns');
  assert.match(layoutTitle[1], /travel/i, 'title must keep travel intent');
});

test('travel H1 matches the travel-cluster title', () => {
  assert.match(page, /<h1>Maine Cannabis Travel Guide: Camp, Stay & Consume Rules<\/h1>/);
});

test('travel page does not cannibalize the is-weed-legal-in-maine owner page', () => {
  const ownerPath = path.resolve(__dirname, '..', 'blog', 'is-weed-legal-in-maine.astro');
  const ownerPage = fs.readFileSync(ownerPath, 'utf8');
  const travelH1 = /<h1>([^<]+)<\/h1>/.exec(page)[1].trim().toLowerCase();
  const ownerH1 = /<h1>([^<]+)<\/h1>/.exec(ownerPage)[1].trim().toLowerCase();
  assert.notStrictEqual(travelH1, ownerH1, 'travel H1 must not duplicate the owner H1');
  assert.ok(!travelH1.startsWith('is weed legal'), 'travel H1 must not open with the owner head query');
});

test('travel FAQ owns the literal "is weed legal in maine" question', () => {
  assert.match(page, /question: 'Is weed legal in Maine\?'/,
    'FAQ must contain the literal head query as a question');
  const faqBlock = page.slice(page.indexOf("question: 'Is weed legal in Maine?'"), page.indexOf("question: 'Is weed legal in Maine?'") + 1200);
  assert.match(faqBlock, /href="\/blog\/is-weed-legal-in-maine"/,
    'literal-query FAQ answer must delegate depth to the dedicated legality owner');
});

test('travel page has a fall foliage planning section with region links', () => {
  const src = stripComments(page);
  assert.match(src, /fall foliage/i, 'page must have foliage planning content');
  assert.match(src, /<h2>[^<]*fall foliage[^<]*<\/h2>/i, 'foliage content must be a real section heading');
  assert.match(src, /href="https:\/\/www\.maine\.gov\/dacf\/mfs\/projects\/fall_foliage/,
    'foliage timing must cite the Maine DACF foliage source');
  for (const slug of ['bar-harbor-dispensary-guide', 'camden-dispensary-guide', 'bethel-dispensary-guide']) {
    assert.ok(src.includes(`/guides/${slug}`), `foliage section must deep-link the ${slug} region`);
  }
});

test('travel page keeps the explicit Acadia federal-land warning', () => {
  const src = stripComments(page);
  assert.match(src, /Acadia National Park[^.]*federal/i,
    'Acadia must be named as federal land where cannabis is illegal');
});

test('travel page no longer mounts the B2B buyer-intent link block', () => {
  assert.doesNotMatch(page, /class="related-buyer-intent"/,
    'travel page must not carry the licensing/B2B link block');
});

test('travel page links only to existing internal travel-intent targets', () => {
  const internal = [...page.matchAll(/href="(\/(?:guides|blog)\/[a-z0-9-]+)"/g)].map((m) => m[1]);
  const appRoot = path.resolve(__dirname, '..');
  for (const href of new Set(internal)) {
    const file = path.join(appRoot, href.slice(1) + '.astro');
    assert.ok(fs.existsSync(file), `internal link ${href} must resolve to a real page (${file})`);
  }
});

test('travel modifiedDate reflects the 2026-08-03 seasonal revision', () => {
  assert.match(page, /modifiedDate: '2026-08-03'/);
});

test('homepage featured-story blurb is traveler-facing, not a policy abstract', () => {
  const block = homepage.slice(homepage.indexOf('featuredStory'), homepage.indexOf('featuredStory') + 2500);
  assert.doesNotMatch(block, /promotional noise/i, 'blurb must not read like internal strategy copy');
  assert.match(block, /travel|visit|trip|foliage/i, 'blurb must speak to visitors');
});

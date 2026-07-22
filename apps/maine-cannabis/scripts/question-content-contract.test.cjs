const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');

function withoutHtmlComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '');
}

function read(relativePath) {
  return withoutHtmlComments(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

test('contract matching ignores HTML comments', () => {
  const source = withoutHtmlComments('<!-- <h1>Fake answer</h1> -->\n<h1>Real answer</h1>');
  assert.doesNotMatch(source, /Fake answer/);
  assert.match(source, /Real answer/);
});

test('purchase-limit question has one complete source-backed owner', () => {
  const source = read('src/pages/blog/how-much-weed-can-you-buy-in-maine.astro');

  assert.match(source, /<div class="eyebrow">Maine cannabis law/);
  assert.match(source, /<h1>How Much (?:Weed|Cannabis) Can You Buy in Maine\?<\/h1>/);
  assert.match(source, /class="answer-capsule"/);
  assert.ok(
    source.indexOf('class="answer-capsule"') < source.indexOf('<picture class="article-hero">'),
    'expected the direct answer before the hero image',
  );
  assert.match(source, /2\.5 ounces/);
  assert.match(source, /10 grams/);
  assert.match(source, /title28-Bsec504\.html/);
  assert.match(source, /title28-Bsec1501\.html/);
  assert.match(source, /import Faq/);
  assert.match(source, /<Faq faqs=\{faqItems\}/);
  assert.ok((source.match(/question:/g) || []).length >= 4, 'expected at least four visible FAQs');
  assert.match(source, /gift/i);
  assert.match(source, /href="\/learn"/);
  assert.match(source, /href="\/guides\/maine-cannabis-regulations"/);
  assert.doesNotMatch(source, /5 grams of concentrate|100\s?mg of edible THC per transaction/i);
});

test('medical-card owner matches search intent while explaining provider certification', () => {
  const source = read('src/pages/blog/maine-medical-marijuana-patient-guide.astro');

  assert.match(source, /<h1>How to Get a Maine Medical Cannabis Card in 2026<\/h1>/);
  assert.match(source, /class="answer-capsule"/);
  assert.match(source, /written certification/i);
  assert.match(source, /bona fide (?:medical )?provider-patient relationship/i);
  assert.match(source, /title22sec2423-B\.html/);
  assert.doesNotMatch(source, /\$100 annual registration fee|apply directly to the OCP|14.?21 business days/i);
  assert.doesNotMatch(source, /provider.{0,80}submits the certification information/i);
});

test('home-grow owner answers counts and states location authority correctly', () => {
  const source = read('src/pages/blog/maine-home-grow-cannabis-guide-2026.astro');

  assert.match(source, /<h1>How Many Cannabis Plants Can You Grow in Maine\?<\/h1>/);
  assert.match(source, /class="answer-capsule"/);
  assert.match(source, /six mature/i);
  assert.match(source, /12 immature/i);
  assert.match(source, /unlimited (?:number of )?seedlings/i);
  assert.match(source, /title28-Bsec1502\.html/);
  assert.match(source, /owns? or (?:is|are) domiciled/i);
  assert.match(source, /neither owns? nor (?:is|are) domiciled/i);
  assert.match(source, /municipalit(?:y|ies).{0,180}(?:may not|cannot) restrict the areas/is);
  assert.doesNotMatch(source, /municipalit(?:y|ies).{0,80}may regulate the location/is);
  assert.match(source, /mature and immature plants.{0,140}(?:legible )?(?:tag|label)/is);
  assert.doesNotMatch(source, /answer: 'Yes\. Adult-use plants|each plant must have/i);
});

test('travel owner answers tourist purchase and private-consumption questions safely', () => {
  const source = read('src/pages/blog/cannabis-friendly-maine-travel.astro');

  assert.match(source, /class="answer-capsule"/);
  assert.match(source, /tourists?.{0,80}(?:can|may) buy/i);
  assert.match(source, /private property/i);
  assert.match(source, /title28-Bsec1501\.html/);
  assert.doesNotMatch(source, /5 grams of concentrate|100\s?mg of edible THC|fly into Maine with cannabis|carry cannabis on a plane/i);
});

test('first-time owner gives visit prep, one 14 percent tax rate, and delegates limits', () => {
  const source = read('src/pages/guides/first-time-maine-dispensary-buyer.astro');

  assert.match(source, /class="answer-capsule"/);
  assert.match(source, /government-issued photo ID/i);
  assert.match(source, /14%/);
  assert.match(source, /\/blog\/how-much-weed-can-you-buy-in-maine/);
  assert.doesNotMatch(source, /19\.5%|14%.{0,120}5\.5%|5\.5%.{0,120}14%/is);
});

test('broad legality owner delegates detailed purchase and possession limits', () => {
  const source = read('src/pages/blog/is-weed-legal-in-maine.astro');

  assert.match(source, /href="\/blog\/how-much-weed-can-you-buy-in-maine"/);
  assert.doesNotMatch(source, /question:\s*["']How much cannabis can I legally possess in Maine\?/i);
  assert.doesNotMatch(source, /<h2[^>]*>How Much Cannabis Can You Possess/i);
});

test('learn hub delegates purchase and possession limits without a competing FAQ', () => {
  const source = read('src/pages/learn/index.astro');

  assert.match(source, /href="\/blog\/how-much-weed-can-you-buy-in-maine"/);
  assert.doesNotMatch(source, /"name":\s*"How much cannabis can I possess in Maine\?"/i);
  assert.doesNotMatch(source, /At home[^<"]{0,80}(?:5|five) ounces/i);
});

test('substantively updated YMYL owners do not claim unverified professional review', () => {
  const owners = [
    'src/pages/blog/how-much-weed-can-you-buy-in-maine.astro',
    'src/pages/blog/maine-medical-marijuana-patient-guide.astro',
    'src/pages/blog/maine-home-grow-cannabis-guide-2026.astro',
    'src/pages/blog/cannabis-friendly-maine-travel.astro',
    'src/pages/guides/first-time-maine-dispensary-buyer.astro',
  ];

  for (const owner of owners) {
    const source = read(owner);
    assert.doesNotMatch(source, /\breviewer\s*:/, `${owner} must not emit an unverified reviewer`);
    assert.doesNotMatch(source, /Reviewed by|Corrected and reviewed/i, `${owner} must label editorial updates honestly`);
    assert.doesNotMatch(source, /\bauthorId\s*:|\bauthor\s*: '(?:Calvin Waters|Thalia Greene|Eliot Nash)'/, `${owner} must not emit a publisher-managed pseudonym as a Person author`);
    assert.doesNotMatch(source, /\/about\/authors#(?:calvin-waters|thalia-greene|eliot-nash)/, `${owner} must not present a pseudonym as a professional source-review identity`);
    assert.match(source, /Editorially reviewed against the cited primary sources on July 22, 2026/i, `${owner} must show truthful organization-level source review`);
  }
});

test('article dates preserve their declared calendar day and sitemap date format', () => {
  const layout = read('src/layouts/Layout.astro');
  const utcDateFormats = layout.match(/toLocaleDateString\('en-US', \{[^}]*timeZone: 'UTC'[^}]*\}\)/g) || [];
  assert.ok(utcDateFormats.length >= 2, 'article dates must render in UTC so YYYY-MM-DD values do not shift a day');

  const owners = [
    'src/pages/blog/how-much-weed-can-you-buy-in-maine.astro',
    'src/pages/blog/maine-medical-marijuana-patient-guide.astro',
    'src/pages/blog/maine-home-grow-cannabis-guide-2026.astro',
    'src/pages/blog/cannabis-friendly-maine-travel.astro',
    'src/pages/guides/first-time-maine-dispensary-buyer.astro',
  ];
  for (const owner of owners) {
    const source = read(owner);
    assert.doesNotMatch(source, /(?:publishDate|modifiedDate): '\d{4}-\d{2}-\d{2}T/, `${owner} must emit sitemap-safe date-only metadata`);
  }
});

test('content-health accepts bounded organization-level source review on the Wave 1 YMYL owner', () => {
  const checker = read('../../scripts/check/content-health.cjs');
  assert.match(checker, /blog\/how-much-weed-can-you-buy-in-maine\.astro/);
  assert.match(checker, /Editorially reviewed against the cited primary sources/i);
});

test('organization fallback is emitted as Organization JSON-LD, never Person', () => {
  const jsonLd = read('src/lib/json-ld.ts');
  assert.match(jsonLd, /const author = article\.author[\s\S]*?: \{ '@id': orgId \};/);
  assert.doesNotMatch(jsonLd, /buildPersonNode\(article\.author\s*\?\?/);
});

test('manual blog listing uses the canonical owner publication date', () => {
  const owner = read('src/pages/blog/how-much-weed-can-you-buy-in-maine.astro');
  const listing = read('src/pages/blog/index.astro');
  const publishDate = owner.match(/publishDate:\s*'(\d{4}-\d{2}-\d{2})'/)?.[1];
  assert.ok(publishDate, 'owner must declare a date-only publishDate');
  assert.match(
    listing,
    new RegExp(`url: '/blog/how-much-weed-can-you-buy-in-maine'[^\\n]+date: '${publishDate}'`),
  );
});

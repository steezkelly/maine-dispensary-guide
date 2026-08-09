#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const correctionsPage = path.join(root, 'apps/maine-cannabis/src/pages/about/corrections.astro');
const correctionsData = path.join(root, 'apps/maine-cannabis/src/data/corrections-log.ts');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// The corrections page's modifiedDate/today must track the newest entry in the
// shared ledger. Derive it from the data file so this test self-maintains
// instead of hardcoding a date that breaks on every legitimate correction.
const ledgerDates = [...read('apps/maine-cannabis/src/data/corrections-log.ts').matchAll(/date:\s*['"](\d{4}-\d{2}-\d{2})['"]/g)].map((m) => m[1]);
const latestCorrectionDate = ledgerDates.sort().pop();
if (!latestCorrectionDate) {
  throw new Error('corrections-log.ts has no dated entries; cannot derive expected corrections-page date');
}

const recoverySlugs = [
  'maine-cannabis-delivery-license-framework',
  'maine-cannabis-waste-management-framework',
  'maine-cannabis-zoning-local-authorization',
  'standish-dispensary-guide-adult-use-status',
  'buxton-dispensary-guide-registry-reconciliation',
];

test('public corrections page renders the shared correction ledger', () => {
  const page = fs.readFileSync(correctionsPage, 'utf8');
  const data = fs.readFileSync(correctionsData, 'utf8');

  assert.match(
    page,
    /import\s*\{\s*CORRECTIONS\s+as\s+corrections(?:\s*,\s*type\s+Correction)?\s*\}\s*from\s*['"]\.\.\/\.\.\/data\/corrections-log['"]/,
    'the public page must import the shared ledger as its rendered corrections array',
  );
  assert.doesNotMatch(
    page,
    /const\s+corrections\s*:[^=]+\=\s*\[/,
    'the public page must not keep a second embedded correction ledger',
  );
  assert.match(page, new RegExp(`modifiedDate:\\s*["']${latestCorrectionDate}["']`));
  assert.match(page, new RegExp(`const\\s+today\\s*=\\s*["']${latestCorrectionDate}["']`));

  for (const slug of recoverySlugs) {
    assert.match(data, new RegExp(`slug:\\s*["']${slug}["']`), `shared ledger missing ${slug}`);
  }
});

test('Standish recovery preserves the medical/adult-use distinction', () => {
  const page = read('apps/maine-cannabis/src/pages/guides/standish-dispensary-guide.astro');

  assert.match(page, /Expressly prohibited by Standish Chapter 220/);
  assert.match(page, /not intended to prohibit lawful conduct under Maine's medical-use law/);
  assert.match(page, /Do not treat the presence of a medical dispensary as proof that the town has opted in to adult-use retail/);
});

test('delivery recovery uses current statutory authority and removes courier-license claims', () => {
  const deliveryGuide = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-delivery-rules.astro');
  const businessGuide = read('apps/maine-cannabis/src/pages/blog/maine-cannabis-delivery-business-guide-2026.astro');
  const medicalGuide = read('apps/maine-cannabis/src/pages/blog/maine-medical-patient-delivery-services-2026.astro');
  const owners = [
    deliveryGuide,
    businessGuide,
    medicalGuide,
    read('apps/maine-cannabis/src/pages/guides/faq.astro'),
    read('apps/maine-cannabis/src/pages/guides/maine-cannabis-pos-comparison.astro'),
    read('apps/maine-cannabis/src/pages/guides/maine-cannabis-wholesale-guide.astro'),
    read('apps/maine-cannabis/src/pages/guides/maine-ocp-license-map.astro'),
    read('apps/maine-cannabis/src/pages/newsletter.astro'),
    read('apps/maine-cannabis/src/pages/contact.astro'),
  ];

  assert.match(deliveryGuide, /28-B M\.R\.S\. §\s*504\(9\)/);
  assert.match(deliveryGuide, /publishDate:\s*['"]2026-01-22['"]/);
  assert.match(businessGuide, /author:\s*['"]Calvin Waters['"]/);
  assert.match(businessGuide, /authorId:\s*['"]calvin-waters['"]/);
  assert.match(businessGuide, /authorTitle:\s*['"]Licensing & Compliance Analyst['"]/);
  assert.match(businessGuide, /publishDate:\s*['"]2026-04-18['"]/);
  assert.match(businessGuide, /const topics = \[['"]business['"], ['"]licensing['"], ['"]operations['"]\]/);
  assert.match(businessGuide, /<AutoRelated[^>]*currentTopics=\{topics\}[^>]*section=\{article\.section\}/);
  assert.match(medicalGuide, /author:\s*['"]Calvin Waters['"]/);
  assert.match(medicalGuide, /authorId:\s*['"]calvin-waters['"]/);
  assert.match(medicalGuide, /publishDate:\s*['"]2026-05-13['"]/);
  assert.match(medicalGuide, /const topics = \[['"]medical['"], ['"]operations['"], ['"]compliance['"]\]/);
  assert.match(medicalGuide, /<AutoRelated[^>]*currentTopics=\{topics\}[^>]*section=\{article\.section\}/);
  const registeredAuthorIds = new Set(
    JSON.parse(read('apps/maine-cannabis/src/data/authors.json')).map((author) => author.id),
  );
  assert.ok(registeredAuthorIds.has('calvin-waters'));
  assert.doesNotMatch(businessGuide + medicalGuide, /alex-rivera|Alex Rivera/);
  assert.match(businessGuide, /does not create a standalone adult-use cannabis courier or delivery-service license/);
  assert.match(medicalGuide, /identify the registered caregiver or dispensary responsible/);
  for (const source of owners) {
    assert.doesNotMatch(source, /Type 13/i);
    assert.doesNotMatch(source, /independent courier license/i);
    assert.doesNotMatch(source, /separate OCP Delivery Endorsement/i);
  }
});

test('zoning, waste, and Buxton corrections retain their primary-source limits', () => {
  const zoning = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-zoning-requirements.astro');
  const waste = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-waste-management.astro');
  const buxton = read('apps/maine-cannabis/src/pages/guides/buxton-dispensary-guide.astro');
  const buxtonEstablishments = read('apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-establishments-2026-06-01.csv');
  const corrections = read('apps/maine-cannabis/src/data/corrections-log.ts');

  assert.match(zoning, /Section 402\(2\)\(A\)/);
  assert.match(zoning, /1,000 feet of the property line/);
  assert.match(zoning, /may not be less than <strong>500 feet<\/strong>/);
  assert.match(waste, /current tax year and six immediately preceding tax years/);
  assert.match(waste, /former blanket “three years” claim was not the current general standard/);
  assert.match(buxtonEstablishments, /"DSP159","Dispensary","CABERSKI INDUSTRIES LLC","HIDDEN GREENS","Active","Buxton"/);
  assert.match(buxton, /active medical dispensary registration <strong>DSP159<\/strong>/);
  assert.match(buxton, /does not publish a street address/);
  assert.match(buxton, /CGR26972/);
  assert.match(corrections, /DSP159/);
  assert.doesNotMatch(buxton, /The June file does not clearly connect those records/);
  assert.match(buxton, /publishDate:\s*['"]2026-05-13['"]/);
  assert.match(buxton, /section:\s*['"]City Guides['"]/);
  assert.match(buxton, /const topics = \[['"]city['"], ['"]market['"]\]/);
  assert.match(buxton, /title="Buxton, ME Medical Cannabis Guide"/);
  assert.doesNotMatch(buxton, /1 Medical Store/);
});

test('materially corrected pages expose the July 26 modification date', () => {
  const correctedPages = [
    'apps/maine-cannabis/src/pages/contact.astro',
    'apps/maine-cannabis/src/pages/download/roadmap.astro',
    'apps/maine-cannabis/src/pages/guides/420-mules-bar-harbor.astro',
    'apps/maine-cannabis/src/pages/guides/great-atlantic-puffin-company.astro',
    'apps/maine-cannabis/src/pages/guides/landrace-cannabis-casco.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-pos-comparison.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-wholesale-guide.astro',
    'apps/maine-cannabis/src/pages/guides/maine-ocp-license-map.astro',
    'apps/maine-cannabis/src/pages/newsletter.astro',
  ];

  for (const page of correctedPages) {
    assert.match(read(page), /modifiedDate:\s*['"]2026-07-26['"]/, `${page} lacks the correction date`);
  }

  assert.match(
    read('apps/maine-cannabis/src/pages/download/roadmap.astro'),
    /<Layout[\s\S]*?\barticle=\{article\}/,
    'roadmap must pass its correction metadata to Layout',
  );
});

test('rewritten FAQ accordions retain GA4 instrumentation attributes', () => {
  const faqPages = [
    'apps/maine-cannabis/src/pages/guides/standish-dispensary-guide.astro',
    'apps/maine-cannabis/src/pages/guides/buxton-dispensary-guide.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-delivery-rules.astro',
    'apps/maine-cannabis/src/pages/blog/maine-medical-patient-delivery-services-2026.astro',
  ];

  for (const page of faqPages) {
    const tags = [...read(page).matchAll(/<details\b([^>]*)>/g)];
    assert.ok(tags.length > 0, `${page} has no FAQ details`);
    const ids = new Set();
    for (const [, attrs] of tags) {
      assert.match(attrs, /\bdata-faq(?:\s|=|$)/, `${page} details missing data-faq`);
      const id = attrs.match(/\bdata-faq-id=['"]([^'"]+)['"]/);
      assert.ok(id, `${page} details missing data-faq-id`);
      assert.ok(!ids.has(id[1]), `${page} repeats data-faq-id ${id[1]}`);
      ids.add(id[1]);
    }
  }
});

test('rewritten FAQ accordions emit one valid FAQPage schema with visible parity', () => {
  const faqPages = [
    'apps/maine-cannabis/src/pages/guides/standish-dispensary-guide.astro',
    'apps/maine-cannabis/src/pages/guides/buxton-dispensary-guide.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-delivery-rules.astro',
    'apps/maine-cannabis/src/pages/blog/maine-medical-patient-delivery-services-2026.astro',
  ];

  for (const page of faqPages) {
    const source = read(page);
    assert.equal(source.match(/FAQPage/g).length, 1, `${page} must emit exactly one FAQPage schema`);
    assert.match(
      source,
      /<script type="application\/ld\+json" set:html=\{faqPageJsonLd\} is:inline><\/script>/,
      `${page} must inline the FAQPage schema via set:html`,
    );

    const literal = source.match(/const faqPageJsonLd = ("(?:[^"\\]|\\.)*");/);
    assert.ok(literal, `${page} missing faqPageJsonLd const`);
    const schema = JSON.parse(JSON.parse(literal[1]));
    assert.equal(schema['@type'], 'FAQPage', `${page} schema is not a FAQPage`);
    assert.equal(schema['@context'], 'https://' + 'schema.org', `${page} FAQ schema must use the schema.org context`);
    assert.ok(Array.isArray(schema.mainEntity) && schema.mainEntity.length > 0, `${page} schema has no questions`);

    const visibleQuestions = [...source.matchAll(/<summary>(.*?)<\/summary>/gs)].map((m) => m[1].trim());
    const schemaQuestions = schema.mainEntity.map((e) => {
      assert.equal(e['@type'], 'Question', `${page} mainEntity entry is not a Question`);
      assert.ok(e.acceptedAnswer && typeof e.acceptedAnswer.text === 'string' && e.acceptedAnswer.text.length > 0, `${page} question lacks an answer`);
      return e.name;
    });
    assert.deepEqual(schemaQuestions, visibleQuestions, `${page} FAQ schema questions diverge from the visible accordions`);
  }
});

test('blog index delivery cards reflect the corrected destination pages', () => {
  const index = read('apps/maine-cannabis/src/pages/blog/index.astro');
  assert.doesNotMatch(index, /starting a cannabis delivery service/i, 'blog index still implies a standalone delivery startup path');
  assert.doesNotMatch(index, /rural access solutions/i, 'blog index still advertises removed rural-network content');
  assert.doesNotMatch(index, /Plan delivery licensing/i, 'blog index crosslink still implies standalone delivery licensing');
  assert.match(index, /no standalone courier license/i, 'business delivery card must state there is no standalone courier license');
  assert.match(index, /§504\(9\)/, 'business delivery card must cite the §504(9) delivery authority');
  assert.match(index, /responsible caregiver or registered dispensary/, 'medical delivery card must name the responsible provider');
});

test('rewritten delivery posts keep a constrained article reading measure', () => {
  const posts = [
    'apps/maine-cannabis/src/pages/blog/maine-cannabis-delivery-business-guide-2026.astro',
    'apps/maine-cannabis/src/pages/blog/maine-medical-patient-delivery-services-2026.astro',
  ];

  for (const post of posts) {
    const source = read(post);
    assert.match(source, /\.blog-post \{ max-width: 42rem; margin: 0 auto; \}/, `${post} lacks the constrained reading-measure rule`);
    assert.match(source, /<article class="blog-post">/, `${post} must wrap content in an <article> landmark`);
    assert.equal(source.match(/<article\b/g).length, source.match(/<\/article>/g).length, `${post} has unbalanced <article> tags`);
  }
});

test('rewritten delivery-rules guide keeps its article landmark', () => {
  const guide = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-delivery-rules.astro');
  assert.match(guide, /article \{ max-width: 42rem; margin: 0 auto; \}/, 'delivery-rules guide lacks the constrained reading-measure rule');
  assert.match(guide, /<article>/, 'delivery-rules guide must wrap content in an <article> landmark');
  assert.equal(guide.match(/<article\b/g).length, guide.match(/<\/article>/g).length, 'delivery-rules guide has unbalanced <article> tags');
});

test('corrections page passes its revision metadata to Layout', () => {
  const corrections = read('apps/maine-cannabis/src/pages/about/corrections.astro');
  assert.match(corrections, new RegExp(`modifiedDate:\\s*['"]${latestCorrectionDate}['"]`), 'corrections page must carry the latest correction date');
  assert.match(corrections, /<Layout[\s\S]*?\barticle=\{article\}/, 'corrections page must pass article metadata to Layout');
});

test('canonical route policy remains slashless', () => {
  const config = read('apps/maine-cannabis/astro.config.mjs');
  assert.match(config, /trailingSlash:\s*['"]never['"]/);
});

test('source-review dates do not exceed the approved July 26 access date', () => {
  const datedPages = [
    'apps/maine-cannabis/src/pages/blog/maine-cannabis-delivery-business-guide-2026.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-delivery-rules.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-zoning-requirements.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-waste-management.astro',
    'apps/maine-cannabis/src/pages/guides/buxton-dispensary-guide.astro',
  ];

  for (const page of datedPages) {
    const source = read(page);
    assert.doesNotMatch(source, /July 27, 2026/, `${page} is future-dated`);
    assert.match(source, /July 26, 2026|2026-07-26/, `${page} lacks the approved review date`);
  }
});

// ---------------------------------------------------------------------------
// Content-maintenance follow-up (card t_5b41cd69 + blog-index date metadata)
// ---------------------------------------------------------------------------

test('corrections methodology fragments map to real ledger slugs and contain no spaces', () => {
  const page = fs.readFileSync(correctionsPage, 'utf8');
  const data = fs.readFileSync(correctionsData, 'utf8');
  const slugs = new Set([...data.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));

  // Methodology example fragments are the href="#..." anchors in the rubric.
  const fragments = [...page.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(fragments.length > 0, 'no methodology fragments found');

  for (const frag of fragments) {
    assert.ok(!/\s/.test(frag), `methodology fragment contains whitespace: "${frag}"`);
    assert.ok(slugs.has(frag), `methodology fragment "#${frag}" has no matching corrections-log slug`);
  }

  // The two repaired fragments are present in their corrected form.
  assert.ok(fragments.includes('bridgton-denmark-limerick-dispensary-guides'));
  assert.ok(fragments.includes('milo-dexter-dispensary-guides'));
  // The stale forms are gone.
  assert.doesNotMatch(page, /#bridgton denmark limerick/);
  assert.doesNotMatch(page, /#milo-dispensary-guide dexter/);
});

test('blog-index delivery-business date agrees with the article canonical publishDate', () => {
  // The blog index is generated from the article pages (scripts/data/regen-blog-index.cjs),
  // so the date contract lives in the generated data file, not the page source.
  const generated = JSON.parse(read('apps/maine-cannabis/src/data/blog-index.json'));
  const entry = generated.items.find((i) => i.slug === 'maine-cannabis-delivery-business-guide-2026');
  assert.ok(entry, 'blog-index.json has no delivery-business entry');

  assert.equal(entry.publishDate, '2026-04-18', 'blog-index publishDate must be the canonical 2026-04-18');

  const article = read('apps/maine-cannabis/src/pages/blog/maine-cannabis-delivery-business-guide-2026.astro');
  const articleDate = article.match(/publishDate:\s*['"]([^'"]+)['"]/);
  assert.ok(articleDate, 'article publishDate missing');
  assert.equal(entry.publishDate, articleDate[1], 'blog-index publishDate must equal the article publishDate');
});

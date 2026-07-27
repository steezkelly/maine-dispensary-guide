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
  assert.match(page, /modifiedDate:\s*["']2026-07-26["']/);
  assert.match(page, /const\s+today\s*=\s*["']2026-07-26["']/);

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
  ];

  assert.match(deliveryGuide, /28-B M\.R\.S\. §\s*504\(9\)/);
  assert.match(businessGuide, /author:\s*['"]Margaret Finch['"]/);
  assert.match(businessGuide, /authorId:\s*['"]margaret-finch['"]/);
  assert.match(businessGuide, /publishDate:\s*['"]2026-04-18['"]/);
  assert.match(medicalGuide, /author:\s*['"]Calvin Waters['"]/);
  assert.match(medicalGuide, /authorId:\s*['"]calvin-waters['"]/);
  assert.match(medicalGuide, /publishDate:\s*['"]2026-05-13['"]/);
  const registeredAuthorIds = new Set(
    JSON.parse(read('apps/maine-cannabis/src/data/authors.json')).map((author) => author.id),
  );
  assert.ok(registeredAuthorIds.has('margaret-finch'));
  assert.ok(registeredAuthorIds.has('calvin-waters'));
  assert.doesNotMatch(businessGuide + medicalGuide, /alex-rivera|Alex Rivera/);
  assert.match(businessGuide, /does not create a standalone adult-use cannabis courier or delivery-service license/);
  assert.match(medicalGuide, /identify the registered caregiver or dispensary responsible/);
  for (const source of owners) {
    assert.doesNotMatch(source, /Type 13/i);
    assert.doesNotMatch(source, /independent courier license/i);
  }
});

test('zoning, waste, and Buxton corrections retain their primary-source limits', () => {
  const zoning = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-zoning-requirements.astro');
  const waste = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-waste-management.astro');
  const buxton = read('apps/maine-cannabis/src/pages/guides/buxton-dispensary-guide.astro');

  assert.match(zoning, /Section 402\(2\)\(A\)/);
  assert.match(zoning, /1,000 feet of the property line/);
  assert.match(zoning, /may not be less than <strong>500 feet<\/strong>/);
  assert.match(waste, /current tax year and six immediately preceding tax years/);
  assert.match(waste, /former blanket “three years” claim was not the current general standard/);
  assert.match(buxton, /The June file does not clearly connect those records/);
  assert.match(buxton, /We do not infer a license relationship that the public records do not show/);
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

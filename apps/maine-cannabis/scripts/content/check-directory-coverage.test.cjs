#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appRoot = path.resolve(__dirname, '../..');
const guidesDir = path.join(appRoot, 'src/pages/guides');
const directoryPage = path.join(appRoot, 'src/pages/find-a-dispensary.astro');

function existingDispensaryGuideHrefs() {
  return fs.readdirSync(guidesDir)
    .filter((name) => name.endsWith('-dispensary-guide.astro'))
    .map((name) => `/guides/${name.replace(/\.astro$/, '')}/`)
    .sort();
}

test('/find-a-dispensary links every local dispensary guide exactly once', () => {
  const text = fs.readFileSync(directoryPage, 'utf8');
  const guideHrefs = [...text.matchAll(/["']?href["']?\s*:\s*[`"'](\/guides\/[a-z0-9-]+-dispensary-guide\/)[`"']/g)]
    .map((match) => match[1])
    .sort();
  const uniqueGuideHrefs = [...new Set(guideHrefs)];
  const expectedGuideHrefs = existingDispensaryGuideHrefs();

  assert.equal(expectedGuideHrefs.length, 50, 'fixture should reflect the current 50 guide pages');
  assert.deepEqual(uniqueGuideHrefs, expectedGuideHrefs);
  assert.equal(guideHrefs.length, uniqueGuideHrefs.length, 'directory should not duplicate guide links');
});

test('/find-a-dispensary exposes map search links for every listed guide area', () => {
  const text = fs.readFileSync(directoryPage, 'utf8');
  const guideCount = existingDispensaryGuideHrefs().length;
  const mapNeedle = 'https://www.google.com/maps/search/?api=1' + String.fromCharCode(38) + 'query=';
  const mapSearchLinks = text.split(mapNeedle).length - 1;

  assert.equal(mapSearchLinks, guideCount);
});

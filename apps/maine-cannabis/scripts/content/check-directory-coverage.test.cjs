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
    .map((name) => `/guides/${name.replace(/\.astro$/, '')}`)
    .sort();
}

function extractDirectoryLinks(text) {
  const guideHrefs = [...text.matchAll(/"href"\s*:\s*[`"'](\/guides\/[a-z0-9-]+-dispensary-guide)[`"']/g)]
    .map((match) => match[1])
    .sort();
  const mapUrls = [...text.matchAll(/"mapUrl"\s*:\s*[`"'](https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=[^`"']+)[`"']/g)]
    .map((match) => match[1])
    .sort();
  return { guideHrefs, mapUrls };
}

test('/find-a-dispensary links every local dispensary guide exactly once', () => {
  const text = fs.readFileSync(directoryPage, 'utf8');
  const { guideHrefs } = extractDirectoryLinks(text);
  const uniqueGuideHrefs = [...new Set(guideHrefs)];
  const expectedGuideHrefs = existingDispensaryGuideHrefs();

  assert.equal(expectedGuideHrefs.length, 61, 'fixture should reflect the current 61 guide pages');
  assert.deepEqual(uniqueGuideHrefs, expectedGuideHrefs);
  assert.equal(guideHrefs.length, uniqueGuideHrefs.length, 'directory should not duplicate guide links');
});

test('/find-a-dispensary exposes exactly one Google Maps search link per guide and all are in expected format', () => {
  const text = fs.readFileSync(directoryPage, 'utf8');
  const { guideHrefs, mapUrls } = extractDirectoryLinks(text);
  const uniqueGuideHrefs = [...new Set(guideHrefs)];
  const uniqueMapUrls = [...new Set(mapUrls)];
  const mapPrefix = 'https://www.google.com/maps/search/?api=1&query=';

  assert.equal(mapUrls.length, uniqueGuideHrefs.length, 'all guides should have a map link');
  assert.equal(uniqueMapUrls.length, mapUrls.length, 'map links should be unique per guide');
  for (const mapUrl of mapUrls) {
    assert.ok(mapUrl.startsWith(mapPrefix), `map URL should use Google Maps search endpoint: ${mapUrl}`);
    assert.ok(mapUrl.includes('%2C%20ME%20dispensary'), `map query should include ME dispensary location context: ${mapUrl}`);
  }
});

test('/find-a-dispensary exposes map search links for every listed guide area', () => {
  const text = fs.readFileSync(directoryPage, 'utf8');
  const guideCount = existingDispensaryGuideHrefs().length;
  const mapNeedle = 'https://www.google.com/maps/search/?api=1' + String.fromCharCode(38) + 'query=';
  const mapSearchLinks = text.split(mapNeedle).length - 1;

  assert.equal(mapSearchLinks, guideCount);
});

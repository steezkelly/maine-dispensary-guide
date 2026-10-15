const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '..', 'index.astro');
const page = fs.readFileSync(pagePath, 'utf8');

test('homepage page uses selectFeaturedAnalysis from the data boundary', () => {
  assert.match(
    page,
    /selectFeaturedAnalysis\s*\(/,
    'index.astro must call selectFeaturedAnalysis from the data boundary',
  );
  // The page must not hardcode the featured href or the featured date — both
  // must flow from the boundary result (or be unset).
  assert.doesNotMatch(
    page,
    /href:\s*['"]\/blog\/cannabis-friendly-maine-travel['"]/,
    'index.astro must not hardcode the featured-story href',
  );
  assert.doesNotMatch(
    page,
    /date:\s*['"]2026-07-09['"]/,
    'index.astro must not hardcode the featured-story date',
  );
});

test('homepage page uses buildLatestIntelligence from the data boundary', () => {
  assert.match(
    page,
    /buildLatestIntelligence\s*\(/,
    'index.astro must call buildLatestIntelligence from the data boundary',
  );
  // The page must not hardcode any intelligence href from a specific blog
  // post — each entry must come from the boundary result.
  assert.doesNotMatch(
    page,
    /href:\s*['"]\/blog\/best-maine-edibles-2026['"]/,
    'index.astro must not hardcode the first intelligence href',
  );
  assert.doesNotMatch(
    page,
    /href:\s*['"]\/blog\/cannabis-friendly-maine-travel['"]/,
    'index.astro must not hardcode the cannabis-friendly-maine-travel href inside an intelligence list',
  );
});
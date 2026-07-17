#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const correctionsPage = path.resolve(
  __dirname,
  '../../apps/maine-cannabis/src/pages/about/corrections.astro',
);

function readCorrectionsPage() {
  return fs.readFileSync(correctionsPage, 'utf8');
}

test('reader cutoff follows the newest correction instead of a hardcoded date', () => {
  const source = readCorrectionsPage();

  assert.match(source, /latestCorrectionDate[\s\S]*corrections\[0\]\.date/);
  assert.match(source, /before \{latestCorrectionDate\}/);
  assert.doesNotMatch(source, /before (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d{2}/);
});

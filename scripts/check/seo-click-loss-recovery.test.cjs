#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const correctionsPage = path.join(root, 'apps/maine-cannabis/src/pages/about/corrections.astro');
const correctionsData = path.join(root, 'apps/maine-cannabis/src/data/corrections-log.ts');

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

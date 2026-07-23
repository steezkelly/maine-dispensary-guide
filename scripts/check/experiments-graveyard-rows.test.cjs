// scripts/check/experiments-graveyard-rows.test.cjs
//
// Unit tests for the Cannabis Claim Graveyard banned-substring sanitizer.
// Mirrors the structure of scripts/check/sitemap-postprocess.test.mjs
// (the test that lives in this same folder).
//
// Usage:
//   node --test scripts/check/experiments-graveyard-rows.test.cjs
//
// The test reads the real
// apps/maine-cannabis/src/data/experiments-graveyard-rows.json so
// that the same data the page renders is what gets validated. A
// regression in editorial judgment is caught here, not in production.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  BANNED_SUBSTRINGS,
  checkBetterField,
  checkGraveyardRows,
} = require('./experiments-graveyard-rows.cjs');

const ROWS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'apps',
  'maine-cannabis',
  'src',
  'data',
  'experiments-graveyard-rows.json',
);

function loadRows() {
  const raw = fs.readFileSync(ROWS_PATH, 'utf8');
  return JSON.parse(raw);
}

test('BANNED_SUBSTRINGS: contains the 10 expected phrases', () => {
  assert.deepEqual(BANNED_SUBSTRINGS, [
    'best',
    'safest',
    'guaranteed',
    '100%',
    'cure',
    'treat',
    'heal',
    'fda-approved',
    'clinically proven',
    'miracle',
  ]);
});

test('checkBetterField: clean input returns ok', () => {
  const verdict = checkBetterField('List current menu fields a reader can verify.', 3);
  assert.equal(verdict.ok, true);
});

test('checkBetterField: banned substring is reported with row index', () => {
  const verdict = checkBetterField('This is the best option for readers.', 7);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.rowIndex, 7);
  assert.equal(verdict.banned, 'best');
});

test('checkBetterField: match is case-insensitive', () => {
  const verdict = checkBetterField('Clinically Proven formula for calm.', 0);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.banned, 'clinically proven');
});

test('checkGraveyardRows: real rows.json is an array of 12 clean rows', () => {
  const rows = loadRows();
  const verdict = checkGraveyardRows(rows);
  assert.equal(verdict.ok, true, verdict.message);
  assert.equal(verdict.count, 12);
});

test('checkGraveyardRows: every row has a non-empty better string', () => {
  const rows = loadRows();
  for (let i = 0; i < rows.length; i += 1) {
    assert.equal(typeof rows[i].better, 'string',
      `row ${i} "better" must be a string`);
    assert.ok(rows[i].better.length > 0, `row ${i} "better" must be non-empty`);
  }
});

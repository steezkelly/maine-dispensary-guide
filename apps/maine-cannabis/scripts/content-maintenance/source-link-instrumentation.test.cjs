'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const citeThis = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'components', 'CiteThis.astro'), 'utf8');
const marketStats = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'pages', 'market-stats.astro'), 'utf8');

test('CiteThis emits only the bounded source-select event vocabulary', () => {
  assert.match(citeThis, /data-mdg-source-id/);
  assert.match(citeThis, /'mdg_source_select'/);
  assert.match(citeThis, /schema_version: 'v1'/);
  assert.match(citeThis, /source_family: link\.dataset\.mdgSourceFamily/);
  assert.doesNotMatch(citeThis, /source_url:/);
});

test('market stats maps its annual-report citation to the manifest source ID', () => {
  assert.match(marketStats, /sourceId: "ocp-au-annual-report-2025"/);
});

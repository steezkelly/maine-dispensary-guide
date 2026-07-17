'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const trackerPath = path.resolve(__dirname, '..', 'maine-cannabis-opt-in-tracker.astro');

test('tracker consumes generated statewide municipality data and removes stale date copy', () => {
  const page = fs.readFileSync(trackerPath, 'utf8');
  assert.match(page, /maine-municipal-authorization\.json/);
  assert.match(page, /ocp_model_refreshed_at/);
  assert.match(page, /modifiedDate:\s*meta\.retrieved_at,\n/);
  assert.match(page, /publishDate:\s*meta\.retrieved_at,\n/);
  assert.match(page, /timezone not supplied by OCP/);
  assert.doesNotMatch(page, /April 2026|Last reviewed <strong>2026-/);
});

test('tracker preserves the authorization versus opt-out distinction and all categories', () => {
  const page = fs.readFileSync(trackerPath, 'utf8');
  assert.match(page, /retail_authorized/);
  assert.match(page, /explicit_opt_out/);
  assert.match(page, /no_recorded_retail_authorization/);
  assert.match(page, /No recorded retail authorization/);
  assert.match(page, /not an explicit opt-out/);
});

test('tracker makes every category table searchable and labels activity authorization', () => {
  const page = fs.readFileSync(trackerPath, 'utf8');
  assert.match(page, /data-municipality-row/);
  assert.match(page, /Retail/);
  assert.match(page, /Cultivation/);
  assert.match(page, /Manufacturing/);
  assert.match(page, /Testing/);
});

// LeadIntakeForm.test.cjs — focused tests for the new server-side-aware lead
// form component. Run with `node --test LeadIntakeForm.test.cjs` from the
// component directory. RED→GREEN gate for cycle-15 Stage 2.
//
// Tests parse the source as text and assert on the shape (not the built
// output). This avoids needing to run `astro build` for a focused test,
// and matches the project's TDD convention for hand-built components.

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { fileURLToPath } = require('node:url');
const { dirname, join } = require('node:path');

const here = __dirname;
const sourcePath = join(here, 'LeadIntakeForm.astro');
const source = readFileSync(sourcePath, 'utf8');

test('LeadIntakeForm: renders a form with the supplied formId', () => {
  assert.match(source, /<form\b/);
  assert.match(source, /id=\{formId\}/);
});

test('LeadIntakeForm: declares a data-endpoint attribute on the form', () => {
  assert.match(source, /data-endpoint/);
  assert.match(source, /data-endpoint=\{endpoint\}/);
});

test('LeadIntakeForm: declares a consent checkbox that gates submit', () => {
  assert.match(source, /type="checkbox"/);
  assert.match(source, /name="consent"/);
  assert.match(source, /required/);
});

test('LeadIntakeForm: POSTs to data-endpoint with JSON body when set', () => {
  assert.match(source, /fetch\s*\(\s*endpoint/);
  assert.match(source, /method:\s*['"]POST['"]/);
  assert.match(source, /application\/json/);
});

test('LeadIntakeForm: falls back to mailto: when endpoint is empty or fetch fails', () => {
  assert.match(source, /buildMailto/);
  // The endpoint guard regex is permissive of whitespace and the polarity
  // of the comparison: matches either "endpoint.length === 0" or
  // "endpoint.length > 0" as a truthy guard.
  assert.match(source, /endpoint\.length\s*(?:===\s*0|>\s*0)/);
  // The fetch is wrapped in try/catch with a .catch handler.
  assert.match(source, /try\s*\{[\s\S]*?fetch[\s\S]*?\}\s*catch/);
  // A non-2xx status check is required.
  assert.match(source, /response\.ok/);
});

test('LeadIntakeForm: GA4 lead_capture event includes a transport field', () => {
  assert.match(source, /gtag\s*\(\s*['"]event['"]\s*,\s*['"]lead_capture['"]/);
  assert.match(source, /transport\s*:/);
});

test('LeadIntakeForm: populates page_path, utm_*, referrer from window.location', () => {
  assert.match(source, /window\.location\.pathname/);
  assert.match(source, /document\.referrer/);
  assert.match(source, /utm_source/);
  assert.match(source, /utm_medium/);
  assert.match(source, /utm_campaign/);
});

test('LeadIntakeForm: passes the original LeadMailtoForm data-* attributes through', () => {
  assert.match(source, /data-lead-to/);
  assert.match(source, /data-lead-subject/);
  assert.match(source, /data-lead-body/);
  assert.match(source, /data-form-name/);
  assert.match(source, /data-success-path/);
  assert.match(source, /data-track-fields/);
});

test('LeadIntakeForm: honeypot preserved', () => {
  assert.match(source, /name="website"/);
  assert.match(source, /aria-hidden="true"/);
});

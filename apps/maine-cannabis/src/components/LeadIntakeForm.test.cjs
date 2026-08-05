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
  // fireGA4 uses a variable eventName; match literal or variable.
  assert.match(source, /gtag\(['"]event['"]\s*,\s*[a-zA-Z_]+/);
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

// --- request_id idempotency key (W14 cutover/request-id correction) ---

test('LeadIntakeForm: generates a per-submission UUID v4 request_id', () => {
  // A request_id is generated immediately before building the POST payload.
  assert.match(source, /function newRequestId/);
  assert.match(source, /crypto\.randomUUID/);
  // The generated request_id is included in the JSON payload.
  assert.match(source, /request_id:\s*requestId/);
  // Generation happens per submission attempt (inside the submit handler path).
  assert.match(source, /var requestId = newRequestId\(\)/);
});

test('LeadIntakeForm: request_id has a secure crypto fallback', () => {
  // When crypto.randomUUID is unavailable, fall back to crypto.getRandomValues
  // and construct an RFC-4122 v4 UUID (version + variant bits set).
  assert.match(source, /crypto\.getRandomValues/);
  assert.match(source, /0x40/); // version 4 nibble
  assert.match(source, /0x80/); // variant 10 nibble
});

test('LeadIntakeForm: request_id is not derived from PII or tracking signals', () => {
  // The generator must not read email, name, timestamp, IP, or user agent.
  const generator = source.slice(source.indexOf('function newRequestId'));
  const generatorBody = generator.slice(0, generator.indexOf('function navigateToSuccess'));
  assert.doesNotMatch(generatorBody, /values\.email|raw\.email/);
  assert.doesNotMatch(generatorBody, /user_agent|userAgent/);
  assert.doesNotMatch(generatorBody, /Date\.now|toISOString/);
  // Not persisted for cross-page tracking.
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
});

test('LeadIntakeForm: ts remains informational and is not the idempotency key', () => {
  // ts is still sent as observational metadata, but request_id is the key.
  assert.match(source, /ts:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(source, /request_id:\s*requestId/);
});

// --- W13 incident containment: validated success contract ---

test('LeadIntakeForm: defines isValidSuccessResponse contract validator', () => {
  assert.match(source, /function isValidSuccessResponse/);
  // Requires data.ok === true (strict).
  assert.match(source, /data\.ok !== true/);
  // Requires data.id to be a positive integer.
  assert.match(source, /Number\.isInteger\(data\.id\)/);
  assert.match(source, /data\.id <= 0/);
});

test('LeadIntakeForm: redirect is validated as a safe same-site path', () => {
  // A redirect must begin with '/' and must not be protocol-relative or absolute.
  assert.match(source, /data\.redirect\.charAt\(0\) !== '\/'/);
  assert.match(source, /data\.redirect\.indexOf\('\/\/'\) === 0/);
  assert.match(source, /data\.redirect\.indexOf\(':\/\/'\) !== -1/);
  // WHATWG URL bypass vectors: backslash and control characters.
  assert.match(source, /data\.redirect\.indexOf\('\\\\'\) !== -1/);
  assert.match(source, /\[\\x00-\\x1f\\x7f\]/);
});

test('LeadIntakeForm: defines an accessible inline temporary-failure message', () => {
  assert.match(source, /function showTemporaryFailure/);
  assert.match(source, /role['"]?\s*,\s*['"]alert['"]/);
  assert.match(source, /aria-live['"]?\s*,\s*['"]polite['"]/);
  // Honest message that does not claim the lead was saved.
  // The source uses the literal escape \u2019 (right single quote).
  assert.match(source, /couldn\\u2019t confirm that your request was received/);
  assert.doesNotMatch(source, /your request has been saved/i);
  assert.doesNotMatch(source, /successfully submitted/i);
});

test('LeadIntakeForm: success path is gated behind isValidSuccessResponse', () => {
  // The lead_capture ('server') event and redirect only fire inside the valid branch.
  assert.match(source, /if \(isValidSuccessResponse\(data\)\)/);
  // The invalid branch shows the temporary failure, not a redirect.
  assert.match(source, /showTemporaryFailure\(\)/);
});

test('LeadIntakeForm: empty or malformed JSON body is NOT treated as success', () => {
  // The old vulnerable pattern swallowed parse errors into {} — that must be gone.
  assert.doesNotMatch(source, /response\.json\(\)\.catch\(function \(\) \{ return \{\}; \}\)/);
  // Parse failure now resolves to null so the contract check fails.
  assert.match(source, /response\.json\(\)\.catch\(function \(\) \{ return null; \}\)/);
});

test('LeadIntakeForm: non-2xx still throws to the mailto fallback', () => {
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /throw new Error\('non-2xx'\)/);
});

test('LeadIntakeForm: lead_form_start remains an intent event on the server path', () => {
  // lead_form_start fires on intent, before the fetch resolves.
  assert.match(source, /fireGA4\(form, formName, trackFields, 'lead_form_start', 'server'\)/);
});

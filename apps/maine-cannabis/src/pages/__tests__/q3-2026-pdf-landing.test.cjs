// q3-2026-pdf-landing.test.cjs — RED-GREEN gate for the Q3 2026 PDF landing page.
//
// Asserts the page source has the right shape: PDF reference, form wiring,
// FAQ JSON-LD, success card, direct download. Source-text checks follow
// the pattern used in scripts/continuation/tests/ for this project.
//
// Run with `node --test q3-2026-pdf-landing.test.cjs` from this directory.

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(
  __dirname,
  '..',
  'download',
  'maine-cannabis-industry-report-q3-2026.astro',
);
const page = fs.readFileSync(pagePath, 'utf8');

test('page references the Q3 2026 PDF asset path', () => {
  assert.match(
    page,
    /\/pdfs\/maine-cannabis-industry-report-q3-2026\.pdf/,
    'page must reference the PDF at the standard public/pdfs path',
  );
  assert.match(
    page,
    /\/downloads\/maine-cannabis-industry-report-q3-2026\.pdf/,
    'page must reference the PDF at the standard downloads path for the manual download link',
  );
});

test('page mounts LeadMailtoForm with the right form-name and successPath', () => {
  // Component import
  assert.match(page, /LeadMailtoForm/);
  // Form wiring
  assert.match(
    page,
    /formName=["']q3_2026_industry_report["']/,
    'must use the canonical snake_case formName for this PDF gate',
  );
  assert.match(
    page,
    /successPath=["']\/download\/maine-cannabis-industry-report-q3-2026\?success=true["']/,
    'must set a success path that round-trips through the same page',
  );
  // Form id
  assert.match(
    page,
    /formId=["']maine-cannabis-industry-report-lead-form["']/,
    'form id must be unique and prefixed to avoid collisions with the other PDF-gate forms',
  );
});

test('page renders required form fields (name, email, business, role)', () => {
  assert.match(page, /id=["']q3-name["']/, 'name input');
  assert.match(page, /id=["']q3-email["']/, 'email input');
  assert.match(page, /id=["']q3-business["']/, 'business input');
  assert.match(page, /id=["']q3-role["']/, 'role select');
  // role select must include the operator/applicant/investor/service/curious options
  assert.match(page, /value=["']operator["']/, 'role option: operator');
  assert.match(page, /value=["']applicant["']/, 'role option: applicant');
  assert.match(page, /value=["']investor["']/, 'role option: investor');
  assert.match(page, /value=["']curious["']/, 'role option: curious');
});

test('page contains FAQPage JSON-LD with at least 4 questions', () => {
  assert.match(
    page,
    /<script[^>]+application\/ld\+json[^>]*>/,
    'must include an ld+json script tag',
  );
  assert.match(page, /FAQPage/, 'must declare the FAQPage ld+json payload');
  // Count question entries — 4 questions defined in the frontmatter.
  const matches = page.match(/'@type':\s*'Question'/g) || [];
  assert.ok(matches.length >= 4, `expected at least 4 FAQ questions, found ${matches.length}`);
});

test('page renders a success card with id for client-side toggle', () => {
  assert.match(
    page,
    /id=["']maine-cannabis-industry-report-success["']/,
    'success card div must have the unique id that the client script toggles',
  );
  assert.match(
    page,
    /Check your inbox/,
    'success card text must announce delivery',
  );
});

test('page renders a direct-download link that bypasses the lead form', () => {
  assert.match(
    page,
    /Or download now without subscribing/,
    'must include the direct-download string used on the other PDF gates',
  );
});

test('page sets publishDate and modifiedDate frontmatter metadata', () => {
  assert.match(page, /publishDate:\s*["']2026-07-23["']/);
  assert.match(page, /modifiedDate:\s*["']2026-07-23["']/);
});

test('page declares a data cutoff note that names the actual date', () => {
  assert.match(
    page,
    /Data cutoff/,
    'page must state the data cutoff',
  );
  assert.match(
    page,
    /23 July 2026/,
    'cutoff must be the published date so future editions can be diffed',
  );
});

test('page covers all 8 sections of the PDF report', () => {
  assert.match(page, /1\.\s*Introduction/);
  assert.match(page, /2\.\s*Maine Market Snapshot/);
  assert.match(page, /3\.\s*Legal/);
  assert.match(page, /4\.\s*Industry/);
  assert.match(page, /5\.\s*Economic Performance/);
  assert.match(page, /6\.\s*Forecast/);
  assert.match(page, /7\.\s*Conclusion/);
  assert.match(page, /8\.\s*References/);
});

test('page is indexable (noindex=false)', () => {
  // The <Layout> opens with noindex={false} so the page is indexable.
  assert.match(
    page,
    /noindex=\{false\}/,
    'page must be noindex={false} so the landing page is discoverable',
  );
});

test('page sets up AutoRelated for downstream internal discovery', () => {
  assert.match(
    page,
    /<AutoRelated/,
    'page must include AutoRelated so the PDF gate links out to related guides',
  );
});

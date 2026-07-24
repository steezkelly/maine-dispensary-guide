'use strict';

/**
 * apps/maine-cannabis/src/pages/__tests__/q3-2026-pdf-landing.test.cjs
 *
 * Focused regression test for the Q3 2026 PDF landing page.
 * Guards the LeadMailtoForm contract, FAQ JSON-LD, success card,
 * and direct download link.
 *
 * Run with: node apps/maine-cannabis/src/pages/__tests__/q3-2026-pdf-landing.test.cjs
 */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PAGE = resolve(__dirname, '..', 'download', 'maine-cannabis-industry-report-q3-2026.astro');
const source = readFileSync(PAGE, 'utf8');

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    process.stderr.write('  ok  ' + name + '\n');
    pass += 1;
  } catch (err) {
    process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n');
    fail += 1;
  }
}

check('page imports LeadMailtoForm and Layout', () => {
  assert.match(source, /import\s+LeadMailtoForm\s+from\s+['"]\.\.\/\.\.\/components\/LeadMailtoForm\.astro['"]/);
  assert.match(source, /import\s+Layout\s+from\s+['"]\.\.\/\.\.\/layouts\/Layout\.astro['"]/);
});

check('page mounts LeadMailtoForm with correct props', () => {
  assert.match(source, /formId=["']q3-2026-industry-report-lead-form["']/);
  assert.match(source, /leadTo=\{leadTo\}/);
  assert.match(source, /leadSubject=\{leadSubject\}/);
  assert.match(source, /leadBody=\{leadBody\}/);
  assert.match(source, /formName=["']q3_2026_industry_report["']/);
  assert.match(source, /successPath=["']\/download\/maine-cannabis-industry-report-q3-2026\?success=true["']/);
  assert.match(source, /trackFields=\{\[['"]stage['"]\]\}/);
});

check('leadTo points to leads@mainedispensaryguide.com', () => {
  assert.match(source, /const\s+leadTo\s*=\s*["']leads@mainedispensaryguide\.com["']/);
});

check('page has FAQ JSON-LD', () => {
  assert.match(source, /"@type":\s*"FAQPage"/);
  assert.match(source, /"@type":\s*"Question"/);
});

check('page has success card with download link', () => {
  assert.match(source, /id=["']q3-2026-report-success["']/);
  assert.match(source, /href=\{pdfUrl\}\s+download/);
});

check('page has direct download link outside form', () => {
  assert.match(source, /class=["']or-download["']/);
  assert.match(source, /download now without subscribing/i);
});

check('pdfUrl points to the correct PDF path', () => {
  assert.match(source, /const\s+pdfUrl\s*=\s*["']\/pdfs\/maine-cannabis-industry-report-q3-2026\.pdf["']/);
});

check('form has required name, email, and stage fields', () => {
  assert.match(source, /name=["']name["']\s+required/);
  assert.match(source, /name=["']email["']\s+required/);
  assert.match(source, /name=["']stage["']\s+required/);
});

check('page is not noindex', () => {
  assert.match(source, /noindex=\{false\}/);
});

process.stderr.write('\nq3-2026-pdf-landing.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);

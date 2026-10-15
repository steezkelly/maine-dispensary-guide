'use strict';

/**
 * apps/maine-cannabis/src/pages/__tests__/q3-2026-pdf-landing.test.cjs
 *
 * Focused regression test for the Q3 2026 PDF landing page.
 * Guards the LeadMailtoForm contract, FAQ component, success card,
 * and direct download link (must use /downloads/, not /pdfs/).
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

check('page imports LeadMailtoForm, Layout, Faq, and AutoRelated', () => {
  assert.match(source, /import\s+LeadMailtoForm\s+from\s+['"]\.\.\/\.\.\/components\/LeadMailtoForm\.astro['"]/);
  assert.match(source, /import\s+Layout\s+from\s+['"]\.\.\/\.\.\/layouts\/Layout\.astro['"]/);
  assert.match(source, /import\s+Faq\s+from\s+['"]\.\.\/\.\.\/components\/Faq\.astro['"]/);
  assert.match(source, /import\s+AutoRelated\s+from\s+['"]\.\.\/\.\.\/components\/AutoRelated\.astro['"]/);
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

check('pdfUrl points to /downloads/ (NOT /pdfs/)', () => {
  assert.match(
    source,
    /const\s+pdfUrl\s*=\s*["']\/downloads\/maine-cannabis-industry-report-q3-2026\.pdf["']/,
    'pdfUrl must use /downloads/ to match the 4 existing lead-magnet PDFs',
  );
  assert.doesNotMatch(
    source,
    /["']\/pdfs\/maine-cannabis-industry-report-q3-2026\.pdf["']/,
    'pdfUrl must NOT use /pdfs/ — that was the bug fixed in this PR',
  );
});

check('page has Faq component with 5+ items', () => {
  assert.match(source, /<Faq\s+items=\{faqItems\}\s*\/>/);
  assert.match(source, /const\s+faqItems\s*=\s*\[/);
  // Count question fields
  const questions = source.match(/question:\s*"/g) || [];
  assert.ok(questions.length >= 5, `Faq must have >= 5 questions, found ${questions.length}`);
});

check('page has success card with download link', () => {
  assert.match(source, /id=["']q3-2026-report-success["']/);
  assert.match(source, /href=\{\s*pdfUrl\s*\}\s+download/);
});

check('page has direct download link outside form', () => {
  assert.match(source, /class=["']or-download["']/);
  assert.match(source, /download now without subscribing/i);
});

check('page has KPI strip with frozen figures', () => {
  // Three KPI cards
  const kpis = source.match(/class=["']kpi["']/g) || [];
  assert.ok(kpis.length >= 3, `KPI strip must have >= 3 cards, found ${kpis.length}`);
  assert.match(source, /\$20\.7M/);
  assert.match(source, /346/);
  assert.match(source, /\$6\.10/);
});

check('form has required name, email, and stage fields', () => {
  assert.match(source, /name=["']name["']\s+required/);
  assert.match(source, /name=["']email["']\s+required/);
  assert.match(source, /name=["']stage["']\s+required/);
});

check('page is not noindex', () => {
  assert.match(source, /noindex=\{false\}/);
});

check('page has AutoRelated with currentPath AND currentTopics', () => {
  assert.match(
    source,
    /<AutoRelated\s+currentPath=["'][^"']*maine-cannabis-industry-report-q3-2026["'][^>]*currentTopics=\{/,
  );
});

check('page has in-line success-script that reads success=true query param', () => {
  assert.match(source, /get\(['"]success['"]\)/);
  assert.match(source, /===\s*['"]true['"]/);
});

process.stderr.write('\nq3-2026-pdf-landing.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);

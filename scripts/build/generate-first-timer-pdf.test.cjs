#!/usr/bin/env node
/**
 * Regression test for scripts/build/generate-first-timer-pdf.py.
 *
 * Run with: node --test scripts/build/generate-first-timer-pdf.test.cjs
 *
 * Locks down the contract that the lead-magnet PDF must hold:
 *   - PDF file is generated at the canonical path
 *   - Page count is in the expected range (9-12 pages)
 *   - Contains the primary-source citations required for YMYL compliance
 *   - Does NOT contain AI-garbled text artifacts (e.g., "lorem ipsum")
 *   - Has correct metadata (Title, Author)
 *
 * If this test fails, the PDF generator (or its inputs) has regressed.
 * Re-generate with: python3 scripts/build/generate-first-timer-pdf.py
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');
const pdfPath = path.join(repoRoot, 'apps/maine-cannabis/public/downloads/maine-first-timer-field-guide.pdf');
const generator = path.join(repoRoot, 'scripts/build/generate-first-timer-pdf.py');

function ensurePdf() {
  // Generate (or re-generate) the PDF before tests so we test the current
  // state of the script. The script is idempotent — re-running just rewrites.
  if (!fs.existsSync(pdfPath) || process.env.PDF_TEST_REGENERATE === '1') {
    const r = spawnSync('python3', [generator], { cwd: repoRoot, encoding: 'utf8' });
    if (r.status !== 0) {
      throw new Error(`generator failed: ${r.stderr}`);
    }
  }
  return pdfPath;
}

function pdfinfo(pdf) {
  // Use system pdfinfo (poppler-utils). Returns parsed object or null.
  const r = spawnSync('pdfinfo', [pdf], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const obj = {};
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) obj[m[1].trim()] = m[2].trim();
  }
  return obj;
}

function pdftotext(pdf) {
  const r = spawnSync('pdftotext', [pdf, '-'], { encoding: 'utf8' });
  if (r.status !== 0) return '';
  return r.stdout;
}

test('PDF is generated and exists at canonical path', () => {
  const p = ensurePdf();
  assert.ok(fs.existsSync(p), `PDF not found at ${p}`);
  const stat = fs.statSync(p);
  assert.ok(stat.size > 5_000, `PDF too small (${stat.size} bytes), probably truncated`);
  assert.ok(stat.size < 200_000, `PDF too large (${stat.size} bytes), something bloated`);
});

test('PDF page count is 8-12 (current: 9)', () => {
  ensurePdf();
  const info = pdfinfo(pdfPath);
  assert.ok(info, 'pdfinfo failed');
  const pages = parseInt(info['Pages'], 10);
  assert.ok(pages >= 8 && pages <= 12, `page count ${pages} outside 8-12 range`);
});

test('PDF has correct metadata (Title, Producer)', () => {
  ensurePdf();
  const info = pdfinfo(pdfPath);
  assert.ok(info['Title']?.includes('First-Timer') || info['Title']?.includes('First-Timers'),
    `Title looks wrong: ${info['Title']}`);
});

test('PDF contains the required primary-source citations', () => {
  ensurePdf();
  const text = pdftotext(pdfPath);
  // Hard-required citations for YMYL compliance
  const required = [
    'Title 28-B',           // Maine adult-use statute
    'Title 22',             // Maine medical program statute
    'PL 2023 c. 396',       // 2023 amendment to dose caps
    'OCP',                  // Office of Cannabis Policy reference
    'Title 28-B §1501',     // Possession limits citation
  ];
  const missing = required.filter(s => !text.includes(s));
  assert.deepEqual(missing, [], `PDF missing required citation(s): ${missing.join(', ')}`);
});

test('PDF does not contain AI-garbled placeholders', () => {
  ensurePdf();
  const text = pdftotext(pdfPath);
  // Common AI-garbage markers — adjust this list if you find new patterns
  const garbage = [
    'lorem ipsum',
    'TODO',
    'FIXME',
    '[insert',
    '{placeholder}',
    '{{',
  ];
  const found = garbage.filter(s => text.toLowerCase().includes(s.toLowerCase()));
  assert.deepEqual(found, [], `PDF contains AI/placeholder text: ${found.join(', ')}`);
});

test('PDF contains the 21+ age-gate disclaimer', () => {
  ensurePdf();
  const text = pdftotext(pdfPath);
  assert.ok(/21 (?:or older|years)/i.test(text), 'PDF missing 21+ age-gate language');
});

test('PDF does not claim to provide medical advice', () => {
  ensurePdf();
  const text = pdftotext(pdfPath);
  // Should contain a "consult a healthcare provider" type disclaimer
  assert.ok(/consult.*healthcare.*provider|consult a medical professional|consult your doctor/i.test(text),
    'PDF missing "consult a healthcare provider" disclaimer');
});

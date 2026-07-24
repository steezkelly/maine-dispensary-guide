'use strict';

/**
 * scripts/pdf/__tests__/mdg-q3-2026-render.test.cjs
 *
 * Focused regression test for the Q3 2026 PDF render pipeline.
 * Uses spawnSync to run the renderer (matches the existing
 * generate-first-timer-pdf.test.cjs pattern), then validates the
 * output PDF with pdfinfo/pdftotext.
 *
 * Run with: node scripts/pdf/__tests__/mdg-q3-2026-render.test.cjs
 */

const assert = require('node:assert/strict');
const { existsSync, statSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = resolve(__dirname, '..', '..', '..');
const PDF_PATH = resolve(REPO, 'apps/maine-cannabis/public/pdfs/maine-cannabis-industry-report-q3-2026.pdf');
const RENDERER = resolve(REPO, 'scripts/pdf/mdg-q3-2026-render.cjs');

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

function ensurePdf() {
  const r = spawnSync('node', [RENDERER], { cwd: REPO, encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) {
    throw new Error(`renderer failed (exit ${r.status}): ${r.stderr}`);
  }
  return PDF_PATH;
}

function pdfinfo(pdf) {
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

check('PDF exists and has reasonable size', () => {
  ensurePdf();
  assert.ok(existsSync(PDF_PATH), `PDF not found at ${PDF_PATH}`);
  const stat = statSync(PDF_PATH);
  assert.ok(stat.size > 50000, `PDF too small (${stat.size} bytes), probably truncated`);
  assert.ok(stat.size < 5000000, `PDF too large (${stat.size} bytes), something bloated`);
});

check('PDF has >= 8 pages', () => {
  ensurePdf();
  const info = pdfinfo(PDF_PATH);
  assert.ok(info, 'pdfinfo failed');
  const pages = parseInt(info['Pages'], 10);
  assert.ok(pages >= 8, `page count ${pages} is below the 8-section minimum`);
});

check('PDF has correct Title metadata', () => {
  ensurePdf();
  const info = pdfinfo(PDF_PATH);
  assert.ok(info, 'pdfinfo failed');
  assert.ok(
    info['Title'] && info['Title'].includes('Maine Cannabis Industry Report'),
    `Title looks wrong: ${info['Title']}`,
  );
});

check('PDF contains frozen verified figures', () => {
  ensurePdf();
  const text = pdftotext(PDF_PATH);
  const required = [
    '20,688,125',
    '425,839',
    '119,954,243',
    '2,439,812',
    '346',
    '2,744,931',
    '1,097,908',
  ];
  const missing = required.filter((s) => !text.includes(s));
  assert.deepEqual(missing, [], `PDF missing required figure(s): ${missing.join(', ')}`);
});

check('PDF contains source citations', () => {
  ensurePdf();
  const text = pdftotext(PDF_PATH);
  const required = ['OCP', 'MRS', '2026-07-22', 'preliminary'];
  const missing = required.filter((s) => !text.includes(s));
  assert.deepEqual(missing, [], `PDF missing required citation(s): ${missing.join(', ')}`);
});

check('PDF does not contain AI-garbled placeholders', () => {
  ensurePdf();
  const text = pdftotext(PDF_PATH);
  const garbage = ['lorem ipsum', 'TODO', 'FIXME', 'PLACEHOLDER', '{{', '}}'];
  const found = garbage.filter((s) => text.toLowerCase().includes(s.toLowerCase()));
  assert.deepEqual(found, [], `PDF contains garbage marker(s): ${found.join(', ')}`);
});

process.stderr.write('\nmdg-q3-2026-render.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);

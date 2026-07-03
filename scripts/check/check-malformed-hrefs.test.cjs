#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const script = path.resolve(__dirname, 'check-malformed-hrefs.cjs');

function runCheck(root) {
  return spawnSync(process.execPath, [script], {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, HREF_CHECK_ROOT: root },
    encoding: 'utf8',
  });
}

test('flags href="#" placeholders on production pages', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'href-check-'));
  const pages = path.join(tmp, 'src/pages');
  fs.mkdirSync(pages, { recursive: true });
  fs.writeFileSync(path.join(pages, 'index.astro'), '<a href = "#">Broken production CTA</a>\n');

  const result = runCheck(pages);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /placeholder href="#"/);
  assert.match(result.stderr, /index\.astro:1/);
});

test('allows href="#" inside non-production admin pages', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'href-check-'));
  const admin = path.join(tmp, 'src/pages/admin');
  fs.mkdirSync(admin, { recursive: true });
  fs.writeFileSync(path.join(admin, 'seo-dashboard.astro'), '<a href="#">Dashboard tab</a>\n');

  const result = runCheck(path.join(tmp, 'src/pages'));

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

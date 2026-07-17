'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const REPO = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(REPO, 'scripts/admin/regenerate-llms.cjs');

test('regenerator writes every sitemap URL exactly once from a local sitemap file', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-llms-test-'));
  const sitemap = path.join(temp, 'sitemap.xml');
  const output = path.join(temp, 'llms.txt');
  const urls = [
    'https://mainedispensaryguide.com',
    'https://mainedispensaryguide.com/guides',
    'https://mainedispensaryguide.com/resources',
    'https://mainedispensaryguide.com/cite/market-stats',
    'https://mainedispensaryguide.com/embed/opt-in-tracker',
    'https://mainedispensaryguide.com/learn/cannabis-events-2026',
    'https://mainedispensaryguide.com/unclassified-route',
  ];

  fs.writeFileSync(sitemap, `<?xml version="1.0"?><urlset>${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);

  try {
    execFileSync(process.execPath, [SCRIPT, '--from-file', sitemap, '--output', output], { cwd: REPO, stdio: 'pipe' });
    const links = [...fs.readFileSync(output, 'utf8').matchAll(/\((https:\/\/mainedispensaryguide\.com[^)]*)\)/g)].map((match) => match[1]);
    assert.deepEqual(new Set(links), new Set(urls));
    assert.equal(links.length, urls.length);
    assert.match(fs.readFileSync(output, 'utf8'), /## Additional Sitemap Pages/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

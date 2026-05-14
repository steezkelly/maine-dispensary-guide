#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const script = path.resolve(__dirname, 'check-content-health.cjs');

function makePages(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'content-health-'));
  const pages = path.join(tmp, 'src/pages');
  fs.mkdirSync(pages, { recursive: true });
  for (const [relativePath, text] of Object.entries(files)) {
    const fullPath = path.join(pages, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, text);
  }
  const sitemap = path.join(tmp, 'dist/sitemap-0.xml');
  fs.mkdirSync(path.dirname(sitemap), { recursive: true });
  fs.writeFileSync(sitemap, '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>\n');
  return { tmp, pages, sitemap };
}

function runCheck({ pages, sitemap }) {
  return spawnSync(process.execPath, [script], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      CONTENT_HEALTH_ROOT: pages,
      CONTENT_HEALTH_SITEMAP: sitemap,
    },
    encoding: 'utf8',
  });
}

test('flags multiple content regressions in a caller-provided pages root', () => {
  const fixture = makePages({
    'index.astro': '<a href="/missing-guide">Missing guide</a>\n<a href="\\1")>Bad regex href</a>\n',
    'guides/existing.astro': '<a href="/">Home</a>\n',
  });

  const result = runCheck(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /dead internal links: 1 issue/);
  assert.match(result.stdout, /malformed \\1 hrefs: 1 issue/);
  assert.match(result.stdout, /index\.astro:1: dead internal link → \/missing-guide/);
  assert.match(result.stdout, /index\.astro:2: malformed \\1 href/);
});

test('allows admin placeholders while still scanning production pages', () => {
  const fixture = makePages({
    'index.astro': '<a href="/guides/existing">Existing guide</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
    'admin/dashboard.astro': '<a href="#">Dashboard tab</a>\n',
  });

  const result = runCheck(fixture);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All content health checks passed/);
});

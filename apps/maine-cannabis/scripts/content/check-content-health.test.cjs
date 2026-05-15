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
  fs.writeFileSync(path.join(tmp, 'dist/index.html'), '<html><head><title>Fixture</title><meta name="description" content="Fixture page"><meta property="og:image" content="/og-image.svg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head><body><a href="/">Home</a><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></body></html>');
  const publicDir = path.join(tmp, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'og-image.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  return { tmp, pages, sitemap, dist: path.join(tmp, 'dist'), publicDir };
}

function runCheck({ pages, sitemap, dist, publicDir }) {
  return spawnSync(process.execPath, [script], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      CONTENT_HEALTH_ROOT: pages,
      CONTENT_HEALTH_SITEMAP: sitemap,
      CONTENT_HEALTH_DIST: dist,
      CONTENT_HEALTH_PUBLIC: publicDir,
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

test('flags trailing-slash internal route strings because production uses trailingSlash never', () => {
  const fixture = makePages({
    'index.astro': 'const cards = [{ href: "/guides/existing/" }];\n<a href={cards[0].href}>Redirecting guide link</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
  });

  const result = runCheck(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /trailing-slash internal links: 1 issue/);
  assert.match(result.stdout, /index\.astro:1: trailing-slash internal route string → \/guides\/existing\//);
});

test('flags rendered slashful internal links that would redirect', () => {
  const fixture = makePages({
    'index.astro': '<a href={dynamicHref}>Existing guide</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
  });
  const guideDir = path.join(fixture.dist, 'guides/existing');
  fs.mkdirSync(guideDir, { recursive: true });
  fs.writeFileSync(path.join(guideDir, 'index.html'), '<html><head><title>Existing</title><meta name="description" content="Existing guide"><meta property="og:image" content="/og-image.svg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head><body>Existing</body></html>');
  fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<html><head><title>Fixture</title><meta name="description" content="Fixture page"><meta property="og:image" content="/og-image.svg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head><body><a href="/guides/existing/">Existing guide</a></body></html>');

  const result = runCheck(fixture);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /rendered crawl basics: 1 issue/);
  assert.match(result.stdout, /rendered internal link redirects under trailingSlash=never → \/guides\/existing\//);
});

test('ignores query strings when checking dead internal route links in source', () => {
  const fixture = makePages({
    'index.astro': '<a href="/guides/existing?source=home">Existing guide with campaign param</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
  });

  const result = runCheck(fixture);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All content health checks passed/);
});

test('ignores query strings for relative internal route links in source', () => {
  const fixture = makePages({
    'index.astro': '<a href="./guides/existing?source=home">Existing guide with local route param</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
  });

  const result = runCheck(fixture);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All content health checks passed/);
});

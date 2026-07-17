#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const script = path.resolve(__dirname, 'content-health.cjs');

function makePages(files, sourceFiles = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'content-health-'));
  const sourceRoot = path.join(tmp, 'src');
  const pages = path.join(sourceRoot, 'pages');
  fs.mkdirSync(pages, { recursive: true });
  for (const [relativePath, text] of Object.entries(files)) {
    const fullPath = path.join(pages, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, text);
  }
  for (const [relativePath, text] of Object.entries(sourceFiles)) {
    const fullPath = path.join(sourceRoot, relativePath);
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
  return { tmp, sourceRoot, pages, sitemap, dist: path.join(tmp, 'dist'), publicDir };
}

function makeHeroes(publicDir, heroes) {
  const heroesDir = path.join(publicDir, 'images', 'heroes');
  fs.mkdirSync(heroesDir, { recursive: true });
  for (const [filename, content] of Object.entries(heroes)) {
    fs.writeFileSync(path.join(heroesDir, filename), content);
  }
}

function runCheck({ pages, sourceRoot, sitemap, dist, publicDir }, { enableFixtureOrphanCheck = false, args = [] } = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      CONTENT_HEALTH_ROOT: pages,
      CONTENT_HEALTH_SOURCE_ROOT: sourceRoot,
      CONTENT_HEALTH_ENABLE_FIXTURE_ORPHAN_CHECK: enableFixtureOrphanCheck ? '1' : '',
      CONTENT_HEALTH_SITEMAP: sitemap,
      CONTENT_HEALTH_DIST: dist,
      CONTENT_HEALTH_PUBLIC: publicDir,
      CONTENT_HEALTH_SKIP_CSS_BUILD: '1',
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

test('flags duplicate hero image content (same MD5 in 2+ files)', () => {
  const fixture = makePages({
    'index.astro': '<a href="/">Home</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
  });
  // Two files with identical content — should trigger duplicate check
  const identicalJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01]);
  makeHeroes(fixture.publicDir, {
    'town-a-dispensary-guide.jpg': identicalJpeg,
    'town-b-dispensary-guide.jpg': identicalJpeg,
  });

  const result = runCheck(fixture);

  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /duplicate hero image content: 1 issue/);
  assert.match(result.stdout, /shared across 2 files: town-a-dispensary-guide\.jpg, town-b-dispensary-guide\.jpg/);
});

test('passes when hero images are all unique content', () => {
  const fixture = makePages({
    'index.astro': '<a href="/">Home</a>\n',
    'guides/existing.astro': '<p>Existing guide</p>\n',
  });
  // Three files with different content
  makeHeroes(fixture.publicDir, {
    'town-a-dispensary-guide.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xAA, 0xBB]),
    'town-b-dispensary-guide.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xCC, 0xDD]),
    'town-c-dispensary-guide.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xEE, 0xFF]),
  });

  const result = runCheck(fixture);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All content health checks passed/);
});

test('flags OG image dimensions that do not match the actual image file', () => {
  const jpeg1280x720 = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]),
    Buffer.from([(720 >> 8) & 0xff, 720 & 0xff]),
    Buffer.from([(1280 >> 8) & 0xff, 1280 & 0xff]),
    Buffer.from([0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]),
    Buffer.from([0xff, 0xd9]),
  ]);
  const fixture = makePages({
    'index.astro': '<a href="/">Home</a>\\n',
    'guides/existing.astro': '<p>Existing guide</p>\\n',
  });
  makeHeroes(fixture.publicDir, { 'town-a-dispensary-guide.jpg': jpeg1280x720 });
  const wrongMeta = '<html><head><title>Fixture</title><meta name="description" content="x"><meta property="og:image" content="/images/heroes/town-a-dispensary-guide.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="400"></head><body><a href="/">Home</a><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></body></html>';
  fs.writeFileSync(path.join(fixture.dist, 'index.html'), wrongMeta);
  const result = runCheck(fixture);
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /og:image:width=1200 doesn\'t match actual image width 1280/);
  assert.match(result.stdout, /og:image:height=400 doesn\'t match actual image height 720/);
});

test('passes when og:image dimensions match the actual image file', () => {
  const jpeg1200x400 = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]),
    Buffer.from([(400 >> 8) & 0xff, 400 & 0xff]),
    Buffer.from([(1200 >> 8) & 0xff, 1200 & 0xff]),
    Buffer.from([0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]),
    Buffer.from([0xff, 0xd9]),
  ]);
  const fixture = makePages({
    'index.astro': '<a href="/">Home</a>\\n',
    'guides/existing.astro': '<p>Existing guide</p>\\n',
  });
  makeHeroes(fixture.publicDir, { 'town-b-dispensary-guide.jpg': jpeg1200x400 });
  const rightMeta = '<html><head><title>Fixture</title><meta name="description" content="x"><meta property="og:image" content="/images/heroes/town-b-dispensary-guide.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="400"></head><body><a href="/">Home</a><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></body></html>';
  fs.writeFileSync(path.join(fixture.dist, 'index.html'), rightMeta);
  const result = runCheck(fixture);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All content health checks passed/);
});

test('counts a component-only link as inbound without rendered output', () => {
  const fixture = makePages({
    'index.astro': '<a href="/">Home</a>\n',
    'cookies.astro': '<p>Cookies</p>\n',
    'privacy.astro': '<p>Privacy</p>\n',
  }, {
    'components/SiteFooter.astro': '<a href="/cookies">Cookies</a>\n',
  });

  const result = runCheck(fixture, { enableFixtureOrphanCheck: true });

  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /\/cookies: no inbound link from any other page/);
  assert.match(result.stdout, /\/privacy: no inbound link from any other page/);
});

test('parses reversed single-quoted meta attributes for crawl and uniqueness checks', () => {
  const fixture = makePages({
    'index.astro': '<a href="/guides/second">Second</a>\n',
    'guides/second.astro': '<a href="/">Home</a>\n',
  });
  const description = 'A'.repeat(161);
  const html = value => `<html><head><title>Fixture</title><meta content='${value}' name='description'><meta content='website' property='og:type'><meta content='/og-image.svg' property='og:image'><meta content='1200' property='og:image:width'><meta content='630' property='og:image:height'></head><body><a href="/">Home</a><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></body></html>`;
  fs.writeFileSync(path.join(fixture.dist, 'index.html'), html(description));
  fs.mkdirSync(path.join(fixture.dist, 'guides', 'second'), { recursive: true });
  fs.writeFileSync(path.join(fixture.dist, 'guides', 'second', 'index.html'), html(description));

  const result = runCheck(fixture);

  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /meta description too long \(161\)/);
  assert.match(result.stdout, /duplicate description on \/(?:index|guides\/second)/);
});

test('reports a broken later srcset candidate in rendered HTML', () => {
  const fixture = makePages({
    'index.astro': '<a href="/">Home</a>\n',
  });
  fs.mkdirSync(path.join(fixture.publicDir, 'images'), { recursive: true });
  fs.writeFileSync(path.join(fixture.publicDir, 'images', 'present.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(path.join(fixture.dist, 'index.html'), '<html><head><title>Fixture</title><meta name="description" content="Fixture"><meta property="og:image" content="/og-image.svg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head><body><source srcset="/images/present.svg 640w, /images/missing.svg 1280w"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script></body></html>');

  const result = runCheck(fixture);

  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /broken rendered media → \/images\/missing\.svg/);
});

test('rejects mutually exclusive source-only and rendered-only modes before auditing', () => {
  const result = spawnSync(process.execPath, [script, '--source-only', '--rendered-only'], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
  });

  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /Cannot combine --source-only and --rendered-only/);
});

test('source-only rejects a route that exists only in stale sitemap data', () => {
  const fixture = makePages({
    'index.astro': '<a href="/stale-sitemap-route">Stale route</a>\n',
  });
  fs.writeFileSync(fixture.sitemap, '<urlset><url><loc>https://mainedispensaryguide.com/stale-sitemap-route</loc></url></urlset>');

  const result = runCheck(fixture, { args: ['--source-only'] });

  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /dead internal links: 1 issue/);
  assert.match(result.stdout, /dead internal link → \/stale-sitemap-route/);
  assert.doesNotMatch(result.stdout, /rendered crawl basics/);
});

test('rendered-only excludes source checks while retaining rendered checks', () => {
  const fixture = makePages({
    'index.astro': '<a href="#">Source-only violation</a>\n',
  });

  const result = runCheck(fixture, { args: ['--rendered-only'] });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /bare href="#" links/);
  assert.match(result.stdout, /rendered crawl basics: OK/);
});

test('source-only caches each source file read and never reads the sitemap', () => {
  const fixture = makePages({
    'index.astro': '<a href="/guides/existing">Existing</a>\n',
    'guides/existing.astro': '<a href="/">Home</a>\n',
  });
  const readLog = path.join(fixture.tmp, 'read-log.json');
  const hook = path.join(fixture.tmp, 'count-reads.cjs');
  fs.writeFileSync(hook, [
    "const fs = require('node:fs');",
    'const original = fs.readFileSync.bind(fs);',
    'const counts = {};',
    'fs.readFileSync = (file, ...rest) => {',
    '  const name = String(file);',
    "  if (/\\.(astro|html|xml)$/.test(name)) counts[name] = (counts[name] || 0) + 1;",
    '  return original(file, ...rest);',
    '};',
    "process.on('exit', () => fs.writeFileSync(process.env.CONTENT_HEALTH_READ_LOG, JSON.stringify(counts)));",
  ].join('\n'));

  const result = spawnSync(process.execPath, ['--require', hook, script, '--source-only'], {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      CONTENT_HEALTH_ROOT: fixture.pages,
      CONTENT_HEALTH_SOURCE_ROOT: fixture.sourceRoot,
      CONTENT_HEALTH_SITEMAP: fixture.sitemap,
      CONTENT_HEALTH_DIST: fixture.dist,
      CONTENT_HEALTH_PUBLIC: fixture.publicDir,
      CONTENT_HEALTH_SKIP_CSS_BUILD: '1',
      CONTENT_HEALTH_READ_LOG: readLog,
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  const reads = JSON.parse(fs.readFileSync(readLog, 'utf8'));
  assert.equal(reads[path.join(fixture.pages, 'index.astro')], 1);
  assert.equal(reads[path.join(fixture.pages, 'guides/existing.astro')], 1);
  assert.equal(reads[fixture.sitemap], undefined);
});

test('no-build skips CSS preflight while build overrides the environment skip', () => {
  const fixture = makePages({ 'index.astro': '<a href="/">Home</a>\n' });
  const env = {
    ...process.env,
    CONTENT_HEALTH_ROOT: fixture.pages,
    CONTENT_HEALTH_SOURCE_ROOT: fixture.sourceRoot,
    CONTENT_HEALTH_SITEMAP: fixture.sitemap,
    CONTENT_HEALTH_DIST: fixture.dist,
    CONTENT_HEALTH_PUBLIC: fixture.publicDir,
    CONTENT_HEALTH_SKIP_CSS_BUILD: '1',
    PATH: '',
  };

  const noBuild = spawnSync(process.execPath, [script, '--rendered-only', '--no-build'], { cwd: path.resolve(__dirname, '../..'), env, encoding: 'utf8' });
  assert.equal(noBuild.status, 0, noBuild.stdout + noBuild.stderr);
  assert.match(noBuild.stdout, /CSS build warnings: OK/);

  const build = spawnSync(process.execPath, [script, '--rendered-only', '--build'], { cwd: path.resolve(__dirname, '../..'), env, encoding: 'utf8' });
  assert.notEqual(build.status, 0, build.stdout + build.stderr);
  assert.match(build.stdout, /CSS build warnings: 1 issue/);
  assert.match(build.stdout, /build failed while scanning CSS warnings/);
});

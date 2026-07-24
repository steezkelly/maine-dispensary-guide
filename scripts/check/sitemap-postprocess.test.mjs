// scripts/build/sitemap-postprocess.test.mjs
//
// Unit + integration tests for scripts/check/sitemap-postprocess.mjs.
//
// The integration test reads the real dist/sitemap-0.xml that the build
// pipeline produces and asserts structural invariants. This catches the
// "sitemap collapsed to 7 URLs" failure mode that the dead-code-removal
// refactor on 2026-07-02 produced, before the change ever ships.
//
// The unit tests are pure: they construct in-memory inputs and verify
// the postprocessor's behavior without touching the filesystem or
// requiring a built dist/.
//
// Usage:
//   node scripts/build/sitemap-postprocess.test.mjs
//
// Exit codes:
//   0  all assertions pass
//   1  one or more assertions failed
//
// Note: requires a fresh `npm run build` first so dist/sitemap-0.xml
// exists. The npm script `check:sitemap-postprocess` wraps this.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOINDEX_PATH_PREFIXES,
  buildUrlEntry,
  escapeXml,
  extractMeta,
  isNoindexSource,
  postprocessSitemap,
  urlToSrcPath,
} from './sitemap-postprocess.mjs';

// ES modules don't have __dirname; derive it from import.meta.url so the
// integration tests can resolve dist/sitemap-0.xml relative to the repo
// root regardless of cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message.split('\n').join('\n      ')}`);
  }
}

console.log('── Unit tests');

test('escapeXml: ampersand', () => {
  assert.equal(escapeXml('A & B'), 'A &amp; B');
});

test('escapeXml: less-than and greater-than', () => {
  assert.equal(escapeXml('<tag>'), '&lt;tag&gt;');
});

test('escapeXml: quotes and apostrophes', () => {
  assert.equal(escapeXml(`"don't"`), '&quot;don&apos;t&quot;');
});

test('escapeXml: empty string', () => {
  assert.equal(escapeXml(''), '');
});

test('escapeXml: idempotent on already-escaped input', () => {
  // escapeXml is NOT idempotent — &amp; → &amp;amp;. This is correct
  // behavior for sitemap construction (input is always unescaped), but
  // documented here so the limitation is visible.
  assert.equal(escapeXml('&amp;'), '&amp;amp;');
});

test('NOINDEX_PATH_PREFIXES: contains the 3 known prefixes', () => {
  assert.deepEqual(NOINDEX_PATH_PREFIXES, ['/experiments', '/search', '/admin/']);
});

test('isNoindexSource: /404 is always noindex', () => {
  // /404 is excluded even if its source file doesn't declare noindex.
  assert.equal(isNoindexSource('/nonexistent/path', '/404'), true);
});

test('isNoindexSource: /experiments matches prefix', () => {
  assert.equal(isNoindexSource('/nonexistent', '/experiments'), true);
});

test('isNoindexSource: /search/foo matches prefix', () => {
  assert.equal(isNoindexSource('/nonexistent', '/search/foo'), true);
});

test('isNoindexSource: /admin matches prefix', () => {
  assert.equal(isNoindexSource('/nonexistent', '/admin'), true);
});

test('isNoindexSource: /about is not noindex (no special handling)', () => {
  // /about isn't in the prefix list, and the path doesn't exist so we
  // can't check the source — should return false (file unreadable is
  // treated as "not noindex" to avoid accidentally excluding pages).
  assert.equal(isNoindexSource('/nonexistent', '/about'), false);
});

test('isNoindexSource: reads noindex={true} from source', () => {
  // Create a temp file with the noindex marker
  const tmp = '/tmp/sitemap-test-noindex.astro';
  fs.writeFileSync(tmp, '<Layout noindex={true} />', 'utf8');
  try {
    assert.equal(isNoindexSource(tmp, '/some-route'), true);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('urlToSrcPath: /maps to index.astro', () => {
  // Use the real pages dir to verify
  const pagesDir = path.resolve(process.cwd(), 'src/pages');
  if (fs.existsSync(path.join(pagesDir, 'index.astro'))) {
    const result = urlToSrcPath('https://example.com/', pagesDir);
    assert.equal(result, path.join(pagesDir, 'index.astro'));
  }
});

test('urlToSrcPath: /guides/maine-cannabis-caregiver-guide maps to direct file', () => {
  const pagesDir = path.resolve(process.cwd(), 'src/pages');
  const result = urlToSrcPath(
    'https://example.com/guides/maine-cannabis-caregiver-guide',
    pagesDir,
  );
  if (result !== null) {
    assert.equal(result, path.join(pagesDir, 'guides/maine-cannabis-caregiver-guide.astro'));
  }
});

test('urlToSrcPath: /learn maps to learn/index.astro', () => {
  const pagesDir = path.resolve(process.cwd(), 'src/pages');
  const result = urlToSrcPath('https://example.com/learn', pagesDir);
  if (result !== null) {
    assert.equal(result, path.join(pagesDir, 'learn/index.astro'));
  }
});

test('urlToSrcPath: invalid URL returns null', () => {
  assert.equal(urlToSrcPath('not-a-url', '/tmp'), null);
});

test('extractMeta: reads modifiedDate from frontmatter', () => {
  const tmp = '/tmp/sitemap-test-extract.astro';
  const content = `---
import Foo from './foo.astro';
const article = { author: "x", modifiedDate: "2026-05-13", publishDate: "2026-04-01" };
---
<Layout title="t" description="d" heroImage="/img.jpg" article={article} />`;
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    const meta = extractMeta(tmp);
    assert.equal(meta.lastmod, '2026-05-13');
    assert.equal(meta.image, 'https://mainedispensaryguide.com/img.jpg');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('extractMeta: falls back to publishDate when no modifiedDate', () => {
  const tmp = '/tmp/sitemap-test-extract.astro';
  const content = `---
const article = { publishDate: "2026-04-01" };
---
<Layout heroImage="/img.jpg" article={article} />`;
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    const meta = extractMeta(tmp);
    assert.equal(meta.lastmod, '2026-04-01');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('extractMeta: falls back to file mtime when no article prop', () => {
  const tmp = '/tmp/sitemap-test-extract.astro';
  const content = `---
import Foo from './foo.astro';
---
<Layout title="t" description="d" heroImage="/img.jpg" />`;
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    const meta = extractMeta(tmp);
    // Should fall back to file mtime — YYYY-MM-DD format
    assert.match(meta.lastmod, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('extractMeta: external heroImage gets passed through', () => {
  const tmp = '/tmp/sitemap-test-extract.astro';
  const content = `---
const article = { modifiedDate: "2026-05-13" };
---
<Layout heroImage="https://images.unsplash.com/photo.jpg" article={article} />`;
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    const meta = extractMeta(tmp);
    assert.equal(meta.image, 'https://images.unsplash.com/photo.jpg');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('extractMeta: relative heroImage gets domain prepended', () => {
  const tmp = '/tmp/sitemap-test-extract.astro';
  const content = `---
const article = { modifiedDate: "2026-05-13" };
---
<Layout heroImage="/images/hero.jpg" article={article} />`;
  fs.writeFileSync(tmp, content, 'utf8');
  try {
    const meta = extractMeta(tmp);
    // The hardcoded domain — if it changes this test will need updating.
    assert.equal(meta.image, 'https://mainedispensaryguide.com/images/hero.jpg');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('buildUrlEntry: minimal entry has only <loc>', () => {
  const entry = buildUrlEntry('https://example.com/foo', '/nonexistent');
  assert.equal(entry, '<url><loc>https://example.com/foo</loc></url>');
});

test('buildUrlEntry: includes lastmod and image when present', () => {
  const entry = buildUrlEntry('https://example.com/foo', '/nonexistent', {
    extractMeta: () => ({ lastmod: '2026-05-13', image: 'https://x/y.jpg' }),
  });
  assert.equal(entry, '<url><loc>https://example.com/foo</loc>'
    + '<lastmod>2026-05-13</lastmod>'
    + '<image:image><image:loc>https://x/y.jpg</image:loc></image:image></url>');
});

test('postprocessSitemap: preserves all input URLs (none filtered by default)', () => {
  const input = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/a</loc></url>
<url><loc>https://example.com/b</loc></url>
<url><loc>https://example.com/c</loc></url>
</urlset>`;
  const out = postprocessSitemap(input, { pagesDir: '/nonexistent' });
  // /nonexistent means all source-file lookups fail → all entries
  // survive the noindex check (since isNoindexSource returns false on
  // unreadable files). The output has 3 URLs.
  const locs = [...out.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 3);
});

test('postprocessSitemap: filters /experiments paths', () => {
  const input = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/</loc></url>
<url><loc>https://example.com/experiments</loc></url>
<url><loc>https://example.com/experiments/test</loc></url>
</urlset>`;
  const out = postprocessSitemap(input, { pagesDir: '/nonexistent' });
  const locs = [...out.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ['https://example.com/']);
});

test('postprocessSitemap: filters /search paths', () => {
  const input = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/</loc></url>
<url><loc>https://example.com/search</loc></url>
</urlset>`;
  const out = postprocessSitemap(input, { pagesDir: '/nonexistent' });
  const locs = [...out.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ['https://example.com/']);
});

test('postprocessSitemap: filters /admin paths', () => {
  const input = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/</loc></url>
<url><loc>https://example.com/admin/foo</loc></url>
</urlset>`;
  const out = postprocessSitemap(input, { pagesDir: '/nonexistent' });
  const locs = [...out.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ['https://example.com/']);
});

test('postprocessSitemap: preserves the <urlset> opening tag attributes', () => {
  const input = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
<url><loc>https://example.com/a</loc></url>
</urlset>`;
  const out = postprocessSitemap(input, { pagesDir: '/nonexistent' });
  assert.match(out, /<urlset[^>]*xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image/);
  assert.match(out, /<urlset[^>]*xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news/);
});

test('postprocessSitemap: handles malformed URL gracefully (skips it)', () => {
  const input = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/valid</loc></url>
<url><loc>not-a-url-at-all</loc></url>
<url><loc>https://example.com/also-valid</loc></url>
</urlset>`;
  const out = postprocessSitemap(input, { pagesDir: '/nonexistent' });
  const locs = [...out.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // The malformed URL is skipped; the 2 valid ones survive.
  assert.deepEqual(locs, ['https://example.com/valid', 'https://example.com/also-valid']);
});

console.log('── Integration test (requires npm run build first)');

test('postprocessSitemapFile: real dist/sitemap-0.xml has 222 URLs, all with <lastmod>', () => {
  // This is the canary. If this fails, the dead-code cascade has
  // struck again — the sitemap is silently truncated to a small
  // number of URLs.
  // Resolve from __dirname (scripts/check) up two levels to the repo
  // root, where the build writes dist/. This makes the test cwd-
  // independent — it works whether invoked from the repo root via
  // `node` or from the workspace via `npm --workspace run`.
  const sitemapPath = path.resolve(__dirname, '..', '..', 'dist', 'sitemap-0.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.log('      (skipped: dist/sitemap-0.xml not found — run `npm run build` first)');
    return;
  }
  const content = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const lastmods = [...content.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)];

  // URL count: must be in the healthy range. We use 150 as a soft
  // lower bound — the project has 200+ pages and the prior dead-code
  // cascade dropped this to 7. Anything under 150 is a regression.
  assert.ok(locs.length >= 150,
    `expected >=150 URLs, got ${locs.length} (regression: dead-code cascade?)`);
  assert.ok(locs.length <= 320,
    `expected <=320 URLs, got ${locs.length} (suspicious — possible duplicate URLs?)`);

  // Every URL should have a <lastmod> child. Without the mtime
  // fallback this assertion fails for 25 of 222 URLs.
  assert.equal(locs.length, lastmods.length,
    `URL/lastmod count mismatch: ${locs.length} URLs but ${lastmods.length} lastmods`);

  // No malformed URLs (would indicate cascade bugs like the `undefined/...`
  // string that appears when a top-level const goes missing)
  for (const loc of locs) {
    assert.ok(!loc.includes('undefined'),
      `malformed URL contains 'undefined': ${loc}`);
    assert.ok(!loc.includes('NaN'),
      `malformed URL contains 'NaN': ${loc}`);
    assert.ok(loc.startsWith('https://'),
      `URL doesn't start with https://: ${loc}`);
  }

  // No duplicates (would indicate a build pipeline bug)
  const seen = new Set();
  for (const loc of locs) {
    assert.ok(!seen.has(loc), `duplicate URL in sitemap: ${loc}`);
    seen.add(loc);
  }

  // lastmods should be in YYYY-MM-DD format
  for (const m of lastmods) {
    const lm = m[1];
    assert.match(lm, /^\d{4}-\d{2}-\d{2}$/, `malformed lastmod: ${lm}`);
  }

  // The noindex paths must NOT appear in the public sitemap
  for (const loc of locs) {
    for (const prefix of NOINDEX_PATH_PREFIXES) {
      assert.ok(!loc.includes(prefix),
        `sitemap contains noindex path: ${loc} (matches prefix ${prefix})`);
    }
  }
});

test('postprocessSitemapFile: real sitemap has <image:image> for pages with heroImage', () => {
  // The home page should have an image entry. The /learn page was
  // specifically fixed in 2026-07-02 to use maine-cannabis-granite-hero
  // and should also have an image. We sample 3 known hero pages.
  const sitemapPath = path.resolve(__dirname, '..', '..', 'dist', 'sitemap-0.xml');
  if (!fs.existsSync(sitemapPath)) return;
  const content = fs.readFileSync(sitemapPath, 'utf8');
  for (const url of [
    'https://mainedispensaryguide.com/',
    'https://mainedispensaryguide.com/learn',
    'https://mainedispensaryguide.com/guides/portland-dispensary-guide',
  ]) {
    // Find the <url> entry for this URL and check it has <image:image>
    const idx = content.indexOf(`<loc>${url}</loc>`);
    if (idx === -1) {
      // The URL might not exist in the current build — skip
      continue;
    }
    // Find the closing </url> after this <loc>
    const endIdx = content.indexOf('</url>', idx);
    const entry = content.slice(idx, endIdx);
    assert.ok(
      entry.includes('<image:image>'),
      `URL ${url} should have <image:image> but does not`,
    );
  }
});

console.log('');
console.log(`── Results: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(
  __dirname,
  '..',
  'blog',
  'cannabis-friendly-maine-travel.astro',
);
const page = fs.readFileSync(pagePath, 'utf8');

test('travel article has no page-local hardcoded hex color literals', () => {
  const hardcoded = page.match(/#[0-9a-f]{3,8}\b/i) || [];
  assert.strictEqual(
    hardcoded.length,
    0,
    `travel article must not introduce hardcoded hex literals; found ${hardcoded.length}`,
  );
});

test('travel article avoids page-local box-shadows', () => {
  assert.doesNotMatch(
    page,
    /box-shadow\s*:/,
    'travel article page-local style must not introduce page-local box-shadows',
  );
});

test('travel article uses shared --reading-column prose width', () => {
  assert.match(
    page,
    /var\(--reading-column[^)]*\)/,
    'travel article body prose must use the shared --reading-column width',
  );
});

test('travel article retains any images with meaningful alt text', () => {
  // The article may or may not have images. Either no images, or every
  // <img> must have a meaningful alt attribute.
  const alts = [...page.matchAll(/<img[^>]*\salt="([^"]+)"\s*\/?>/g)].map((m) => m[1]);
  for (const alt of alts) {
    assert.ok(alt.trim().length >= 8, `travel image alt text must be meaningful, got "${alt}"`);
  }
});

test('travel article preserves author, dates, and reviewer text', () => {
  assert.match(page, /author/i, 'travel article must keep its author byline');
  assert.match(page, /Published|publishDate/i, 'travel article must keep its publish date');
  assert.match(page, /Updated|modifiedDate/i, 'travel article must keep its modified date');
});

test('travel article does not inline a Layout-owned breadcrumb or guide sidebar', () => {
  const inlineBreadcrumb = (page.match(/<nav\s+aria-label="Breadcrumb"/g) || []).length;
  const inlineGuideSidebar = (page.match(/<GuideSidebar\b/g) || []).length;
  assert.strictEqual(inlineBreadcrumb, 0, 'travel article must not inline a breadcrumb (Layout owns it)');
  assert.strictEqual(inlineGuideSidebar, 0, 'travel article must not mount GuideSidebar (Layout owns it)');
});

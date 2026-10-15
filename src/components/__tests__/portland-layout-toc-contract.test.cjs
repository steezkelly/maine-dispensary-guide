const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const layoutPath = path.join(root, 'apps/maine-cannabis/src/layouts/Layout.astro');
const portlandPath = path.join(root, 'apps/maine-cannabis/src/pages/guides/portland-dispensary-guide.astro');

const layout = fs.readFileSync(layoutPath, 'utf8');
const portland = fs.readFileSync(portlandPath, 'utf8');

test('Layout accepts a toc prop and renders a single OnThisPage inside the sidebar column', () => {
  assert.match(layout, /toc\?:\s*TocItem\[\]/, 'Layout frontmatter must declare toc?: TocItem[]');
  assert.match(layout, /toc\s*=\s*\[\]/, 'Layout must destructure toc with a safe default of []');
  assert.match(
    layout,
    /\{[\s\S]*?toc\.length\s*>\s*0[\s\S]*?&&[\s\S]*?<OnThisPage[\s\S]*?headings=\{\s*toc\s*\}\s*\/>/,
    'Layout must render <OnThisPage headings={toc} /> only when toc has entries',
  );
});

test('Layout does not leak the legacy per-page OnThisPage mount requirement', () => {
  // The previous hand-mount pattern is fine for old content; the new contract
  // still allows it (the page can opt in to either approach) but the canonical
  // prose is now: pass toc to Layout, not mount OnThisPage directly.
  // We assert only that the OnThisPage import is local to Layout so pages
  // can rely on Layout being the single source of truth.
  assert.match(layout, /import OnThisPage/, 'Layout must own the OnThisPage import');
});

test('Portland guide passes its TOC inventory through the Layout toc prop, not a page-level OnThisPage', () => {
  assert.match(
    portland,
    /const\s+portlandToc\s*=\s*\[/,
    'Portland must declare a portlandToc array that the Layout receives as toc',
  );
  assert.match(
    portland,
    /<Layout\b[\s\S]*?toc=\{portlandToc\}[\s\S]*?>/,
    'Portland must pass toc={portlandToc} to <Layout>',
  );
  assert.doesNotMatch(
    portland,
    /<OnThisPage\b/,
    'Portland must not mount OnThisPage directly; the Layout owns the TOC',
  );
});

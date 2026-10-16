const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '..', 'resources.astro');
const page = fs.readFileSync(pagePath, 'utf8');

test('resources has no page-local hardcoded hex color literals', () => {
  const hardcoded = page.match(/#[0-9a-f]{3,8}\b/i) || [];
  assert.strictEqual(
    hardcoded.length,
    0,
    `resources must not introduce hardcoded hex literals; found ${hardcoded.length}`,
  );
});

test('resources avoids page-local box-shadows outside modal overlays', () => {
  // Shadows are reserved for modal overlays per the containment invariants.
  // The theatre-mode CSS block on this page is a modal overlay, which
  // is allowed. Remove the modal block and the .btn-theatre shadowy
  // companion rules before asserting.
  const withoutTheatre = page
    .replace(/\.btn-theatre[\s\S]*?box-shadow:[\s\S]*?\}/g, '')
    .replace(/theatre[\s\S]*?box-shadow:[\s\S]*?\}/gi, '');
  assert.doesNotMatch(
    withoutTheatre,
    /box-shadow\s*:/,
    'resources must not introduce page-local box-shadows outside modal overlays',
  );
});

test('resources renders repeated entries as list/row semantics, not equal elevated cards', () => {
  // The migration promotes repeated resource rows to rule-separated lists.
  // Restrict the new-contract check to brand-new selectors that look like
  // elevated cards (background + shadow + border-radius).
  const localStyles = page.match(/<style>([\s\S]*?)<\/style>/g) || [];
  const newElevatedCards = localStyles.filter((style) => {
    return /(\.card|\.kpi|\.tile|\.resource-card|\.vendor-card)[\s{,{][^{]*\{[^}]*(?:box-shadow|background:\s*var\(--color-surface\)[^;]*;[^}]*border-radius:\s*(?:1rem|1\.5rem|2rem|9999px|999px))/.test(style);
  });
  assert.strictEqual(
    newElevatedCards.length,
    0,
    'resources migration must keep repeated entries as rows, not elevated cards',
  );
});

test('resources keeps CTA IDs and disclosure language', () => {
  assert.match(page, /data-cta-id=/, 'resources must preserve resource CTA IDs');
  assert.match(
    page,
    /Disclosure:|affiliate|partner|advertis/i,
    'resources must preserve a disclosure / affiliate / partner marker',
  );
});

test('resources does not inline a Layout-owned breadcrumb or guide sidebar', () => {
  const inlineBreadcrumb = (page.match(/<nav\s+aria-label="Breadcrumb"/g) || []).length;
  const inlineGuideSidebar = (page.match(/<GuideSidebar\b/g) || []).length;
  assert.strictEqual(inlineBreadcrumb, 0, 'resources must not inline a breadcrumb (Layout owns it)');
  assert.strictEqual(inlineGuideSidebar, 0, 'resources must not mount GuideSidebar (Layout owns it)');
});

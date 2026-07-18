const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const pagePath = path.join(root, 'apps/maine-cannabis/src/pages/market-stats.astro');
const page = fs.readFileSync(pagePath, 'utf8');

test('market-stats has no page-local hardcoded hex color literals', () => {
  const hardcoded = page.match(/#[0-9a-f]{3,8}\b/i) || [];
  assert.strictEqual(
    hardcoded.length,
    0,
    `market-stats must not introduce hardcoded hex literals; found ${hardcoded.length}`,
  );
});

test('market-stats avoids page-local box-shadows', () => {
  assert.doesNotMatch(
    page,
    /box-shadow\s*:/,
    'market-stats page-local style must not introduce page-local box-shadows',
  );
});

test('market-stats uses rule-separated stat rows, not elevated cards', () => {
  // The migration promotes stat rows to rules; the new contract forbids
  // adding new elevated card chrome selectors.
  const localStyles = page.match(/<style>([\s\S]*?)<\/style>/g) || [];
  const newElevatedStatCards = localStyles.filter((style) => {
    return /(\.stat[\w-]*|\.card|\.kpi|\.metric)[\s,{][^{]*\{[^}]*(?:box-shadow|background:\s*var\(--color-surface\)[^;]*;[^}]*border)/.test(style);
  });
  assert.strictEqual(
    newElevatedStatCards.length,
    0,
    'market-stats must keep stat rows rule-separated; do not add new elevated stat cards',
  );
});

test('market-stats preserves source-backed provenance and date markers', () => {
  // Preserve at least one each of the OCP source URL, a "Last updated"
  // marker, and a citation/figure caption string.
  assert.match(page, /maine\.gov/i, 'market-stats must retain the OCP / Maine.gov source URL');
  assert.match(page, /last[\s_-]?updated/i, 'market-stats must retain a Last-updated marker');
  assert.match(page, /<figcaption|Source:\s/i, 'market-stats must retain a captioned source reference');
});

test('market-stats does not inline a Layout-owned breadcrumb or guide sidebar', () => {
  const inlineBreadcrumb = (page.match(/<nav\s+aria-label="Breadcrumb"/g) || []).length;
  const inlineGuideSidebar = (page.match(/<GuideSidebar\b/g) || []).length;
  assert.strictEqual(inlineBreadcrumb, 0, 'market-stats must not inline a breadcrumb (Layout owns it)');
  assert.strictEqual(inlineGuideSidebar, 0, 'market-stats must not mount GuideSidebar (Layout owns it)');
});

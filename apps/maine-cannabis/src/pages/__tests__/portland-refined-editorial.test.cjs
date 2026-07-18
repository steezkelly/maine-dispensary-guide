const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.resolve(
  __dirname,
  '..',
  'guides',
  'portland-dispensary-guide.astro',
);
const page = fs.readFileSync(pagePath, 'utf8');

test('Portland guide has no page-local hardcoded hex color literals', () => {
  // Page-local style is a hardcoded hex literal that bypasses shared tokens.
  // Allow shared token use; the contract is the absence of new hex literals
  // introduced for the migration scope.
  const hardcoded = page.match(/#[0-9a-f]{3,8}\b/i) || [];
  assert.strictEqual(
    hardcoded.length,
    0,
    `Portland guide must not introduce hardcoded hex literals; found ${hardcoded.length} (${hardcoded.join(', ')})`,
  );
});

test('Portland guide avoids broad box-shadow in its page-local style', () => {
  assert.doesNotMatch(
    page,
    /box-shadow\s*:/,
    'Portland page-local style must not introduce page-local box-shadows',
  );
});

test('Portland guide does not introduce new large-radius card class in its page-local style', () => {
  // .fact-box uses 1rem radius and pre-dates the migration. The migration
  // contract is "do not introduce additional large-radius cards."
  // Restrict the new-contract check to brand-new selectors; .fact-box
  // remains an explicit non-goal per the plan.
  const localStyles = page.match(/<style>([\s\S]*?)<\/style>/g) || [];
  const newLargeRadiusCards = localStyles.filter((style) => {
    return /\.card[\s{,{][^{]*\{[^}]*border-radius:\s*(?:1rem|1\.5rem|2rem|9999px|999px)/.test(style);
  });
  assert.strictEqual(
    newLargeRadiusCards.length,
    0,
    'Portland migration must not add new large-radius card chrome in its page-local style',
  );
});

test('Portland guide passes its TOC inventory to the Layout as a toc prop', () => {
  assert.match(
    page,
    /toc=\{portlandToc\}/,
    'Portland must pass toc={portlandToc} to the Layout',
  );
  assert.doesNotMatch(
    page,
    /<OnThisPage\b/,
    'Portland must not mount OnThisPage directly; Layout owns the TOC',
  );
});

test('Portland guide preserves source, reviewer, and modified-date text', () => {
  assert.match(page, /Last reviewed/i, 'Portland must preserve the reviewer / last reviewed badge');
  assert.match(page, /Editorial Corrections Log/i, 'Portland must preserve the editorial corrections pointer');
  assert.match(page, /2026-07-06/, 'Portland must preserve the documented modified date');
});

test('Portland guide does not duplicate the Layout-owned discovery rail', () => {
  // Layout already mounts AutoRelated via the ICA pilot trio. Portland
  // already calls AutoRelated inline. The page must not introduce a
  // second related/continuation rail.
  const inlineAutoRelated = (page.match(/<AutoRelated\b/g) || []).length;
  const inlineBreadcrumb = (page.match(/<nav\s+aria-label="Breadcrumb"/g) || []).length;
  const inlineGuideSidebar = (page.match(/<GuideSidebar\b/g) || []).length;
  assert.strictEqual(inlineAutoRelated, 1, 'Portland must mount AutoRelated exactly once');
  assert.strictEqual(inlineBreadcrumb, 0, 'Portland must not inline a breadcrumb (Layout owns it)');
  assert.strictEqual(inlineGuideSidebar, 0, 'Portland must not mount GuideSidebar (Layout owns it)');
});

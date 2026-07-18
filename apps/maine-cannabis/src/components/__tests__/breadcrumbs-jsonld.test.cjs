const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const proofPages = [
  'apps/maine-cannabis/src/pages/guides/portland-dispensary-guide.astro',
  'apps/maine-cannabis/src/pages/market-stats.astro',
  'apps/maine-cannabis/src/pages/resources.astro',
  'apps/maine-cannabis/src/pages/blog/cannabis-friendly-maine-travel.astro',
];
const layoutPath = path.join(root, 'apps/maine-cannabis/src/layouts/Layout.astro');
const componentsBreadcrumbs = path.join(root, 'packages/ui/src/components/Breadcrumbs.astro');

const layout = fs.readFileSync(layoutPath, 'utf8');
const breadcrumbs = fs.readFileSync(componentsBreadcrumbs, 'utf8');

const proofBuiltPaths = [
  'dist/guides/portland-dispensary-guide/index.html',
  'dist/market-stats/index.html',
  'dist/resources/index.html',
  'dist/blog/cannabis-friendly-maine-travel/index.html',
];

test('Layout owns the BreadcrumbList JSON-LD and emits it once per page', () => {
  assert.match(
    layout,
    /['"]@type['"]:\s*['"]BreadcrumbList['"]/,
    'Layout must own the BreadcrumbList JSON-LD',
  );
});

test('component Breadcrumbs renders a visual nav with the current page as plain text', () => {
  assert.match(breadcrumbs, /<nav\s+aria-label="Breadcrumb"[^>]*class="breadcrumbs">/);
  assert.match(breadcrumbs, /aria-current="page"/, 'current crumb must carry aria-current="page"');
  assert.match(breadcrumbs, /<span class="current"[^>]*>/, 'current crumb must be a span (not a self-link)');
});

for (const proofPage of proofPages) {
  test(`${proofPage} does not duplicate the breadcrumb — Layout owns the render`, () => {
    const page = fs.readFileSync(path.join(root, proofPage), 'utf8');
    assert.doesNotMatch(
      page,
      /<nav\s+aria-label="Breadcrumb"[^>]*class="breadcrumbs">/,
      `${proofPage} must not inline a second breadcrumb nav; Layout owns it`,
    );
    assert.doesNotMatch(
      page,
      /"@type":\s*"BreadcrumbList"/,
      `${proofPage} must not inline a second BreadcrumbList JSON-LD; Layout owns it`,
    );
  });
}

for (const builtPath of proofBuiltPaths) {
  test(`built ${builtPath} emits exactly one BreadcrumbList JSON-LD block`, () => {
    const built = fs.readFileSync(path.join(root, builtPath), 'utf8');
    const matches = built.match(/"@type":\s*"BreadcrumbList"/g) || [];
    assert.strictEqual(matches.length, 1, `${builtPath} must have exactly one BreadcrumbList (saw ${matches.length})`);
  });
}

test('all four built proof pages render exactly one visual breadcrumb nav', () => {
  for (const builtPath of proofBuiltPaths) {
    const built = fs.readFileSync(path.join(root, builtPath), 'utf8');
    const matches = built.match(/<nav\s+aria-label="Breadcrumb"/g) || [];
    assert.strictEqual(matches.length, 1, `${builtPath} must have exactly one <Breadcrumb> nav (saw ${matches.length})`);
  }
});

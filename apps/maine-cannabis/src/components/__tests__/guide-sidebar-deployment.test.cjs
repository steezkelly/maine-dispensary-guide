// Task 8 — GuideSidebar deployment regression test.
//
// Per spec §17.6 ticket #7 — GuideSidebar renders dynamic sibling links
// (Portland → other Cumberland County guides; travel blog → operator guides).
//
// Tests capture the actual deployment state. Per rollout plan + the Phase 2
// cross-agent reality audit (2026-07-14), the state is:
//
//   - Portland guide (a guide path): GuideSidebar renders via Layout.astro's
//     {isGuide ? (sidebar layout) : (legacy)} ternary at line ~498.
//   - Travel blog (/blog/cannabis-friendly-maine-travel): Layout's `isGuide`
//     filter excludes blog paths; the GuideSidebar does NOT render there.
//     Adding GuideSidebar to a blog page requires either (a) a Layout change
//     or (b) a page-level mount. Both are scoped beyond the rollout-plan's
//     Task 8 ("deploy GuideSidebar on Portland + one blog post"). That
//     architectural gap is captured as ⚠️ Cannot-verify below and logged
//     in the spec/ledger for a Phase 3 ticket.
//
// These tests are read-only against source files. No dev server, no network,
// no mutation.

const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PORTLAND = resolve(
  __dirname,
  '..', '..',
  'pages/guides/portland-dispensary-guide.astro',
);
const TRAVEL = resolve(
  __dirname,
  '..', '..',
  'pages/blog/cannabis-friendly-maine-travel.astro',
);
const SIDEBAR = resolve(
  __dirname,
  '..', '..', '..', '..', '..',
  'packages/ui/src/components/GuideSidebar.astro',
);
const LAYOUT = resolve(
  __dirname,
  '..', '..',
  'layouts/Layout.astro',
);

// ───── PORTLAND DEPLOYMENT (real) ─────

test('Portland guide has GuideSidebar mounted via Layout (not hand-rolled)', () => {
  // Layout.astro auto-renders GuideSidebar at line ~554 inside the
  // {isGuide ? ...} conditional. Portland's URL path /guides/portland-...
  // makes `isGuide` truthy, so the sidebar auto-mounts. A page-level import
  // would duplicate the render. Assert the page does NOT carry a hand-rolled
  // mount (auto-deployment) AND the Layout wires it.
  const portlandSrc = readFileSync(PORTLAND, 'utf8');
  const layoutSrc = readFileSync(LAYOUT, 'utf8');

  assert.doesNotMatch(
    portlandSrc,
    /<GuideSidebar\b/,
    'Portland guide should NOT hand-roll <GuideSidebar/> — Layout provides it',
  );
  assert.match(
    layoutSrc,
    /<GuideSidebar\b/,
    'Layout.astro should mount <GuideSidebar/> for guide paths',
  );
  assert.match(
    layoutSrc,
    /guide-sidebar-container/,
    'Layout.astro should wrap GuideSidebar in guide-sidebar-container',
  );
});

test('Portland guide passes the right data (article + topics) for sibling derivation', () => {
  // §17.6 #7 expects Portland to surface Cumberland County guides.
  // The data flow that drives this is: page passes `topics={['city', 'market']}`
  // → Layout passes it to GuideSidebar as `currentTopics` → GuideSidebar
  // filters its `allGuides[]` registry by topic match (calculateScore()).
  const portlandSrc = readFileSync(PORTLAND, 'utf8');
  assert.match(
    portlandSrc,
    /topics=\{?\[?\s*["']city["']\s*,\s*["']market["']\]?\}?/,
    'Portland guide should pass topics=["city","market"] (city + market)',
  );
});

test('GuideSidebar data registry includes the 16 expected city guides', () => {
  // Lock in the registry contents so a future edit that drops or renames
  // a city guide fails loudly.
  const sidebarSrc = readFileSync(SIDEBAR, 'utf8');
  const expectedCities = [
    'portland', 'bangor', 'lewiston', 'south-portland', 'augusta',
    'biddeford', 'auburn', 'brunswick', 'saco', 'sanford', 'scarborough',
    'waterville', 'westbrook', 'old-orchard-beach', 'kittery',
  ];
  for (const slug of expectedCities) {
    assert.match(
      sidebarSrc,
      new RegExp(`/guides/${slug}-dispensary-guide`),
      `GuideSidebar registry should include /guides/${slug}-dispensary-guide`,
    );
  }
});

test('GuideSidebar uses Phase 1 token layer (no fabricated hardcoded hex)', () => {
  const sidebarSrc = readFileSync(SIDEBAR, 'utf8');
  // Phase 1 + Task M1 discipline: components should reference tokens
  // rather than hand-rolled hex values. Confirm at least 4 token uses
  // for the visual surface (rule, primary, accent, surface).
  const tokenReferences = (sidebarSrc.match(/var\(--color-[a-z-]+\)/g) || []).length;
  assert.ok(
    tokenReferences >= 4,
    `expected ≥4 token references in GuideSidebar; found ${tokenReferences}`,
  );
});

// ───── BLOG GAP (documented, not fixed) ─────

test('Travel blog does NOT render GuideSidebar (Layout isGuide filter excludes blog paths)', () => {
  // Layout.astro uses an {isGuide ? (sidebar layout) : (legacy)} ternary.
  // isGuide is computed from the URL path; blog paths are not guides.
  // Adding <GuideSidebar> to the travel blog page (per the rollout
  // plan's Step 3) would mount it inside <article>, NOT inside the
  // sidebar-layout wrapper, producing a different visual treatment than
  // guide pages.
  //
  // The Phase 2 ticket #7 acceptance ("travel blog → operator guides")
  // requires a Layout-level change to widen isGuide to blog paths
  // OR a focused blog-deploy component. That is captured as ⚠️
  // Cannot-verify and logged in the spec/ledger.
  const travelSrc = readFileSync(TRAVEL, 'utf8');
  const layoutSrc = readFileSync(LAYOUT, 'utf8');

  assert.doesNotMatch(
    travelSrc,
    /<GuideSidebar\b/,
    'Travel blog should NOT hand-roll <GuideSidebar/> yet (logged as Phase 3 ticket)',
  );
  assert.match(
    layoutSrc,
    /isGuide\s*\?\s*\(/,
    'Layout.astro should still gate GuideSidebar via isGuide filter',
  );
});

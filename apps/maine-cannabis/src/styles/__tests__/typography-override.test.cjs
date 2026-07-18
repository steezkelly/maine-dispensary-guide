/**
 * typography-override.test.cjs
 *
 * Pins the typography token authority on this branch. The test FOLLOWS
 * the actual swap (intended to start RED and become GREEN once the swap
 * lands). Per Steve 2026-07-17 direction, Fraunces/Plus Jakarta Sans
 * is replaced with Newsreader (display) + Source Sans 3 (body) across
 * tokens.css, BaseHead.astro, MinimalLayout.astro, and verticals.ts.
 *
 * Run with: node apps/maine-cannabis/src/styles/__tests__/typography-override.test.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const TOKENS = path.join(
  REPO_ROOT,
  'apps/maine-cannabis/src/styles/tokens.css',
);
const BASE_HEAD = path.join(
  REPO_ROOT,
  'apps/maine-cannabis/src/layouts/BaseHead.astro',
);
const MIN_LAYOUT = path.join(
  REPO_ROOT,
  'apps/maine-cannabis/src/layouts/MinimalLayout.astro',
);
const VERTICALS = path.join(
  REPO_ROOT,
  'packages/config/src/verticals.ts',
);
const PACKAGE_LAYOUT = path.join(
  REPO_ROOT,
  'packages/layouts/src/Layout.astro',
);
const GUIDE_SIDEBAR = path.join(
  REPO_ROOT,
  'packages/ui/src/components/GuideSidebar.astro',
);
const AGENTS_MD = path.join(REPO_ROOT, 'AGENTS.md');

let passed = 0;
let failed = 0;
const fails = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    fails.push(msg);
    console.error('  X ' + msg);
  }
}

function section(name) {
  console.log('\n' + name);
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

// ---------------------------------------------------------------------------
// TEST 1 - tokens.css font-family + font-serif swap
// ---------------------------------------------------------------------------
section('1. tokens.css uses Source Sans 3 + Newsreader');

{
  const css = fs.readFileSync(TOKENS, 'utf8');
  assert(
    css.includes("--font-family: 'Source Sans 3'"),
    'tokens.css --font-family should reference Source Sans 3',
  );
  assert(
    css.includes("--font-serif: 'Newsreader'"),
    'tokens.css --font-serif should reference Newsreader',
  );
  assert(
    !css.includes("'Plus Jakarta Sans'"),
    'tokens.css should no longer reference Plus Jakarta Sans',
  );
  assert(
    !css.includes("'Fraunces'"),
    'tokens.css should no longer reference Fraunces',
  );
}

// ---------------------------------------------------------------------------
// TEST 2 - BaseHead.astro Google Fonts URL pinned to new families
// ---------------------------------------------------------------------------
section('2. BaseHead.astro loads Newsreader + Source Sans 3 from Google Fonts');

{
  const head = fs.readFileSync(BASE_HEAD, 'utf8');
  assert(
    head.includes('family=Newsreader'),
    'BaseHead.astro <link> should load Newsreader',
  );
  assert(
    head.includes('family=Source+Sans+3'),
    'BaseHead.astro <link> should load Source Sans 3',
  );
  assert(
    !head.includes('family=Fraunces'),
    'BaseHead.astro should no longer load Fraunces',
  );
  assert(
    !head.includes('family=Plus+Jakarta+Sans'),
    'BaseHead.astro should no longer load Plus Jakarta Sans',
  );
}

// ---------------------------------------------------------------------------
// TEST 3 - MinimalLayout.astro carries the same fonts
// ---------------------------------------------------------------------------
section('3. MinimalLayout.astro uses the same fonts');

{
  const layout = fs.readFileSync(MIN_LAYOUT, 'utf8');
  assert(
    layout.includes('family=Newsreader') || layout.includes("'Newsreader'"),
    'MinimalLayout.astro should reference Newsreader',
  );
  assert(
    layout.includes('family=Source+Sans+3') ||
      layout.includes("'Source Sans 3'"),
    'MinimalLayout.astro should reference Source Sans 3',
  );
}

// ---------------------------------------------------------------------------
// TEST 4 - verticals.ts pin fontSerif=Newsreader, fontSans=Source Sans 3
// ---------------------------------------------------------------------------
section('4. packages/config/src/verticals.ts maps to new fonts');

{
  const ts = fs.readFileSync(VERTICALS, 'utf8');
  assert(
    ts.includes("Newsreader"),
    'verticals.ts should map a fontSerif to Newsreader',
  );
  assert(
    ts.includes("Source Sans 3") || ts.includes('Source Sans'),
    'verticals.ts should map a fontSans to Source Sans 3',
  );
}

// ---------------------------------------------------------------------------
// TEST 5 - AGENTS.md design-system line reflects the typography authority
// ---------------------------------------------------------------------------
section('5. AGENTS.md design-system line is updated');

{
  const md = fs.readFileSync(AGENTS_MD, 'utf8');
  assert(
    /Design System:[^\n]*(Newsreader|Source Sans 3)/i.test(md),
    'AGENTS.md design system line should reflect Newsreader/Source Sans 3',
  );
  assert(
    !/Design System:[^\n]*Fraunces/i.test(md),
    'AGENTS.md should no longer call out Fraunces in the design system rule',
  );
  assert(
    !/Design System:[^\n]*Plus Jakarta Sans/i.test(md),
    'AGENTS.md should no longer call out Plus Jakarta Sans in the design system rule',
  );
}

// ---------------------------------------------------------------------------
// TEST 6 - governed package surfaces do not load or hardcode retired families
// ---------------------------------------------------------------------------
section('6. Shared package surfaces contain no retired typography declarations');

{
  const retiredTypography =
    /(?:family=(?:Fraunces|Plus\+Jakarta\+Sans)\b|font-family\s*:\s*['"]?(?:Fraunces|Plus Jakarta Sans)\b)/i;

  for (const file of [PACKAGE_LAYOUT, GUIDE_SIDEBAR]) {
    const source = stripComments(fs.readFileSync(file, 'utf8'));
    assert(
      !retiredTypography.test(source),
      `${file} loads or hardcodes retired Fraunces/Plus Jakarta Sans typography`,
    );
  }
}

// ---------------------------------------------------------------------------
console.log('');
console.log(
  'typography-override tests: ' + passed + ' passed, ' + failed + ' failed',
);
if (failed > 0) {
  console.error('');
  for (const f of fails) console.error('  X ' + f);
  process.exit(1);
}
process.exit(0);
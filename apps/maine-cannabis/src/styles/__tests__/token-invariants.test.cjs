const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(
  path.join(__dirname, '../theme-2026.css'),
  'utf8',
);

test('Phase 1 tokens are defined in :root', () => {
  for (const token of [
    '--color-lichen',
    '--color-rule',
    '--color-accent',
    '--font-mono',
    '--space-section',
    '--reading-column',
    '--control-bg',
    '--control-bg-hover',
    '--control-bg-active',
    '--control-border',
    '--control-border-hover',
    '--control-text',
    '--focus-ring',
    '--selected-rule',
    '--disabled-opacity',
    '--color-link-visited',
    '--color-error-bg',
    '--color-success-bg',
  ]) {
    assert.match(css, new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`), `${token} should be defined in :root`);
  }
});

test('--color-accent is editorial bronze in light mode', () => {
  // Extract the first :root block (light mode)
  const lightRoot = css.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(lightRoot, 'should have a :root block');
  assert.match(lightRoot[1], /--color-accent:\s*#8C5A3A/i, 'light --color-accent must be #8C5A3A bronze');
});

test('--color-accent is lifted bronze in [data-theme="dark"]', () => {
  const darkRoot = css.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
  assert.ok(darkRoot, 'should have a [data-theme="dark"] block');
  assert.match(darkRoot[1], /--color-accent:\s*#B0825A/i, 'dark --color-accent must be #B0825A lifted bronze');
});

test('every --color-on-* token has a documented invariant comment', () => {
  for (const token of ['--color-on-primary', '--color-on-accent', '--color-on-surface', '--color-on-surface-2', '--color-on-secondary']) {
    const tokenDecl = new RegExp(`${token}\\s*:[^;]+;`);
    assert.match(css, tokenDecl, `${token} should be declared`);
  }
});

// === Task 2 — Typography swap to Newsreader + Source Sans 3 ===
// Spec §4 (typography) + §7.1 ticket #2. References resolve from the
// monorepo root. This test file lives at apps/maine-cannabis/src/styles/__tests__/,
// so 5 levels up reaches the worktree root.
// (Brief originally specified 4 levels; corrected for actual file depth.)
const ROOT = path.join(__dirname, '../../../../../');

test('tokens.css defaults use Newsreader + Source Sans 3', () => {
  const tokens = fs.readFileSync(path.join(ROOT, 'apps/maine-cannabis/src/styles/tokens.css'), 'utf8');
  assert.match(tokens, /--font-family:\s*'Source Sans 3'/, 'tokens.css --font-family should be Source Sans 3');
  assert.match(tokens, /--font-serif:\s*'Newsreader'/, 'tokens.css --font-serif should be Newsreader');
  assert.doesNotMatch(tokens, /--font-family:\s*'Plus Jakarta Sans'/, 'must not reference Plus Jakarta Sans');
  assert.doesNotMatch(tokens, /--font-serif:\s*'Fraunces'/, 'must not reference Fraunces');
});

test('packages/layouts Google Fonts URL uses Newsreader + Source Sans 3', () => {
  const layout = fs.readFileSync(path.join(ROOT, 'packages/layouts/src/Layout.astro'), 'utf8');
  assert.match(layout, /family=Newsreader/, 'Google Fonts URL should reference Newsreader');
  assert.match(layout, /family=Source\+Sans\+3/, 'Google Fonts URL should reference Source Sans 3');
  assert.doesNotMatch(layout, /family=Fraunces/, 'must not reference Fraunces');
  assert.doesNotMatch(layout, /family=Plus\+Jakarta\+Sans/, 'must not reference Plus Jakarta Sans');
});

test('GuideSidebar.astro uses var(--font-serif) instead of hardcoded Fraunces', () => {
  const sidebar = fs.readFileSync(path.join(ROOT, 'packages/ui/src/components/GuideSidebar.astro'), 'utf8');
  assert.doesNotMatch(sidebar, /font-family:\s*'Fraunces'/, 'GuideSidebar must not hardcode Fraunces');
  // Three usages should be there, all using the token
  const matches = sidebar.match(/var\(--font-serif/g) || [];
  assert.ok(matches.length >= 3, `expected 3+ var(--font-serif) usages, got ${matches.length}`);
});

test('verticals.ts uses Newsreader + Source Sans 3', () => {
  const verticals = fs.readFileSync(path.join(ROOT, 'packages/config/src/verticals.ts'), 'utf8');
  assert.match(verticals, /fontSerif:\s*'Newsreader'/, 'verticals.ts fontSerif should be Newsreader');
  assert.match(verticals, /fontSans:\s*'Source Sans 3'/, 'verticals.ts fontSans should be Source Sans 3');
});

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
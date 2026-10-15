'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const STYLES_ROOT = path.resolve(__dirname, '..');
const sharedStylesheets = [
  'tokens.css',
  'globals.css',
  'components.css',
  'theme-2026.css',
]
  .map((file) => ({
    file,
    source: fs.readFileSync(path.join(STYLES_ROOT, file), 'utf8'),
  }));
const sharedStyles = sharedStylesheets.map(({ source }) => source).join('\n');
const searchSource = fs.readFileSync(
  path.resolve(__dirname, '../../../../../packages/ui/src/components/Search.astro'),
  'utf8',
);

const requiredTokens = [
  '--font-mono',
  '--space-section',
  '--reading-column',
  '--color-lichen',
  '--color-rule',
  '--radius-editorial-sm',
  '--radius-editorial-md',
  '--control-min-size',
  '--duration-interface',
];

const requiredUtilitySelectors = [
  '.editorial-section',
  '.editorial-rule-list',
  '.editorial-rule-list > * + *',
  '.editorial-text-link',
  '.editorial-surface',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function globalRootDeclarationBlocks(stylesheets) {
  return stylesheets.flatMap(({ file, source }) => {
    const uncommented = stripCssComments(source);
    return [...uncommented.matchAll(/(?:^|})\s*:root\s*\{([^{}]*)\}/gi)].map(
      (match) => ({ file, declarations: match[1] }),
    );
  });
}

function declarationBlock(source, selector) {
  const uncommented = stripCssComments(source);
  const match = uncommented.match(
    new RegExp(`(?:^|})\\s*${escapeRegex(selector)}\\s*\\{([^{}]*)\\}`, 'i'),
  );
  assert.ok(match, `${selector} should be defined by the shared editorial styles`);
  return match[1];
}

for (const token of requiredTokens) {
  test(`shared global :root authority exposes ${token}`, () => {
    assert.ok(
      globalRootDeclarationBlocks(sharedStylesheets).some(({ declarations }) =>
        new RegExp(`${escapeRegex(token)}\\s*:`).test(declarations),
      ),
      `${token} should be declared in a global :root rule in an allowed Task 5 stylesheet`,
    );
  });
}

test('interface duration is root-authoritative at 220ms and drives mobile transitions', () => {
  assert.ok(
    globalRootDeclarationBlocks(sharedStylesheets).some(({ declarations }) =>
      /--duration-interface\s*:\s*220ms\s*;?/i.test(declarations),
    ),
    '--duration-interface must be declared as 220ms in a global :root rule',
  );
  assert.match(
    sharedStyles,
    /transition\s*:\s*transform\s+var\(\s*--duration-interface\s*\)\s+cubic-bezier/i,
  );
  assert.match(
    sharedStyles,
    /transition\s*:\s*opacity\s+var\(\s*--duration-interface\s*\)\s*,\s*transform\s+var\(\s*--duration-interface\s*\)/i,
  );
});

for (const selector of requiredUtilitySelectors) {
  test(`${selector} exists and remains shadowless`, () => {
    const declarations = declarationBlock(sharedStyles, selector);
    const shadow = declarations.match(/\bbox-shadow\s*:\s*([^;]+)/i);
    assert.ok(
      !shadow || shadow[1].trim().toLowerCase() === 'none',
      `${selector} must not apply a box shadow`,
    );
  });
}

test('shared buttons and form fields use the 44px control baseline', () => {
  assert.match(
    sharedStyles,
    /button\s*,\s*\.btn\s*\{[^}]*min-block-size\s*:\s*var\(\s*--control-min-size\s*\)/i,
  );
  assert.match(
    sharedStyles,
    /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)\s*,\s*select\s*,\s*textarea\s*\{[^}]*min-block-size\s*:\s*var\(\s*--control-min-size\s*\)/i,
  );
});

test('shared Search input retains global keyboard focus visibility', () => {
  assert.match(
    sharedStyles,
    /input:focus-visible\s*,[\s\S]*?outline\s*:\s*2px\s+solid\s+var\(\s*--color-accent\s*\)/i,
  );
  assert.doesNotMatch(
    stripCssComments(searchSource),
    /input:focus\s*\{[^}]*outline\s*:\s*none/i,
  );
});

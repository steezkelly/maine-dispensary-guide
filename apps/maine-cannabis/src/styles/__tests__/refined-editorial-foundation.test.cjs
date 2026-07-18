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

const requiredTokens = [
  '--font-mono',
  '--space-section',
  '--reading-column',
  '--color-lichen',
  '--color-rule',
  '--radius-editorial-sm',
  '--radius-editorial-md',
  '--control-min-size',
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

for (const selector of requiredUtilitySelectors) {
  test(`${selector} exists and remains shadowless`, () => {
    const declarations = declarationBlock(sharedStyles, selector);
    assert.doesNotMatch(
      declarations,
      /\bbox-shadow\s*:\s*(?!none\b)[^;]+/i,
      `${selector} must not apply a box shadow`,
    );
  });
}

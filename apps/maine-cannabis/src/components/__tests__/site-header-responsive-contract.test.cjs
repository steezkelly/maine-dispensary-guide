'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const HEADER = path.resolve(__dirname, '..', 'SiteHeader.astro');
const COMPONENTS = path.resolve(__dirname, '..', '..', 'styles', 'components.css');
const header = fs.readFileSync(HEADER, 'utf8');
const liveHeader = stripComments(header);
const headerStyles = extractStyleBlocks(liveHeader);
const componentStyles = fs.readFileSync(COMPONENTS, 'utf8');
const menuAndThemeControls = ['.nav-toggle-label', '.theme-toggle'];
const shrinkableFlexChild = '.logo';

function stripComments(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:/])\/\/.*$/gm, '$1');
}

function extractStyleBlocks(source) {
  return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join('\n');
}

function selectorDeclarations(source, selector) {
  return [...source.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').some((part) => part.trim() === selector))
    .map((match) => match[2])
    .join('\n');
}

function mediaBlock(source, query) {
  const start = source.search(query);
  assert.notEqual(start, -1, 'site header should own the required responsive media query');

  const openingBrace = source.indexOf('{', start);
  assert.notEqual(openingBrace, -1, 'responsive media query should open a declaration block');

  let depth = 0;
  for (let index = openingBrace; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}') {
      depth--;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }

  assert.fail('responsive media query should close its declaration block');
}

function controlsHaveDeclaration(propertyPattern) {
  return menuAndThemeControls.every((selector) =>
    propertyPattern.test(selectorDeclarations(headerStyles, selector)),
  );
}

test('site header contains no decorative AnimatedBackdrop', () => {
  assert.doesNotMatch(
    liveHeader,
    /(?:import[\s\S]*?from\s+['"][^'"]*AnimatedBackdrop[^'"]*['"]|<AnimatedBackdrop\b|\.mdg-anim-backdrop--subtle\b)/,
  );
});

test('site header menu and theme controls expose a 44px inline touch target', () => {
  assert.ok(
    controlsHaveDeclaration(
      /(?:min-)?(?:width|inline-size)\s*:\s*(?:44px|var\(\s*--control-min-size\s*\))/,
    ),
    'both .nav-toggle-label and .theme-toggle must define a 44px inline minimum',
  );
});

test('site header menu and theme controls expose a 44px block touch target', () => {
  assert.ok(
    controlsHaveDeclaration(
      /(?:min-)?(?:height|block-size)\s*:\s*(?:44px|var\(\s*--control-min-size\s*\))/,
    ),
    'both .nav-toggle-label and .theme-toggle must define a 44px block minimum',
  );
});

test('site header owns its 768px responsive contract', () => {
  const responsiveStyles = mediaBlock(
    componentStyles,
    /@media\s*\(max-width\s*:\s*768px\)/i,
  );
  assert.match(
    responsiveStyles,
    /\.nav-toggle-label\b/,
    'the 768px header media block must control the actual menu trigger',
  );
  assert.match(responsiveStyles, /\.nav-links\s*\{[^}]*position\s*:\s*fixed/i);
  assert.doesNotMatch(
    componentStyles,
    /@media\s*\(max-width\s*:\s*(?:769|[89]\d\d|1\d{3,})px\)\s*\{[\s\S]*?\.nav-toggle-label\s*\{[^}]*display\s*:/i,
    'no wider breakpoint may activate the mobile menu mode before 768px',
  );
});

test('site header logo flex child can shrink', () => {
  assert.match(
    selectorDeclarations(headerStyles, shrinkableFlexChild),
    /min-width\s*:\s*0\b/,
    '.logo must explicitly allow its header flex item to shrink',
  );
});

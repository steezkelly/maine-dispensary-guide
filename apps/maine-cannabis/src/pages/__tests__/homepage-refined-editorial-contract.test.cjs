'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const HOMEPAGE = path.resolve(__dirname, '..', 'index.astro');
const source = fs.readFileSync(HOMEPAGE, 'utf8');
const frontmatterEnd = source.indexOf('---', 3);
assert.notEqual(frontmatterEnd, -1, 'homepage should have a closing frontmatter fence');
const template = source
  .slice(frontmatterEnd + 3)
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const requiredIds = [
  'authority-hero',
  'evidence-strip',
  'operator-pathways',
  'featured-analysis',
  'municipality-explorer',
  'latest-intelligence',
  'newsletter-invitation',
  'trust-layer',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionOpeningsFor(id) {
  return [
    ...template.matchAll(
      new RegExp(
        `<section\\b(?=[^>]*\\bid\\s*=\\s*(["'])${escapeRegex(id)}\\1)[^>]*>`,
        'gi',
      ),
    ),
  ];
}

for (const id of requiredIds) {
  test(`homepage includes the ${id} content section`, () => {
    assert.ok(
      sectionOpeningsFor(id).length > 0,
      `homepage template should open a <section> with id="${id}"`,
    );
  });
}

test('homepage content sections appear in the canonical exact order', () => {
  const sectionMatches = requiredIds.map((id) => sectionOpeningsFor(id));

  for (let i = 0; i < requiredIds.length; i++) {
    assert.ok(
      sectionMatches[i].length > 0,
      `homepage should open a <section> with id="${requiredIds[i]}"`,
    );
  }

  const positions = sectionMatches.map(([match]) => match.index);

  for (let i = 1; i < requiredIds.length; i++) {
    assert.ok(
      positions[i - 1] < positions[i],
      `${requiredIds[i - 1]} should precede ${requiredIds[i]}`,
    );
  }
});

test('homepage removes the retired composition', () => {
  assert.doesNotMatch(
    stripComments(source),
    /(?:import[\s\S]*?from\s+['"][^'"]*(?:AnimatedBackdrop|SiteHealthStrip)[^'"]*['"]|<(?:AnimatedBackdrop|SiteHealthStrip)\b|\b(?:tour-carousel|mission-manifesto|journey-detail)\b)/,
  );
});

test('homepage source owns exactly one H1', () => {
  assert.equal((template.match(/<h1\b/g) || []).length, 1);
});

function stripComments(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:/])\/\/.*$/gm, '$1');
}

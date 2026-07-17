'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const layoutsDirectory = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(layoutsDirectory, 'Layout.astro'), 'utf8');
const globals = fs.readFileSync(path.resolve(layoutsDirectory, '..', 'styles', 'globals.css'), 'utf8');

test('reveal hiding is opt-in and observer failures leave semantic content visible', () => {
  assert.match(
    globals,
    /html\.reveal-enhanced\s+\.reveal\s*\{[\s\S]*?opacity:\s*0;/,
    'the opacity-zero state must require an explicit enhancement class',
  );
  assert.doesNotMatch(
    globals,
    /(?<!enhanced\s)\.reveal\s*\{[\s\S]*?opacity:\s*0;/,
    'plain .reveal elements must stay visible before JavaScript enhancement',
  );
  assert.match(
    layout,
    /if \([\s\S]*?!\('IntersectionObserver' in window\)[\s\S]*?\)\s*\{\s*revealAll\(\);\s*return;/,
    'missing IntersectionObserver must reveal content instead of throwing',
  );
  assert.match(
    layout,
    /document\.documentElement\.classList\.add\('reveal-enhanced'\);/,
    'JavaScript must explicitly opt into the hidden pre-animation state',
  );
});

test('reveal observer has a finite fallback for elements it never observes', () => {
  assert.match(
    layout,
    /window\.setTimeout\(revealAll,\s*\d+\);/,
    'a finite timeout must reveal every remaining section',
  );
  assert.match(
    layout,
    /const revealAll = \(\) => \{[\s\S]*?document\.querySelectorAll\('\.reveal'\)[\s\S]*?classList\.add\('visible'\);/,
    'fallback must make every reveal element visible',
  );
});

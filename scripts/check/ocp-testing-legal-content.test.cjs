#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const pages = [
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-edibles-compliance.astro',
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-product-testing-guide.astro',
];

for (const relativePath of pages) {
  test(`${relativePath} separates the effective edible statute from proposed rules`, () => {
    const source = read(relativePath);
    assert.match(source, /P\.L\. 2025, ch\. 764 effective April 19, 2026/);
    assert.match(source, /§ 605's prior-testing, documentation, and tracking conditions/);
    assert.match(source, /§ 602\(1\)\(F\)/);
    assert.match(source, /draft Chapter 40 would incorporate (?:this|that) statutory exception|draft Chapter 40[^.]+incorporate the statutory edible/);
    assert.doesNotMatch(source, /This exception is proposed—not current binding guidance/);
    assert.doesNotMatch(source, /That draft exception is not yet effective/);
    assert.doesNotMatch(source, /plus any other applicable product-level test such as water activity/);
  });
}

test('corrections log records the statute/rule distinction', () => {
  const source = read('apps/maine-cannabis/src/pages/about/corrections.astro');
  assert.match(source, /P\.L\. 2025, ch\. 764 made it effective April 19, 2026/);
  assert.match(source, /already provides the edible concentrate-input testing exception/);
});

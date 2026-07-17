#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const implementationGuidancePath =
  'OCP%20Guidance%20for%20Mandatory%20Testing%20of%20Adult%20Use%20Edibles%20April%202026.pdf';
const operatorPages = [
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-edibles-compliance.astro',
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-product-testing-guide.astro',
];

for (const relativePath of operatorPages) {
  test(`${relativePath} separates the effective edible statute from proposed rules`, () => {
    const source = read(relativePath);
    assert.match(source, /P\.L\. 2025, ch\. 764 effective April 19, 2026/);
    assert.match(source, /§ 605's prior-testing, documentation, and tracking conditions/);
    assert.match(source, /every cannabis concentrate input used in the edible has passed all required mandatory contaminant testing/i);
    assert.match(source, /§ 602\(1\)\(F\)/);
    assert.match(source, /draft Chapter 40 would incorporate (?:this|that) statutory exception|draft Chapter 40[^.]+incorporate the statutory edible/);
    assert.ok(source.includes(implementationGuidancePath));
    assert.match(source, /OCP's April 28, 2026 implementation guidance/);
    assert.match(source, /effective immediately/i);
    assert.doesNotMatch(source, /This exception is proposed—not current binding guidance/);
    assert.doesNotMatch(source, /That draft exception is not yet effective/);
    assert.doesNotMatch(source, /plus any other applicable product-level test such as water activity/);
  });
}

const consumerPages = [
  'apps/maine-cannabis/src/pages/blog/best-maine-edibles-2026.astro',
  'apps/maine-cannabis/src/pages/guides/cannabis-edible-dose-calculator-maine.astro',
];

for (const relativePath of consumerPages) {
  test(`${relativePath} does not claim every finished edible gets a contaminant panel`, () => {
    const source = read(relativePath);
    assert.match(source, /P\.L\. 2025, ch\. 764/);
    assert.match(source, /P\.L\. 2025, ch\. 764[\s\S]{0,320}effective April 19, 2026/i);
    assert.match(source, /every cannabis concentrate used to make the edible (?:has already passed|must already have passed) all required mandatory contaminant testing/i);
    assert.ok(source.includes(implementationGuidancePath));
    assert.match(source, /THC-potency, cannabinoid-profile, and homogeneity testing/);
    assert.match(source, /not subject to additional mandatory contaminant testing/);
    assert.doesNotMatch(source, /All edibles must pass Maine OCP testing for potency, microbials, pesticides, and heavy metals/i);
    assert.doesNotMatch(source, /Each batch of edible has a Certificate of Analysis \(COA\) that lists[^.]+a contaminant panel/i);
    assert.doesNotMatch(source, /The Certificate of Analysis \(COA\) reports on five panels/i);
  });
}

test('corrections log records the statute/rule/guidance distinction', () => {
  const source = read('apps/maine-cannabis/src/pages/about/corrections.astro');
  assert.match(source, /P\.L\. 2025, ch\. 764 made it effective April 19, 2026/);
  assert.match(source, /already provides the edible concentrate-input testing exception/);
  assert.match(source, /OCP's April 28, 2026 implementation guidance/);
  assert.ok(source.includes(implementationGuidancePath));
});

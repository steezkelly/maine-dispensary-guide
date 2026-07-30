#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..');
const pagePath = path.join(repo, 'apps/maine-cannabis/src/pages/guides/maine-cannabis-product-recall-response.astro');
const sourcePackPath = path.join(repo, 'docs/research/2026-07-30-maine-cannabis-product-recall-response-source-pack.md');
const designPath = path.join(repo, 'docs/superpowers/specs/2026-07-30-maine-cannabis-product-recall-response-design.md');
const jsonLdPath = path.join(repo, 'apps/maine-cannabis/src/lib/json-ld.ts');
const layoutPath = path.join(repo, 'apps/maine-cannabis/src/layouts/Layout.astro');
const rootPackagePath = path.join(repo, 'package.json');
const workflowPath = path.join(repo, '.github/workflows/ci.yml');
const builtPagePath = path.join(repo, 'apps/maine-cannabis/dist/guides/maine-cannabis-product-recall-response/index.html');

for (const file of [pagePath, sourcePackPath, designPath, jsonLdPath, layoutPath, rootPackagePath, workflowPath]) {
  assert.ok(fs.existsSync(file), `expected artifact: ${file}`);
}

const page = fs.readFileSync(pagePath, 'utf8');
const sourcePack = fs.readFileSync(sourcePackPath, 'utf8');
const design = fs.readFileSync(designPath, 'utf8');
const jsonLd = fs.readFileSync(jsonLdPath, 'utf8');
const layout = fs.readFileSync(layoutPath, 'utf8');
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
const workflow = fs.readFileSync(workflowPath, 'utf8');

assert.match(page, /title="Maine Cannabis Product Recall & Failed-Test Response Guide \(2026\)"/);
assert.match(page, /<h1>Maine Cannabis Product Recall &amp; Failed-Test Response Guide \(2026\)<\/h1>/);
assert.match(page, /description="A Maine adult-use operator checklist for failed cannabis tests, stop-sales, administrative holds, consumer complaints, and OCP recalls\."/);
assert.match(page, /currentPath="\/guides\/maine-cannabis-product-recall-response"/);
assert.match(page, /const faqs = \[/);
assert.match(page, /<Faq faqs=\{faqs\}/);
assert.match(page, /failed test.*not automatically the same event as an OCP recall/is);
assert.match(page, /voluntary stop-sale or quarantine/i);
assert.match(page, /OCP administrative hold/i);
assert.match(page, /OCP recall/i);
assert.match(page, /Title 28-B section 803-A/i);
assert.match(page, /Title 28-B section 105/i);
assert.match(page, /draft Chapter 40 as current law/i);
assert.match(page, /Last reviewed <strong>2026-07-30<\/strong>/);
assert.doesNotMatch(page, /margaret-finch|Margaret Finch/);
assert.match(page, /authorTitle: 'Licensing & Compliance Analyst'/);
assert.match(page, /OCP communications and any communication about termination, if provided/);
assert.doesNotMatch(page, /written notice of termination/i);
assert.match(page, /<th scope="row"><strong>What happened\?<\/strong><\/th>/);
assert.match(page, /verification-icon" aria-hidden="true"/);
assert.doesNotMatch(page, /\.status-label \{ font-weight: 700; white-space: nowrap; \}/);
assert.match(page, /authorSchemaType: 'Organization'/);
assert.doesNotMatch(page, /with reviewer attribution/i);
assert.doesNotMatch(page, /Keep the affected batch out of sale and transfer/i);
assert.match(page, /<strong>Hold the batch from sale\.<\/strong>/);
assert.match(jsonLd, /: \{ '@id': orgId \}/);
assert.match(layout, /authorSchemaType\?: 'Person' \| 'Organization'/);
assert.match(layout, /author: article\.authorSchemaType === 'Organization' \? undefined : article\.author/);
assert.equal(
  rootPackage.scripts['test:maine-cannabis-product-recall-response'],
  'node scripts/check/maine-cannabis-product-recall-response.test.cjs',
  'root package must expose the focused recall-response test',
);
assert.match(workflow, /node scripts\/check\/maine-cannabis-product-recall-response\.test\.cjs/);

for (const url of [
  'https://www.maine.gov/dafs/ocp/resources/recalls',
  'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/18-691%20CMR%20Ch.%2040%20for%20Public%20Comment%202026.pdf',
  'https://www.maine.gov/dafs/ocp/open-data/adult-use/testing-data',
  'https://www.maine.gov/dafs/ocp/open-data/adult-use/compliance-data',
  'https://legislature.maine.gov/statutes/28-B/title28-Bsec105.html',
  'https://legislature.maine.gov/statutes/28-B/title28-Bsec803-A.html'
]) {
  assert.ok(page.includes(url), `page must cite ${url}`);
  assert.ok(sourcePack.includes(url), `source pack must record ${url}`);
}

for (const href of [
  '/guides/maine-cannabis-product-testing-guide',
  '/guides/maine-cannabis-inventory-management',
  '/guides/maine-metrc-compliance-guide'
]) {
  assert.ok(page.includes(`href="${href}"`), `expected internal link: ${href}`);
}

for (const forbidden of [
  /guaranteed\s+(?:return|profit|outcome)/i,
  /guarantee(?:d|s)?\s+(?:a\s+)?(?:penalt|recall|safety|compliance)/i,
  /projected\s+ROI/i,
  /return\s+on\s+investment/i,
  /must\s+immediately\s+be\s+destroyed/i,
  /diagnos(?:e|is)\s+(?:your|a|the)\s+symptom/i
]) {
  assert.doesNotMatch(page, forbidden, `forbidden claim pattern: ${forbidden}`);
}

assert.match(sourcePack, /No claim that every failed batch must immediately be destroyed/);
assert.match(sourcePack, /No medical diagnosis/);
assert.match(design, /No claim that a recall response eliminates penalties/);

if (fs.existsSync(builtPagePath)) {
  const builtPage = fs.readFileSync(builtPagePath, 'utf8');
  const jsonLdScripts = [...builtPage.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  const graph = jsonLdScripts.flatMap((script) => script['@graph'] || []);
  const articleNode = graph.find((node) => node['@type'] === 'Article');
  assert.ok(articleNode, 'built route must emit an Article JSON-LD node');
  assert.equal(articleNode.author?.['@type'], undefined, 'publisher-managed byline must not emit a Person author type');
  assert.match(articleNode.author?.['@id'] || '', /#organization$/);
}

console.log('maine-cannabis-product-recall-response: PASS');

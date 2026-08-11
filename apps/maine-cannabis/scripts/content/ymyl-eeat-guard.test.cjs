#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '../../../..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const cohort = [
  {
    path: 'apps/maine-cannabis/src/pages/guides/maine-cannabis-edibles-compliance.astro',
    source: 'https://legislature.maine.gov/statutes/28-b/title28-Bsec703.html',
  },
  {
    path: 'apps/maine-cannabis/src/pages/guides/maine-cannabis-taxes-2026.astro',
    source: 'https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/IB61%20FINAL%20Sales%20of%20Adult%20Use%20Cannabis_2025_12_22.pdf',
    reviewDate: '2026-08-11',
  },
  {
    path: 'apps/maine-cannabis/src/pages/blog/best-maine-edibles-2026.astro',
    source: 'https://www.cdc.gov/cannabis/health-effects/poisoning.html',
  },
  {
    path: 'apps/maine-cannabis/src/pages/blog/maine-psilocybin-2026-guide.astro',
    source: 'https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1034&snum=132',
  },
  {
    path: 'apps/maine-cannabis/src/pages/guides/maine-cannabis-staffing-licensing.astro',
    source: 'https://www.maine.gov/dafs/ocp/adult-use/application-process/iic-instructions',
  },
];

for (const page of cohort) {
  test(`${page.path} uses organizational source review without a Person attribution`, () => {
    const source = read(page.path);
    const article = source.match(/const article\s*=\s*\{[\s\S]*?\n\};/)?.[0];

    assert.ok(article, 'article metadata must remain readable and emitted through Layout');
    assert.doesNotMatch(article, /\b(?:author|authorId|authorTitle|reviewer)\s*:/);
    assert.doesNotMatch(source, /Calvin Waters|Margaret Finch|Maine Cannabis Compliance Reviewer/);
    assert.doesNotMatch(
      source,
      /\b(?:professionally|expert|independently)\s+reviewed\b|\b(?:licensed|qualified)\s+(?:professional|expert)[^.\n]{0,80}\b(?:reviewer|reviewed)\b/i,
      `${page.path} must not imply professional, expert, or independent review`,
    );
    const reviewDate = page.reviewDate ?? '2026-07-21';
    const reviewDateEscaped = reviewDate.replace(/-/g, '\\-');
    assert.match(
      source,
      new RegExp(`Editorially reviewed against the cited primary sources by <strong>Maine Dispensary Guide<\\/strong> on <strong>${reviewDateEscaped}<\\/strong>`),
    );
    assert.match(source, /organizational editorial review, not (?:legal|medical)/i);
    assert.match(article, new RegExp(`modifiedDate:\\s*['"]${reviewDateEscaped}['"]`));
    assert.ok(source.includes(page.source), `missing contextual primary source: ${page.source}`);
  });
}

test('psilocybin page does not retain dormant ldJson metadata', () => {
  const source = read('apps/maine-cannabis/src/pages/blog/maine-psilocybin-2026-guide.astro');
  assert.doesNotMatch(source, /\b(?:const|let|var)\s+ldJson\b/);
});

test('staffing page preserves its established canonical override', () => {
  const source = read('apps/maine-cannabis/src/pages/guides/maine-cannabis-staffing-licensing.astro');
  assert.match(
    source,
    /canonicalOverride="https:\/\/mainedispensaryguide\.com\/guides\/maine-cannabis-regulations"/,
  );
});

test('cohort pages with an explicit FAQPage schema suppress duplicate component schema', () => {
  for (const page of [
    'apps/maine-cannabis/src/pages/blog/best-maine-edibles-2026.astro',
    'apps/maine-cannabis/src/pages/blog/maine-psilocybin-2026-guide.astro',
    'apps/maine-cannabis/src/pages/guides/maine-cannabis-staffing-licensing.astro',
  ]) {
    const source = read(page);
    assert.match(source, /<Faq\s+faqs=\{[^}]+\}\s+withoutSchema=\{true\}\s*\/>/);
    assert.match(source, /@type': 'FAQPage'/);
  }
});

function loadTypeScriptModule(relativePath) {
  const filename = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled, filename);
  return loaded.exports;
}

test('authorless Article JSON-LD references the publisher Organization', () => {
  const { buildJsonLdGraph } = loadTypeScriptModule('apps/maine-cannabis/src/lib/json-ld.ts');
  const siteUrl = 'https://mainedispensaryguide.com';
  const graph = buildJsonLdGraph(
    { siteName: 'Maine Dispensary Guide', siteUrl, socialLinks: [] },
    {
      title: 'Source-reviewed article',
      description: 'A source-reviewed article without an individual author.',
      pageUrl: `${siteUrl}/guides/source-reviewed`,
    },
  )['@graph'];
  const article = graph.find((node) => node['@type'] === 'Article');

  assert.deepEqual(article.author, { '@id': `${siteUrl}#organization` });
  assert.equal(graph.some((node) => node['@type'] === 'Person'), false);
});

test('declared individual authors still emit a Person node', () => {
  const { buildJsonLdGraph } = loadTypeScriptModule('apps/maine-cannabis/src/lib/json-ld.ts');
  const siteUrl = 'https://mainedispensaryguide.com';
  const graph = buildJsonLdGraph(
    { siteName: 'Maine Dispensary Guide', siteUrl, socialLinks: [] },
    {
      title: 'Named article',
      description: 'An article with a declared individual author.',
      author: 'Named Author',
      authorId: 'named-author',
      pageUrl: `${siteUrl}/guides/named`,
    },
  )['@graph'];
  const article = graph.find((node) => node['@type'] === 'Article');

  assert.equal(article.author['@type'], 'Person');
  assert.equal(article.author.name, 'Named Author');
});

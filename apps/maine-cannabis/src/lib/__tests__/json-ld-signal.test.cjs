'use strict';

/**
 * Focused tests for apps/maine-cannabis/src/lib/json-ld-signal.ts
 *
 * The signal page model is a research surface (read-only) backed by a
 * single primary MDG-DATA release. JSON-LD on these pages must:
 *
 *  - emit Dataset + WebPage graph nodes
 *  - attach a WebPage isPartOf back to the Organization / WebSite graph
 *  - carry the MDG-DATA release id, OCP data date, ACS vintage,
 *    and the spatial coverage (the municipality name + state) on the
 *    Dataset node
 *  - cite the source URLs (OCP licensee search, Census ACS 5-year) as
 *    Dataset sameAs or DataDownload URLs
 *  - NOT emit any menu-price, contact_email, or contact_phone field
 *    (these would be PII / out-of-scope data leaks)
 *  - preserve the existing buildJsonLdGraph() output shape so the
 *    site's main JSON-LD continues to render alongside the Signal graph
 *
 * Tests are written first; the production module implements the minimum
 * to make them pass.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

let buildSignalJsonLd;
try {
  ({ buildSignalJsonLd } = require('../json-ld-signal.ts'));
} catch (_) {
  // The .ts file is consumed at Astro build time. For Node's --test
  // runner, we shim by reading the source and transpiling via esbuild
  // only if the import failed. The Astro build pipeline handles the
  // real .ts.
  const fs = require('node:fs');
  const path = require('node:path');
  const Module = require('node:module');
  const esbuild = require('/home/steve/projects/maine-dispensary-guide/node_modules/esbuild');
  const src = fs.readFileSync(path.join(__dirname, '..', 'json-ld-signal.ts'), 'utf8');
  const out = esbuild.transformSync(src, { loader: 'ts', format: 'cjs', target: 'node22' });
  const tmp = path.join(__dirname, '.json-ld-signal.shim.cjs');
  fs.writeFileSync(tmp, out.code);
  ({ buildSignalJsonLd } = require(tmp));
}

const ORG = {
  siteName: 'Maine Dispensary Guide',
  siteUrl: 'https://mainedispensaryguide.com',
  socialLinks: ['https://mainedispensaryguide.com/about'],
};

const EVIDENCE = {
  releaseId: 'ded381696bddf56f',
  ocpDataAsOf: '2026-06-01',
  acsVintage: 2024,
  fetchedAtUtc: '2026-07-12T06:21:30.028Z',
  preliminary: false,
  sourceIds: ['ocp_licenses', 'census_acs5_population'],
  sourceUrls: [
    'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
    'https://www.census.gov/data/developers/data-sets/acs-5year.html',
  ],
};

const CITY = {
  slug: 'portland',
  city: 'Portland',
  geoid: '2300560545',
  licenses: 27,
  population: 68854,
  density: 3.92,
  dataAsOf: '2026-06-01',
  releaseId: 'ded381696bddf56f',
};

test('buildSignalJsonLd returns an @graph containing Dataset + WebPage + Organization + WebSite', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  assert.equal(out['@context'], 'https://schema.org');
  const types = out['@graph'].map((node) => node['@type']);
  assert.ok(types.includes('Organization'), 'Organization node required');
  assert.ok(types.includes('WebSite'), 'WebSite node required');
  assert.ok(types.includes('WebPage'), 'WebPage node required');
  assert.ok(types.includes('Dataset'), 'Dataset node required');
});

test('WebPage has isPartOf back to the WebSite via @id reference', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  const page = out['@graph'].find((n) => n['@type'] === 'WebPage');
  assert.ok(page['@id'], 'WebPage must have a stable @id');
  assert.equal(typeof page.isPartOf, 'object', 'isPartOf must be an object reference');
  assert.ok(page.isPartOf['@id'], 'isPartOf must carry an @id');
  const website = out['@graph'].find((n) => n['@type'] === 'WebSite');
  assert.equal(page.isPartOf['@id'], website['@id'], 'isPartOf @id must match WebSite @id');
});

test('Dataset carries release id, OCP date, ACS vintage, and spatial coverage', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  const dataset = out['@graph'].find((n) => n['@type'] === 'Dataset');
  assert.ok(dataset['@id'], 'Dataset must have a stable @id');
  assert.equal(dataset.identifier, EVIDENCE.releaseId, 'Dataset.identifier must equal the MDG-DATA release id');
  assert.equal(dataset.spatialCoverage?.name, 'Portland, Maine');
  assert.equal(dataset.temporalCoverage, EVIDENCE.ocpDataAsOf);
  assert.ok(Array.isArray(dataset.variableMeasured), 'Dataset.variableMeasured must be an array');
  const names = dataset.variableMeasured.map((v) => v.name);
  assert.ok(names.includes('active_adult_use_cannabis_store_licenses'));
  assert.ok(names.includes('population'));
  assert.ok(names.includes('rate_per_10k'));
});

test('Dataset cites the OCP and Census source URLs via sameAs', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  const dataset = out['@graph'].find((n) => n['@type'] === 'Dataset');
  assert.ok(Array.isArray(dataset.sameAs));
  for (const url of EVIDENCE.sourceUrls) {
    assert.ok(dataset.sameAs.includes(url), `Dataset.sameAs must cite ${url}`);
  }
});

test('JSON-LD never leaks contact_email, contact_phone, or any menu-price field', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  const json = JSON.stringify(out);
  assert.equal(json.includes('contact_email'), false, 'contact_email must not leak');
  assert.equal(json.includes('contact_phone'), false, 'contact_phone must not leak');
  assert.equal(json.includes('menu'), false, 'menu-price data must not leak');
  assert.equal(json.includes('price'), false, 'price data must not leak');
});

test('Index page (no city) produces a Dataset covering the curated set, not one row', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/', city: null });
  const dataset = out['@graph'].find((n) => n['@type'] === 'Dataset');
  assert.ok(dataset.spatialCoverage, 'spatialCoverage required');
  // Index spatial coverage is Maine, not a single city
  assert.equal(dataset.spatialCoverage.name, 'Maine');
  assert.equal(dataset.spatialCoverage['@type'], 'Place');
});

test('WebPage.mainEntity references the Dataset via @id (Google Rich Results pattern)', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  const page = out['@graph'].find((n) => n['@type'] === 'WebPage');
  const dataset = out['@graph'].find((n) => n['@type'] === 'Dataset');
  assert.ok(page.mainEntity, 'mainEntity required');
  assert.equal(page.mainEntity['@id'], dataset['@id']);
});

test('Dataset.creator is the Organization; provenance is a DataDownload pointing to MDG-DATA', () => {
  const out = buildSignalJsonLd(ORG, EVIDENCE, { pageUrl: 'https://mainedispensaryguide.com/signal/portland/', city: CITY });
  const dataset = out['@graph'].find((n) => n['@type'] === 'Dataset');
  assert.ok(dataset.creator, 'creator required');
  assert.equal(dataset.creator['@type'], 'Organization');
  assert.ok(Array.isArray(dataset.distribution));
  assert.ok(dataset.distribution.length >= 1);
  const first = dataset.distribution[0];
  assert.equal(first['@type'], 'DataDownload');
  assert.ok(first.contentUrl, 'distribution must carry contentUrl');
  assert.match(first.contentUrl, /\/signal\/|\/data\/methodology\/|mdg-data/);
});

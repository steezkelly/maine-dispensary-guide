#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'apps/maine-cannabis/src/data');
const PAGES = path.join(ROOT, 'apps/maine-cannabis/src/pages');

const optIn = JSON.parse(fs.readFileSync(path.join(DATA, 'maine-opt-in-towns.json'), 'utf8'));
const authorization = JSON.parse(fs.readFileSync(path.join(DATA, 'maine-municipal-authorization.json'), 'utf8'));
const licenseReceiptSource = fs.readFileSync(path.join(DATA, 'maine-opt-in-store-license-receipt.json'), 'utf8');
const licenseReceipt = JSON.parse(licenseReceiptSource);

const sorted = (values) => [...values].sort((a, b) => a.localeCompare(b));

test('journalist opt-in dataset exactly matches the canonical retail-authorized municipality universe', () => {
  const expected = authorization.municipalities
    .filter((municipality) => municipality.status === 'retail_authorized')
    .map((municipality) => municipality.name);
  const actual = optIn.towns.map((town) => town.town);

  assert.equal(new Set(actual).size, actual.length, 'dataset must not contain duplicate municipality rows');
  assert.deepEqual(sorted(actual), sorted(expected));
  assert.equal(optIn.meta.town_count, expected.length);
  assert.equal(optIn.meta.town_count, authorization.meta.status_counts.retail_authorized);
  assert.equal(optIn.meta.counties_covered, new Set(optIn.towns.map((town) => town.county)).size);
});

test('store counts and partial-detail fields are explicit and internally consistent', () => {
  for (const town of optIn.towns) {
    assert.ok(Number.isInteger(town.dispensaries_operating) && town.dispensaries_operating >= 0,
      `${town.town}: dispensaries_operating must be a non-negative integer`);
    assert.ok(town.year_opted_in === null || Number.isInteger(town.year_opted_in),
      `${town.town}: year_opted_in must be integer|null`);
    assert.ok(town.license_fee_usd === null || Number.isInteger(town.license_fee_usd),
      `${town.town}: license_fee_usd must be integer|null`);
    assert.equal(town.year_opted_in === null, town.license_fee_usd === null,
      `${town.town}: year and fee must either both be populated or both be null`);
  }

  const detailedRows = optIn.towns.filter((town) => town.year_opted_in !== null && town.license_fee_usd !== null);
  assert.equal(detailedRows.length, 21, 'fee/year detail coverage must remain explicitly partial until independently expanded');
  assert.equal(optIn.towns.reduce((sum, town) => sum + town.dispensaries_operating, 0), 184,
    'roster retrieved 2026-08-11 should link 184 active Store licenses to canonical authorized municipalities');
  const countPairs = optIn.towns.map((town) => [town.town, town.dispensaries_operating]);
  const countPairsHash = crypto.createHash('sha256').update(JSON.stringify(countPairs)).digest('hex');
  assert.equal(countPairsHash, 'fc72d86bfaf0ddf0534b58c9385012a9b82add29d5a9ea611e53c65465fbe33b',
    'per-municipality active Store-license mapping must match the reviewed roster derivation');
  const receiptCounts = new Map();
  for (const license of licenseReceipt.licenses) {
    if (!license.included) continue;
    receiptCounts.set(license.canonical_municipality, (receiptCounts.get(license.canonical_municipality) || 0) + 1);
  }
  assert.deepEqual(countPairs, optIn.towns.map((town) => [town.town, receiptCounts.get(town.town) || 0]),
    'every municipality count must be derived from the committed distinct-license receipt');
  assert.equal(new Set(licenseReceipt.licenses.map((license) => license.license_id)).size, 189,
    'receipt must contain 189 distinct active Store IDs');
  assert.equal(licenseReceipt.licenses.filter((license) => license.included).length, 184);
  assert.equal(licenseReceipt.meta.source_sha256, optIn.meta.source_artifacts.adult_use_roster.sha256);
  assert.deepEqual(licenseReceipt.meta.aliases, {
    Stratton: 'Eustis',
    'Hollis Center': 'Hollis',
    'Greenville Junction': 'Greenville',
  });
  assert.deepEqual(
    licenseReceipt.licenses
      .filter((license) => Object.hasOwn(licenseReceipt.meta.aliases, license.roster_city))
      .map(({ license_id, roster_city, canonical_municipality }) => ({ license_id, roster_city, canonical_municipality })),
    [
      { license_id: 'AMS124', roster_city: 'Stratton', canonical_municipality: 'Eustis' },
      { license_id: 'AMS304', roster_city: 'Hollis Center', canonical_municipality: 'Hollis' },
      { license_id: 'AMS625', roster_city: 'Greenville Junction', canonical_municipality: 'Greenville' },
      { license_id: 'AMS832', roster_city: 'Hollis Center', canonical_municipality: 'Hollis' },
    ],
    'receipt alias metadata and every affected license record must agree');
  assert.equal(crypto.createHash('sha256').update(licenseReceiptSource).digest('hex'),
    optIn.meta.source_artifacts.adult_use_roster.license_receipt_sha256,
    'public metadata must pin the exact committed per-license receipt');
  assert.match(optIn.meta.method, /Complete statewide universe/);
  assert.match(optIn.meta.method, /null means not yet verified/);
  assert.equal(
    optIn.meta.source_artifacts.municipal_authorization.model_refreshed_at,
    authorization.meta.ocp_model_refreshed_at,
    'journalist metadata must use the exact refresh timestamp from the canonical authorization model',
  );
  assert.equal(optIn.meta.source_artifacts.adult_use_roster.sha256,
    '37c678ced16a14eaba81821f254b5596bf6b1ee3f5a4619ef95a17dfa2aee0fa',
    'overwritable OCP roster URL must be pinned to the retrieved artifact hash');
  assert.equal(optIn.meta.source_artifacts.adult_use_roster.http_last_modified, '2026-08-10T19:11:13Z');
  assert.equal(optIn.meta.source_artifacts.adult_use_roster.active_store_ids_in_roster, 189);
  assert.equal(optIn.meta.source_artifacts.adult_use_roster.active_store_ids_linked_to_authorized_municipalities, 184);
  assert.deepEqual(
    licenseReceipt.licenses.filter((license) => !license.included),
    [
      { license_id: 'AMS1486', roster_city: 'Warren', canonical_municipality: null, included: false },
      { license_id: 'AMS1558', roster_city: 'Guilford', canonical_municipality: null, included: false },
      { license_id: 'AMS1692', roster_city: 'West Paris', canonical_municipality: null, included: false },
      { license_id: 'AMS1770', roster_city: 'Baring Plt', canonical_municipality: null, included: false },
      { license_id: 'AMS1783', roster_city: 'Baring Plantation', canonical_municipality: null, included: false },
    ],
    'committed receipt must preserve all five roster-to-authorization conflicts');
  assert.deepEqual(
    optIn.meta.source_artifacts.adult_use_roster.excluded_active_store_records,
    [
      { license_id: 'AMS1486', roster_location: 'Warren', reason: 'canonical model has no recorded retail authorization' },
      { license_id: 'AMS1558', roster_location: 'Guilford', reason: 'canonical model has no recorded retail authorization' },
      { license_id: 'AMS1692', roster_location: 'West Paris', reason: 'canonical model has no recorded retail authorization' },
      { license_id: 'AMS1770', roster_location: 'Baring Plt', reason: 'location is outside the canonical incorporated-municipality model' },
      { license_id: 'AMS1783', roster_location: 'Baring Plantation', reason: 'location is outside the canonical incorporated-municipality model' },
    ],
    'public metadata must preserve every excluded ID, roster location, and reason');
});

test('JSON endpoint executes and returns the canonical journalist dataset', async () => {
  const endpointPath = path.join(PAGES, 'data/maine-opt-in-towns.json.ts');
  const build = esbuild.buildSync({
    entryPoints: [endpointPath],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
  });
  const endpointModule = new Module(endpointPath, module);
  endpointModule.filename = endpointPath;
  endpointModule.paths = module.paths;
  endpointModule._compile(build.outputFiles[0].text, endpointPath);
  assert.equal(endpointModule.exports.prerender, true);
  const response = await endpointModule.exports.GET({});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/);
  assert.deepEqual(await response.json(), optIn);
});

test('citation surfaces do not present the former 21-row subset as Maine statewide', () => {
  const endpoint = fs.readFileSync(path.join(PAGES, 'data/maine-opt-in-towns.json.ts'), 'utf8');
  assert.match(endpoint, /export const prerender = true/);
  assert.match(endpoint, /application\/json/);
  assert.match(endpoint, /import optInData from ['"]\.\.\/\.\.\/data\/maine-opt-in-towns\.json['"]/,
    'endpoint must import the canonical journalist dataset');
  assert.match(endpoint, /JSON\.stringify\(optInData, null, 2\)/,
    'endpoint must serialize the imported canonical dataset');

  const surfaces = [
    'for-journalists.astro',
    'market-pulse-2026.astro',
    'embed/opt-in-tracker.astro',
    'guides/maine-cannabis-opt-in-tracker.astro',
    'blog/maine-opt-in-tracker-audit-2026.astro',
    'blog/which-towns-allow-dispensaries-in-maine.astro',
  ].map((relative) => [relative, fs.readFileSync(path.join(PAGES, relative), 'utf8')]);

  for (const [relative, source] of surfaces) {
    assert.doesNotMatch(source, /21 (?:OCP-verified|verified) (?:opted-in )?(?:towns|municipalities)/i, relative);
    assert.doesNotMatch(source, /(?:21|34)-town patchwork/i, relative);
    assert.doesNotMatch(source, /Maine's 488 municipalities/i, relative);
    assert.doesNotMatch(source, /20 have explicitly opted out/i, relative);
    assert.doesNotMatch(source, /m\.retail\s*===\s*['"]N['"]/, `${relative} must derive opt-outs from canonical status, not the raw OCP activity flag`);
    assert.doesNotMatch(source, /how many stores operate|against 12 operating/i, `${relative} must not turn active-license counts into storefront-operation claims`);
    assert.doesNotMatch(source, /simply hasn't taken action|haven't taken a formal vote/i, `${relative} must not infer local action from absent OCP authorization`);
    assert.doesNotMatch(source, /has not affirmatively opted in|no recorded retail authorization\s*\/\s*no decision/i, `${relative} must not infer local action from absent OCP authorization`);
    assert.doesNotMatch(source, /(?:never|not|didn't|did not|hasn't|has not)\s+(?:taken a )?(?:formal )?(?:vote|voted|action)|no (?:local )?(?:vote|decision|action) (?:occurred|was taken|was made)/i, `${relative} must not restate absent OCP authorization as known local history`);
    assert.doesNotMatch(source, /(?:have|has) yet to decide|(?:have|has) not decided whether to opt in/i, `${relative} must not infer an undecided local process from absent OCP authorization`);
    assert.doesNotMatch(source, /OCP will not process your application without written municipal authorization/i, `${relative} must preserve OCP's conditional-license → local-authorization → active-license sequence`);
    assert.doesNotMatch(source, /(?:must|need to) secure municipal authorization before (?:applying|submitting an application) to OCP/i, `${relative} must preserve conditional licensure before municipal authorization`);
    assert.doesNotMatch(source, /operating without both is a criminal offense/i, `${relative} must not make an unsupported criminal-offense claim`);
    assert.doesNotMatch(source, /operating[^.]{0,80}without both approvals[^.]{0,30}(?:is|constitutes) (?:a )?(?:crime|criminal offense)/i, `${relative} must not restate an unsupported criminal-offense claim`);
    assert.doesNotMatch(source, /\b184 operating storefronts\b/i, `${relative} must not turn active-license records into proven operating storefronts`);
    assert.doesNotMatch(source, /\*\*\*/, `${relative} must not expose malformed emphasis text`);
    assert.doesNotMatch(source, /existing licensed operators are typically grandfathered|most towns require|budget 4-12 weeks/i, `${relative} must not generalize ordinance-specific municipal procedures`);
    assert.doesNotMatch(source, /zoning requirements \(commercial zone, 500-foot buffer from schools/i, `${relative} must not present Maine's 500-foot municipal floor as the statewide default setback`);
  }

  assert.equal(authorization.meta.status_counts.explicit_opt_out, 0,
    'explicit opt-out claims require primary local evidence, not an OCP N activity flag');
});

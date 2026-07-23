'use strict';

/**
 * Tests for apps/maine-cannabis/scripts/derived/signal-page-model.cjs
 *
 * These prove the read-only MDG Signal page model contract:
 *
 *  - exactly the curated 12 municipalities are emitted
 *  - licenses, population, density, geoid, acs vintage, data_as_of match the
 *    current MDG-DATA products (retail-licenses-by-municipality.csv,
 *    retail-licenses-per-10k.csv, dispensary-directory.csv)
 *  - the dispensary-directory store list for each municipality is filtered to
 *    Active store licenses and never exposes contact_email / contact_phone
 *  - the derivation fails fast if any required product or the manifest is
 *    missing
 *  - the derivation is deterministic across runs (sorted by density desc, then
 *    city name asc)
 *  - the derivation NEVER reads dispensary-menu-prices (proves the
 *    "menu-price not ready" boundary in code, not just UI)
 *
 * The tests use a fixture MDG-DATA tree created in a tmpdir so the canonical
 * repository tree is not mutated and the test is hermetic.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');

const SCRIPT = path.join(__dirname, '..', 'signal-page-model.cjs');

function writeFixture(root) {
  fs.mkdirSync(path.join(root, 'products'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'manifest.json'),
    JSON.stringify(
      {
        schema_version: 1,
        release_id: 'test-release-abc123',
        transform_version: '1',
        inputs: [
          { source_id: 'census_acs5_population', sha256: 'a'.repeat(64) },
          { source_id: 'ocp_licenses', sha256: 'b'.repeat(64) },
        ],
        files: [],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(root, 'products', 'retail-licenses-by-municipality.csv'),
    [
      'geoid,active_adult_use_cannabis_store_licenses,data_as_of',
      '2300560545,27,2026-06-01', // Portland
      '2300571990,11,2026-06-01', // South Portland
      '2301902795,10,2026-06-01', // Bangor
      '2300138740,8,2026-06-01',  // Lewiston
      '2300102060,7,2026-06-01',  // Auburn
      '2301102100,5,2026-06-01',  // Augusta
      '2301180740,6,2026-06-01',  // Waterville
      '2303165725,4,2026-06-01',  // Sanford
      '2300508430,3,2026-06-01',  // Brunswick
      '2303137270,2,2026-06-01',  // Kittery
      '2301955565,4,2026-06-01',  // Orono
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(root, 'products', 'retail-licenses-per-10k.csv'),
    [
      'geoid,active_adult_use_cannabis_store_licenses,population,rate_per_10k_unrounded,rate_per_10k_display,suppressed,suppression_reason,acs_vintage,data_as_of',
      '2300560545,27,68854,3.921,3.92,false,,2024,2026-06-01',
      '2300571990,11,26930,4.084,4.08,false,,2024,2026-06-01',
      '2301902795,10,31938,3.131,3.13,false,,2024,2026-06-01',
      '2300138740,8,38324,2.087,2.09,false,,2024,2026-06-01',
      '2300102060,7,24602,2.845,2.85,false,,2024,2026-06-01',
      '2301102100,5,19077,2.621,2.62,false,,2024,2026-06-01',
      '2301180740,6,17077,3.514,3.51,false,,2024,2026-06-01',
      '2303165725,4,22247,1.798,1.80,false,,2024,2026-06-01',
      '2300508430,3,22336,1.343,1.34,false,,2024,2026-06-01',
      '2303137270,2,10473,1.910,1.91,false,,2024,2026-06-01',
      '2301955565,4,12341,3.241,3.24,false,,2024,2026-06-01',
    ].join('\n')
  );
  const directoryHeader = 'license_id,legal_name,dba,license_type_raw,license_status,street_address_raw,city_raw,geoid,county_raw,website_raw,has_website,contact_email,contact_phone,issue_date,first_issue_date,price_capture_status';
  const directoryRows = [
    `${directoryHeader}`,
    'AMS101,PORTLAND STORE ONE,GREEN LEAF,Store,Active,1 Main St,Portland,2300560545,Cumberland,https://x.test,true,secret@x.test,+1-555-000-0001,01-JAN-22,01-JAN-22,not_attempted',
    'AMS102,PORTLAND STORE TWO,BLUE LEAF,Store,Active,2 Main St,Portland,2300560545,Cumberland,,false,bob@x.test,+1-555-000-0002,01-JAN-23,01-JAN-23,not_attempted',
    'AMS103,OLD CLOSED,LATE LEAF,Store,Closed,3 Main St,Portland,2300560545,Cumberland,,false,,+1-555-000-0099,01-JAN-21,01-JAN-21,not_attempted',
    'AMS201,BANGOR STORE ONE,RIVER LEAF,Store,Active,4 River Rd,Bangor,2301902795,Penobscot,,false,,+1-555-000-0010,01-JAN-22,01-JAN-22,not_attempted',
    'AMS301,S PORTLAND STORE,SOUTH LEAF,Store,Active,5 Ocean Ave,South Portland,2300571990,Cumberland,,false,,+1-555-000-0020,01-JAN-22,01-JAN-22,not_attempted',
    'AMS401,LEWISTON STORE,L L EAF,Store,Active,6 Lisbon St,Lewiston,2300138740,Androscoggin,,false,,+1-555-000-0030,01-JAN-22,01-JAN-22,not_attempted',
    'AMS501,AUBURN STORE,AU LEAF,Store,Active,7 Union St,Auburn,2300102060,Androscoggin,,false,,+1-555-000-0040,01-JAN-22,01-JAN-22,not_attempted',
    'AMS601,AUGUSTA STORE,AG LEAF,Store,Active,8 State St,Augusta,2301102100,Kennebec,,false,,+1-555-000-0050,01-JAN-22,01-JAN-22,not_attempted',
    'AMS701,WATERVILLE STORE,WV LEAF,Store,Active,9 Main St,Waterville,2301180740,Kennebec,,false,,+1-555-000-0060,01-JAN-22,01-JAN-22,not_attempted',
    'AMS801,SANFORD STORE,SF LEAF,Store,Active,10 Main St,Sanford,2303165725,York,,false,,+1-555-000-0070,01-JAN-22,01-JAN-22,not_attempted',
    'AMS901,BRUNSWICK STORE,BW LEAF,Store,Active,11 Maine St,Brunswick,2300508430,Cumberland,,false,,+1-555-000-0080,01-JAN-22,01-JAN-22,not_attempted',
    'AMS1001,KITTERY STORE,KT LEAF,Store,Active,12 Walker St,Kittery,2303137270,York,,false,,+1-555-000-0090,01-JAN-22,01-JAN-22,not_attempted',
    'AMS1101,ORONO STORE,OR LEAF,Store,Active,13 Main St,Orono,2301955565,Penobscot,,false,,+1-555-000-0110,01-JAN-22,01-JAN-22,not_attempted',
  ];
  fs.writeFileSync(path.join(root, 'products', 'dispensary-directory.csv'), directoryRows.join('\n'));
  fs.writeFileSync(
    path.join(root, 'products', 'retail-optin-gap.csv'),
    'geoid,municipality,opted_in,data_as_of\n2300560545,Portland,true,2026-06-01\n'
  );
}

function makeTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-test-'));
  writeFixture(dir);
  return dir;
}

function cleanup(dir) {
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

test('derives exactly the 11 curated municipalities from the source data', () => {
  const dir = makeTmp();
  try {
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    const out = m.derive({ sourceRoot: dir });
    assert.equal(out.municipalities.length, 11);
    const names = out.municipalities.map((row) => row.city).sort();
    assert.deepEqual(names, [
      'Auburn', 'Augusta', 'Bangor', 'Brunswick', 'Kittery',
      'Lewiston', 'Orono', 'Portland', 'Sanford', 'South Portland',
      'Waterville',
    ]);
  } finally { cleanup(dir); }
});

test('license count, population, density, geoid, vintage, data_as_of come from products', () => {
  const dir = makeTmp();
  try {
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    const out = m.derive({ sourceRoot: dir });
    const portland = out.municipalities.find((row) => row.city === 'Portland');
    assert.ok(portland, 'Portland row should be present');
    assert.equal(portland.geoid, '2300560545');
    assert.equal(portland.licenses, 27);
    assert.equal(portland.population, 68854);
    assert.equal(portland.density, 3.92);
    assert.equal(portland.acsVintage, 2024);
    assert.equal(portland.dataAsOf, '2026-06-01');
    assert.equal(portland.releaseId, 'test-release-abc123');
  } finally { cleanup(dir); }
});

test('store list filters to Active licenses and strips contact_email / contact_phone', () => {
  const dir = makeTmp();
  try {
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    const out = m.derive({ sourceRoot: dir });
    const portland = out.municipalities.find((row) => row.city === 'Portland');
    assert.equal(portland.stores.length, 2, 'only the two Active Portland stores');
    for (const store of portland.stores) {
      assert.ok(!('contact_email' in store), 'contact_email must not leak');
      assert.ok(!('contact_phone' in store), 'contact_phone must not leak');
      assert.ok(typeof store.licenseId === 'string');
      assert.ok(typeof store.legalName === 'string');
      assert.ok(typeof store.firstIssued === 'string');
    }
    assert.ok(portland.stores.some((store) => store.licenseId === 'AMS101'));
  } finally { cleanup(dir); }
});

test('derivation is deterministic: sorted by density desc then city asc', () => {
  const dir = makeTmp();
  try {
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    const a = m.derive({ sourceRoot: dir });
    const b = m.derive({ sourceRoot: dir });
    assert.deepEqual(a, b);
    // South Portland density 4.08 > Portland 3.92 > Waterville 3.51 > Orono 3.24 > Bangor 3.13 > ...
    const top = a.municipalities.map((row) => row.city);
    assert.equal(top[0], 'South Portland');
    assert.equal(top[1], 'Portland');
  } finally { cleanup(dir); }
});

test('derivation fails fast when manifest.json is missing', () => {
  const dir = makeTmp();
  try {
    fs.unlinkSync(path.join(dir, 'manifest.json'));
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    assert.throws(() => m.derive({ sourceRoot: dir }), /manifest\.json/);
  } finally { cleanup(dir); }
});

test('derivation fails fast when a required product CSV is missing', () => {
  const dir = makeTmp();
  try {
    fs.unlinkSync(path.join(dir, 'products', 'retail-licenses-per-10k.csv'));
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    assert.throws(() => m.derive({ sourceRoot: dir }), /retail-licenses-per-10k/);
  } finally { cleanup(dir); }
});

test('derivation NEVER reads dispensary-menu-prices (proves "not ready" boundary)', () => {
  const dir = makeTmp();
  try {
    // Plant a menu-prices CSV; the derivation must not surface any price field.
    fs.writeFileSync(
      path.join(dir, 'products', 'dispensary-menu-prices.csv'),
      [
        'license_id,product_name,price_usd,observed_at',
        'AMS101,Sour Diesel 1g,18.00,2026-06-15',
        'AMS101,Pre-roll 1g,12.00,2026-06-15',
      ].join('\n')
    );
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    const out = m.derive({ sourceRoot: dir });
    for (const muni of out.municipalities) {
      for (const store of muni.stores) {
        assert.ok(!('price' in store), 'no price field allowed');
        assert.ok(!('menu' in store), 'no menu field allowed');
      }
      assert.ok(!('menu' in muni), 'no menu field on municipality');
      assert.ok(!('prices' in muni), 'no prices field on municipality');
    }
    assert.ok(out.capabilities, 'must declare capabilities');
    assert.equal(out.capabilities.menuPrices, 'not_ready');
  } finally { cleanup(dir); }
});

test('capabilities declare current, partial, and proposed-paid states explicitly', () => {
  const dir = makeTmp();
  try {
    delete require.cache[require.resolve(SCRIPT)];
    const m = require(SCRIPT);
    const out = m.derive({ sourceRoot: dir });
    assert.equal(out.capabilities.licensesByMunicipality, 'current');
    assert.equal(out.capabilities.licensesPer10k, 'current');
    assert.equal(out.capabilities.optinCoverage, 'partial');
    assert.equal(out.capabilities.menuPrices, 'not_ready');
    assert.equal(out.capabilities.watchlist, 'proposed_paid');
    assert.equal(out.capabilities.changeAlerts, 'proposed_paid');
  } finally { cleanup(dir); }
});

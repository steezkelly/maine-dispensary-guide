'use strict';

/**
 * scripts/pdf/__tests__/mdg-q3-2026-chart-data.test.cjs
 *
 * Focused regression test for the Q3 2026 PDF chart-data pipeline.
 * The pipeline reads the verified source pool and writes 11 chart-data
 * JSON files. This test guards:
 *   - exactly 11 chart-data files are written
 *   - each file has id, title, source (url, retrieval_date, status),
 *     observation_period, and data/tiers arrays
 *   - all numeric values are finite and non-negative
 *   - the frozen verified figures appear in the correct charts
 *   - no chart uses July 2026 data (incomplete month)
 *
 * Run with: node scripts/pdf/__tests__/mdg-q3-2026-chart-data.test.cjs
 */

const assert = require('node:assert/strict');
const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const REPO = resolve(__dirname, '..', '..', '..');
const OUT_DIR = resolve(REPO, 'apps/maine-cannabis/scripts/pdf/data/q3-2026');

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    process.stderr.write('  ok  ' + name + '\n');
    pass += 1;
  } catch (err) {
    process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n');
    fail += 1;
  }
}

// Run the pipeline first
const { main } = require('../mdg-q3-2026-chart-data.cjs');
const result = main();

const EXPECTED_IDS = [
  'adult-use-monthly-sales-trailing-12m',
  '2026-ytd-kpi-cards',
  'bud-flower-price-compression',
  'product-mix-shift',
  'ocp-vs-mrs-monthly-lens',
  'adult-use-tax-receipts',
  'active-adult-use-license-mix',
  'adult-use-footprint-by-county',
  'medical-program-divergence',
  'medical-access-geography',
  'market-structure-snapshot',
];

check('pipeline writes exactly 11 chart-data files', () => {
  assert.equal(result.charts.length, 11, 'must produce 11 charts');
  const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).sort();
  const expectedFiles = EXPECTED_IDS.slice().sort().map((id) => id + '.json');
  assert.deepEqual(onDisk, expectedFiles, 'on-disk files must match expected ids');
});

check('every chart JSON has required top-level fields', () => {
  for (const id of EXPECTED_IDS) {
    const path = resolve(OUT_DIR, id + '.json');
    assert.ok(existsSync(path), `${id}.json must exist`);
    const chart = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(typeof chart.id, 'string', `${id}.id must be a string`);
    assert.equal(chart.id, id, `${id}.id must match filename`);
    assert.equal(typeof chart.title, 'string', `${id}.title must be a string`);
    assert.ok(chart.title.length > 5, `${id}.title must be non-trivial`);
    assert.equal(typeof chart.source, 'object', `${id}.source must be an object`);
    assert.equal(typeof chart.source.url, 'string', `${id}.source.url must be a string`);
    assert.equal(chart.source.retrieval_date, '2026-07-22', `${id}.source.retrieval_date must be 2026-07-22`);
    assert.equal(typeof chart.source.status, 'string', `${id}.source.status must be a string`);
    assert.equal(typeof chart.observation_period, 'string', `${id}.observation_period must be a string`);
    assert.ok(
      Array.isArray(chart.data) || Array.isArray(chart.tiers),
      `${id} must have data or tiers array`,
    );
  }
});

check('all numeric values are finite and non-negative', () => {
  for (const id of EXPECTED_IDS) {
    const chart = JSON.parse(readFileSync(resolve(OUT_DIR, id + '.json'), 'utf8'));
    const values = (chart.data || []).map((d) => Number(d.value));
    for (const v of values) {
      assert.ok(Number.isFinite(v), `${id} has non-finite value: ${v}`);
      assert.ok(v >= 0, `${id} has negative value: ${v}`);
    }
  }
});

check('no chart references July 2026 (incomplete month)', () => {
  for (const id of EXPECTED_IDS) {
    const raw = readFileSync(resolve(OUT_DIR, id + '.json'), 'utf8');
    assert.doesNotMatch(raw, /July 2026/i, `${id} must not reference July 2026`);
    assert.doesNotMatch(raw, /Jul 2026/i, `${id} must not reference Jul 2026`);
  }
});

check('chart 1 (adult-use monthly sales) has verified June 2026 + YTD figures', () => {
  const chart = JSON.parse(readFileSync(resolve(OUT_DIR, 'adult-use-monthly-sales-trailing-12m.json'), 'utf8'));
  assert.ok(Array.isArray(chart.data), 'must have data array');
  assert.ok(chart.data.length >= 2, 'must have at least June 2026 + YTD data points');
  // June 2026 must be present with the frozen figure
  const june = chart.data.find((d) => /jun/i.test(d.label));
  assert.ok(june, 'June 2026 data point must exist');
  assert.equal(june.value, 20688125, 'June 2026 sales must be $20,688,125');
  // YTD must be present
  const ytd = chart.data.find((d) => /ytd|jan/i.test(d.label));
  assert.ok(ytd, 'YTD data point must exist');
  assert.equal(ytd.value, 119954243, 'YTD sales must be $119,954,243');
  // Must note that full monthly series requires OCP dashboard export
  const raw = readFileSync(resolve(OUT_DIR, 'adult-use-monthly-sales-trailing-12m.json'), 'utf8');
  assert.match(raw, /preliminary/i, 'must label OCP data as preliminary');
});

check('chart 2 (YTD KPI cards) has the frozen Jan-Jun figures', () => {
  const chart = JSON.parse(readFileSync(resolve(OUT_DIR, '2026-ytd-kpi-cards.json'), 'utf8'));
  assert.ok(Array.isArray(chart.data), 'must have data array');
  const sales = chart.data.find((d) => /sales/i.test(d.label));
  const txns = chart.data.find((d) => /transaction/i.test(d.label));
  const price = chart.data.find((d) => /price/i.test(d.label));
  assert.ok(sales, 'sales KPI must exist');
  assert.equal(sales.value, 119954243, 'YTD sales must be $119,954,243');
  assert.ok(txns, 'transactions KPI must exist');
  assert.equal(txns.value, 2439812, 'YTD transactions must be 2,439,812');
  assert.ok(price, 'price KPI must exist');
  assert.equal(price.value, 6.10, 'YTD avg price must be $6.10/g');
});

check('chart 3 (price compression) has 2021-2025 + 2026 YTD', () => {
  const chart = JSON.parse(readFileSync(resolve(OUT_DIR, 'bud-flower-price-compression.json'), 'utf8'));
  assert.ok(Array.isArray(chart.data), 'must have data array');
  assert.ok(chart.data.length >= 6, 'must have at least 6 data points (2021-2025 + 2026 YTD)');
  const y2025 = chart.data.find((d) => /2025/.test(d.label));
  assert.ok(y2025, '2025 data point must exist');
  assert.equal(y2025.value, 6.62, '2025 avg price must be $6.62/g');
  const ytd = chart.data.find((d) => /2026/i.test(d.label));
  assert.ok(ytd, '2026 YTD data point must exist');
  assert.equal(ytd.value, 6.10, '2026 YTD avg price must be $6.10/g');
});

check('chart 6 (tax receipts) has May 2026 MRS figures', () => {
  const chart = JSON.parse(readFileSync(resolve(OUT_DIR, 'adult-use-tax-receipts.json'), 'utf8'));
  assert.ok(Array.isArray(chart.data), 'must have data array');
  const salesTax = chart.data.find((d) => /2026-05.*sales.tax/i.test(d.label));
  const excise = chart.data.find((d) => /2026-05.*excise/i.test(d.label));
  assert.ok(salesTax, 'May 2026 sales-tax revenue data point must exist');
  assert.equal(salesTax.value, 2744931.97, 'May 2026 AU sales-tax revenue must be $2,744,931.97');
  assert.ok(excise, 'May 2026 excise-tax revenue data point must exist');
  assert.equal(excise.value, 1097908.09, 'May 2026 AU excise revenue must be $1,097,908.09');
});

check('chart 7 (license mix) has the frozen roster counts', () => {
  const chart = JSON.parse(readFileSync(resolve(OUT_DIR, 'active-adult-use-license-mix.json'), 'utf8'));
  assert.ok(Array.isArray(chart.data), 'must have data array');
  const stores = chart.data.find((d) => /store/i.test(d.label));
  const mfg = chart.data.find((d) => /manufactur/i.test(d.label));
  const cult = chart.data.find((d) => /cultivat/i.test(d.label));
  const test = chart.data.find((d) => /test/i.test(d.label));
  assert.ok(stores, 'stores data point must exist');
  assert.equal(stores.value, 187, 'active stores must be 187');
  assert.ok(mfg, 'manufacturing data point must exist');
  assert.equal(mfg.value, 80, 'active manufacturing must be 80');
  assert.ok(cult, 'cultivation data point must exist');
  assert.equal(cult.value, 76, 'active cultivation must be 76');
  assert.ok(test, 'testing data point must exist');
  assert.equal(test.value, 3, 'active testing must be 3');
});

check('chart 11 (market structure) has CY2025 anchor editions', () => {
  const chart = JSON.parse(readFileSync(resolve(OUT_DIR, 'market-structure-snapshot.json'), 'utf8'));
  const raw = readFileSync(resolve(OUT_DIR, 'market-structure-snapshot.json'), 'utf8');
  assert.match(raw, /246[.,]?8/, 'must reference the live dashboard ~$246.8M edition');
  assert.match(raw, /246[.,]?4/, 'must reference the frozen statutory $246.4M edition');
});

process.stderr.write('\nmdg-q3-2026-chart-data.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  validateEnv,
  getOutputDir,
  runQuery,
  writeIndexMd,
  writeDashboard,
  tableFromRows,
} = require('./ga4-deep-pull.cjs');

test('validateEnv fails when GA4_PROPERTY_ID missing', () => {
  delete process.env.GA4_PROPERTY_ID;
  assert.throws(() => validateEnv(), /GA4_PROPERTY_ID/);
});

test('validateEnv fails when GOOGLE_APPLICATION_CREDENTIALS missing', () => {
  process.env.GA4_PROPERTY_ID = '532778727';
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  assert.throws(() => validateEnv(), /GOOGLE_APPLICATION_CREDENTIALS/);
});

test('validateEnv passes when both present', () => {
  process.env.GA4_PROPERTY_ID = '532778727';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/fake.json';
  assert.doesNotThrow(() => validateEnv());
});

test('getOutputDir returns dated path', () => {
  const dir = getOutputDir();
  assert.match(dir, /data\/ga4-pull-\d{4}-\d{2}-\d{2}$/);
});

test('runQuery flattens dimension and metric headers', async () => {
  const fakeClient = {
    properties: {
      runReport: async () => ({
        data: {
          rows: [
            {
              dimensionValues: [{ value: '/' }, { value: 'Home' }],
              metricValues: [{ value: '142' }, { value: '87.3' }],
            },
          ],
          rowCount: '1',
          metadata: { currencyCode: 'USD', timeZone: 'America/New_York' },
        },
      }),
    },
  };
  const queryDef = {
    name: 'pageviews',
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'engagementDuration' }],
    rowCap: 10000,
  };
  const result = await runQuery(fakeClient, '532778727', queryDef);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0].dimensions, { pagePath: '/', pageTitle: 'Home' });
  assert.deepEqual(result.rows[0].metrics, { screenPageViews: 142, engagementDuration: 87.3 });
  assert.equal(result.truncated, false);
});

test('tableFromRows formats a 5-col header + N rows', () => {
  const rows = [
    { dimensions: { a: 'x', b: 'y' }, metrics: { p: 1, q: 2, r: 3 } },
    { dimensions: { a: 'with|pipe', b: 'plain' }, metrics: { p: 4, q: 5, r: 6 } },
  ];
  const t = tableFromRows(rows, ['a', 'b'], ['p', 'q', 'r']);
  assert.match(t, /\| a \| b \| p \| q \| r \|/);
  assert.match(t, /\| x \| y \| 1 \| 2 \| 3 \|/);
  assert.match(t, /\| with\\\|pipe \| plain \| 4 \| 5 \| 6 \|/);
});

test('tableFromRows handles empty rows', () => {
  assert.equal(tableFromRows([], ['a'], ['p']), '_no rows_');
});

test('writeIndexMd produces all spec sections', () => {
  const tmpDir = fs.mkdtempSync('/tmp/ga4-index-smoke-');
  fs.mkdirSync(path.join(tmpDir, 'raw'), { recursive: true });
  // Synthesize minimal JSONL
  const writeJsonl = (name, rows) => {
    fs.writeFileSync(path.join(tmpDir, 'raw', `${name}.jsonl`),
      rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  };
  writeJsonl('timeseries', [
    { dimensions: { date: '20260701' }, metrics: { users: 10, sessions: 15, screenPageViews: 40, eventCount: 5 } },
    { dimensions: { date: '20260702' }, metrics: { users: 12, sessions: 18, screenPageViews: 45, eventCount: 7 } },
  ]);
  writeJsonl('pageviews', [
    { dimensions: { pagePath: '/', pageTitle: 'Home' }, metrics: { screenPageViews: 100, engagementDuration: 50, bounceRate: 0.3 } },
  ]);
  writeJsonl('geography', [
    { dimensions: { country: 'US', city: 'Portland', region: 'ME' }, metrics: { totalUsers: 5, sessions: 8 } },
  ]);
  writeJsonl('acquisition', [
    { dimensions: { sessionSource: 'google', sessionMedium: 'organic', sessionCampaignName: '' }, metrics: { sessions: 20, engagedSessions: 15, engagementRate: 0.75 } },
  ]);
  writeJsonl('technology', [
    { dimensions: { deviceCategory: 'desktop', browser: 'Chrome', operatingSystem: 'Linux' }, metrics: { users: 10 } },
  ]);
  writeJsonl('lead_capture', []); // empty
  writeJsonl('new_vs_returning', [
    { dimensions: { newVsReturning: 'new' }, metrics: { totalUsers: 8, engagementRate: 0.6, sessions: 10 } },
  ]);

  const meta = {
    runAt: '2026-07-11T00:00:00.000Z',
    propertyId: '532778727',
    totalRows: 23,
    dateRange: { start: '2020-01-01', end: 'today' },
    queriesRun: 7,
    queriesFailed: 0,
  };
  const summary = [
    { name: 'timeseries', rows: 2 },
    { name: 'pageviews', rows: 1 },
    { name: 'geography', rows: 1 },
    { name: 'acquisition', rows: 1 },
    { name: 'technology', rows: 1 },
    { name: 'lead_capture', rows: 0 },
    { name: 'new_vs_returning', rows: 1 },
  ];

  writeIndexMd(tmpDir, meta, summary);
  const md = fs.readFileSync(path.join(tmpDir, 'index.md'), 'utf8');

  // Spec assertions
  assert.match(md, /^# GA4 Deep Pull — 2026-07-11/m);
  assert.match(md, /## Headline/);
  assert.match(md, /Total users:.*22/); // 10 + 12
  assert.match(md, /Total sessions:.*33/); // 15 + 18
  assert.match(md, /## By page/);
  assert.match(md, /## By geography/);
  assert.match(md, /## By source/);
  assert.match(md, /## By device/);
  assert.match(md, /## Lead capture funnel/);
  assert.match(md, /## New vs returning/);
  assert.match(md, /## Time series/);
  assert.match(md, /## Files/);
  assert.match(md, /raw\/pageviews\.jsonl/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('writeDashboard produces valid HTML referencing Chart.js + 4 canvases', () => {
  const tmpDir = fs.mkdtempSync('/tmp/ga4-dash-smoke-');
  fs.mkdirSync(path.join(tmpDir, 'raw'), { recursive: true });
  writeDashboard(tmpDir, {
    runAt: '2026-07-11T00:00:00.000Z',
    propertyId: '532778727',
    totalRows: 5,
    dateRange: { start: '2020-01-01', end: 'today' },
    queriesRun: 4,
    queriesFailed: 0,
  });
  const html = fs.readFileSync(path.join(tmpDir, 'dashboard.html'), 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /chart\.umd\.min\.js/);
  assert.match(html, /<canvas id="tsChart">/);
  assert.match(html, /<canvas id="pageChart">/);
  assert.match(html, /<canvas id="srcChart">/);
  assert.match(html, /<canvas id="devChart">/);
  assert.match(html, /loadJsonl\('raw\/timeseries\.jsonl'\)/);
  assert.match(html, /loadJsonl\('raw\/pageviews\.jsonl'\)/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
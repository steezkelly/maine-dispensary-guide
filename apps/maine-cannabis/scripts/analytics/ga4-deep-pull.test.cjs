const { test } = require('node:test');
const assert = require('node:assert');
const { validateEnv, getOutputDir, runQuery } = require('./ga4-deep-pull.cjs');

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
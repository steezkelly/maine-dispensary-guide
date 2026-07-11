const { test } = require('node:test');
const assert = require('node:assert');
const { validateEnv, getOutputDir } = require('./ga4-deep-pull.cjs');

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
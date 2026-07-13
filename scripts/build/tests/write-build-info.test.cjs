'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createBuildInfo, writeBuildInfo } = require('../write-build-info.cjs');

const SHA = '0123456789abcdef0123456789abcdef01234567';
const BUILT_AT = '2026-07-13T20:32:00.000Z';

test('createBuildInfo emits only safe release provenance fields', () => {
  assert.deepEqual(createBuildInfo({
    gitSha: SHA,
    now: new Date(BUILT_AT),
    env: {
      VERCEL_ENV: 'production',
      VERCEL_DEPLOYMENT_ID: 'dpl_example',
      SECRET_TOKEN: 'must-not-leak',
    },
  }), {
    schemaVersion: 1,
    gitSha: SHA,
    shortSha: '0123456',
    builtAt: BUILT_AT,
    environment: 'production',
    deploymentId: 'dpl_example',
  });
});

test('writeBuildInfo writes public build metadata beneath the active repository root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-build-info-'));
  try {
    const output = writeBuildInfo({
      root,
      gitSha: SHA,
      now: new Date(BUILT_AT),
      env: { VERCEL_ENV: 'preview' },
    });
    assert.equal(output, path.join(root, 'apps', 'maine-cannabis', 'public', 'build-info.json'));
    assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')), {
      schemaVersion: 1,
      gitSha: SHA,
      shortSha: '0123456',
      builtAt: BUILT_AT,
      environment: 'preview',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('createBuildInfo rejects a missing or malformed Git SHA', () => {
  assert.throws(() => createBuildInfo({ gitSha: 'not-a-sha', now: new Date(BUILT_AT), env: {} }), /40-character Git SHA/);
});

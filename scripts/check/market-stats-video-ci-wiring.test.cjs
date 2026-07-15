const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const ROOT = resolve(__dirname, '../..');
const CI_WORKFLOW = resolve(ROOT, '.github/workflows/ci.yml');
const ROOT_PACKAGE = resolve(ROOT, 'package.json');
const APP_PACKAGE = resolve(ROOT, 'apps/maine-cannabis/package.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('market-stats no-autoplay regression is wired into package and CI', () => {
  const workflow = readFileSync(CI_WORKFLOW, 'utf8');
  const rootPackage = readJson(ROOT_PACKAGE);
  const appPackage = readJson(APP_PACKAGE);

  assert.match(
    workflow,
    /npm run test:market-stats-video/,
    'CI workflow must invoke npm run test:market-stats-video',
  );

  assert.match(
    workflow,
    /market-stats-video/i,
    'CI workflow invocation should include the market-stats video test name',
  );

  assert.equal(
    rootPackage?.scripts?.['test:market-stats-video'],
    'npm --workspace @network/maine-cannabis run test:market-stats-video && node --test scripts/check/market-stats-video-ci-wiring.test.cjs',
    'root package script "test:market-stats-video" must run both the app regression and this CI-wiring assertion',
  );

  assert.equal(
    appPackage?.scripts?.['test:market-stats-video'],
    'node --test src/pages/__tests__/market-stats-video.test.cjs',
    'app package script "test:market-stats-video" must execute the existing regression test',
  );
});

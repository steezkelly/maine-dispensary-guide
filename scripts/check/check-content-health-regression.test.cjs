#!/usr/bin/env node
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = path.join(ROOT, 'scripts/check/content-health-regression.cjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'content-health-regression-'));
const fixtureDir = path.join(tempRoot, 'scripts/check');

try {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(fixtureDir, 'content-health-regression.cjs'));
  fs.writeFileSync(
    path.join(fixtureDir, 'check-content-health.cjs'),
    "console.log('❌ fixture check: 1 issue'); process.exit(1);\n",
  );

  const result = spawnSync('node', ['content-health-regression.cjs'], {
    cwd: fixtureDir,
    encoding: 'utf8',
  });
  const output = (result.stdout || '') + (result.stderr || '');

  assert.notEqual(result.status, 0, output);
  assert.match(output, /No baseline found/);
  assert.match(output, /--update-baseline/);
  assert.equal(fs.existsSync(path.join(fixtureDir, '.content-health-baseline.json')), false);

  const updateResult = spawnSync('node', ['content-health-regression.cjs', '--update-baseline'], {
    cwd: fixtureDir,
    encoding: 'utf8',
  });
  assert.equal(updateResult.status, 0, (updateResult.stdout || '') + (updateResult.stderr || ''));
  assert.equal(fs.existsSync(path.join(fixtureDir, '.content-health-baseline.json')), true);

  const zeroFixtureDir = path.join(tempRoot, 'zero/scripts/check');
  fs.mkdirSync(zeroFixtureDir, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(zeroFixtureDir, 'content-health-regression.cjs'));
  fs.writeFileSync(
    path.join(zeroFixtureDir, 'check-content-health.cjs'),
    "console.log('✅ fixture check: no issues'); process.exit(0);\n",
  );

  const zeroUpdate = spawnSync('node', ['content-health-regression.cjs', '--update-baseline'], {
    cwd: zeroFixtureDir,
    encoding: 'utf8',
  });
  assert.equal(zeroUpdate.status, 0, (zeroUpdate.stdout || '') + (zeroUpdate.stderr || ''));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(zeroFixtureDir, '.content-health-baseline.json'), 'utf8')), {});

  const zeroNormal = spawnSync('node', ['content-health-regression.cjs'], {
    cwd: zeroFixtureDir,
    encoding: 'utf8',
  });
  assert.equal(zeroNormal.status, 0, (zeroNormal.stdout || '') + (zeroNormal.stderr || ''));
  assert.match((zeroNormal.stdout || '') + (zeroNormal.stderr || ''), /No change from baseline/);

  console.log('content-health baseline regression: PASS');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

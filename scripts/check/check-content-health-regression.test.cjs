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

  console.log('content-health missing-baseline regression: PASS');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

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
    path.join(fixtureDir, 'content-health.cjs'),
    "console.log('🔍 Content Health QA\\n❌ fixture check: 1 issue(s)\\n\\n──\\nTotal: 1 failure(s), 0 warning(s)'); process.exit(1);\n",
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
  const baselineFile = path.join(fixtureDir, '.content-health-baseline.json');
  assert.equal(fs.existsSync(baselineFile), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(baselineFile, 'utf8')), { 'fixture check': 1 });

  const replacementFixtureDir = path.join(tempRoot, 'replacement/scripts/check');
  fs.mkdirSync(replacementFixtureDir, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(replacementFixtureDir, 'content-health-regression.cjs'));
  fs.writeFileSync(
    path.join(replacementFixtureDir, 'content-health.cjs'),
    "console.log('🔍 Content Health QA\\n❌ existing fixture check: 2 issue(s)\\n❌ new fixture check: 3 issue(s)\\n\\n──\\nTotal: 5 failure(s), 0 warning(s)'); process.exit(1);\n",
  );
  const replacementBaselineFile = path.join(replacementFixtureDir, '.content-health-baseline.json');
  fs.writeFileSync(replacementBaselineFile, JSON.stringify({ 'existing fixture check': 1 }, null, 2) + '\n');

  const replacementNormalBeforeUpdate = spawnSync('node', ['content-health-regression.cjs'], {
    cwd: replacementFixtureDir,
    encoding: 'utf8',
  });
  assert.notEqual(replacementNormalBeforeUpdate.status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(replacementBaselineFile, 'utf8')), { 'existing fixture check': 1 });

  const replacementUpdate = spawnSync('node', ['content-health-regression.cjs', '--update-baseline'], {
    cwd: replacementFixtureDir,
    encoding: 'utf8',
  });
  assert.equal(replacementUpdate.status, 0, (replacementUpdate.stdout || '') + (replacementUpdate.stderr || ''));
  assert.deepEqual(JSON.parse(fs.readFileSync(replacementBaselineFile, 'utf8')), {
    'existing fixture check': 2,
    'new fixture check': 3,
  });

  const replacementNormal = spawnSync('node', ['content-health-regression.cjs'], {
    cwd: replacementFixtureDir,
    encoding: 'utf8',
  });
  assert.equal(replacementNormal.status, 0, (replacementNormal.stdout || '') + (replacementNormal.stderr || ''));
  assert.match((replacementNormal.stdout || '') + (replacementNormal.stderr || ''), /No change from baseline/);

  const zeroFixtureDir = path.join(tempRoot, 'zero/scripts/check');
  fs.mkdirSync(zeroFixtureDir, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(zeroFixtureDir, 'content-health-regression.cjs'));
  fs.writeFileSync(
    path.join(zeroFixtureDir, 'content-health.cjs'),
    "console.log('🔍 Content Health QA\\n✅ fixture check: OK\\n\\n──\\nTotal: 0 failure(s), 0 warning(s)\\n\\n✅ All content health checks passed.'); process.exit(0);\n",
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

  const invalidBaseline = JSON.stringify({ 'existing fixture check': 4 }, null, 2) + '\n';
  const invalidCases = [
    {
      name: 'missing',
    },
    {
      name: 'crashing',
      checker: "throw new Error('fixture checker crashed');\n",
    },
    {
      name: 'warning-only',
      checker: "console.log('🔍 Content Health QA\\n⚠️ fixture check: ERROR — unavailable\\n\\n──\\nTotal: 0 failure(s), 1 warning(s)'); process.exit(2);\n",
    },
    {
      name: 'empty',
      checker: 'process.exit(0);\n',
    },
  ];

  for (const { name, checker } of invalidCases) {
    const invalidFixtureDir = path.join(tempRoot, name, 'scripts/check');
    fs.mkdirSync(invalidFixtureDir, { recursive: true });
    fs.copyFileSync(SOURCE, path.join(invalidFixtureDir, 'content-health-regression.cjs'));
    if (checker) {
      fs.writeFileSync(path.join(invalidFixtureDir, 'content-health.cjs'), checker);
    }
    const invalidBaselineFile = path.join(invalidFixtureDir, '.content-health-baseline.json');
    fs.writeFileSync(invalidBaselineFile, invalidBaseline);

    for (const args of [['content-health-regression.cjs'], ['content-health-regression.cjs', '--update-baseline']]) {
      const invalidResult = spawnSync('node', args, {
        cwd: invalidFixtureDir,
        encoding: 'utf8',
      });
      const invalidOutput = (invalidResult.stdout || '') + (invalidResult.stderr || '');
      assert.notEqual(invalidResult.status, 0, `${name} unexpectedly passed:\n${invalidOutput}`);
      assert.equal(
        fs.readFileSync(invalidBaselineFile, 'utf8'),
        invalidBaseline,
        `${name} changed the baseline in ${args.includes('--update-baseline') ? 'update' : 'normal'} mode`,
      );
    }
  }

  console.log('content-health baseline regression: PASS');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

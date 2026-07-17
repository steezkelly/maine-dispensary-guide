const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const validatorPath = path.join(root, 'scripts/analytics/check-answer-engine-benchmark-manifest.cjs');
const manifestPath = path.join(root, 'docs/analytics/answer-engine-benchmark-manifest.v1.json');

function runValidator(manifestOverride) {
  return spawnSync(process.execPath, [validatorPath], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ANSWER_ENGINE_BENCHMARK_MANIFEST_PATH: manifestOverride },
  });
}

test('validator accepts the active benchmark and its deferred retail-store query', () => {
  const result = runValidator(manifestPath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: 9 Maine-only benchmark queries/);
});

test('validator rejects an active retail-store query while its canonical page has a different value', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const deferredQuery = manifest.deferredQueries.find((entry) => entry.id === 'market-retail-stores');
  manifest.benchmarkQueries.push({
    id: deferredQuery.id,
    intent: deferredQuery.intent,
    query: deferredQuery.query,
    canonicalMdgUrl: deferredQuery.canonicalMdgUrl,
    requiredFactualClaims: [{
      claim: `Maine's 2025 OCP annual report records ${deferredQuery.requiredAnswer.value} adult-use retail stores at December 31, 2025.`,
      primarySourceReferences: deferredQuery.requiredAnswer.primarySourceReferences,
    }],
    queryOwner: 'MDG primary-source reviewer',
    reviewDate: '2026-10-15',
  });
  manifest.deferredQueries = [];

  const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-answer-engine-benchmark-'));
  const fixturePath = path.join(fixtureDirectory, 'manifest.json');
  fs.writeFileSync(fixturePath, `${JSON.stringify(manifest, null, 2)}\n`);

  try {
    const result = runValidator(fixturePath);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /market-retail-stores must remain deferred/);
  } finally {
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

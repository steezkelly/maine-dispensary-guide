#!/usr/bin/env node
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const fixtureSuffix = `${process.pid}-${Date.now()}-${randomBytes(6).toString('hex')}`;
const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-push-fake-npx-'));
const fakeNpx = path.join(binDir, 'npx');

function withFixture(filePath, content, run) {
  const existed = fs.existsSync(filePath);
  const original = existed ? fs.readFileSync(filePath) : null;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  try {
    return run();
  } finally {
    if (existed) fs.writeFileSync(filePath, original);
    else fs.rmSync(filePath, { force: true });
  }
}

function runPrePush(env = {}) {
  return spawnSync(
    'node',
    [
      'scripts/git/pre-push-verify.cjs',
      '--skip-sitemap-postprocess',
      '--skip-docs-vs-code',
      '--skip-compressed-frontmatter',
      '--skip-hero-image-naming',
    ],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } },
  );
}

try {
  fs.writeFileSync(
    fakeNpx,
    "#!/usr/bin/env node\nconsole.error('src/layouts/Layout.astro:12:5 - error ts(2554): Expected 1 arguments, but got 0.');\nprocess.exit(1);\n",
    { mode: 0o755 },
  );

  const preservationFixture = path.join(ROOT, 'apps/maine-cannabis/src/lib', `__pre-push-fixture-preservation-${fixtureSuffix}.ts`);
  fs.writeFileSync(preservationFixture, 'export const preserved = true;\n');
  try {
    withFixture(preservationFixture, 'export const replacement = true;\n', () => {
      assert.match(fs.readFileSync(preservationFixture, 'utf8'), /replacement/);
    });
    assert.equal(fs.readFileSync(preservationFixture, 'utf8'), 'export const preserved = true;\n');
  } finally {
    fs.rmSync(preservationFixture, { force: true });
  }

  const tsFixture = path.join(ROOT, 'apps/maine-cannabis/src/lib', `__pre-push-ts-consumer-fixture-${fixtureSuffix}.ts`);
  withFixture(tsFixture, 'export const prePushFixture = true;\n', () => {
    const result = runPrePush({ PATH: `${binDir}${path.delimiter}${process.env.PATH}` });
    const output = (result.stdout || '') + (result.stderr || '');
    assert.equal(result.status, 2, output);
    assert.match(output, /changed app source TS files may affect Astro consumers/);
    assert.match(output, /push blocked/);
    assert.match(output, /Layout\.astro/);
  });

  const mjsFixture = path.join(ROOT, 'scripts', `__pre-push-node-syntax-fixture-${fixtureSuffix}.mjs`);
  withFixture(mjsFixture, 'export const = ;\n', () => {
    const result = runPrePush();
    const output = (result.stdout || '') + (result.stderr || '');
    assert.equal(result.status, 10, output);
    assert.match(output, /node --check failed/);
    assert.match(output, /\.mjs/);
  });

  console.log('pre-push TS consumer and Node syntax regressions: PASS');
} finally {
  fs.rmSync(binDir, { recursive: true, force: true });
}

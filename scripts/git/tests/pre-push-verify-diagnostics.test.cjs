#!/usr/bin/env node
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const fixturePath = path.join(ROOT, 'apps/maine-cannabis/src/lib/__pre-push-ts-consumer-fixture.ts');
const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-push-fake-npx-'));
const fakeNpx = path.join(binDir, 'npx');

try {
  fs.writeFileSync(fixturePath, 'export const prePushFixture = true;\n');
  fs.writeFileSync(
    fakeNpx,
    "#!/usr/bin/env node\nconsole.error('src/layouts/Layout.astro:12:5 - error ts(2554): Expected 1 arguments, but got 0.');\nprocess.exit(1);\n",
    { mode: 0o755 },
  );

  const result = spawnSync(
    'node',
    [
      'scripts/git/pre-push-verify.cjs',
      '--skip-sitemap-postprocess',
      '--skip-docs-vs-code',
      '--skip-compressed-frontmatter',
      '--skip-hero-image-naming',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH}` },
    },
  );
  const output = (result.stdout || '') + (result.stderr || '');

  assert.equal(result.status, 2, output);
  assert.match(output, /changed app source TS files may affect Astro consumers/);
  assert.match(output, /push blocked/);
  assert.match(output, /Layout\.astro/);

  console.log('pre-push TS consumer-diagnostic regression: PASS');
} finally {
  fs.rmSync(fixturePath, { force: true });
  fs.rmSync(binDir, { recursive: true, force: true });
}

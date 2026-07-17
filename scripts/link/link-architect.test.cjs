const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

function runLinkArchitect(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-link-architect-'));
  const linkDir = path.join(root, 'scripts', 'link');
  const pathsDir = path.join(root, 'scripts', 'check', 'lib');
  const guidesDir = path.join(root, 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
  fs.mkdirSync(linkDir, { recursive: true });
  fs.mkdirSync(pathsDir, { recursive: true });
  fs.mkdirSync(guidesDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'link-architect.cjs'), path.join(linkDir, 'link-architect.cjs'));
  fs.copyFileSync(path.join(__dirname, '..', 'check', 'lib', 'paths.cjs'), path.join(pathsDir, 'paths.cjs'));
  const guidePath = path.join(guidesDir, 'fixture-guide.astro');
  fs.writeFileSync(guidePath, source);

  const result = spawnSync(process.execPath, [path.join(linkDir, 'link-architect.cjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  const output = fs.readFileSync(guidePath, 'utf8');
  fs.rmSync(root, { recursive: true, force: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return output;
}

test('links visible Astro article text without changing frontmatter or styles', () => {
  const source = `---
const metadataTerm = 'THC';
---
<Layout title="THC guide"><style>.THC { color: red; }</style><article><p>Learn about THC effects.</p></article></Layout>`;
  const output = runLinkArchitect(source);

  assert.ok(output.includes("const metadataTerm = 'THC';"));
  assert.ok(output.includes('.THC { color: red; }'));
  assert.ok(output.includes('<p>Learn about <a href="/glossary/#thc-(tetrahydrocannabinol)">THC</a> effects.</p>'));
});

test('links visible Astro copy after a style block when no article wrapper exists', () => {
  const source = `---
const metadataTerm = 'THC';
---
<Layout title="THC guide"><style>.THC { color: red; }</style><main><p>Learn about THC effects.</p></main></Layout>`;
  const output = runLinkArchitect(source);

  assert.ok(output.includes("const metadataTerm = 'THC';"));
  assert.ok(output.includes('.THC { color: red; }'));
  assert.ok(output.includes('<p>Learn about <a href="/glossary/#thc-(tetrahydrocannabinol)">THC</a> effects.</p>'));
});

test('protects style and script blocks that follow visible article copy', () => {
  const source = `---
const metadataTerm = 'THC';
---
<Layout title="THC guide"><article><p>Learn about Metrc reporting.</p></article><style>.THC { color: red; }</style><script>const label = 'Caregiver';</script></Layout>`;
  const output = runLinkArchitect(source);

  assert.ok(output.includes('<p>Learn about <a href="/glossary/#metrc">Metrc</a> reporting.</p>'));
  assert.ok(output.includes('<style>.THC { color: red; }</style>'));
  assert.ok(output.includes("<script>const label = 'Caregiver';</script>"));
});

test('does not link glossary terms inside existing anchors', () => {
  const source = `---
const metadataTerm = 'Municipal Opt-In';
---
<Layout><article><p><a href="/guides/maine-cannabis-municipal-opt-in-guide">Current municipal opt-in status</a>.</p><p>Use Metrc reporting.</p></article></Layout>`;
  const output = runLinkArchitect(source);

  assert.ok(output.includes('<a href="/guides/maine-cannabis-municipal-opt-in-guide">Current municipal opt-in status</a>'));
  assert.ok(output.includes('<p>Use <a href="/glossary/#metrc">Metrc</a> reporting.</p>'));
  assert.ok(!/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/i.test(output), 'output must not contain nested anchors');
});

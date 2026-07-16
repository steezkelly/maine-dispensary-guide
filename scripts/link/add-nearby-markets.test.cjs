const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const TARGET_GUIDES = [
  'auburn-dispensary-guide',
  'bangor-dispensary-guide',
  'biddeford-dispensary-guide',
  'kittery-dispensary-guide',
  'saco-dispensary-guide',
  'sanford-dispensary-guide',
  'waterville-dispensary-guide',
];

function copyScriptFixture(root) {
  const linkDir = path.join(root, 'scripts', 'link');
  const pathsDir = path.join(root, 'scripts', 'check', 'lib');
  const guidesDir = path.join(root, 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
  fs.mkdirSync(linkDir, { recursive: true });
  fs.mkdirSync(pathsDir, { recursive: true });
  fs.mkdirSync(guidesDir, { recursive: true });

  fs.copyFileSync(path.join(__dirname, 'add-nearby-markets.cjs'), path.join(linkDir, 'add-nearby-markets.cjs'));
  fs.copyFileSync(path.join(__dirname, '..', 'check', 'lib', 'paths.cjs'), path.join(pathsDir, 'paths.cjs'));

  const guideSource = '<article><section class="further-reading"><p>Links</p></section> <section class="disclaimer"><p>Legal</p></section></article>';
  for (const slug of TARGET_GUIDES) {
    fs.writeFileSync(path.join(guidesDir, `${slug}.astro`), guideSource);
  }

  return { guidesDir, scriptPath: path.join(linkDir, 'add-nearby-markets.cjs') };
}

test('nearby-market insertion preserves the preceding section close tag', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-nearby-markets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { guidesDir, scriptPath } = copyScriptFixture(root);

  const result = spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const firstRun = new Map();
  for (const slug of TARGET_GUIDES) {
    const output = fs.readFileSync(path.join(guidesDir, `${slug}.astro`), 'utf8');
    firstRun.set(slug, output);
    assert.ok(
      output.includes('<p>Links</p></section> <section> <h2>Nearby Markets</h2>'),
      `${slug} must close further-reading before Nearby Markets`,
    );
    assert.equal(
      (output.match(/<section\b/g) || []).length,
      (output.match(/<\/section>/g) || []).length,
      `${slug} must keep balanced section tags`,
    );
    const guideLinks = [...output.matchAll(/href="(\/guides\/[^"]+)"/g)].map((match) => match[1]);
    assert.equal(guideLinks.length, 3, `${slug} must include three nearby guide links`);
    assert.ok(guideLinks.every((href) => !href.endsWith('/')), `${slug} guide links must be slashless`);
  }

  const kittery = firstRun.get('kittery-dispensary-guide');
  assert.ok(
    kittery.includes('<tr><td>Portland</td><td>50 miles</td><td><a href="/guides/portland-dispensary-guide">Portland Guide</a></td><td>Largest Maine market</td></tr>'),
    'Kittery must point to Portland at 50 miles with the required relationship label',
  );

  const secondResult = spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' });
  assert.equal(secondResult.status, 0, secondResult.stderr || secondResult.stdout);
  for (const slug of TARGET_GUIDES) {
    const output = fs.readFileSync(path.join(guidesDir, `${slug}.astro`), 'utf8');
    assert.equal(output, firstRun.get(slug), `${slug} must be unchanged on an idempotent rerun`);
  }
});

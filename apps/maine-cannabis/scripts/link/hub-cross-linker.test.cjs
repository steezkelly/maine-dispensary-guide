'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const scriptPath = path.join(__dirname, 'hub-cross-linker.cjs');
const mapPath = path.join(__dirname, 'hub-cross-link-map.json');

function guideSource(topics, heading = '<h2>See also: Maine dispensary guides nearby</h2>') {
  return `---\nconst topics = ${JSON.stringify(topics)};\n---\n<Layout>\n<article>\n  <p>City copy.</p>\n  <section>\n    ${heading}\n    <p>Nearby guides.</p>\n  </section>\n</article>\n</Layout>\n`;
}

function makeFixture(guides, configureMap) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-hub-cross-linker-'));
  const linkDir = path.join(root, 'apps', 'maine-cannabis', 'scripts', 'link');
  const guidesDir = path.join(root, 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
  fs.mkdirSync(linkDir, { recursive: true });
  fs.mkdirSync(guidesDir, { recursive: true });
  fs.copyFileSync(scriptPath, path.join(linkDir, 'hub-cross-linker.cjs'));

  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  if (configureMap) configureMap(map);
  fs.writeFileSync(path.join(linkDir, 'hub-cross-link-map.json'), `${JSON.stringify(map, null, 2)}\n`);

  const mappedSlugs = new Set([
    ...map.alwaysRelevant.map((entry) => entry.slug),
    ...map.operators.map((entry) => entry.slug),
  ]);
  for (const slug of mappedSlugs) {
    fs.writeFileSync(path.join(guidesDir, `${slug}.astro`), '<Layout><article>Operator guide.</article></Layout>\n');
  }
  for (const [name, source] of Object.entries(guides)) {
    fs.writeFileSync(path.join(guidesDir, name), source);
  }

  return {
    root,
    guidesDir,
    script: path.join(linkDir, 'hub-cross-linker.cjs'),
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function run(fixture, ...args) {
  return spawnSync(process.execPath, [fixture.script, ...args], {
    cwd: fixture.root,
    encoding: 'utf8',
  });
}

function sectionLinks(source) {
  const section = source.match(/<section id="hub-cross-links">([\s\S]*?)<\/section>/);
  assert.ok(section, 'expected a hub-cross-links section');
  return [...section[1].matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

test('apply selects distinct topic-aware links and accepts heading attributes', () => {
  const fixture = makeFixture({
    'finance-dispensary-guide.astro': guideSource(['finance'])
      .replace('const topics = ["finance"]', "const topics = ['finance']"),
    'operations-dispensary-guide.astro': guideSource(
      ['operations'],
      '<h2 id="nearby-guides">See also: Maine dispensary guides nearby</h2>',
    ),
    'retailer-dispensary.astro': guideSource(['finance']),
  });
  try {
    const result = run(fixture, '--apply');
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /updated: 2 \| skipped: 0 \| mode: apply/);

    const finance = fs.readFileSync(path.join(fixture.guidesDir, 'finance-dispensary-guide.astro'), 'utf8');
    const operations = fs.readFileSync(path.join(fixture.guidesDir, 'operations-dispensary-guide.astro'), 'utf8');
    const retailer = fs.readFileSync(path.join(fixture.guidesDir, 'retailer-dispensary.astro'), 'utf8');
    const financeLinks = sectionLinks(finance);
    const operationsLinks = sectionLinks(operations);

    assert.equal(financeLinks.length, 5);
    assert.equal(operationsLinks.length, 5);
    assert.notDeepEqual(financeLinks, operationsLinks);
    assert.ok(financeLinks.includes('/guides/maine-cannabis-banking-solutions'));
    assert.ok(operationsLinks.includes('/guides/maine-cannabis-inventory-management'));
    assert.doesNotMatch(retailer, /id="hub-cross-links"/);
  } finally {
    fixture.cleanup();
  }
});

test('dry-run preserves bytes and diff reports the actual update count', () => {
  const source = guideSource(['finance']);
  const fixture = makeFixture({ 'finance-dispensary-guide.astro': source });
  try {
    const dryRun = run(fixture, '--dry-run');
    assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    assert.equal(
      fs.readFileSync(path.join(fixture.guidesDir, 'finance-dispensary-guide.astro'), 'utf8'),
      source,
    );

    const diff = run(fixture, '--diff');
    assert.equal(diff.status, 0, diff.stderr || diff.stdout);
    assert.match(diff.stdout, /would update: 1 \| skipped: 0 \| mode: diff/);
    assert.equal(
      fs.readFileSync(path.join(fixture.guidesDir, 'finance-dispensary-guide.astro'), 'utf8'),
      source,
    );
  } finally {
    fixture.cleanup();
  }
});

test('apply is idempotent and classifies already-linked files', () => {
  const fixture = makeFixture({ 'finance-dispensary-guide.astro': guideSource(['finance']) });
  try {
    const first = run(fixture, '--apply');
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const file = path.join(fixture.guidesDir, 'finance-dispensary-guide.astro');
    const once = fs.readFileSync(file, 'utf8');

    const second = run(fixture, '--apply');
    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.equal(fs.readFileSync(file, 'utf8'), once);
    assert.match(second.stdout, /\[skip:already-linked\] finance-dispensary-guide\.astro/);
    assert.match(second.stdout, /updated: 0 \| skipped: 1 \| mode: apply/);
  } finally {
    fixture.cleanup();
  }
});

test('missing anchors are reported by file and reason', () => {
  const fixture = makeFixture({
    'missing-anchor-dispensary-guide.astro': '---\nconst topics = ["finance"];\n---\n<Layout><article>No nearby section.</article></Layout>\n',
  });
  try {
    const result = run(fixture, '--dry-run');
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /\[skip:missing-anchor\] missing-anchor-dispensary-guide\.astro/);
    assert.match(result.stdout, /would update: 0 \| skipped: 1 \| mode: dry-run/);
  } finally {
    fixture.cleanup();
  }
});

test('route validation fails before any guide is written', () => {
  const source = guideSource(['finance']);
  const fixture = makeFixture(
    { 'finance-dispensary-guide.astro': source },
    (map) => {
      map.operators.push({
        slug: 'missing-operator-route',
        title: 'Missing Operator Route',
        topics: ['finance'],
        order: 99,
      });
      map._meta.operator_count += 1;
    },
  );
  try {
    fs.rmSync(path.join(fixture.guidesDir, 'missing-operator-route.astro'));
    const result = run(fixture, '--apply');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mapped route not found: \/guides\/missing-operator-route/);
    assert.equal(
      fs.readFileSync(path.join(fixture.guidesDir, 'finance-dispensary-guide.astro'), 'utf8'),
      source,
    );
  } finally {
    fixture.cleanup();
  }
});

test('the committed map resolves every unique slug to a guide route', () => {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const guidesDir = path.join(repoRoot, 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const slugs = new Set([
    ...map.alwaysRelevant.map((entry) => entry.slug),
    ...map.operators.map((entry) => entry.slug),
  ]);

  assert.equal(slugs.size, map._meta.operator_count);
  assert.equal(map.alwaysRelevant.length, map._meta.always_relevant_count);
  for (const slug of slugs) {
    assert.ok(fs.existsSync(path.join(guidesDir, `${slug}.astro`)), `missing route for ${slug}`);
  }
});

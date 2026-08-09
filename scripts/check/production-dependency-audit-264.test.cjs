const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function major(range) {
  const match = String(range).match(/\d+/);
  return match ? Number(match[0]) : NaN;
}

function atLeast(version, floor) {
  const parse = (value) => value.split('.').map(Number);
  const actual = parse(version);
  const minimum = parse(floor);
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}

function isPatchedAstro(range) {
  return major(range) === 7 && atLeast(String(range).replace(/^[^\d]*/, ''), '7.2.0');
}

test('all Astro package declarations use the supported Astro 7 line', () => {
  const root = readJson('package.json');
  const app = readJson('apps/maine-cannabis/package.json');
  const layouts = readJson('packages/layouts/package.json');
  const ui = readJson('packages/ui/package.json');

  assert.ok(isPatchedAstro(root.devDependencies.astro));
  assert.ok(isPatchedAstro(app.dependencies.astro));
  assert.ok(isPatchedAstro(layouts.dependencies.astro));
  assert.ok(isPatchedAstro(ui.dependencies.astro));
  assert.equal(major(app.dependencies['@astrojs/mdx']), 7);
  assert.equal(major(app.dependencies['@astrojs/vercel']), 11);
});

function resolvedVersions(packages, name) {
  return Object.entries(packages)
    .filter(([location]) => location.endsWith(`/${name}`))
    .map(([, details]) => details.version);
}

test('both committed lockfiles resolve secure production dependency floors', () => {
  for (const relativePath of ['package-lock.json', 'apps/maine-cannabis/package-lock.json']) {
    const packages = readJson(relativePath).packages || {};
    const astroVersions = resolvedVersions(packages, 'astro');

    assert.ok(astroVersions.length > 0, `${relativePath} must resolve Astro`);
    assert.ok(astroVersions.every((version) => isPatchedAstro(version)), relativePath);
    assert.ok(resolvedVersions(packages, 'sharp').every((version) => atLeast(version, '0.35.3')), relativePath);
    assert.ok(resolvedVersions(packages, 'nodemailer').every((version) => atLeast(version, '9.0.1')), relativePath);
    assert.ok(resolvedVersions(packages, 'fast-uri').every((version) => atLeast(version, '3.1.5')), relativePath);
    assert.ok(resolvedVersions(packages, 'js-yaml').every((version) => atLeast(version, '4.3.1')), relativePath);
  }
});

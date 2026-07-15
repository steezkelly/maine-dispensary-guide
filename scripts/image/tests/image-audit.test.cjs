const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { isResponsiveVariant, scanFilesystem } = require('../image-audit.cjs');

test('isResponsiveVariant identifies 640w jpeg derivatives only', () => {
  assert.equal(isResponsiveVariant('/images/heroes/city-640w.jpg'), true);
  assert.equal(isResponsiveVariant('/images/heroes/city-640w.jpeg'), true);
  assert.equal(isResponsiveVariant('/images/heroes/city.jpg'), false);
  assert.equal(isResponsiveVariant('/images/heroes/city-1280w.jpg'), false);
  assert.equal(isResponsiveVariant('/images/heroes/city-640w.webp'), false);
});

test('scanFilesystem excludes 640w responsive jpg variants from generated source image counts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-image-audit-'));
  try {
    const heroes = path.join(tmp, 'images', 'heroes');
    const infographics = path.join(tmp, 'images', 'infographics');
    fs.mkdirSync(heroes, { recursive: true });
    fs.mkdirSync(infographics, { recursive: true });
    fs.writeFileSync(path.join(heroes, 'portland.jpg'), 'x');
    fs.writeFileSync(path.join(heroes, 'portland-640w.jpg'), 'x');
    fs.writeFileSync(path.join(infographics, 'chart.jpg'), 'x');
    fs.writeFileSync(path.join(infographics, 'chart-640w.jpg'), 'x');

    const result = scanFilesystem(tmp);

    assert.deepEqual(result.heroFiles.map(f => path.basename(f.path)), ['portland.jpg']);
    assert.deepEqual(result.infographicFiles.map(f => path.basename(f.path)), ['chart.jpg']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

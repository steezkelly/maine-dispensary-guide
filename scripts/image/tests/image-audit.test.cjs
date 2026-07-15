#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const audit = require('../image-audit.cjs');
const { appRoot } = require('../../check/lib/paths.cjs');

function captureOutput(run) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  try {
    run();
  } finally {
    console.log = originalLog;
  }
  return lines.join('\n');
}

test('audit CLI resolves the Maine Cannabis app root', () => {
  assert.equal(audit.getProjectPaths().projectRoot, appRoot);
});

test('responsive JPEG is excluded from orphan comparison but included in size audit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-audit-'));
  const publicDir = path.join(root, 'public');
  const heroesDir = path.join(publicDir, 'images', 'heroes');
  fs.mkdirSync(heroesDir, { recursive: true });
  fs.writeFileSync(path.join(heroesDir, 'guide.jpg'), Buffer.from([0xff, 0xd8]));
  fs.writeFileSync(path.join(heroesDir, 'guide-640w.jpg'), '');

  try {
    const filesystem = audit.scanFilesystem(publicDir);
    assert.deepEqual(filesystem.heroFiles.map(file => path.basename(file.path)), ['guide.jpg']);
    assert.deepEqual(filesystem.heroAuditFiles.map(file => path.basename(file.path)).sort(), ['guide-640w.jpg', 'guide.jpg']);

    const output = captureOutput(() => audit.generateReport(
      'heroes',
      filesystem,
      {
        heroRefs: new Map(),
        infographicRefs: new Map(),
        pagesWithHeroField: [],
        pagesWithNullHero: [],
        pagesWithInfographic: [],
      },
      root,
      path.join(root, 'pages'),
    ));
    assert.match(output, /guide-640w\.jpg:.*CORRUPTED/);
    assert.match(output, /Summary: 2 images checked/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

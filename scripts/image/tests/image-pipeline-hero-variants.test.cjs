const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');
const {
  assertHeroImageSetReady,
  hasCompleteImageSet,
  writeHeroVariants,
  writeImageFiles,
} = require('../image-pipeline.cjs');

test('writeHeroVariants writes desktop and 640px mobile JPG, WebP, and AVIF files', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const source = await sharp({
    create: {
      width: 1200,
      height: 400,
      channels: 3,
      background: { r: 20, g: 80, b: 40 },
    },
  }).jpeg().toBuffer();
  const outputFile = path.join(tempDir, 'synthetic.jpg');

  await writeHeroVariants(source, outputFile);

  const expected = [
    ['synthetic.jpg', 'jpeg', 1200],
    ['synthetic.webp', 'webp', 1200],
    ['synthetic.avif', 'heif', 1200],
    ['synthetic-640w.jpg', 'jpeg', 640],
    ['synthetic-640w.webp', 'webp', 640],
    ['synthetic-640w.avif', 'heif', 640],
  ];

  for (const [filename, format, width] of expected) {
    const filePath = path.join(tempDir, filename);
    assert.equal(fs.existsSync(filePath), true, `${filename} should exist`);
    const metadata = await sharp(filePath).metadata();
    assert.equal(metadata.format, format, `${filename} should use ${format}`);
    assert.equal(metadata.width, width, `${filename} should be ${width}px wide`);
  }
});

test('writeHeroVariants does not publish a partial set when one encoder output fails', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-atomic-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const source = await sharp({
    create: {
      width: 1200,
      height: 400,
      channels: 3,
      background: { r: 20, g: 80, b: 40 },
    },
  }).jpeg().toBuffer();
  const outputFile = path.join(tempDir, 'synthetic.jpg');
  const blockedPath = path.join(tempDir, 'synthetic.avif');
  fs.mkdirSync(blockedPath);

  await assert.rejects(writeHeroVariants(source, outputFile));
  await new Promise(resolve => setTimeout(resolve, 500));

  for (const filename of [
    'synthetic.jpg',
    'synthetic.webp',
    'synthetic-640w.jpg',
    'synthetic-640w.webp',
    'synthetic-640w.avif',
  ]) {
    assert.equal(fs.existsSync(path.join(tempDir, filename)), false, `${filename} must not be published`);
  }
});

test('hasCompleteImageSet rejects an incomplete hero variant set', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-incomplete-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const outputFile = path.join(tempDir, 'synthetic.jpg');
  fs.writeFileSync(outputFile, 'partial');

  assert.equal(hasCompleteImageSet(outputFile, 'heroImage'), false);
  assert.equal(hasCompleteImageSet(outputFile, 'infographic'), true);

  const source = await sharp({
    create: {
      width: 1200,
      height: 400,
      channels: 3,
      background: { r: 20, g: 80, b: 40 },
    },
  }).jpeg().toBuffer();
  await writeHeroVariants(source, outputFile);
  assert.equal(hasCompleteImageSet(outputFile, 'heroImage'), true);
});

function writeExistingHeroSet(outputFile, missingFilename) {
  const base = outputFile.slice(0, -'.jpg'.length);
  for (const candidate of [
    outputFile,
    `${base}.webp`,
    `${base}.avif`,
    `${base}-640w.jpg`,
    `${base}-640w.webp`,
    `${base}-640w.avif`,
  ]) {
    if (path.basename(candidate) !== missingFilename) fs.writeFileSync(candidate, 'fixture');
  }
}

test('assertHeroImageSetReady identifies a missing desktop WebP variant with a repair action', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-missing-desktop-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const outputFile = path.join(tempDir, 'synthetic.jpg');
  writeExistingHeroSet(outputFile, 'synthetic.webp');

  assert.throws(
    () => assertHeroImageSetReady(outputFile),
    /synthetic\.webp[\s\S]*--force/,
  );
});

test('assertHeroImageSetReady identifies a missing 640w AVIF variant with a repair action', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-missing-mobile-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const outputFile = path.join(tempDir, 'synthetic.jpg');
  writeExistingHeroSet(outputFile, 'synthetic-640w.avif');

  assert.throws(
    () => assertHeroImageSetReady(outputFile),
    /synthetic-640w\.avif[\s\S]*--force/,
  );
});

test('pipeline blocks a pre-existing partial actual-site hero set before FAL or Astro publication', (t) => {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const slug = `hero-variant-guard-${process.pid}`;
  const heroDir = path.join(repoRoot, 'apps', 'maine-cannabis', 'public', 'images', 'heroes');
  const outputFile = path.join(heroDir, `${slug}.jpg`);
  const manifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-manifest-'));
  const manifestPath = path.join(manifestDir, 'manifest.json');
  const targetPath = path.join(repoRoot, 'apps', 'maine-cannabis', 'src', 'pages', 'guides', 'faq.astro');
  const originalTarget = fs.readFileSync(targetPath, 'utf8');

  t.after(() => {
    fs.rmSync(manifestDir, { recursive: true, force: true });
    for (const filename of [
      `${slug}.jpg`,
      `${slug}.webp`,
      `${slug}.avif`,
      `${slug}-640w.jpg`,
      `${slug}-640w.webp`,
      `${slug}-640w.avif`,
    ]) fs.rmSync(path.join(heroDir, filename), { force: true });
  });

  fs.writeFileSync(outputFile, 'partial existing hero');
  fs.writeFileSync(manifestPath, JSON.stringify([{
    slug,
    prompt: 'must never reach FAL for a partial existing hero set',
    target: 'src/pages/guides/faq.astro',
    field: 'heroImage',
  }]));

  let error;
  try {
    execFileSync(
      process.execPath,
      ['scripts/image/image-pipeline.cjs', manifestPath],
      { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, FAL_KEY: '' } },
    );
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, 'partial set must make the pipeline exit non-zero');
  const output = `${error.stdout || ''}${error.stderr || ''}`;

  assert.match(output, /Incomplete hero responsive variant set/);
  assert.match(output, new RegExp(`${slug}\\.webp`));
  assert.match(output, /--force/);
  assert.doesNotMatch(output, /FAL_KEY is required/);
  assert.equal(fs.readFileSync(targetPath, 'utf8'), originalTarget, 'blocked partial set must not update Astro');
});

test('writeImageFiles preserves single-JPG output for infographics', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-infographic-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const source = await sharp({
    create: {
      width: 800,
      height: 592,
      channels: 3,
      background: { r: 40, g: 40, b: 40 },
    },
  }).jpeg().toBuffer();
  const outputFile = path.join(tempDir, 'synthetic.jpg');

  await writeImageFiles(source, outputFile, 'infographic');

  assert.deepEqual(fs.readdirSync(tempDir), ['synthetic.jpg']);
  const metadata = await sharp(outputFile).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 800);
});

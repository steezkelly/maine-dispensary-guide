const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');
const { writeHeroVariants, writeImageFiles } = require('../image-pipeline.cjs');

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

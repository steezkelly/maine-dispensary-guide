#!/usr/bin/env node
/**
 * scripts/image/compress-new-13.cjs
 * Compresses + generates WebP + AVIF + 640w variants for the 13 new city guide hero images.
 * Idempotent.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const HEROES_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'heroes');
const NEW_FILES = [
  'solon-dispensary-guide.jpg', 'greenville-dispensary-guide.jpg', 'columbia-dispensary-guide.jpg',
  'guilford-dispensary-guide.jpg', 'west-paris-dispensary-guide.jpg', 'chelsea-dispensary-guide.jpg',
  'rome-dispensary-guide.jpg', 'medway-dispensary-guide.jpg', 'baring-dispensary-guide.jpg',
  'somerville-dispensary-guide.jpg', 'stratton-dispensary-guide.jpg', 'peru-dispensary-guide.jpg',
  'winslow-dispensary-guide.jpg',
];
const MOBILE_WIDTH = 640;
const AVIF_QUALITY = 60;

let count = 0, skipped = 0, errors = [];

(async () => {
  for (const fn of NEW_FILES) {
    const src = path.join(HEROES_DIR, fn);
    const base = fn.replace(/\.jpg$/i, '');
    const mobJpg = path.join(HEROES_DIR, base + '-640w.jpg');
    const mobWebp = path.join(HEROES_DIR, base + '-640w.webp');
    const avif = path.join(HEROES_DIR, base + '.avif');
    const mobAvif = path.join(HEROES_DIR, base + '-640w.avif');
    const webp = path.join(HEROES_DIR, base + '.webp');
    if (!fs.existsSync(src)) { console.error(`missing: ${src}`); continue; }
    // Idempotency: skip if all variants exist
    if (fs.existsSync(mobJpg) && fs.existsSync(mobWebp) && fs.existsSync(avif) && fs.existsSync(mobAvif) && fs.existsSync(webp)) {
      skipped++;
      continue;
    }
    try {
      // Load source into buffer first so we can write variants without "same file" conflict
      const srcBuf = await sharp(src, {failOn: 'none'}).rotate().toBuffer();
      const img = sharp(srcBuf);
      // Write to a temp file for the JPG output
      const tmpJpg = src + '.tmp';
      await img.clone().jpeg({quality: 80, mozjpeg: true, progressive: true}).toFile(tmpJpg);
      fs.renameSync(tmpJpg, src);
      // Re-load after the rewrite
      const buf2 = await sharp(src, {failOn: 'none'}).rotate().toBuffer();
      const img2 = sharp(buf2);
      await img2.clone().webp({quality: 80}).toFile(webp);
      await img2.clone().avif({quality: AVIF_QUALITY, effort: 4}).toFile(avif);
      await img2.clone().resize({width: MOBILE_WIDTH, withoutEnlargement: true}).jpeg({quality: 80, mozjpeg: true, progressive: true}).toFile(mobJpg);
      await img2.clone().resize({width: MOBILE_WIDTH, withoutEnlargement: true}).webp({quality: 80}).toFile(mobWebp);
      await img2.clone().resize({width: MOBILE_WIDTH, withoutEnlargement: true}).avif({quality: AVIF_QUALITY, effort: 4}).toFile(mobAvif);
      console.log(`✓ ${fn}: ${(fs.statSync(src).size/1024).toFixed(0)}KB +5 variants`);
      count++;
    } catch(e) {
      errors.push({fn, err: e.message});
      console.error(`✗ ${fn}: ${e.message}`);
    }
  }
  console.log(`\nDone. New: ${count}, Skipped (already done): ${skipped}, Errors: ${errors.length}`);
})();

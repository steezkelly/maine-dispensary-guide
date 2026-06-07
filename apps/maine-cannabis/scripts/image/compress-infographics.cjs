#!/usr/bin/env node
/**
 * scripts/image/compress-infographics.cjs
 *
 * Re-compresses all infographic JPEGs to mozjpeg q=80 progressive and
 * generates WebP variants. Idempotent, --dry-run mode.
 *
 * Why: 1.9MB of infographics at q90+ originals. q80 mozjpeg cuts
 * each ~70% with imperceptible quality loss.
 *
 * Usage:  node scripts/image/compress-infographics.cjs [--dry-run] [--skip-webp]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INFOGRAPHICS_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'infographics');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipWebp = args.includes('--skip-webp');

if (!fs.existsSync(INFOGRAPHICS_DIR)) {
  console.error(`Infographics dir not found: ${INFOGRAPHICS_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(INFOGRAPHICS_DIR)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort();

console.log(`[compress-infographics] ${files.length} infographic images in ${INFOGRAPHICS_DIR}`);
console.log(`[compress-infographics] mode: ${dryRun ? 'DRY-RUN' : 'WRITE'} | webp: ${skipWebp ? 'skip' : 'generate'}`);
console.log();

let totalOrig = 0;
let totalJpg = 0;
let totalWebp = 0;
let errors = [];

(async () => {
  for (const fn of files) {
    const src = path.join(INFOGRAPHICS_DIR, fn);
    const tmpJpg = path.join(INFOGRAPHICS_DIR, fn + '.tmp');
    const webp = path.join(INFOGRAPHICS_DIR, fn.replace(/\.jpg$/i, '.webp'));
    const orig = fs.statSync(src).size;
    totalOrig += orig;

    try {
      if (dryRun) {
        const buf = await sharp(src, { failOn: 'none' })
          .rotate()
          .jpeg({ quality: 80, mozjpeg: true, progressive: true })
          .toBuffer();
        totalJpg += buf.length;
        if (!skipWebp) {
          const webpBuf = await sharp(src, { failOn: 'none' })
            .rotate()
            .webp({ quality: 80 })
            .toBuffer();
          totalWebp += webpBuf.length;
        }
      } else {
        await sharp(src, { failOn: 'none' })
          .rotate()
          .jpeg({ quality: 80, mozjpeg: true, progressive: true })
          .toFile(tmpJpg);
        const newSize = fs.statSync(tmpJpg).size;
        totalJpg += newSize;
        fs.renameSync(tmpJpg, src);

        if (!skipWebp) {
          await sharp(src, { failOn: 'none' })
            .rotate()
            .webp({ quality: 80 })
            .toFile(webp);
          totalWebp += fs.statSync(webp).size;
        }
      }
    } catch (e) {
      errors.push({ fn, err: e.message });
      console.error(`  ERROR: ${fn}: ${e.message}`);
    }
  }

  console.log('─'.repeat(60));
  console.log(`[compress-infographics] Original total:  ${(totalOrig/1024).toFixed(0)}KB (${files.length} files)`);
  console.log(`[compress-infographics] Re-compressed:    ${(totalJpg/1024).toFixed(0)}KB (${(totalJpg/totalOrig*100).toFixed(0)}% of orig)`);
  if (!skipWebp) {
    console.log(`[compress-infographics] WebP variants:    ${(totalWebp/1024).toFixed(0)}KB (${(totalWebp/totalOrig*100).toFixed(0)}% of orig)`);
    console.log(`[compress-infographics] Combined:          ${((totalJpg+totalWebp)/1024).toFixed(0)}KB (${((totalJpg+totalWebp)/totalOrig*100).toFixed(0)}% of orig, saves ${((totalOrig-(totalJpg+totalWebp))/1024).toFixed(0)}KB)`);
  }
  console.log(`[compress-infographics] Errors:           ${errors.length}`);
  console.log();
  console.log('[compress-infographics] Next step: update guides that reference infographics to use <picture> with WebP source.');
})();

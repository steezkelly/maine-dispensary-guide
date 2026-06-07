#!/usr/bin/env node
/**
 * scripts/image/generate-mobile-variants.cjs
 *
 * Generates 640w mobile + AVIF variants of every hero image.
 * The original JPGs are kept as-is (used as 1x desktop src).
 *
 * Output naming:
 *   <name>.jpg (existing, ~1280px) -> used as desktop default
 *   <name>-640w.jpg (new, 640px)   -> mobile srcset
 *   <name>.webp (existing)         -> desktop WebP
 *   <name>-640w.webp (new)         -> mobile WebP
 *   <name>.avif (new)              -> desktop AVIF (Safari 16+)
 *   <name>-640w.avif (new)         -> mobile AVIF
 *
 * Why: mobile users were downloading 1280x720 (often 100KB+) for a
 * viewport that only needs 640px. 640w variant is typically 30-40KB.
 * 50% of MDG traffic is mobile per Steve's analytics note, so this
 * is the largest single wire-savings win left.
 *
 * Usage:  node scripts/image/generate-mobile-variants.cjs [--dry-run] [--skip-avif]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const HEROES_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'heroes');
const INFOGRAPHICS_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'infographics');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipAvif = args.includes('--skip-avif');
const dirs = args.includes('--infographics') ? [INFOGRAPHICS_DIR] : [HEROES_DIR];

if (!fs.existsSync(HEROES_DIR)) {
  console.error(`Heroes dir not found: ${HEROES_DIR}`);
  process.exit(1);
}

const MOBILE_WIDTH = 640;
const AVIF_QUALITY = 60; // sweet spot per sharp docs (~10% smaller than WebP q80)

let totalJpgOrig = 0, totalJpgMobile = 0;
let totalWebp = 0, totalWebpMobile = 0;
let totalAvif = 0, totalAvifMobile = 0;
let errors = [];

(async () => {
  for (const dir of dirs) {
    const files = fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.jpg') && !f.includes('-640w'))
      .sort();

    console.log(`[generate-mobile-variants] dir: ${path.relative(process.cwd(), dir)} (${files.length} jpgs)`);
    console.log(`[generate-mobile-variants] mode: ${dryRun ? 'DRY-RUN' : 'WRITE'} | avif: ${skipAvif ? 'skip' : 'generate'}`);
    console.log();

    let skipped = 0;
    for (const fn of files) {
      const src = path.join(dir, fn);
      const baseName = fn.replace(/\.jpg$/i, '');
      const mobileJpg = path.join(dir, baseName + '-640w.jpg');
      const mobileWebp = path.join(dir, baseName + '-640w.webp');
      const avifDest = path.join(dir, baseName + '.avif');
      const mobileAvif = path.join(dir, baseName + '-640w.avif');
      const orig = fs.statSync(src).size;
      totalJpgOrig += orig;

      // Idempotency: if all four variants already exist, skip
      const needMobileJpg = !fs.existsSync(mobileJpg);
      const needMobileWebp = !fs.existsSync(mobileWebp);
      const needAvif = !skipAvif && !fs.existsSync(avifDest);
      const needMobileAvif = !skipAvif && !fs.existsSync(mobileAvif);
      if (!needMobileJpg && !needMobileWebp && (!needAvif && !needMobileAvif)) {
        // Estimate existing sizes for accurate total
        try { totalJpgMobile += fs.statSync(mobileJpg).size; } catch {}
        try { totalWebpMobile += fs.statSync(mobileWebp).size; } catch {}
        try { totalAvif += fs.statSync(avifDest).size; } catch {}
        try { totalAvifMobile += fs.statSync(mobileAvif).size; } catch {}
        skipped++;
        continue;
      }

      try {
        const img = sharp(src, { failOn: 'none' }).rotate();

        // 1) 640w mobile jpg
        if (dryRun) {
          const buf = await img.clone().resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();
          totalJpgMobile += buf.length;
        } else {
          const buf = await img.clone().resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(mobileJpg);
          totalJpgMobile += buf.size;
        }

        // 2) 640w mobile webp
        if (dryRun) {
          const buf = await img.clone().resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 }).toBuffer();
          totalWebpMobile += buf.length;
        } else {
          const buf = await img.clone().resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 }).toFile(mobileWebp);
          totalWebpMobile += buf.size;
        }

        // 3) desktop avif (Safari 16+)
        if (!skipAvif) {
          if (dryRun) {
            const buf = await img.clone().avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer();
            totalAvif += buf.length;
            const bufM = await img.clone().resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
              .avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer();
            totalAvifMobile += bufM.length;
          } else {
            const buf = await img.clone().avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(avifDest);
            totalAvif += buf.size;
            const bufM = await img.clone().resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
              .avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(mobileAvif);
            totalAvifMobile += bufM.size;
          }
        }
      } catch (e) {
        errors.push({ fn, err: e.message });
        console.error(`  ERROR: ${fn}: ${e.message}`);
      }
    }
  }

  let skipped = 0;
  console.log('─'.repeat(60));
  console.log(`[generate-mobile-variants] Original JPGs (existing):  ${(totalJpgOrig/1024).toFixed(0)}KB (desktop default)`);
  console.log(`[generate-mobile-variants] Mobile JPGs (640w):          ${(totalJpgMobile/1024).toFixed(0)}KB (mobile srcset, ${(totalJpgMobile/totalJpgOrig*100).toFixed(0)}% of orig)`);
  console.log(`[generate-mobile-variants] Mobile WebP (640w):         ${(totalWebpMobile/1024).toFixed(0)}KB (mobile, ${(totalWebpMobile/totalJpgOrig*100).toFixed(0)}% of orig)`);
  if (!skipAvif) {
    console.log(`[generate-mobile-variants] AVIF desktop:               ${(totalAvif/1024).toFixed(0)}KB (${(totalAvif/totalJpgOrig*100).toFixed(0)}% of orig)`);
    console.log(`[generate-mobile-variants] AVIF mobile (640w):         ${(totalAvifMobile/1024).toFixed(0)}KB (${(totalAvifMobile/totalJpgOrig*100).toFixed(0)}% of orig)`);
  }
  console.log();
  console.log(`[generate-mobile-variants] Skipped (already existed): ${skipped}`);
  console.log(`[generate-mobile-variants] Errors: ${errors.length}`);
  console.log(`[generate-mobile-variants] Total new files generated: ${(skipAvif ? 2 : 4) * (files.length - skipped)}`);
  console.log();
  console.log(`[generate-mobile-variants] Next step: update Layout.astro to add srcset + sizes to the <img> element.`);
  console.log(`[generate-mobile-variants] Pattern:`);
  console.log(`  <source type="image/avif" srcset="/images/heroes/X.avif 1x, /images/heroes/X-640w.avif 640w" sizes="(max-width: 640px) 640px, 1280px" />`);
  console.log(`  <source type="image/webp" srcset="/images/heroes/X.webp 1x, /images/heroes/X-640w.webp 640w" sizes="(max-width: 640px) 640px, 1280px" />`);
  console.log(`  <img src="/images/heroes/X.jpg" ... />`);
})();

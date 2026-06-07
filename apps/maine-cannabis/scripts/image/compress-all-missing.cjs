const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const HEROES_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'heroes');
const MOBILE_WIDTH = 640;
const AVIF_QUALITY = 60;

let count = 0, skipped = 0, errors = [];
const files = fs.readdirSync(HEROES_DIR).filter(f => f.endsWith('.jpg') && !f.includes('-640w'));

(async () => {
  for (const fn of files) {
    const src = path.join(HEROES_DIR, fn);
    const base = fn.replace(/\.jpg$/i, '');
    const mobJpg = path.join(HEROES_DIR, base + '-640w.jpg');
    const mobWebp = path.join(HEROES_DIR, base + '-640w.webp');
    const avif = path.join(HEROES_DIR, base + '.avif');
    const mobAvif = path.join(HEROES_DIR, base + '-640w.avif');
    const webp = path.join(HEROES_DIR, base + '.webp');
    if (fs.existsSync(mobJpg) && fs.existsSync(mobWebp) && fs.existsSync(avif) && fs.existsSync(mobAvif) && fs.existsSync(webp)) {
      skipped++;
      continue;
    }
    try {
      const srcBuf = await sharp(src, {failOn: 'none'}).rotate().toBuffer();
      const img = sharp(srcBuf);
      const tmpJpg = src + '.tmp';
      await img.clone().jpeg({quality: 80, mozjpeg: true, progressive: true}).toFile(tmpJpg);
      fs.renameSync(tmpJpg, src);
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
  console.log(`\nDone. New: ${count}, Skipped: ${skipped}, Errors: ${errors.length}`);
})();

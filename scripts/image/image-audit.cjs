#!/usr/bin/env node
/**
 * scripts/image-audit.cjs
 *
 * Audits which generated images are embedded in pages vs. sitting in filesystem.
 * Answers: "Are all generated images used? Are all pages that should have images referencing them?"
 *
 * Usage: node scripts/image-audit.cjs [type]
 *   type: heroes | infographics | all (default: all)
 */

const fs = require('node:fs');
const path = require('node:path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const check = `${colors.green}✅${colors.reset}`;
const cross = `${colors.red}❌${colors.reset}`;
const warn = `${colors.yellow}⚠${colors.reset}`;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function logSection(title) {
  console.log(`\n${colors.bold}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${title}${colors.reset}`);
  console.log(`${colors.bold}${'─'.repeat(60)}${colors.reset}`);
}

function logSubsection(title) {
  console.log(`\n${colors.cyan}${title}${colors.reset}`);
}

function getFilesRecursively(dir, extensions = ['.jpg', '.jpeg']) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function getImageDimensions(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) return { width: 0, height: 0, corrupted: true };

    // Read first 64KB to check for JPEG header/footer
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(Math.min(65536, stats.size));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    // Check for JPEG magic bytes (FFD8)
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return { width: 0, height: 0, corrupted: true };
    }

    // JPEG files store dimensions in the SOF0 segment
    // Search for SOF0 marker (FF C0) through the buffer
    let offset = 2;
    while (offset < buffer.length - 4) {
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF0, SOF1, SOF2 markers contain dimensions
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
        const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
        return { width, height, corrupted: false };
      }
      // Skip to next marker (read segment length)
      const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3];
      offset += 2 + segmentLength;
    }

    return { width: '?', height: '?', corrupted: false };
  } catch {
    return { width: 0, height: 0, corrupted: true };
  }
}

function findAstroFiles(pagesDir) {
  const files = [];
  if (!fs.existsSync(pagesDir)) return files;

  const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(pagesDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAstroFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─────────────────────────────────────────────────────────────
// Phase 1: Scan filesystem
// ─────────────────────────────────────────────────────────────

function scanFilesystem(baseDir) {
  const heroesDir = path.join(baseDir, 'images', 'heroes');
  const infographicsDir = path.join(baseDir, 'images', 'infographics');

  const heroFiles = getFilesRecursively(heroesDir, ['.jpg', '.jpeg']).map(f => ({
    path: f,
    slug: path.basename(f, path.extname(f)),
  }));

  const infographicFiles = getFilesRecursively(infographicsDir, ['.jpg', '.jpeg']).map(f => ({
    path: f,
    slug: path.basename(f, path.extname(f)),
  }));

  return { heroFiles, infographicFiles };
}

// ─────────────────────────────────────────────────────────────
// Phase 2: Scan pages
// ─────────────────────────────────────────────────────────────

function scanPages(pagesDir) {
  const astroFiles = findAstroFiles(pagesDir);

  // Map: slug -> [files that reference it]
  const heroRefs = new Map();
  const infographicRefs = new Map();

  // Track pages with heroImage field
  const pagesWithHeroField = [];
  const pagesWithNullHero = [];

  // Track pages with infographic references
  const pagesWithInfographic = [];

  for (const file of astroFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(pagesDir, file);

    // ── Hero images ──────────────────────────────────────
    // Check Layout component for heroImage prop (e.g., heroImage="/images/heroes/slug.jpg")
    const heroPropMatch = content.match(/heroImage=["']([^"']+)["']/);
    if (heroPropMatch) {
      const value = heroPropMatch[1].trim();
      if (value === 'null' || value === 'undefined') {
        pagesWithNullHero.push(relativePath);
      } else {
        pagesWithHeroField.push(relativePath);
        // Extract slug from heroImage value (e.g., "/images/heroes/portland-dispensary-guide.jpg")
        const heroSlugMatch = value.match(/\/images\/heroes\/([^\/]+)\.jpg/i);
        if (heroSlugMatch) {
          const slug = heroSlugMatch[1].toLowerCase();
          if (!heroRefs.has(slug)) heroRefs.set(slug, []);
          heroRefs.get(slug).push(relativePath);
        }
      }
    }

    // Check <img src="/images/heroes/...jpg">
    const heroImgRegex = /src=["']?\/images\/heroes\/([^"']+\.jpg)["']?/gi;
    let match;
    while ((match = heroImgRegex.exec(content)) !== null) {
      const slug = path.basename(match[1], path.extname(match[1])).toLowerCase();
      if (!heroRefs.has(slug)) heroRefs.set(slug, []);
      if (!heroRefs.get(slug).includes(relativePath)) {
        heroRefs.get(slug).push(relativePath);
      }
    }

    // ── Infographic images ───────────────────────────────
    // Check <figure class="infographic"> with img src
    const figureRegex = /<figure[^>]*class=["'][^"']*infographic[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']?\/images\/infographics\/([^"']+\.jpg)["']?/gi;
    while ((match = figureRegex.exec(content)) !== null) {
      const slug = path.basename(match[1], path.extname(match[1])).toLowerCase();
      if (!infographicRefs.has(slug)) infographicRefs.set(slug, []);
      if (!infographicRefs.get(slug).includes(relativePath)) {
        infographicRefs.get(slug).push(relativePath);
      }
      if (!pagesWithInfographic.includes(relativePath)) {
        pagesWithInfographic.push(relativePath);
      }
    }

    // Also check direct img src to infographics
    const infographicImgRegex = /src=["']?\/images\/infographics\/([^"']+\.jpg)["']?/gi;
    while ((match = infographicImgRegex.exec(content)) !== null) {
      const slug = path.basename(match[1], path.extname(match[1])).toLowerCase();
      if (!infographicRefs.has(slug)) infographicRefs.set(slug, []);
      if (!infographicRefs.get(slug).includes(relativePath)) {
        infographicRefs.get(slug).push(relativePath);
      }
      if (!pagesWithInfographic.includes(relativePath)) {
        pagesWithInfographic.push(relativePath);
      }
    }

    // Check JSON-LD schema references (look for infographic URLs in schema)
    const jsonLdRegex = /"image"\s*:\s*\[?\s*"([^"]*\/images\/infographics\/[^"]+\.jpg)"/gi;
    while ((match = jsonLdRegex.exec(content)) !== null) {
      const slug = path.basename(match[1], path.extname(match[1])).toLowerCase();
      if (!infographicRefs.has(slug)) infographicRefs.set(slug, []);
      if (!infographicRefs.get(slug).includes(relativePath)) {
        infographicRefs.get(slug).push(relativePath);
      }
    }
  }

  return {
    heroRefs,
    infographicRefs,
    pagesWithHeroField,
    pagesWithNullHero,
    pagesWithInfographic,
  };
}

// ─────────────────────────────────────────────────────────────
// Phase 3: Report
// ─────────────────────────────────────────────────────────────

function generateReport(type, filesystem, pageScan, baseDir, pagesDir) {
  const { heroFiles, infographicFiles } = filesystem;
  const { heroRefs, infographicRefs, pagesWithHeroField, pagesWithNullHero, pagesWithInfographic } = pageScan;

  const showHeroes = type === 'all' || type === 'heroes';
  const showInfographics = type === 'all' || type === 'infographics';

  // ── HERO IMAGES ─────────────────────────────────────────
  if (showHeroes) {
    logSection('HERO IMAGES');

    const generatedCount = heroFiles.length;
    console.log(`  Generated: ${generatedCount}`);

    // Find referenced slugs
    const referencedSlugs = new Set(heroRefs.keys());
    const actuallyReferenced = heroFiles.filter(f => referencedSlugs.has(f.slug));
    console.log(`  Referenced in pages: ${actuallyReferenced.length}`);

    // Orphaned: generated but never referenced
    const orphaned = heroFiles.filter(f => !referencedSlugs.has(f.slug));

    if (orphaned.length > 0) {
      console.log(`  Orphaned (no page refs): ${orphaned.length}`);
      for (const f of orphaned) {
        console.log(`    - ${path.basename(f.path)}`);
      }
    } else {
      console.log(`  Orphaned (no page refs): 0 ${check}`);
    }

    // Missing: referenced but don't exist
    const existingSlugs = new Set(heroFiles.map(f => f.slug));
    const missing = [];
    for (const [slug, files] of heroRefs) {
      if (!existingSlugs.has(slug)) {
        missing.push({ slug, files });
      }
    }

    if (missing.length > 0) {
      console.log(`  Missing (page refs non-existent file): ${missing.length}`);
      for (const { slug, files } of missing) {
        console.log(`    - ${slug}.jpg (referenced in ${files.length} page(s))`);
      }
    } else {
      console.log(`  Missing (page refs non-existent file): 0 ${check}`);
    }
  }

  // ── INFOGRAPHIC IMAGES ──────────────────────────────────
  if (showInfographics) {
    logSection('INFOGRAPHIC IMAGES');

    const generatedCount = infographicFiles.length;
    console.log(`  Generated: ${generatedCount}`);

    // Count embedded via <figure class="infographic">
    // Re-scan to count figure-embedded specifically
    const astroFiles = findAstroFiles(pagesDir);
    let figureEmbeddedCount = 0;
    for (const file of astroFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const figureRegex = /<figure[^>]*class=["'][^"']*infographic[^"']*["'][^>]*>[\s\S]*?<img[^>]*src=["']?\/images\/infographics\/([^"']+\.jpg)["']?/gi;
      while (figureRegex.exec(content) !== null) {
        figureEmbeddedCount++;
      }
    }
    console.log(`  Embedded with <figure class="infographic">: ${figureEmbeddedCount}`);

    // Count JSON-LD references
    let jsonLdCount = 0;
    for (const file of astroFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const jsonLdRegex = /"image"\s*:\s*\[?\s*"([^"]*\/images\/infographics\/[^"]+\.jpg)"/gi;
      while (jsonLdRegex.exec(content) !== null) {
        jsonLdCount++;
      }
    }
    console.log(`  Referenced in JSON-LD schema: ${jsonLdCount}`);

    const referencedSlugs = new Set(infographicRefs.keys());

    const orphaned = infographicFiles.filter(f => !referencedSlugs.has(f.slug));
    if (orphaned.length > 0) {
      console.log(`  Orphaned (no page refs): ${orphaned.length}`);
      for (const f of orphaned) {
        console.log(`    - ${path.basename(f.path)}`);
      }
    } else {
      console.log(`  Orphaned (no page refs): 0 ${check}`);
    }
  }

  // ── ORPHAN PAGES ────────────────────────────────────────
  if (showHeroes) {
    logSection('ORPHAN PAGES (pages that should have hero but don\'t)');

    const pagesWithHeroOrphan = [];
    const astroFiles = findAstroFiles(pagesDir);

    for (const file of astroFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(pagesDir, file);

      // Check if page is a guide (should have hero)
      if (!file.includes('/guides/')) continue;

      // Check frontmatter for heroImage: null or missing heroImage entirely
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const hasHeroField = /heroImage\s*:/i.test(frontmatter);

        if (!hasHeroField) {
          // Check if this is a guide that SHOULD have heroImage by checking structure
          const hasFrontmatter = /^---/.test(content);
          if (hasFrontmatter) {
            pagesWithHeroOrphan.push({ path: relativePath, reason: 'missing heroImage field' });
          }
        }
      }
    }

    // Combine with pages that have null hero
    const allOrphanPages = [...pagesWithNullHero.map(p => ({ path: p, reason: 'heroImage: null' }))];

    // Add pages missing heroImage field (only guides that aren't already listed)
    const nullHeroSet = new Set(pagesWithNullHero);
    for (const orphan of pagesWithHeroOrphan) {
      if (!nullHeroSet.has(orphan.path)) {
        allOrphanPages.push(orphan);
      }
    }

    if (allOrphanPages.length > 0) {
      console.log(`  Found ${allOrphanPages.length} page(s):`);
      for (const { path: p, reason } of allOrphanPages) {
        console.log(`  - ${p}`);
        console.log(`    (${reason})`);
      }
    } else {
      console.log(`  None found ${check}`);
    }
  }

  // ── IMAGE SIZE AUDIT ─────────────────────────────────────
  if (showHeroes || showInfographics) {
    logSection('IMAGE SIZE AUDIT');

    const allImages = [
      ...(showHeroes ? heroFiles : []),
      ...(showInfographics ? infographicFiles : []),
    ];

    if (allImages.length === 0) {
      console.log('  No images to audit.');
    } else {
      const dir = showHeroes && showInfographics ? 'images/' :
                  showHeroes ? 'images/heroes/' : 'images/infographics/';

      console.log(`  Checking all ${dir}*.jpg...`);

      let corruptedCount = 0;
      let zeroSizeCount = 0;

      for (const file of allImages) {
        const dims = getImageDimensions(file.path);
        const relPath = path.relative(baseDir, file.path);

        if (dims.corrupted) {
          console.log(`  - ${path.basename(file.path)}: ${colors.red}CORRUPTED${colors.reset} ${cross}`);
          corruptedCount++;
        } else if (dims.width === 0 || dims.height === 0) {
          console.log(`  - ${path.basename(file.path)}: 0x0 ${colors.yellow}ZERO SIZE${colors.reset} ${warn}`);
          zeroSizeCount++;
        } else if (dims.width === '?' || dims.height === '?') {
          console.log(`  - ${path.basename(file.path)}: ${dims.width}x${dims.height} ${colors.dim}unable to parse${colors.reset}`);
        } else {
          console.log(`  - ${path.basename(file.path)}: ${dims.width}x${dims.height} ${check}`);
        }
      }

      console.log(`\n  Summary: ${allImages.length} images checked`);
      if (corruptedCount > 0) console.log(`  ${corruptedCount} corrupted`);
      if (zeroSizeCount > 0) console.log(`  ${zeroSizeCount} zero-size`);
    }
  }

  // ── SUMMARY ─────────────────────────────────────────────
  console.log(`\n${colors.bold}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Scan complete${colors.reset}`);
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'all';

  if (!['heroes', 'infographics', 'all'].includes(type)) {
    console.error(`Usage: node scripts/image-audit.cjs [heroes|infographics|all]`);
    console.error(`  Default: all`);
    process.exit(1);
  }

  // Determine project root (one level up from scripts/)
  const scriptDir = __dirname;
  const projectRoot = path.dirname(scriptDir);
  const publicDir = path.join(projectRoot, 'public');
  const pagesDir = path.join(projectRoot, 'src', 'pages');

  console.log(`${colors.dim}Image Audit — Maine Dispensary Guide${colors.reset}`);
  console.log(`${colors.dim}Type: ${type} | Root: ${path.basename(projectRoot)}${colors.reset}`);

  // Phase 1: Scan filesystem
  logSubsection('PHASE 1: Scanning filesystem...');
  const filesystem = scanFilesystem(publicDir);
  console.log(`  Found ${filesystem.heroFiles.length} hero images`);
  console.log(`  Found ${filesystem.infographicFiles.length} infographic images`);

  // Phase 2: Scan pages
  logSubsection('PHASE 2: Scanning pages...');
  const pageScan = scanPages(pagesDir);
  console.log(`  Scanned ${findAstroFiles(pagesDir).length} .astro files`);
  console.log(`  Found ${pageScan.heroRefs.size} hero image references`);
  console.log(`  Found ${pageScan.infographicRefs.size} infographic image references`);

  // Phase 3: Generate report
  logSubsection('PHASE 3: Generating report...');
  generateReport(type, filesystem, pageScan, projectRoot, pagesDir);
}

main();

#!/usr/bin/env node
/**
 * image-pipeline.cjs — Combined image generation, download, and path-update workflow
 * Usage: node scripts/image-pipeline.cjs manifest.json [--force]
 *
 * Manifest format:
 * [
 *   {
 *     "slug": "portland-dispensary-guide",
 *     "prompt": "Maine coastal cityscape with cannabis dispensary storefront...",
 *     "width": 1200,
 *     "height": 400,
 *     "model": "flux-2-pro",
 *     "target": "src/pages/guides/portland-dispensary-guide.astro",
 *     "field": "heroImage"
 *   },
 *   {
 *     "slug": "maine-dispensary-license",
 *     "prompt": "Professional infographic showing Maine cannabis licensing...",
 *     "width": 800,
 *     "height": 592,
 *     "model": "flux-2-pro",
 *     "target": "src/pages/guides/maine-dispensary-license.astro",
 *     "field": "infographic",
 *     "schema": true
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Check for node-fetch (CommonJS compat)
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  // Fall back to global fetch if available (Node 18+)
  fetch = globalThis.fetch;
}

function getFalKey() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new Error('FAL_KEY is required for image generation. Set it in the environment; never commit credentials to source.');
  }
  return key;
}

const modelMap = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-2-pro': 'fal-ai/flux-2-pro',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'ideogram-3': 'fal-ai/ideogram/v3/generate',
};

const repoRoot = path.join(__dirname, '..', '..');
const siteRoot = path.join(repoRoot, 'apps', 'maine-cannabis');

let manifest = [];
let force = false;

function loadManifest(argv) {
  const manifestPath = argv.find(arg => !arg.startsWith('--'));
  force = argv.includes('--force');

  if (!manifestPath) {
    throw new Error('Usage: node scripts/image-pipeline.cjs manifest.json [--force]');
  }

  const absoluteManifestPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(repoRoot, manifestPath);
  try {
    return JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
  } catch (err) {
    throw new Error(`❌ Failed to read manifest: ${err.message}`);
  }
}

// Determine output directory based on field type
function getOutputDir(field) {
  if (field === 'infographic') {
    return path.join(siteRoot, 'public', 'images', 'infographics');
  }
  return path.join(siteRoot, 'public', 'images', 'heroes');
}

// Determine output filename
function getOutputFilename(slug, field) {
  return `${slug}.jpg`;
}

// Determine local path for astro file
function getLocalPath(slug, field) {
  if (field === 'infographic') {
    return `/images/infographics/${slug}.jpg`;
  }
  return `/images/heroes/${slug}.jpg`;
}

// Step 1: Generate image via fal.ai
async function generateImage(prompt, model, width, height) {
  const endpoint = `https://fal.run/${modelMap[model] || modelMap['flux-schnell']}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${getFalKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result.images[0].url;
}

// Step 2: Download image to local path
function getHeroVariantPaths(filePath) {
  const extension = path.extname(filePath);
  const base = filePath.slice(0, -extension.length);
  return [
    filePath,
    `${base}.webp`,
    `${base}.avif`,
    `${base}-640w.jpg`,
    `${base}-640w.webp`,
    `${base}-640w.avif`,
  ];
}

function hasCompleteImageSet(filePath, field) {
  const expectedPaths = field === 'heroImage' ? getHeroVariantPaths(filePath) : [filePath];
  return expectedPaths.every(candidate => fs.existsSync(candidate));
}

function assertHeroImageSetReady(filePath) {
  const expectedPaths = getHeroVariantPaths(filePath);
  const missingPaths = expectedPaths.filter(candidate => !fs.existsSync(candidate));
  if (missingPaths.length === 0 || missingPaths.length === expectedPaths.length) return;

  const missing = missingPaths.map(candidate => path.basename(candidate)).join(', ');
  throw new Error(
    `Incomplete hero responsive variant set for ${path.basename(filePath)}; missing: ${missing}. `
    + 'Run the pipeline with --force to regenerate the complete JPG, WebP, and AVIF set before publication.',
  );
}

async function writeHeroVariants(buffer, filePath) {
  const extension = path.extname(filePath);
  const base = filePath.slice(0, -extension.length);
  const variants = [
    [filePath, null, 'jpeg'],
    [`${base}.webp`, null, 'webp'],
    [`${base}.avif`, null, 'avif'],
    [`${base}-640w.jpg`, 640, 'jpeg'],
    [`${base}-640w.webp`, 640, 'webp'],
    [`${base}-640w.avif`, 640, 'avif'],
  ];

  for (const [outputPath] of variants) {
    if (fs.existsSync(outputPath) && !fs.lstatSync(outputPath).isFile()) {
      throw new Error(`Cannot replace non-file hero variant: ${outputPath}`);
    }
  }

  const token = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const staged = variants.map(([outputPath, width, format]) => {
    const extension = path.extname(outputPath);
    const tempPath = `${outputPath.slice(0, -extension.length)}.${token}.tmp${extension}`;
    return { outputPath, tempPath, width, format };
  });

  try {
    await Promise.all(staged.map(({ tempPath, width, format }) => {
      let image = sharp(buffer);
      if (width) image = image.resize({ width });
      return image[format]().toFile(tempPath);
    }));
    for (const { outputPath, tempPath } of staged) {
      fs.renameSync(tempPath, outputPath);
    }
  } catch (err) {
    for (const { tempPath } of staged) {
      fs.rmSync(tempPath, { force: true });
    }
    throw err;
  }
}

async function writeImageFiles(buffer, filePath, field) {
  if (field === 'heroImage') {
    await writeHeroVariants(buffer, filePath);
    return;
  }
  fs.writeFileSync(filePath, buffer);
}

async function downloadImage(url, filePath, field) {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (hasCompleteImageSet(filePath, field) && !force) {
    return false; // Already exists, skip
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await writeImageFiles(Buffer.from(buffer), filePath, field);
  return true;
}

// Step 3: Update target .astro file
function updateAstroFile(filePath, field, localPath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target file not found: ${filePath}`);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Build the pattern to match the field assignment
  // Matches: field="..." or field="https://..." or heroImage={...}
  const fieldPattern = new RegExp(`${field}=["'][^"']*["']`);
  const newValue = `${field}="${localPath}"`;

  if (fieldPattern.test(content)) {
    content = content.replace(fieldPattern, newValue);
  } else {
    // Try matching with curly braces (JSX-style)
    const curlyPattern = new RegExp(`${field}=\\{[^}]+\\}`);
    if (curlyPattern.test(content)) {
      content = content.replace(curlyPattern, newValue);
    } else {
      throw new Error(`Field "${field}" not found in ${path.basename(filePath)}`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// Step 4: Add ImageObject schema (inline logic from add-image-schema.cjs)
function addImageSchema(filePath, localPath, caption, width, height) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target file not found: ${filePath}`);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already has image schema for this image
  if (content.includes('"@type": "ImageObject"') && content.includes(localPath)) {
    return false; // Already has schema
  }

  const imageSchema = `
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "contentUrl": `https://mainedispensaryguide.com${localPath}`,
    "description": caption || `${path.basename(filePath, '.astro')} image`,
    "width": width,
    "height": height
  })}
  </script>`;

  // Insert before </Layout>
  content = content.replace('</Layout>', `${imageSchema}\n</Layout>`);

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// Main pipeline
async function runPipeline() {
  const total = manifest.length;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\n🖼  Image Pipeline — ${total} item${total !== 1 ? 's' : ''}${force ? ' (FORCE mode)' : ''}\n`);

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const idx = i + 1;
    const num = `[${idx}/${total}]`;
    const { slug, prompt, width = 1200, height = 400, model = 'flux-schnell', target, field = 'heroImage', schema, caption } = item;

    // Validate required fields (slug and prompt are required; target is optional for generate-only mode)
    if (!slug || !prompt) {
      console.log(`${num} ⚠️  ${slug || 'unknown'}: Missing required fields (slug, prompt) — skipping`);
      failed++;
      continue;
    }

    const outputDir = getOutputDir(field);
    const outputFile = path.join(outputDir, getOutputFilename(slug, field));
    const localPath = getLocalPath(slug, field);
    const targetPath = target ? (path.isAbsolute(target) ? target : path.join(siteRoot, target)) : null;

    // Check if already exists
    if (hasCompleteImageSet(outputFile, field) && !force) {
      console.log(`${num} ⏭  ${slug} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`${num} Generating ${slug}...`);

    try {
      if (field === 'heroImage' && !force) assertHeroImageSetReady(outputFile);

      // Step 1: Generate
      const falUrl = await generateImage(prompt, model, width, height);
      console.log(`    └─ Generated: ${falUrl}`);

      // Step 2: Download
      const downloaded = await downloadImage(falUrl, outputFile, field);
      if (downloaded) {
        const sizeKB = (fs.statSync(outputFile).size / 1024).toFixed(0);
        console.log(`    └─ Downloaded: ${sizeKB}KB`);
      } else {
        console.log(`    └─ Skipped (exists)`);
      }

      // Step 3: Update astro file (only if target provided)
      if (target) {
        updateAstroFile(targetPath, field, localPath);
        console.log(`    └─ Updated: ${path.basename(target)} → ${localPath}`);

        // Step 4: Add schema if requested
        if (schema) {
          const added = addImageSchema(targetPath, localPath, caption, width, height);
          if (added) {
            console.log(`    └─ Schema added`);
          } else {
            console.log(`    └─ Schema skipped (already exists)`);
          }
        }
      } else {
        console.log(`    └─ Skipped update (no target specified)`);
      }

      generated++;
      console.log(`    └─ ✅ Complete\n`);
    } catch (err) {
      console.log(`    └─ ❌ Error: ${err.message}`);
      failed++;
      console.log(); // Blank line for readability between items
    }
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`📊 Summary: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  console.log('─'.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    manifest = loadManifest(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  runPipeline().catch(err => {
    console.error('Pipeline error:', err.message);
    process.exit(1);
  });
}

module.exports = { assertHeroImageSetReady, hasCompleteImageSet, writeHeroVariants, writeImageFiles };

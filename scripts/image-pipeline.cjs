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

// Check for node-fetch (CommonJS compat)
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  // Fall back to global fetch if available (Node 18+)
  fetch = globalThis.fetch;
}

const FAL_KEY = '0074bb6b-18bc-43fa-8df5-3fe3db094237:6c10c5e128ab0aa68815fed1cf224b52';

const modelMap = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-2-pro': 'fal-ai/flux-2-pro',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'ideogram-3': 'fal-ai/ideogram/v3/generate',
};

const rootDir = path.join(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
const manifestPath = args.find(arg => !arg.startsWith('--'));
const force = args.includes('--force');

if (!manifestPath) {
  console.error('Usage: node scripts/image-pipeline.cjs manifest.json [--force]');
  process.exit(1);
}

// Read manifest
let manifest;
try {
  const absoluteManifestPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(rootDir, manifestPath);
  manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read manifest: ${err.message}`);
  process.exit(1);
}

// Determine output directory based on field type
function getOutputDir(field) {
  if (field === 'infographic') {
    return path.join(rootDir, 'public', 'images', 'infographics');
  }
  return path.join(rootDir, 'public', 'images', 'heroes');
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
      'Authorization': `Key ${FAL_KEY}`,
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
async function downloadImage(url, filePath) {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    if (force) {
      fs.unlinkSync(filePath);
    } else {
      return false; // Already exists, skip
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));
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

    // Validate required fields
    if (!slug || !prompt || !target) {
      console.log(`${num} ⚠️  ${slug || 'unknown'}: Missing required fields (slug, prompt, target) — skipping`);
      failed++;
      continue;
    }

    const outputDir = getOutputDir(field);
    const outputFile = path.join(outputDir, getOutputFilename(slug, field));
    const localPath = getLocalPath(slug, field);
    const targetPath = path.isAbsolute(target) ? target : path.join(rootDir, target);

    // Check if already exists
    if (fs.existsSync(outputFile) && !force) {
      console.log(`${num} ⏭  ${slug} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`${num} Generating ${slug}...`);

    try {
      // Step 1: Generate
      const falUrl = await generateImage(prompt, model, width, height);
      console.log(`    └─ Generated: ${falUrl}`);

      // Step 2: Download
      const downloaded = await downloadImage(falUrl, outputFile);
      if (downloaded) {
        const sizeKB = (fs.statSync(outputFile).size / 1024).toFixed(0);
        console.log(`    └─ Downloaded: ${sizeKB}KB`);
      } else {
        console.log(`    └─ Skipped (exists)`);
      }

      // Step 3: Update astro file
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

runPipeline().catch(err => {
  console.error('Pipeline error:', err.message);
  process.exit(1);
});

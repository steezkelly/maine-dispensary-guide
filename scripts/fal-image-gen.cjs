#!/usr/bin/env node
/**
 * fal-image-gen.cjs — Image generation CLI using fal.ai
 * Usage: node scripts/fal-image-gen.cjs "prompt" [model] [width] [height] [options]
 * Models:
 *   flux-schnell  — fast/cheap (default)
 *   flux-dev      — development
 *   flux-2-pro    — high quality
 *   flux-pro      — pro endpoint (pass custom params)
 *   flux-pro-5    — cannabis-friendly (safety_tolerance: "5")
 *   ideogram-3    — text-to-image with text rendering
 * Options:
 *   --safety-tolerance, --st <0-6>  Override safety tolerance (default: varies by model)
 * Example: node scripts/fal-image-gen.cjs "cannabis storefront" flux-2-pro 1200 400 --safety-tolerance 5
 */

const FAL_KEY = '0074bb6b-18bc-43fa-8df5-3fe3db094237:6c10c5e128ab0aa68815fed1cf224b52';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node fal-image-gen.cjs "prompt" [model] [width] [height] [options]');
  console.log('Models: flux-schnell, flux-dev, flux-2-pro, flux-pro, flux-pro-5, ideogram-3');
  console.log('Options: --safety-tolerance, --st <0-6>');
  process.exit(1);
}

// Parse --safety-tolerance / --st flag
let safetyTolerance;
const cleanArgs = args.filter(arg => {
  if (arg === '--safety-tolerance' || arg === '--st') {
    const idx = args.indexOf(arg);
    safetyTolerance = args[idx + 1];
    return false;
  }
  if (arg.startsWith('--safety-tolerance=') || arg.startsWith('--st=')) {
    safetyTolerance = arg.split('=')[1];
    return false;
  }
  return true;
});

const prompt = cleanArgs[0];
const model = cleanArgs[1] || 'flux-schnell';
const width = parseInt(cleanArgs[2]) || 1200;
const height = parseInt(cleanArgs[3]) || 400;

const modelMap = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-2-pro': 'fal-ai/flux-2-pro',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'flux-pro-5': 'fal-ai/flux-pro/v1.1',
  'ideogram-3': 'fal-ai/ideogram/v3/generate',
};

const endpoint = `https://fal.run/${modelMap[model] || modelMap['flux-schnell']}`;

async function generateImage() {
  console.log(`\nGenerating image with ${model}...`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Size: ${width}x${height}`);
  if (safetyTolerance) console.log(`Safety Tolerance: ${safetyTolerance}`);
  console.log(`Endpoint: ${endpoint}\n`);

  const startTime = Date.now();

  const requestBody = {
    prompt,
    image_size: { width, height },
    num_images: 1,
  };

  // Add safety_tolerance for flux-pro-5 or when explicitly provided
  if (model === 'flux-pro-5') {
    requestBody.safety_tolerance = "5";
  } else if (safetyTolerance) {
    requestBody.safety_tolerance = String(safetyTolerance);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error ${response.status}: ${errorText}`);
    process.exit(1);
  }

  const result = await response.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Generated in ${elapsed}s`);
  if (result.timings?.inference) {
    console.log(`   Inference: ${result.timings.inference.toFixed(2)}s`);
  }
  console.log(`   URL: ${result.images[0].url}`);
  console.log(`   Size: ${result.images[0].width}x${result.images[0].height}`);

  return result;
}

generateImage().catch(err => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

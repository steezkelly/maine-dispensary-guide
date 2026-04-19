#!/usr/bin/env node
/**
 * fal-image-gen.cjs — Image generation CLI using fal.ai
 * Usage: node scripts/fal-image-gen.cjs "prompt" [model] [width] [height]
 * Models: flux-schnell (fast/cheap), flux-dev, flux-2-pro (quality), ideogram-3
 * Example: node scripts/fal-image-gen.cjs "Maine lighthouse at sunset" flux-2-pro 1200 400
 */

const FAL_KEY = '0074bb6b-18bc-43fa-8df5-3fe3db094237:6c10c5e128ab0aa68815fed1cf224b52';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node fal-image-gen.cjs "prompt" [model] [width] [height]');
  console.log('Models: flux-schnell (fast/cheap), flux-dev, flux-2-pro (quality), ideogram-3 (text)');
  process.exit(1);
}

const prompt = args[0];
const model = args[1] || 'flux-schnell';
const width = parseInt(args[2]) || 1200;
const height = parseInt(args[3]) || 400;

const modelMap = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-2-pro': 'fal-ai/flux-2-pro',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'ideogram-3': 'fal-ai/ideogram/v3/generate',
};

const endpoint = `https://fal.run/${modelMap[model] || modelMap['flux-schnell']}`;

async function generateImage() {
  console.log(`\nGenerating image with ${model}...`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Size: ${width}x${height}`);
  console.log(`Endpoint: ${endpoint}\n`);

  const startTime = Date.now();

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

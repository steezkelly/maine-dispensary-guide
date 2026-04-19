#!/usr/bin/env node
/**
 * download-infographics.cjs — Download all generated infographic images
 */

const fs = require('fs');
const path = require('path');

const images = [
  { url: 'https://v3b.fal.media/files/b/0a96d9e9/Pz0-wjJVK83IOGcdXYdBi_TsStrPMX.jpg', name: 'licensing-process.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9e9/1CeiLqUJIgLy5rKml_BsV_vz13shUM.jpg', name: 'cultivation-tiers.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9e9/iMzS3a7N6I5Up3AVXLJwK_MOR1Yzmg.jpg', name: 'startup-costs.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9e9/iYRCOvVy3yRFM_Fj6A3_T_BsM3WYws.jpg', name: 'security-requirements.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ea/qlq4kRPsTI2EosRhzNoWC_ujh32rqz.jpg', name: 'metrc-tracking.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ea/49O83zJzjpQd4GFGDokCU_jsb5OyWl.jpg', name: 'product-testing.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ee/fY_X_stowZkryy52oFfQB_PR3yDYTu.jpg', name: 'business-plan.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ec/S4Hy2wT3G8BjxETVnB-Yg_bQHblRkm.jpg', name: '280e-tax.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ec/Mdkcw46eZdd3QmrjhuKIt_j930i9RK.jpg', name: 'zoning-requirements.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ec/FGOUg2M6XztTDUaZoutwP_2Ymz6XQk.jpg', name: 'vertical-integration.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ec/lps-eNqQjixHQil7CBXnv_7by1yDhJ.jpg', name: 'employee-licensing.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ec/i9jV4i2lBk8BvL9oR1-RL_R35Vppxu.jpg', name: 'delivery-rules.jpg' },
];

const outDir = path.join(__dirname, '..', 'public', 'images', 'infographics');

async function downloadImage(url, name) {
  const filePath = path.join(outDir, name);
  if (fs.existsSync(filePath)) {
    console.log(`  ⏭  ${name} (already exists)`);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`  ✅ ${name} (${(buffer.byteLength / 1024).toFixed(0)}KB)`);
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log(`\nDownloading ${images.length} infographic images to ${outDir}\n`);
  for (let i = 0; i < images.length; i += 5) {
    const batch = images.slice(i, i + 5);
    await Promise.all(batch.map(img => downloadImage(img.url, img.name)));
  }
  console.log('\n✅ All infographic downloads complete\n');
}

main().catch(console.error);

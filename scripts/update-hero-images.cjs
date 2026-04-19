#!/usr/bin/env node
/**
 * update-hero-images.cjs — Replace Unsplash heroImage URLs with local paths
 * Usage: node scripts/update-hero-images.cjs
 */

const fs = require('fs');
const path = require('path');

// Map of file paths to their hero image filenames
const imageMap = {
  // City Guides
  'src/pages/guides/portland-dispensary-guide.astro': 'portland-dispensary-guide.jpg',
  'src/pages/guides/bangor-dispensary-guide.astro': 'bangor-dispensary-guide.jpg',
  'src/pages/guides/lewiston-dispensary-guide.astro': 'lewiston-dispensary-guide.jpg',
  'src/pages/guides/biddeford-dispensary-guide.astro': 'biddeford-dispensary-guide.jpg',
  'src/pages/guides/brunswick-dispensary-guide.astro': 'brunswick-dispensary-guide.jpg',
  'src/pages/guides/augusta-dispensary-guide.astro': 'augusta-dispensary-guide.jpg',
  'src/pages/guides/south-portland-dispensary-guide.astro': 'south-portland-dispensary-guide.jpg',
  'src/pages/guides/scarborough-dispensary-guide.astro': 'scarborough-dispensary-guide.jpg',
  'src/pages/guides/westbrook-dispensary-guide.astro': 'westbrook-dispensary-guide.jpg',
  'src/pages/guides/saco-dispensary-guide.astro': 'saco-dispensary-guide.jpg',
  'src/pages/guides/old-orchard-beach-dispensary-guide.astro': 'old-orchard-beach-dispensary-guide.jpg',
  'src/pages/guides/kittery-dispensary-guide.astro': 'kittery-dispensary-guide.jpg',
  'src/pages/guides/waterville-dispensary-guide.astro': 'waterville-dispensary-guide.jpg',
  'src/pages/guides/auburn-dispensary-guide.astro': 'auburn-dispensary-guide.jpg',
  'src/pages/guides/sanford-dispensary-guide.astro': 'sanford-dispensary-guide.jpg',

  // Technical Guides
  'src/pages/guides/maine-dispensary-license.astro': 'maine-dispensary-license.jpg',
  'src/pages/guides/maine-cannabis-cultivation-guide.astro': 'maine-cannabis-cultivation-guide.jpg',
  'src/pages/guides/maine-dispensary-business-plan.astro': 'maine-dispensary-business-plan.jpg',
  'src/pages/guides/maine-cannabis-market.astro': 'maine-cannabis-market.jpg',
  'src/pages/guides/maine-dispensary-costs.astro': 'maine-dispensary-costs.jpg',
  'src/pages/guides/maine-dispensary-hiring.astro': 'maine-dispensary-hiring.jpg',
  'src/pages/guides/maine-cannabis-funding-guide.astro': 'maine-cannabis-funding-guide.jpg',
  'src/pages/guides/maine-cannabis-real-estate.astro': 'maine-cannabis-real-estate.jpg',
  'src/pages/guides/maine-dispensary-security.astro': 'maine-dispensary-security.jpg',
  'src/pages/guides/maine-dispensary-pos.astro': 'maine-dispensary-pos.jpg',
  'src/pages/guides/maine-cannabis-product-testing-guide.astro': 'maine-cannabis-product-testing-guide.jpg',
  'src/pages/guides/maine-dispensary-packaging.astro': 'maine-dispensary-packaging.jpg',
  'src/pages/guides/maine-cannabis-waste-management.astro': 'maine-cannabis-waste-management.jpg',
  'src/pages/guides/maine-cannabis-edibles-compliance.astro': 'maine-cannabis-edibles-compliance.jpg',
  'src/pages/guides/maine-cannabis-delivery-rules.astro': 'maine-cannabis-delivery-rules.jpg',
  'src/pages/guides/maine-cannabis-banking-solutions.astro': 'maine-cannabis-banking-solutions.jpg',
  'src/pages/guides/maine-cannabis-staffing-licensing.astro': 'maine-cannabis-staffing-licensing.jpg',
  'src/pages/guides/maine-cannabis-extraction-licensing.astro': 'maine-cannabis-extraction-licensing.jpg',
  'src/pages/guides/maine-cannabis-inventory-management.astro': 'maine-cannabis-inventory-management.jpg',
  'src/pages/guides/maine-metrc-compliance-guide.astro': 'maine-metrc-compliance-guide.jpg',
  'src/pages/guides/maine-cannabis-caregiver-guide.astro': 'maine-cannabis-caregiver-guide.jpg',
  'src/pages/guides/maine-cannabis-regulations.astro': 'maine-cannabis-regulations.jpg',
  'src/pages/guides/maine-cannabis-vertical-integration.astro': 'maine-cannabis-vertical-integration.jpg',
  'src/pages/guides/maine-cannabis-taxation-280e.astro': 'maine-cannabis-taxation-280e.jpg',
  'src/pages/guides/maine-cannabis-taxes-2026.astro': 'maine-cannabis-taxes-2026.jpg',
  'src/pages/guides/maine-cannabis-marketing-compliance.astro': 'maine-cannabis-marketing-compliance.jpg',
  'src/pages/guides/maine-cannabis-business-insurance.astro': 'maine-cannabis-business-insurance.jpg',
  'src/pages/guides/maine-cannabis-workers-comp-insurance.astro': 'maine-cannabis-workers-comp-insurance.jpg',
  'src/pages/guides/maine-cannabis-events-2026.astro': 'maine-cannabis-events-2026.jpg',
  'src/pages/guides/maine-cannabis-vendor-directory.astro': 'maine-cannabis-vendor-directory.jpg',

  // Blog Posts
  'src/pages/blog/maine-home-grow-cannabis-guide-2026.astro': 'maine-home-grow-cannabis-guide-2026.jpg',
  'src/pages/blog/maine-cannabis-delivery-business-guide-2026.astro': 'maine-cannabis-delivery-business-guide-2026.jpg',
  'src/pages/blog/maine-cannabis-microbusiness-license-2026.astro': 'maine-cannabis-microbusiness-license-2026.jpg',
  'src/pages/blog/maine-dispensary-how-to-open.astro': 'maine-dispensary-how-to-open.jpg',
  'src/pages/blog/portland-maine-cannabis-rules-2026.astro': 'portland-maine-cannabis-rules-2026.jpg',
  'src/pages/blog/trump-psychedelic-executive-order-maine-psilocybin-2026.astro': 'trump-psychedelic-executive-order-maine-psilocybin-2026.jpg',

  // Founders
  'src/pages/founders/index.astro': 'founders-index.jpg',
  'src/pages/founders/maine-cannabis-founder-portland-flagship.astro': 'maine-cannabis-founder-portland-flagship.jpg',
  'src/pages/founders/maine-cannabis-founder-rural-cultivator.astro': 'maine-cannabis-founder-rural-cultivator.jpg',
  'src/pages/founders/maine-cannabis-founder-coastal-shop.astro': 'maine-cannabis-founder-coastal-shop.jpg',

  // Key Pages
  'src/pages/index.astro': 'homepage.jpg',
  'src/pages/directory.astro': 'directory.jpg',
  'src/pages/market-stats.astro': 'market-stats.jpg',
  'src/pages/roi-calculator.astro': 'roi-calculator.jpg',
  'src/pages/launch-checklist.astro': 'launch-checklist.jpg',
  'src/pages/start-here.astro': 'start-here.jpg',
  'src/pages/about.astro': 'about.jpg',
  'src/pages/contact.astro': 'contact.jpg',
  'src/pages/resources.astro': 'resources.jpg',
  'src/pages/glossary.astro': 'glossary.jpg',
  'src/pages/all-guides.astro': 'all-guides.jpg',
  'src/pages/download-checklist.astro': 'download-checklist.jpg',
  'src/pages/find-a-dispensary.astro': 'find-a-dispensary.jpg',
  'src/pages/site-health.astro': 'site-health.jpg',
  'src/pages/privacy.astro': 'privacy.jpg',
  'src/pages/guides/portland-maine-cannabis.astro': 'portland-maine-cannabis.jpg',
  'src/pages/guides/maine-dispensary-locations.astro': 'maine-dispensary-locations.jpg',
  'src/pages/resources/maine-cannabis-official-resources.astro': 'resources-maine-cannabis-official-resources.jpg',
  'src/pages/resources/maine-cannabis-education.astro': 'resources-maine-cannabis-education.jpg',
};

const rootDir = path.join(__dirname, '..');
let updated = 0;
let skipped = 0;

for (const [relPath, imageName] of Object.entries(imageMap)) {
  const filePath = path.join(rootDir, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${relPath}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const oldMatch = content.match(/heroImage="[^"]*unsplash[^"]*"/);
  if (!oldMatch) {
    console.log(`  ⏭  ${relPath} (no Unsplash heroImage found)`);
    skipped++;
    continue;
  }

  const newHero = `heroImage="/images/heroes/${imageName}"`;
  content = content.replace(/heroImage="[^"]*unsplash[^"]*"/, newHero);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${relPath} → ${imageName}`);
  updated++;
}

console.log(`\n✅ Updated ${updated} files, skipped ${skipped}\n`);

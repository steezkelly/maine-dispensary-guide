#!/usr/bin/env node
/**
 * add-image-schema.cjs — Add ImageObject JSON-LD to pages with infographics
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Pages with infographics and their image details
const pages = [
  {
    file: 'src/pages/guides/maine-dispensary-license.astro',
    images: [
      { url: '/images/infographics/licensing-process.jpg', caption: 'Maine cannabis dispensary licensing process: 5 steps from municipal approval to license issued', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-cultivation-guide.astro',
    images: [
      { url: '/images/infographics/cultivation-tiers.jpg', caption: 'Maine cannabis cultivation license tiers: Tier 1 through Tier 4 with canopy size comparison', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-dispensary-costs.astro',
    images: [
      { url: '/images/infographics/startup-costs.jpg', caption: 'Maine cannabis dispensary startup cost breakdown', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-dispensary-security.astro',
    images: [
      { url: '/images/infographics/security-requirements.jpg', caption: 'Maine cannabis dispensary security requirements', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-metrc-compliance-guide.astro',
    images: [
      { url: '/images/infographics/metrc-tracking.jpg', caption: 'Maine cannabis METRC seed-to-sale tracking flow', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-taxation-280e.astro',
    images: [
      { url: '/images/infographics/280e-tax.jpg', caption: 'Maine cannabis 280E tax implications', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-vertical-integration.astro',
    images: [
      { url: '/images/infographics/vertical-integration.jpg', caption: 'Maine cannabis vertical integration model', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-delivery-rules.astro',
    images: [
      { url: '/images/infographics/delivery-rules.jpg', caption: 'Maine cannabis delivery rules and requirements', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-product-testing-guide.astro',
    images: [
      { url: '/images/infographics/product-testing.jpg', caption: 'Maine cannabis product testing requirements', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-dispensary-business-plan.astro',
    images: [
      { url: '/images/infographics/business-plan.jpg', caption: 'Maine cannabis dispensary business plan components', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-real-estate.astro',
    images: [
      { url: '/images/infographics/zoning-requirements.jpg', caption: 'Maine cannabis real estate zoning requirements', width: 800, height: 592 }
    ]
  },
  {
    file: 'src/pages/guides/maine-cannabis-staffing-licensing.astro',
    images: [
      { url: '/images/infographics/employee-licensing.jpg', caption: 'Maine cannabis employee licensing requirements', width: 800, height: 592 }
    ]
  }
];

let updated = 0;

for (const page of pages) {
  const filePath = path.join(rootDir, page.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${page.file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already has image schema
  if (content.includes('"@type": "ImageObject"') && content.includes('/images/infographics/')) {
    console.log(`  ⏭  ${page.file} (already has image schema)`);
    continue;
  }

  // Build ImageObject JSON-LD blocks
  const imageSchemas = page.images.map(img => `
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "contentUrl": `https://mainedispensaryguide.com${img.url}`,
    "description": img.caption,
    "width": img.width,
    "height": img.height
  })}
  </script>`).join('\n');

  // Insert before </Layout> at the end of the file
  // For minified files, insert before the closing </Layout> tag
  if (content.includes('</article> </Layout>')) {
    content = content.replace('</article> </Layout>', `</article>${imageSchemas} </Layout>`);
  } else if (content.includes('</article>\n</Layout>')) {
    content = content.replace('</article>\n</Layout>', `</article>\n${imageSchemas}\n</Layout>`);
  } else if (content.includes('</article> </Layout>')) {
    content = content.replace('</article> </Layout>', `</article> ${imageSchemas} </Layout>`);
  } else {
    // Fallback: insert before </Layout>
    content = content.replace('</Layout>', `${imageSchemas}</Layout>`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${page.file} → added ${page.images.length} ImageObject schema(s)`);
  updated++;
}

console.log(`\n✅ Updated ${updated} files with ImageObject JSON-LD\n`);

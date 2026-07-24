#!/usr/bin/env node
/**
 * Add cross-links to all 13 buyer-intent PAA cluster pages.
 * Inserts a "Related Buyer-Intent Guides" section before the editorial-note.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(REPO, 'apps/maine-cannabis/src/pages');

const CLUSTER_PAGES = [
  { path: 'guides/maine-dispensary-license.astro', title: 'Maine Dispensary License: 2026 Costs & Application Timeline', type: 'pillar' },
  { path: 'guides/maine-cannabis-conditional-license.astro', title: 'Maine Cannabis Conditional License Guide', type: 'spoke' },
  { path: 'guides/maine-cannabis-staffing-licensing.astro', title: 'Maine Cannabis Staffing & Licensing Guide', type: 'spoke' },
  { path: 'blog/maine-dispensary-business-for-sale.astro', title: 'Maine Dispensary for Sale: How to Find, Buy, and Close', type: 'spoke' },
  { path: 'guides/maine-cannabis-business-transfer.astro', title: 'Maine Cannabis Business Transfer of Ownership', type: 'spoke' },
  { path: 'guides/maine-cannabis-license-denied.astro', title: 'Maine Cannabis License Denied: Appeal & Next Steps', type: 'spoke' },
  { path: 'blog/maine-dispensary-roi-what-to-expect-2026.astro', title: 'Maine Dispensary ROI: What to Expect in 2026', type: 'spoke' },
  { path: 'guides/maine-cannabis-cultivation-guide.astro', title: 'Maine Cannabis Cultivation Guide', type: 'spoke' },
  { path: 'guides/maine-cannabis-real-estate.astro', title: 'Maine Cannabis Real Estate Guide', type: 'spoke' },
  { path: 'guides/maine-cannabis-taxes-2026.astro', title: 'Maine Cannabis Taxes 2026: 280E & State Tax Guide', type: 'spoke' },
  { path: 'blog/maine-medical-marijuana-patient-guide.astro', title: 'Maine Medical Marijuana Patient Guide', type: 'spoke' },
  { path: 'blog/maine-cannabis-delivery-business-guide-2026.astro', title: 'Maine Cannabis Delivery Business Guide 2026', type: 'spoke' },
  { path: 'blog/cannabis-friendly-maine-travel.astro', title: 'Cannabis-Friendly Maine Travel Guide', type: 'spoke' },
];

function buildCrossLinkSection(currentPath) {
  const links = CLUSTER_PAGES
    .filter(p => p.path !== currentPath)
    .map(p => {
      const url = '/' + p.path.replace(/\.astro$/, '');
      return `      <li><a href="${url}">${p.title}</a></li>`;
    })
    .join('\n');

  return `
  <section class="related-buyer-intent">
    <h2>Related Buyer-Intent Guides</h2>
    <ul>
${links}
    </ul>
  </section>
`;
}

function addCrossLinks(filePath, currentPath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has the section
  if (content.includes('related-buyer-intent')) {
    console.log(`  SKIP: ${currentPath} (already has cross-links)`);
    return false;
  }
  
  const section = buildCrossLinkSection(currentPath);
  
  // Insert before editorial-note or AutoRelated or </article>
  const patterns = [
    /(<p class="editorial-note")/,
    /(<AutoRelated)/,
    /(<\/article>)/,
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, section + '\n$1');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  OK: ${currentPath} (inserted before ${pattern.source})`);
      return true;
    }
  }
  
  console.log(`  FAIL: ${currentPath} (no insertion point found)`);
  return false;
}

console.log('Adding cross-links to buyer-intent cluster pages...\n');

let updated = 0;
for (const page of CLUSTER_PAGES) {
  const filePath = path.join(PAGES_DIR, page.path);
  if (!fs.existsSync(filePath)) {
    console.log(`  MISSING: ${page.path}`);
    continue;
  }
  if (addCrossLinks(filePath, page.path)) {
    updated++;
  }
}

console.log(`\nDone: ${updated}/${CLUSTER_PAGES.length} pages updated.`);

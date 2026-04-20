const fs = require('fs');
const path = require('path');

const orphans = [
  {
    file: 'maine-cannabis-funding-guide.astro',
    section: 'finance',
    links: [
      { url: '/guides/maine-cannabis-banking-solutions/', label: 'Banking Solutions' },
      { url: '/guides/maine-cannabis-real-estate/', label: 'Real Estate Guide' },
      { url: '/guides/maine-cannabis-taxation-280e/', label: '280E Taxation Guide' }
    ]
  },
  {
    file: 'maine-cannabis-market.astro',
    section: 'market',
    links: [
      { url: '/guides/maine-cannabis-regulations/', label: 'Regulations Overview' },
      { url: '/guides/maine-dispensary-locations/', label: 'Municipal Opt-In Guide' }
    ]
  },
  {
    file: 'maine-cannabis-marketing-compliance.astro',
    section: 'marketing',
    links: [
      { url: '/guides/maine-cannabis-delivery-rules/', label: 'Delivery Rules' },
      { url: '/guides/maine-dispensary-packaging/', label: 'Packaging Requirements' }
    ]
  },
  {
    file: 'sanford-dispensary-guide.astro',
    section: 'city',
    links: [
      { url: '/guides/biddeford-dispensary-guide/', label: 'Biddeford Guide' },
      { url: '/guides/portland-dispensary-guide/', label: 'Portland Guide' }
    ]
  }
];

const relatedSection = (links) => `
<section class="related-guides">
  <h2>Related Guides</h2>
  <p>Explore related content for your Maine cannabis operation:</p>
  <ul>
    ${links.map(l => `<li><a href="${l.url}">${l.label} →</a></li>`).join('\n    ')}
  </ul>
</section>

`;

for (const orphan of orphans) {
  const filePath = path.join(process.cwd(), 'src/pages/guides', orphan.file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find <section class="disclaimer"> or </article> to insert before
  const disclaimerIdx = content.lastIndexOf('<section class="disclaimer">');
  const articleEndIdx = content.lastIndexOf('</article>');
  
  let insertIdx;
  if (disclaimerIdx > 0) {
    insertIdx = disclaimerIdx;
  } else if (articleEndIdx > 0) {
    insertIdx = articleEndIdx;
  } else {
    console.log('Could not find insertion point for', orphan.file);
    continue;
  }
  
  const newSection = relatedSection(orphan.links);
  content = content.slice(0, insertIdx) + newSection + content.slice(insertIdx);
  
  fs.writeFileSync(filePath, content);
  console.log('Updated', orphan.file);
}

console.log('\nDone!');
console.log('Remaining orphans that need links from other pages:');
console.log('  /resources/maine-cannabis-education - add links from education-related guides');
console.log('  /resources/maine-cannabis-official-resources - add links from official resources page');
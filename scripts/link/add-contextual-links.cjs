const fs = require('fs');
const path = require('path');

const updates = [
  {
    file: 'src/pages/guides/maine-cannabis-banking-solutions.astro',
    oldText: '280E is a complex federal tax issue',
    newLink: ' — See our <a href="/guides/maine-cannabis-funding-guide/">Funding Guide →</a>'
  },
  {
    file: 'src/pages/guides/maine-dispensary-locations.astro',
    oldText: 'market analysis',
    newLink: ' — See our <a href="/guides/maine-cannabis-market/">Maine Market Analysis →</a>'
  },
  {
    file: 'src/pages/guides/maine-dispensary-packaging.astro',
    oldText: 'marketing rules',
    newLink: ' — See our <a href="/guides/maine-cannabis-marketing-compliance/">Marketing Compliance Guide →</a>'
  }
];

for (const u of updates) {
  const content = fs.readFileSync(u.file, 'utf8');
  if (content.includes(u.oldText) && !content.includes(u.newLink.replace(/<[^>]+>/g, ''))) {
    const newContent = content.replace(u.oldText, u.oldText + u.newLink);
    fs.writeFileSync(u.file, newContent);
    console.log('Updated', u.file);
  } else {
    console.log('Skipped', u.file, '— text not found or link exists');
  }
}

console.log('\nDone!');
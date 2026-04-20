const fs = require('fs');
const path = require('path');

const updates = [
  {
    file: 'src/pages/guides/maine-cannabis-staffing-licensing.astro',
    findText: 'Responsible Vendor training within 90 days',
    linkHtml: '<a href="/resources/maine-cannabis-education/">Maine Cannabis Education Resources</a>'
  },
  {
    file: 'src/pages/guides/maine-dispensary-hiring.astro',
    findText: 'OCP Responsible Vendor training',
    linkHtml: '<a href="/resources/maine-cannabis-education/">Maine Cannabis Education Resources</a>'
  },
  {
    file: 'src/pages/guides/maine-cannabis-regulations.astro',
    findText: 'OCP Rules & Statutes',
    linkHtml: '<a href="/resources/maine-cannabis-official-resources/">Official Resources →</a>'
  }
];

for (const update of updates) {
  const content = fs.readFileSync(update.file, 'utf8');
  if (content.includes(update.findText) && !content.includes(update.linkHtml)) {
    const newContent = content.replace(update.findText, update.findText + ' — ' + update.linkHtml);
    fs.writeFileSync(update.file, newContent);
    console.log('Updated', update.file);
  } else {
    console.log('Skipped', update.file, '(already has link or text not found)');
  }
}

console.log('\nDone!');
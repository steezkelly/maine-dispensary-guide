const fs = require('fs');
const html = fs.readFileSync('dist/admin/link-dashboard/index.html', 'utf8');
const idx = html.indexOf('const graphJson');
const rest = html.substring(idx);
const m = rest.match(/const graphJson = "((?:[^"\\]|\\.)*)"/);
if (m) {
  const graphStr = m[1];
  const unescaped = graphStr.replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
  const data = JSON.parse(unescaped);
  
  console.log('Total pages:', data.stats.totalPages);
  console.log('Total links:', data.stats.totalLinks);
  console.log('Orphan pages:', data.stats.orphanPages.length);
  if (data.stats.orphanPages.length > 0) {
    data.stats.orphanPages.forEach(u => console.log(' -', u));
  }
} else {
  console.log('No match');
}
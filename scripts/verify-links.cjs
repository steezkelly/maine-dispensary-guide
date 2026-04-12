const fs = require('fs');
const html = fs.readFileSync('dist/admin/link-dashboard/index.html', 'utf8');
const idx = html.indexOf('const graphJson');
const rest = html.substring(idx);
const m = rest.match(/const graphJson = "((?:[^"\\]|\\.)*)"/);
if (m) {
  const graphStr = m[1];
  const unescaped = graphStr.replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
  const data = JSON.parse(unescaped);
  
  const sanfordOutgoing = data.links.filter(l => l.source === '/guides/sanford-dispensary-guide');
  console.log('Sanford outgoing links:');
  sanfordOutgoing.forEach(l => console.log(' to', l.target));
  
  const linksToSanford = data.links.filter(l => l.target === '/guides/sanford-dispensary-guide');
  console.log('\nLinks TO Sanford:');
  linksToSanford.forEach(l => console.log(' from', l.source));
  
  const portlandLinks = data.links.filter(l => l.target === '/guides/portland-dispensary-guide');
  console.log('\nLinks TO Portland (should include Brunswick, Kittery, Scarborough):');
  portlandLinks.forEach(l => console.log(' from', l.source));
} else {
  console.log('No match');
}
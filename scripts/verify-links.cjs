const fs = require('fs');
const html = fs.readFileSync('dist/admin/link-dashboard/index.html', 'utf8');
const idx = html.indexOf('const graphJson');
const rest = html.substring(idx);
const m = rest.match(/const graphJson = "((?:[^"\\]|\\.)*)"/);
if (m) {
  const graphStr = m[1];
  const unescaped = graphStr.replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
  const data = JSON.parse(unescaped);
  
  const checks = [
    '/guides/portland-dispensary-guide',
    '/guides/brunswick-dispensary-guide', 
    '/guides/kittery-dispensary-guide',
    '/guides/scarborough-dispensary-guide',
    '/guides/auburn-dispensary-guide',
    '/guides/lewiston-dispensary-guide',
    '/guides/saco-dispensary-guide',
    '/guides/sanford-dispensary-guide',
    '/resources/maine-cannabis-education',
    '/resources/maine-cannabis-official-resources'
  ];
  
  for (const url of checks) {
    const node = data.nodes.find(n => n.id === url);
    if (node) {
      console.log(`${url}: incoming=${node.incoming}, outgoing=${node.outgoing}`);
    } else {
      console.log(`${url}: NOT FOUND`);
    }
  }
} else {
  console.log('No match');
}
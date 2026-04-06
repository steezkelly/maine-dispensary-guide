const fs = require('fs');
const content = fs.readFileSync('src/pages/launch-checklist.astro', 'utf8');

const titleMatch = content.match(/title: "([^"]+)"/g);
const descMatch = content.match(/description: "([^"]+)"/g);
const ctaMatch = content.match(/cta: "([^"]+)"/g);

const h1 = 'Maine Dispensary Launch Checklist';
const lead = 'Each phase is a step. Click any item to see the regulatory details and official links you need.';
const badge = '2026 Interactive Roadmap';
const phases = ['Phase 1: Foundation', 'Phase 2: The Search', 'Phase 3: State Submission', 'Phase 4: Build & Launch'];

console.log('=== CONTENT ANALYSIS ===');
console.log('Title:', h1);
console.log('Lead:', lead);
console.log('Badge:', badge);
console.log('');
console.log('Phase count:', phases.length);
console.log('Checklist items:', titleMatch ? titleMatch.length : 0);

let words = 0;
const allText = [h1, lead, badge, ...phases];
titleMatch && titleMatch.forEach(m => allText.push(m.replace(/title: "/, '').replace(/"/, '')));
descMatch && descMatch.forEach(m => allText.push(m.replace(/description: "/, '').replace(/"/, '').replace(/<[^>]+>/g, '')));
ctaMatch && ctaMatch.forEach(m => allText.push(m.replace(/cta: "/, '').replace(/"/, '')));

allText.forEach(t => words += t.split(' ').length);

const printText = 'Ready to Go Offline? Download the high-resolution, printable PDF version of this roadmap including OCP form numbers and fee schedules.';
console.log('\nWord count breakdown:');
console.log('Header text:', [h1, lead, badge].join(' ').split(' ').length);
console.log('Phase names:', phases.join(' ').split(' ').length);
console.log('Item titles:', titleMatch ? titleMatch.length * 5 : 0, 'est');
console.log('Item descriptions:', descMatch ? descMatch.length * 40 : 0, 'est');
console.log('CTAs:', ctaMatch ? ctaMatch.length * 4 : 0, 'est');
console.log('Print CTA:', printText.split(' ').length);
console.log('\nTotal estimated content words:', words + printText.split(' ').length);
console.log('\nNote: This is primarily a UI component page with interactive cards.');
console.log('The actual HTML content is lightweight as most text is in JS data structure.');
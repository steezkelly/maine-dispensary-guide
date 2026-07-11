#!/usr/bin/env node
// Add `void faqPageJsonLd;` at the end of the frontmatter to suppress
// pre-existing TypeScript warning (the variable is built elsewhere
// by the Faq.astro component but the frontmatter still declares it).
const fs = require('node:fs');
const path = require('node:path');
const PAGES_DIR = path.resolve(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages', 'guides');

const slugs = [
  'eclipse-cannabis-company',
  'hidden-greens-dispensary',
  'great-atlantic-puffin-company',
  '420-mules-bar-harbor',
  'above-all-greenery-dispensary',
  'white-mountain-craft-cannabis',
  'lifted-cannabis-maine',
];

for (const slug of slugs) {
  const filePath = path.join(PAGES_DIR, `${slug}.astro`);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('void faqPageJsonLd;')) {
    console.log(`SKIP (already fixed): ${slug}`);
    continue;
  }
  // Find the closing --- and insert before it
  const fmEnd = content.indexOf('\n---');
  if (fmEnd < 0) {
    console.error(`NO FRONTMATTER: ${slug}`);
    continue;
  }
  const before = content.slice(0, fmEnd);
  const after = content.slice(fmEnd);
  content = before + '\nvoid faqPageJsonLd; // emitted by Faq.astro component (not referenced in template)' + after;
  fs.writeFileSync(filePath, content);
  console.log(`PATCHED: ${slug}`);
}
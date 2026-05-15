#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const inputPath = process.argv[2] || process.env.SITEMAP_PATH || process.env.CONTENT_HEALTH_SITEMAP;
const repoRoot = path.resolve(__dirname, '../..');
const fallbackPath = path.join(repoRoot, 'dist/sitemap-0.xml');
const sitemapPath = inputPath || fallbackPath;

if (!fs.existsSync(sitemapPath)) {
  console.error(`sitemap-xml check failed: file not found (${sitemapPath})`);
  process.exit(1);
}

const xml = fs.readFileSync(sitemapPath, 'utf8');
const invalidEntities = [...xml.matchAll(/&(?![a-zA-Z0-9#]+;)/g)];

if (invalidEntities.length === 0) {
  console.log(`sitemap-xml check passed: ${sitemapPath}`);
  process.exit(0);
}

const count = invalidEntities.length;
console.error(`sitemap-xml check failed: ${count} unescaped '&' entity violation${count > 1 ? 's' : ''} in ${sitemapPath}.`);
const sample = invalidEntities.slice(0, 5).map(match => match.index);
console.error(`First positions: ${sample.join(', ')}${count > 5 ? ` ... (+${count - 5} more)` : ''}`);
process.exit(1);

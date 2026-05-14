#!/usr/bin/env node
/**
 * Regenerate llms.txt from sitemap-0.xml
 * Run: node scripts/admin/regenerate-llms.cjs
 */
const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const sitemapXml = await fetchUrl('https://mainedispensaryguide.com/sitemap-0.xml');
  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

  // Group URLs
  const groups = { homepage: [], top: [], guides: [], resources: [], about: [], blog: [], download: [], founders: [] };
  for (const url of urls) {
    const path = url.replace('https://mainedispensaryguide.com', '') || '/';
    const segs = path.split('/').filter(Boolean);
    if (!segs.length) { groups.homepage.push({ label: 'Homepage', url }); continue; }
    if (segs.length === 1) { groups.top.push({ label: segs[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), url }); continue; }
    const sec = segs[0];
    if (groups[sec]) groups[sec].push({ label: segs[segs.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), url });
    else if (!groups.guides.includes(url)) { /* skip unknown */ }
  }

  const lines = [
    '# Maine Dispensary Guide — Agent Discoverability Index',
    '# https://mainedispensaryguide.com',
    '# For AI agents and crawlers. See /robots.txt for crawl-directive.',
    '',
    '## Homepage',
    '- [Maine Dispensary Guide](https://mainedispensaryguide.com) — Cannabis business resource hub for Maine operators',
    '',
    '## Top-Level Pages',
    ...groups.top.map(p => `- [${p.label}](${p.url})`),
    '',
    '## City & Regional Guides',
    '- [All Guides](https://mainedispensaryguide.com/guides) — 40+ city and technical guides',
    ...groups.guides.filter(g => !g.label.includes('maine-cannabis') && !g.label.includes('maine-dispensary') && !g.label.includes('ocp')).map(g => `- [${g.label}](${g.url})`),
    '',
    '## Technical Guides',
    ...groups.guides.filter(g => g.label.includes('maine-cannabis') || g.label.includes('maine-dispensary') || g.label.includes('ocp')).map(g => `- [${g.label}](${g.url})`),
    '',
    '## Resources',
    '- [Vendor Directory](https://mainedispensaryguide.com/resources) — Service providers and equipment vendors',
    ...groups.resources.map(g => `- [${g.label}](${g.url})`),
    '',
    '## About & Founders',
    ...groups.about.map(g => `- [${g.label}](${g.url})`),
    ...groups.founders.map(g => `- [${g.label}](${g.url})`),
    '',
    '## Blog',
    ...groups.blog.map(g => `- [${g.label}](${g.url})`),
    '',
    '## Downloads',
    ...groups.download.map(g => `- [${g.label}](${g.url})`),
    '',
  ].filter(Boolean);

  fs.writeFileSync('apps/maine-cannabis/public/llms.txt', lines.join('\n') + '\n');
  console.log(`✓ llms.txt regenerated — ${urls.length} URLs, ${lines.length} lines`);
}

main().catch(console.error);
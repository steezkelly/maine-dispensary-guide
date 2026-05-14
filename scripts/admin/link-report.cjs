#!/usr/bin/env node
/**
 * Link Architecture Report
 * Generates a JSON audit of internal link structure: orphans, link counts,
 * most-linked pages, and category breakdown.
 *
 * Usage: node scripts/admin/link-report.cjs [--json|--summary]
 */

const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(filePath) {
  if (filePath.includes('/admin/')) return 'admin';
  if (filePath.includes('/founders/')) return 'founders';
  if (filePath.includes('/resources/')) return 'resources';
  if (filePath.includes('/guides/')) return 'guides';
  return 'core';
}

function getPageType(filePath) {
  if (filePath.endsWith('index.astro')) return 'index';
  const file = path.basename(filePath);
  if (file.includes('-guide')) return 'city-guide';
  if (file.includes('maine-cannabis') || file.includes('maine-dispensary')) return 'technical-guide';
  return 'utility';
}

function urlFromFilePath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const lastPagesIdx = normalizedPath.lastIndexOf('pages/');

  let noPages;
  if (lastPagesIdx >= 0) {
    noPages = normalizedPath.substring(lastPagesIdx);
  } else {
    const cleanPath = normalizedPath.replace(/^\.\.\//, '').replace(/^\.\.\//, '');
    noPages = cleanPath.startsWith('pages/') ? cleanPath : 'pages/' + cleanPath;
  }

  const noAstro = noPages.replace(/\.astro$/, '');
  const cleaned = noAstro.replace(/^pages\//, '').replace(/\/index$/, '') || '/';
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

function extractLinks(content) {
  const linkRegex = /href="(\/[^\"#]*?)"/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api')) {
      links.push(href.split('#')[0]);
    }
  }
  return [...new Set(links)];
}

function extractTitle(content) {
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const titleMatch = content.match(/const title\s*=\s*["']([^"']+)["']/);
  return h1Match ? h1Match[1].trim() : (titleMatch ? titleMatch[1].trim() : 'Untitled');
}

// ─── Scan pages ───────────────────────────────────────────────────────────────

const pagesDir = path.join(__dirname, '..', '..', 'apps', 'maine-cannabis', 'src', 'pages');

// Walk all .astro files under pages/
function walkDir(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full, rel));
    } else if (entry.name.endsWith('.astro')) {
      files.push({ full, rel });
    }
  }
  return files;
}

const files = walkDir(pagesDir);
const pageMap = new Map();
const linkSet = [];

for (const { full, rel } of files) {
  const content = fs.readFileSync(full, 'utf-8');
  const url = urlFromFilePath(rel);
  const title = extractTitle(content);
  const links = extractLinks(content);
  const type = getPageType(rel);
  const category = getCategory(rel);

  pageMap.set(url, { url, title, type, category, incoming: 0, outgoing: links.length, links });
}

// Second pass: count incoming links
for (const [url, page] of pageMap) {
  for (const targetUrl of page.links) {
    const normalizedTarget = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
    if (pageMap.has(normalizedTarget)) {
      linkSet.push({ source: url, target: normalizedTarget });
      pageMap.get(normalizedTarget).incoming++;
    } else if (pageMap.has(targetUrl)) {
      linkSet.push({ source: url, target: targetUrl });
      pageMap.get(targetUrl).incoming++;
    }
  }
}

// Build nodes
const nodes = [...pageMap.values()].map(p => ({
  id: p.url,
  label: p.title || p.url,
  type: p.type,
  category: p.category,
  incoming: p.incoming,
  outgoing: p.outgoing
}));

const orphanPages = [...pageMap.values()]
  .filter(p => p.incoming === 0 && p.category !== 'core' && p.type !== 'index')
  .map(p => p.url);

const mostLinked = [...pageMap.values()]
  .sort((a, b) => b.incoming - a.incoming)
  .slice(0, 10)
  .map(p => ({ id: p.url, label: p.title, count: p.incoming }));

const categories = {};
for (const page of pageMap.values()) {
  categories[page.category] = (categories[page.category] || 0) + 1;
}

const report = {
  generated: new Date().toISOString(),
  stats: {
    totalPages: pageMap.size,
    totalLinks: linkSet.length,
    orphanPages,
    orphanCount: orphanPages.length,
    mostLinked,
    categories
  },
  nodes,
  links: linkSet
};

// ─── Output ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const format = args.includes('--json') ? 'json' : 'summary';

if (format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('\n◆ LINK ARCHITECTURE REPORT');
  console.log(`  Generated: ${report.generated}\n`);
  console.log(`  Total Pages:   ${report.stats.totalPages}`);
  console.log(`  Total Links:   ${report.stats.totalLinks}`);
  console.log(`  Orphan Pages:  ${report.stats.orphanCount}\n`);

  if (orphanPages.length > 0) {
    console.log('  ── Orphan Pages ──');
    for (const url of orphanPages) {
      console.log(`    ${url}`);
    }
    console.log('');
  } else {
    console.log('  ✓ No orphan pages\n');
  }

  console.log('  ── Most Linked Pages ──');
  mostLinked.forEach((p, i) => {
    console.log(`    #${i + 1}  ${p.label} (${p.count} in)`);
  });
  console.log('');

  console.log('  ── Category Breakdown ──');
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log('');
}

#!/usr/bin/env node
/**
 * regen-blog-index.cjs
 *
 * Regenerates apps/maine-cannabis/src/data/blog-index.json by walking every
 * .astro file under apps/maine-cannabis/src/pages/blog/ and extracting:
 *   - slug (filename without .astro)
 *   - href (under /blog/)
 *   - title (from <Layout title="...">, fallback to first <h1>)
 *   - publishDate, modifiedDate, date (modifiedDate or publishDate)
 *   - section (from frontmatter article = { section: ... } or top-level
 *     section: "...")
 *   - heroImage (from <Layout heroImage="...">)
 *
 * The output JSON is the data file consumed by the homepage data boundary
 * via buildLatestIntelligence and selectFeaturedAnalysis. Keeping the data
 * file in sync with the routes is essential: a stale data file means new
 * posts won't appear on the homepage until the next regen.
 *
 * Usage:
 *   node scripts/data/regen-blog-index.cjs                  # write to data file
 *   node scripts/data/regen-blog-index.cjs --dry-run        # print what would change
 *   node scripts/data/regen-blog-index.cjs --check          # exit 1 if data is stale, 0 if fresh
 *
 * Exit codes:
 *   0  written (or fresh in --check mode)
 *   1  --check: data file is stale (regen needed)
 *   2  tool/env error
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const BLOG_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'pages', 'blog');
const DATA_FILE = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'data', 'blog-index.json');

const ASTRO_RE = /\.astro$/;

function listAstroFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (entry.isFile() && ASTRO_RE.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out.sort();
}

function extractFrontmatter(text) {
  const lines = text.split('\n');
  if (!lines[0] || !lines[0].trim().startsWith('---')) return '';
  let closeLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('---')) { closeLine = i; break; }
  }
  if (closeLine === -1) return text;
  return lines.slice(1, closeLine).join('\n');
}

function extractField(fm, name) {
  const re = new RegExp(`\\b${name}:\\s*["']([^"']+)["']`);
  return fm.match(re);
}

function extractLayoutAttr(text, name) {
  // Match `<Layout ... name="..."` or `<Layout ... name='...'` (greedy up to
  // the next whitespace+attribute or `>`).
  const re = new RegExp(`<Layout\\b[^>]*\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 's');
  return text.match(re);
}

function extractH1(text) {
  const m = text.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return m ? m[1].trim() : null;
}

function buildItem(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const fm = extractFrontmatter(text);
  const slug = path.basename(absPath, '.astro');
  const href = `/blog/${slug}`;
  const publish = extractField(fm, 'publishDate');
  if (!publish) return null;
  const modified = extractField(fm, 'modifiedDate');
  const section = extractField(fm, 'section');
  const hero = extractLayoutAttr(text, 'heroImage');
  const layoutTitle = extractLayoutAttr(text, 'title');
  const title = layoutTitle ? layoutTitle[2] : (extractH1(text) || slug.replace(/-/g, ' '));
  return {
    slug,
    href,
    title,
    publishDate: publish[1],
    modifiedDate: modified ? modified[1] : publish[1],
    date: modified ? modified[1] : publish[1],
    section: section ? section[1] : '',
    heroImage: hero ? hero[2] : null,
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const check = args.has('--check');

  const files = listAstroFiles(BLOG_DIR);
  const items = files.map(buildItem).filter(Boolean);
  items.sort((a, b) => b.date.localeCompare(a.date));

  const payload = { generatedAt: new Date().toISOString(), count: items.length, items };
  const next = JSON.stringify(payload, null, 2) + '\n';

  if (check) {
    let current = '';
    try { current = fs.readFileSync(DATA_FILE, 'utf8'); } catch { current = ''; }
    if (current !== next) {
      console.error(`blog-index.json is stale (${items.length} posts). Run: node scripts/data/regen-blog-index.cjs`);
      process.exit(1);
    }
    console.log(`blog-index.json is fresh (${items.length} posts).`);
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] would write ${items.length} posts to ${path.relative(REPO, DATA_FILE)}`);
    return;
  }

  fs.writeFileSync(DATA_FILE, next);
  console.log(`blog-index.json written: ${items.length} posts`);
}

try {
  main();
} catch (err) {
  console.error('[regen-blog-index] fatal:', err && err.stack ? err.stack : err);
  process.exit(2);
}
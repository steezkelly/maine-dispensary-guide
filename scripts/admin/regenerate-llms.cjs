'use strict';

/**
 * Regenerate llms.txt from an XML sitemap.
 *
 * Usage:
 *   node scripts/admin/regenerate-llms.cjs --from-file=dist/sitemap-0.xml
 *   node scripts/admin/regenerate-llms.cjs --from-file sitemap.xml --output /tmp/llms.txt
 *
 * With no --from-file argument, the canonical production sitemap is fetched.
 */
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');

const SITE_ORIGIN = 'https://mainedispensaryguide.com';
const DEFAULT_OUTPUT = path.join('apps', 'maine-cannabis', 'public', 'llms.txt');
const GROUPS = ['homepage', 'top', 'guides', 'resources', 'about', 'blog', 'download', 'founders', 'additional'];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`failed to fetch ${url}: HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseArguments(argv) {
  const args = { fromFile: null, output: DEFAULT_OUTPUT };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [flag, inline] = arg.split('=', 2);
    if (!['--from-file', '--output'].includes(flag)) throw new Error(`unknown argument: ${flag}`);
    const value = inline ?? argv[++index];
    if (!value) throw new Error(`missing value for ${flag}`);
    if (flag === '--from-file') args.fromFile = value;
    else args.output = value;
  }
  return args;
}

function titleFromSegment(segment) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function sitemapUrls(xml) {
  return [...new Set([...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1].trim()).filter(Boolean))];
}

function groupUrls(urls) {
  const groups = Object.fromEntries(GROUPS.map((group) => [group, []]));
  for (const url of urls) {
    const route = url.replace(SITE_ORIGIN, '') || '/';
    const segments = route.split('/').filter(Boolean);
    if (!segments.length) {
      groups.homepage.push({ label: 'Maine Dispensary Guide', url });
      continue;
    }
    if (segments.length === 1) {
      groups.top.push({ label: titleFromSegment(segments[0]), url });
      continue;
    }
    const group = Object.hasOwn(groups, segments[0]) ? segments[0] : 'additional';
    groups[group].push({ label: titleFromSegment(segments.at(-1)), url });
  }
  return groups;
}

function renderGroup(title, entries) {
  if (!entries.length) return [];
  return [`## ${title}`, ...entries.map((entry) => `- [${entry.label}](${entry.url})`), ''];
}

function buildIndex(urls, regenerationDate = new Date().toISOString().split('T')[0]) {
  const groups = groupUrls(urls);
  return [
    '# Maine Dispensary Guide — Agent Discoverability Index',
    `# ${SITE_ORIGIN}`,
    '# For AI agents and crawlers. See /robots.txt for crawl-directive.',
    `# Last regenerated: ${regenerationDate} from ${urls.length} sitemap URLs`,
    '',
    ...renderGroup('Homepage', groups.homepage),
    ...renderGroup('Top-Level Pages', groups.top),
    ...renderGroup('City & Regional Guides', groups.guides.filter((entry) => !/maine cannabis|maine dispensary|ocp/i.test(entry.label))),
    ...renderGroup('Technical Guides', groups.guides.filter((entry) => /maine cannabis|maine dispensary|ocp/i.test(entry.label))),
    ...renderGroup('Resources', groups.resources),
    ...renderGroup('About & Founders', [...groups.about, ...groups.founders]),
    ...renderGroup('Blog', groups.blog),
    ...renderGroup('Downloads', groups.download),
    ...renderGroup('Additional Sitemap Pages', groups.additional),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const xml = args.fromFile
    ? fs.readFileSync(args.fromFile, 'utf8')
    : await fetchUrl(`${SITE_ORIGIN}/sitemap-0.xml`);
  const urls = sitemapUrls(xml);
  if (!urls.length) throw new Error('sitemap contained no URLs');
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, buildIndex(urls));
  console.log(`✓ llms.txt regenerated — ${urls.length} URLs, output: ${args.output}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildIndex, groupUrls, parseArguments, sitemapUrls };

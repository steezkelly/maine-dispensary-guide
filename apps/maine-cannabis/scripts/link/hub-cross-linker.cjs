// hub-cross-linker.cjs
//
// Insert hub-to-hub (city guide -> operator guide) internal links in the
// canonical *-dispensary-guide.astro city-guide corpus.
//
// This is a body-only text injector, modeled on scripts/link/link-architect.cjs
// but for city->operator cross-links. It does NOT touch the Astro frontmatter,
// inline <style> block, or any existing JSON-LD. The insertion anchor is the
// "See also: Maine dispensary guides nearby" section that already exists in
// every city guide.
//
// Design choices:
//   1. The injection is idempotent. If a section with id="hub-cross-links"
//      already exists in the body, the script skips the file.
//   2. Each guide receives three core references plus up to two matches for
//      its declared `topics`; unused topic slots fall back to core references.
//   3. The script supports --dry-run, --diff, and --apply modes. Default is
//      --dry-run so the change is preview-able before touching 100+ files.
//   4. The body anchor is matched via a forgiving regex over the existing
//      "See also: Maine dispensary guides nearby" heading.
//
// Run from the repo root or the apps/maine-cannabis directory:
//   node apps/maine-cannabis/scripts/link/hub-cross-linker.cjs --dry-run
//   node apps/maine-cannabis/scripts/link/hub-cross-linker.cjs --apply
//
// Owned by sprint: hub-to-hub-internal-linking-2026-07-21

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const guidesDir = path.join(repoRoot, 'apps', 'maine-cannabis', 'src', 'pages', 'guides');
const mapPath = path.join(__dirname, 'hub-cross-link-map.json');
const MAX_LINKS = 5;
const TOPIC_LINK_SLOTS = 2;

const args = process.argv.slice(2);
const supportedFlags = new Set(['--apply', '--diff', '--dry-run']);
const unknownFlags = args.filter((arg) => !supportedFlags.has(arg));
const requestedModes = args.filter((arg) => supportedFlags.has(arg));
if (unknownFlags.length > 0 || new Set(requestedModes).size > 1) {
  console.error('usage: hub-cross-linker.cjs [--dry-run|--diff|--apply]');
  process.exit(2);
}
const mode = args.includes('--apply') ? 'apply'
  : args.includes('--diff') ? 'diff'
  : 'dry-run';

if (!fs.existsSync(guidesDir)) {
  console.error(`guides directory not found: ${guidesDir}`);
  process.exit(1);
}
if (!fs.existsSync(mapPath)) {
  console.error(`cross-link map not found: ${mapPath}`);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

function validateMap() {
  if (!Array.isArray(map.alwaysRelevant) || !Array.isArray(map.operators)) {
    throw new Error('cross-link map must define alwaysRelevant and operators arrays');
  }
  if (map.alwaysRelevant.length !== map._meta.always_relevant_count) {
    throw new Error('alwaysRelevant count does not match _meta.always_relevant_count');
  }
  if (map.operators.length !== map._meta.operator_count) {
    throw new Error('operators count does not match _meta.operator_count');
  }

  const entriesBySlug = new Map();
  for (const entry of [...map.alwaysRelevant, ...map.operators]) {
    if (!entry || !/^[a-z0-9-]+$/.test(entry.slug || '')) {
      throw new Error(`invalid mapped slug: ${entry?.slug || '(missing)'}`);
    }
    if (typeof entry.title !== 'string' || !Number.isFinite(entry.order)) {
      throw new Error(`invalid mapped entry: ${entry.slug}`);
    }
    if (entriesBySlug.has(entry.slug)) {
      const prior = entriesBySlug.get(entry.slug);
      if (prior.title !== entry.title || prior.order !== entry.order) {
        throw new Error(`conflicting duplicate mapped slug: ${entry.slug}`);
      }
    } else {
      entriesBySlug.set(entry.slug, entry);
    }
  }
  for (const entry of map.operators) {
    if (!Array.isArray(entry.topics) || entry.topics.some((topic) => typeof topic !== 'string')) {
      throw new Error(`invalid topics for mapped entry: ${entry.slug}`);
    }
  }

  for (const slug of entriesBySlug.keys()) {
    const routePath = path.join(guidesDir, `${slug}.astro`);
    if (!fs.existsSync(routePath)) {
      throw new Error(`mapped route not found: /guides/${slug}`);
    }
  }
}

try {
  validateMap();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const byTopic = new Map();
for (const entry of map.operators) {
  for (const t of entry.topics) {
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(entry);
  }
}

function isCityGuide(name) {
  return name.endsWith('-dispensary-guide.astro');
}

function extractTopics(content) {
  const frontmatter = content.match(/^---([\s\S]*?)---/);
  if (!frontmatter) return [];
  const m = frontmatter[1].match(/const\s+topics\s*=\s*\[([^\]]*)\]/);
  if (!m) return [];
  const out = [];
  const re = /(['"])([^'"]+)\1/g;
  let t;
  while ((t = re.exec(m[1])) !== null) out.push(t[2]);
  return out;
}

function pickOperators(cityTopics) {
  const coreCount = MAX_LINKS - TOPIC_LINK_SLOTS;
  const picked = new Map();
  for (const entry of map.alwaysRelevant.slice(0, coreCount)) {
    picked.set(entry.slug, entry);
  }

  const topicMatches = new Map();
  for (const topic of cityTopics) {
    for (const entry of byTopic.get(topic) || []) {
      if (!picked.has(entry.slug)) topicMatches.set(entry.slug, entry);
    }
  }
  const orderedTopicMatches = Array.from(topicMatches.values())
    .sort((a, b) => a.order - b.order)
    .slice(0, TOPIC_LINK_SLOTS);
  for (const entry of orderedTopicMatches) picked.set(entry.slug, entry);

  for (const entry of map.alwaysRelevant) {
    if (picked.size >= MAX_LINKS) break;
    picked.set(entry.slug, entry);
  }

  return Array.from(picked.values())
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_LINKS);
}

function buildSectionHtml(operators) {
  const items = operators.map((o) => (
    `    <li><a href="/guides/${o.slug}">${o.title}</a></li>`
  )).join('\n');
  return [
    '',
    '  <section id="hub-cross-links">',
    '    <h2>Read the operator guide</h2>',
    '    <p>For the Maine-specific rules and operator context behind the dispensaries above, start with these core and topic-specific references:</p>',
    '    <ul>',
    items,
    '    </ul>',
    '  </section>',
  ].join('\n');
}

const files = fs.readdirSync(guidesDir).filter(isCityGuide);

let touched = 0;
let skipped = 0;
let previewed = 0;

function recordSkip(reason, name) {
  skipped += 1;
  console.log(`[skip:${reason}] ${name}`);
}

for (const name of files) {
  const fp = path.join(guidesDir, name);
  const content = fs.readFileSync(fp, 'utf8');

  if (content.includes('id="hub-cross-links"')) {
    recordSkip('already-linked', name);
    continue;
  }

  const cityTopics = extractTopics(content);
  const ordered = pickOperators(cityTopics);

  if (ordered.length === 0) {
    recordSkip('no-links', name);
    continue;
  }

  // Find insertion point: just before the "See also: Maine dispensary guides
  // nearby" <h2>. We use a forgiving regex because the heading text is
  // template-stable across the canonical city-guide corpus, while allowing
  // attributes on the section and heading elements.
  const anchorRe = /(<section\b[^>]*>\s*<h2\b[^>]*>See also:\s*Maine dispensary guides nearby<\/h2>)/i;
  const match = content.match(anchorRe);
  if (!match) {
    recordSkip('missing-anchor', name);
    continue;
  }

  const newSection = buildSectionHtml(ordered);
  const updated = content.slice(0, match.index) + newSection + '\n\n' + content.slice(match.index);

  if (mode === 'dry-run') {
    previewed += 1;
    if (previewed <= 3) {
      console.log(`---\n[preview] ${name}\n  would insert: ${ordered.length} operator links`);
    }
    continue;
  }
  if (mode === 'diff') {
    console.log(`---\n[diff] ${name}\n  + ${newSection.split('\n').join('\n  + ')}`);
    previewed += 1;
    continue;
  }

  fs.writeFileSync(fp, updated);
  touched += 1;
}

const verb = mode === 'apply' ? 'updated' : 'would update';
const total = touched + previewed;
console.log(`\n${verb}: ${mode === 'apply' ? touched : total} | skipped: ${skipped} | mode: ${mode}`);
if (mode === 'dry-run' && previewed > 3) {
  console.log(`(preview shown for first 3 of ${previewed} files)`);
}

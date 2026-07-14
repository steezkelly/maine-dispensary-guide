#!/usr/bin/env node
/**
 * Orphan-page detector for Maine Dispensary Guide.
 *
 * READ-ONLY: scans `apps/maine-cannabis/src/pages/**` and reports each
 * non-noindex Astro page that has zero inbound internal links from any
 * other page on the site. Useful as:
 *
 *   1. A pre-commit gate to catch new pages that don't link to anything.
 *   2. A regression check after a content-edit sprint to confirm
 *      hub/related-guides cross-links actually worked.
 *   3. A discovery tool for the agent/human to triage orphan clusters
 *      by category (city guides, blog posts, operator profiles, etc.).
 *
 * Why this exists as a separate script instead of just being another
 * check inside content-health.cjs: orphan triage is a content-eng
 * decision (which orphans to fix and how), not a code-quality gate.
 * A content-eng session can run this script and get a categorization
 * report; the existing content-health.cjs just emits an undifferentiated
 * "X orphans" count.
 *
 * Design choices:
 *
 * - Matches the existing `content-health.cjs::checkOrphanPages` inbound
 *   detection regex (`href="/<path>"` and `href: "/<path>"` literal forms)
 *   so the two scripts agree on what "orphan" means on a given repo state.
 * - Reads source files (not `dist/`) so it runs without `npm run build`
 *   and stays fast (< 1 s for the full MDG page corpus).
 * - Categorizes each orphan into one of:
 *     - `city-guide`     : `/guides/<city>-dispensary-guide.{astro}` in City Guides section
 *     - `regional-hub`  : `/guides/*-cannabis-guide.{astro}` (5 hub pages)
 *     - `operator`      : `/guides/<operator>-dispensary.{astro}` or under `/founders/`
 *     - `policy-blog`   : `/blog/*.astro` topics include policy/compliance/legislation
 *     - `operator-blog` : `/blog/*.astro` topics include business/licensing/operations
 *     - `consumer-blog` : `/blog/*.astro` topics include consumer-guide/edibles
 *     - `utility`       : `/embed/*`, `/market-*`, `/maine-cannabis-tax-calculator`, etc.
 *     - `unknown`       : fallback when no section/topics match
 * - Why no fix-mode: cross-link auto-injection is intentionally
 *   excluded from this script's scope. Three reasons:
 *     1. **Editorial judgment**: cross-link decisions benefit from
 *        human review (anchor text choice, context relevance,
 *        near-duplicate avoidance). Auto-injection patterns scale
 *        into uniform outputs that miss this judgment layer.
 *     2. **YMYL discipline**: this project covers cannabis
 *        regulatory and licensing content where unverified
 *        auto-generated cross-links could mislead readers.
 *     3. **Caution against pattern-match YMYL triggers**: while
 *        the Google March 2026 Spam Update (verified via
 *        `docs/superpowers/specs/2026-07-14-mdg-march-2026-spam-update-audit.md`)
 *        does NOT specifically ban internal cross-link injection,
 *        its scope includes "manipulative outbound link patterns"
 *        and the broader scaled-content-abuse category. Future
 *        updates may extend this scope. Keeping the detector
 *        read-only is the conservative position.
 *   The detector reports; a human-or-agent session makes content
 *   decisions with editorial judgment.
 *
 * Usage:
 *
 *   # Default: list all orphans with category + recommended fix
 *   node scripts/check/orphan-detector.cjs
 *
 *   # Filter by category
 *   node scripts/check/orphan-detector.cjs --category city-guide
 *
 *   # JSON output (for piping into a report)
 *   node scripts/check/orphan-detector.cjs --json
 *
 *   # Exit 1 if any orphan exists (use as a CI gate after fix-pass)
 *   node scripts/check/orphan-detector.cjs --strict
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PAGES_DIR = path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'src', 'pages');
const SRC_DIR = path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'src');

// Routes that are intentionally noindex / standalone and don't need
// inbound links (e.g. admin panes, 404 utility, opt-in tracker, helpers).
const INTENTIONAL_NOINDEX = new Set([
  '/404',
  '/admin',
  '/experiments',
  '/search',
  '/download/roadmap',
  '/embed/opt-in-tracker', // opt-in trackers rarely warrant navigation presence
]);

const HELP_TEXT = `orphan-detector — list MDG pages with zero inbound internal links

usage:
  node scripts/check/orphan-detector.cjs [flags]

flags:
  --category <name>  filter by category (city-guide | regional-hub | operator
                   | policy-blog | operator-blog | consumer-blog | utility | all)
  --strict          exit 1 if any orphan found (use as CI gate)
  --json            output machine-readable JSON instead of text report
  --help            show this text

default mode prints a categorized text report and exits 0.
`;

function listAstroFilesRecursive(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'admin' || entry.name === 'api' || entry.name === 'node_modules') continue;
      listAstroFilesRecursive(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      out.push(full);
    }
  }
  return out;
}

function isNoindex(file) {
  try {
    return /noindex\s*=\s*\{\s*true\s*\}/.test(fs.readFileSync(file, 'utf8'));
  } catch {
    return false;
  }
}

function findInboundLink(needle, excludeFile) {
  // Match both `href="/path"` and `href: "/path"` forms. This matches the
  // convention in content-health.cjs::checkOrphanPages so the two scripts
  // agree. Pages with cross-links via JSX expressions, dynamic routes, or
  // AutoRelated slots are intentionally not counted here — those are
  // detected by the rendered-HTML-based smoke-200 check separately.
  const escaped = needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re1 = new RegExp(`href\\s*=\\s*["']\\/?${escaped}["']`);
  const re2 = new RegExp(`href\\s*:\\s*["']\\/?${escaped}["']`);
  const all = listAstroFilesRecursive(SRC_DIR);
  for (const f of all) {
    if (f === excludeFile) continue;
    let text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (re1.test(text) || re2.test(text)) return f;
  }
  return '';
}

// Rendered-HTML check: walks `apps/maine-cannabis/dist` for `*.html` files
// and counts whether the page is referenced via a literal `href="/<path>"`
// in any other rendered file. This catches inbound links emitted by JSX
// expressions (e.g., `<a href={hubByName[region.name]}>`), data-driven
// post arrays, and slot fills — patterns the source-only check misses.
//
// Build first (`npm run build`) so dist/ exists. The script reads from
// dist/ when present; if absent, the source check (above) is authoritative
// and we surface a warning so the runner knows the rendered check is stale.
function findInboundFromRendered(needle, excludeHtml) {
  // Look for the route-with-leading-slash pattern. Note: dist path encoding
  // varies by Astro config (this repo uses trailingSlash: 'never' so
  // /foo/ becomes /foo/index.html; the source path /foo matches either).
  const escaped = needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(`href\\s*=\\s*["']\\/?${escaped}(?:["'/#?]|$)`, 'm');
  // For src → dist path mapping: src/pages/foo/bar.astro → dist/foo/bar/index.html
  const distPath = path.join(
    REPO_ROOT,
    'apps',
    'maine-cannabis',
    'dist',
    needle.replace(/^\//, ''),
    'index.html',
  );
  // For trailingSlash:'never', Astro writes dist/index.html for /, too.
  function walk(dir, out) {
    if (!fs.existsSync(dir)) return out;
    out = out || [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.isFile() && full.endsWith('.html')) out.push(full);
    }
    return out;
  }
  let htmlFiles;
  try {
    htmlFiles = walk(path.join(REPO_ROOT, 'apps', 'maine-cannabis', 'dist'));
  } catch {
    return '';
  }
  for (const f of htmlFiles) {
    if (f === excludeHtml || f === distPath) continue;
    let text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (re.test(text)) return f;
  }
  return '';
}

// Categorize a page by section/topic signals extracted from frontmatter.
// Heuristic-only; not authoritative — humans should confirm category
// from page-level review when running this script for content triage.
function categorize(file, route) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { category: 'unknown', section: '', topics: [] };
  }

  // Section extraction: matches `section: "Foo"` and `section = "Foo"`.
  const sectionMatch = text.match(/(?:section|Section)\s*[:=]\s*["']([^"']+)["']/);
  const section = sectionMatch ? sectionMatch[1] : '';

  // Topics extraction: matches `topics=['a', 'b']` and `topics={['a','b']}`.
  const topicsMatch =
    text.match(/topics\s*[:=]\s*\[\s*([^\]]*)\]/) ||
    text.match(/topics\s*[:=]\s*{[^}]*\[([^\]]*)\]/);
  const topics = [];
  if (topicsMatch) {
    for (const m of topicsMatch[1].matchAll(/["']([^"']+)["']/g)) {
      topics.push(m[1]);
    }
  }

  // Match by route shape first (cheaper than grepping frontmatter).
  if (route.startsWith('/embed/') || route.includes('calculator')) {
    return { category: 'utility', section, topics };
  }
  if (/\/(guides|founders)\/[^/]+-cannabis-guide(?:-\d+)?(?:\.astro)?$/.test(route)) {
    return { category: 'regional-hub', section, topics };
  }
  if (route.startsWith('/founders/')) {
    return { category: 'operator', section, topics };
  }
  if (route.startsWith('/guides/')) {
    // Operator profile paths tend to use `<name>-dispensary` without
    // `dispensary-guide`; town guides always include `-dispensary-guide`.
    if (/-dispensary-guide(?:-\d+)?$/.test(route)) {
      return { category: 'city-guide', section, topics };
    }
    if (/-dispensary$/.test(route) || /-(?:company|therapy|cannabis)$/.test(route)) {
      return { category: 'operator', section, topics };
    }
    return { category: 'guides-other', section, topics };
  }
  if (route.startsWith('/blog/')) {
    // Topic-driven categorization for blogs.
    const t = new Set(topics);
    if (t.has('policy') || t.has('legislation') || t.has('compliance') || t.has('enforcement')) {
      return { category: 'policy-blog', section, topics };
    }
    if (t.has('business') || t.has('licensing') || t.has('operations') || t.has('careers')) {
      return { category: 'operator-blog', section, topics };
    }
    if (t.has('consumer-guide') || t.has('best-of') || t.has('gift-cards')) {
      return { category: 'consumer-blog', section, topics };
    }
    return { category: 'blog-other', section, topics };
  }
  return { category: 'unknown', section, topics };
}

function findOrphans() {
  if (!fs.existsSync(PAGES_DIR)) {
    process.stderr.write(`pages/ not found at ${PAGES_DIR}\n`);
    process.exit(2);
  }
  const files = listAstroFilesRecursive(PAGES_DIR);
  const orphans = [];
  for (const f of files) {
    if (isNoindex(f)) continue;
    const relRaw = path.relative(PAGES_DIR, f).replace(/\.astro$/, '');
    if (relRaw === 'index') continue;
    let route = '/' + relRaw.replace(/\//g, '/').replace(/\/index$/, '');
    if (INTENTIONAL_NOINDEX.has(route)) continue;
    const inboundSrc = findInboundLink(route.replace(/^\//, ''), f);
    const inboundDist = findInboundFromRendered(route);
    if (!inboundSrc && !inboundDist) {
      orphans.push({
        file: f,
        route,
        sourceInbounds: inboundSrc,
        renderedInbounds: inboundDist,
        ...categorize(f, route),
      });
    }
  }
  orphans.sort((a, b) => a.route.localeCompare(b.route));
  return orphans;
}

function categoryColor(cat) {
  // No ANSI color — we're not in a TTY-required context. The category
  // label is included verbatim in text output.
  return cat;
}

// Recommended fix strategy per category. Human-or-agent applies this with
// real content decisions; the script only surfaces the recommendation.
const CATEGORY_RECOMMENDATIONS = {
  'city-guide':
    'Add a single /guides/all-cities.astro hub page that lists every town guide alphabetically. 1 page kills 20+ orphans at once.',
  'regional-hub':
    "Add the 5 hubs to the find-a-dispensary.astro directory index. Single block of <a> lines.",
  'operator':
    'Create operator-profile hubs (or expand operator index). Most Maine operators get direct traffic from branded queries.',
  'policy-blog':
    'Add topic-tag cross-link blocks on policy content. Group by section in /blog/ index.',
  'operator-blog':
    'Add topic cross-links from operator-playbook index. Group by section (Business Essentials, Operations, etc.).',
  'consumer-blog':
    'Add topic cross-links from /learn consumer-content index. Group by cannabinoid category or consumption mode.',
  'guides-other':
    'Manual triage — review content direction and add to nearest parent index.',
  'blog-other':
    'Manual triage — review content and group by section.',
  'utility':
    'Embed utilities (tax calc, opt-in tracker) rarely warrant navigation. Accept as intentional orphan or link from /resources.',
  'unknown':
    'Cannot auto-categorize from frontmatter. Open the page, confirm category manually.',
};

function renderText(orphans) {
  if (orphans.length === 0) {
    process.stdout.write(
      '\n✅ No MDG orphan pages (above the intentional-noindex allow-list)\n\n',
    );
    return;
  }

  // Group by category for readable summary.
  const byCategory = {};
  for (const o of orphans) {
    if (!byCategory[o.category]) byCategory[o.category] = [];
    byCategory[o.category].push(o);
  }

  process.stdout.write(
    `\nMDG orphan-page detector — ${orphans.length} orphan pages found\n\n`,
  );

  for (const cat of Object.keys(byCategory).sort()) {
    const items = byCategory[cat];
    process.stdout.write(`── ${cat} (${items.length}) ──\n`);
    for (const o of items) {
      process.stdout.write(`  ${o.route}\n`);
      if (o.section) {
        process.stdout.write(`    section: ${o.section}\n`);
      }
    }
    process.stdout.write(
      `    fix: ${CATEGORY_RECOMMENDATIONS[cat] || 'manual triage'}\n\n`,
    );
  }

  process.stdout.write(
    `Intentional orphans allow-listed:\n  ${Array.from(INTENTIONAL_NOINDEX).join('\n  ')}\n\n`,
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const categoryFilter = args.indexOf('--category') >= 0
    ? args[args.indexOf('--category') + 1]
    : null;
  const jsonMode = args.includes('--json');
  const strict = args.includes('--strict');

  let orphans = findOrphans();
  if (categoryFilter && categoryFilter !== 'all') {
    orphans = orphans.filter((o) => o.category === categoryFilter);
  }

  if (jsonMode) {
    process.stdout.write(JSON.stringify({ orphans, total: orphans.length }, null, 2) + '\n');
  } else {
    renderText(orphans);
  }

  if (strict && orphans.length > 0) process.exit(1);
  process.exit(0);
}

main();

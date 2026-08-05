#!/usr/bin/env node
/**
 * regen-auto-related.cjs
 *
 * Regenerates apps/maine-cannabis/src/data/autoRelatedData.json by walking
 * every .astro file under apps/maine-cannabis/src/pages/ and extracting:
 *   - title (from the <h1> in the body, or from frontmatter `title:` field)
 *   - section (from frontmatter `section:` field, default "Uncategorized")
 *   - topics (from frontmatter `const topics = [...]` array)
 *   - url (relative path under src/pages/, leading slash, no .astro)
 *
 * The output JSON is the data file consumed at build time by
 * src/components/AutoRelated.astro (scoring + ranking). Keeping the data
 * file in sync with the routes is essential: a stale data file means new
 * pages won't appear in related-guides blocks until the next regen.
 *
 * Usage:
 *   node scripts/data/regen-auto-related.cjs                # write to data file
 *   node scripts/data/regen-auto-related.cjs --stdout       # emit canonical JSON without writing
 *   node scripts/data/regen-auto-related.cjs --dry-run      # print what would change
 *   node scripts/data/regen-auto-related.cjs --check        # exit 1 if data is stale, 0 if fresh
 *
 * Exit codes:
 *   0  written (or fresh in --check mode)
 *   1  --check: data file is stale (regen needed)
 *   2  tool/env error
 *
 * Wiring:
 *   This script is the canonical data-regeneration tool. The pre-push
 *   gate and pre-commit hook call it (via `npm run data:auto-related`)
 *   whenever any .astro file with frontmatter changes.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const PAGES_DIR = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'pages');
const DATA_FILE = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'data', 'autoRelatedData.json');

const ASTRO_RE = /\.astro$/;

function listAstroFiles(dir) {
    const out = [];
    function walk(d) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) { walk(full); continue; }
            if (entry.isFile() && ASTRO_RE.test(entry.name)) out.push(full);
        }
    }
    walk(dir);
    return out.sort();
}

function getUrl(absPath) {
    let rel = path.relative(PAGES_DIR, absPath).replace(/\\/g, '/');
    rel = rel.replace(/\.astro$/, '');
    if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
    if (rel === 'index') rel = '';
    if (!rel.startsWith('/')) rel = '/' + rel;
    return rel;
}

function isConcretePageUrl(url) {
    return !url.split('/').some((segment) => segment.startsWith('[') && segment.endsWith(']'));
}

/**
 * Extract the frontmatter block. Returns text between the opening `---`
 * and the next line that starts with `---`. Handles both proper and
 * compressed forms.
 */
function extractFrontmatter(text) {
    const lines = text.split('\n');
    if (!lines[0].trim().startsWith('---')) return '';
    let closeLine = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith('---')) { closeLine = i; break; }
    }
    if (closeLine === -1) return text; // unclosed — return whole file
    return lines.slice(1, closeLine).join('\n');
}

/**
 * Extract title: prefer a literal page <h1>, then frontmatter `title:`.
 * A page-level H1 must win because collection/search frontmatter often contains
 * nested item objects with unrelated `title:` keys.
 */
function extractTitle(text, fm) {
    const h1 = text.match(/<h1[^>]*>([^<]+)<\/h1>/);
    // The H1 is raw HTML, so decode entities (e.g. &amp; -> &). AutoRelated
    // renders item.title as text and Astro escapes it again, so storing the
    // already-escaped form would show a literal "&amp;" on related cards.
    if (h1) return decodeHtmlEntities(h1[1].trim());
    const m = fm.match(/^\s*title:\s*['"]([^'"]+)['"]/m);
    if (m) return m[1];
    // Compressed form: title might be inline. Look for "title:" followed by
    // a quoted string anywhere in the fm.
    const m2 = fm.match(/title:\s*['"]([^'"]+)['"]/);
    if (m2) return m2[1];
    const layout = text.match(/<Layout\b[^>]*\btitle\s*=\s*(['"])(.*?)\1/);
    if (layout) return layout[2];
    return path.basename(text, '.astro').replace(/-/g, ' ');
}

/**
 * Decode the common named/numeric HTML entities that appear in extracted
 * <h1> text. Keeps the stored title as literal text so downstream renderers
 * (which escape again) don't double-encode.
 */
function decodeHtmlEntities(s) {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

/**
 * Extract section: prefer frontmatter `section:` field. May be quoted or
 * part of an `article = { ... }` object literal.
 */
function extractSection(fm) {
    const m = fm.match(/section:\s*['"]([^'"]+)['"]/);
    return m ? m[1] : '';
}

/**
 * Extract topics: ONLY from an explicit `const topics = ['a', 'b']` or
 * `topics={['a', 'b']}` array literal. Falls back to URL-pattern inference
 * if neither is present.
 *
 * The previous version of this regex matched every quoted string in the
 * frontmatter, which produced garbage like full FAQ answers and JSX
 * attribute values as topics. That broke AutoRelated scoring — a page
 * with no `topics = [...]` would get a topics array of 40+ strings, most
 * of which were unrelated to its actual subject.
 */
function extractTopics(fm) {
    // Look for `topics = [...]` (variable declaration) OR `topics={[...]}` (JSX prop)
    const decl = fm.match(/(?:const\s+)?topics\s*=\s*\[([^\]]+)\]/);
    const prop = fm.match(/topics\s*=\s*\{\s*\[([^\]]+)\]\s*\}/);
    const source = (decl && decl[1]) || (prop && prop[1]);
    if (!source) return [];
    const out = [];
    const re = /['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        const t = m[1].trim();
        if (t && !out.includes(t)) out.push(t);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Topic and section inference
//
// Many MDG pages use the `article = { ... section: "..." }` pattern rather
// than a top-level `section:` field, and only ~5 pages declare an explicit
// `topics = [...]` array. To keep autoRelatedData.json useful for the
// scoring algorithm, we infer topic and section from URL patterns + page
// content when the frontmatter doesn't declare them. This matches the
// behavior of the original generator that produced the data file R127
// shipped with.
//
// Inference is heuristic and intentionally conservative — when uncertain,
// we omit rather than guess wrong. AutoRelated scoring still produces
// useful rankings with empty topics (it falls back to section match).
// ---------------------------------------------------------------------------

const URL_TOPIC_HINTS = [
    // [path-substring, [topic, topic, ...]]
    ['/blog/maine-cannabis-budtender-careers', ['careers', 'budtender', 'hiring']],
    ['/blog/portland-maine-cannabis-rules', ['portland', 'rules', 'local']],
    ['/blog/cannabis-clones-vs-seeds-maine', ['clones', 'seeds', 'genetics']],
    ['/blog/drying-cannabis-maine-humidity', ['drying', 'curing', 'humidity']],
    ['/blog/indoor-cannabis-grow-setup', ['indoor', 'grow', 'equipment']],
    ['/blog/autoflower-vs-feminized-maine', ['autoflower', 'feminized', 'seeds']],
    ['/blog/when-to-start-cannabis-seeds-maine', ['timing', 'germination', 'calendar']],
    ['/blog/best-cannabis-strains-maine-outdoor', ['strains', 'outdoor', 'mold']],
    ['/blog/best-live-rosin-maine', ['rosin', 'solventless', 'concentrates']],
    ['/blog/cannabis-friendly-maine-travel', ['travel', 'tourism', '420']],
    ['/blog/maine-dispensary-gift-cards', ['gift-cards', 'consumer']],
    ['/blog/maine-rso-guide', ['rso', 'concentrates', 'medical']],
    ['/blog/buying-cannabis-by-effect', ['effects', 'consumer']],
    ['/blog/ibogaine-federal-executive-order', ['psychedelics', 'policy', 'federal']],
    ['/blog/trump-psychedelic-executive-order', ['psychedelics', 'policy', 'federal']],
    ['/blog/maine-cannabis-social-equity', ['social-equity', 'licensing']],
    ['/blog/maine-cannabis-delivery-business-guide', ['delivery', 'business', 'license']],
    ['/blog/maine-home-grow-cannabis-guide', ['home-grow', 'cultivation']],
    ['/blog/maine-cannabis-microbusiness-license', ['microbusiness', 'license']],
    ['/blog/maine-cannabis-cultivation-license', ['cultivation', 'license']],
    ['/blog/maine-medical-cannabis-pesticide', ['pesticide', 'compliance']],
    ['/blog/cannabis-terpenes-explained-maine', ['terpenes', 'consumer']],
    ['/blog/maine-dispensary-roi-what-to-expect', ['roi', 'finance', 'investor']],
    ['/blog/best-maine-dispensaries-2026', ['best-of', 'consumer']],
    ['/guides/cannabis-coa-maine-how-to-read', ['consumer-guide', 'cannabis-science', 'lab-testing', 'dosing']],
    ['/guides/cannabis-tinctures-sublingual-maine', ['dosing', 'consumer-guide', 'consumption-methods']],
    ['/guides/cannabis-topicals-maine', ['topicals', 'consumer-guide']],
    ['/guides/cannabis-edible-dose-calculator-maine', ['dosing', 'consumer-guide', 'edibles']],
    ['/guides/cannabis-terpenes-effects-maine', ['terpenes', 'consumer-guide']],
    ['/guides/maine-cannabis-taxes-2026', ['finance', 'compliance', 'business']],
    ['/guides/maine-cannabis-schedule-iii-dual-license-280e', ['tax', 'compliance', 'schedule-iii']],
    ['/guides/maine-cannabis-2026-operator-cost-update', ['cost', 'tax', 'compliance']],
    ['/guides/maine-cannabis-caregiver-trade-show-sales', ['caregiver', 'compliance']],
    ['/guides/maine-cannabis-sun-grown-caregiver', ['caregiver', 'cultivation']],
    ['/guides/maine-cannabis-market', ['market', 'analysis']],
    ['/guides/maine-dispensary-license', ['licensing', 'compliance']],
    ['/guides/maine-dispensary-costs', ['cost', 'finance']],
    ['/guides/maine-dispensary-business-plan', ['business-plan', 'startup']],
    ['/guides/maine-dispensary-real-estate', ['real-estate', 'zoning']],
    ['/guides/maine-dispensary-security', ['security', 'compliance']],
    ['/guides/maine-dispensary-packaging', ['packaging', 'compliance']],
    ['/guides/maine-cannabis-inventory-management', ['inventory', 'metrc']],
    ['/guides/maine-cannabis-wholesale-guide', ['wholesale', 'b2b']],
    ['/guides/maine-dispensary-pos', ['pos', 'technology']],
    ['/guides/maine-cannabis-banking-solutions', ['banking', 'finance']],
    ['/guides/maine-cannabis-staffing-licensing', ['staffing', 'licensing']],
    ['/guides/maine-cannabis-marketing-compliance', ['marketing', 'compliance']],
    ['/guides/maine-cannabis-business-insurance', ['insurance', 'risk']],
    ['/guides/maine-cannabis-workers-comp-insurance', ['insurance', 'hr']],
    ['/guides/maine-cannabis-license-denied', ['licensing', 'appeal']],
    ['/guides/maine-cannabis-caregiver-guide', ['caregiver', 'medical']],
    ['/guides/cannabis-product-testing', ['lab-testing', 'compliance']],
    ['/guides/maine-cannabis-school-buffer', ['zoning', 'buffer']],
    ['/guides/maine-cannabis-faq', ['faq', 'basics']],
    ['/learn', ['consumer', 'education', 'basics']],
    ['/all-guides', ['library']],
    ['/find-a-dispensary', ['finder', 'consumer']],
    ['/about/corrections', ['editorial', 'corrections']],
    ['/about/authors', ['editorial', 'authors']],
    ['/blog/greenhouse-cannabis-maine-2026', ['home-growing', 'outdoor', 'maine-climate', 'season-extension']],
    ['/resources/buy-cannabis-seeds-maine', ['home-growing', 'seeds', 'maine-vendors', 'genetics']],
    ['/blog/outdoor-cannabis-grow-maine-2026', ['home-growing', 'outdoor', 'maine-climate', 'calendar']],
    ['/blog/cannabis-soil-maine-2026', ['home-growing', 'outdoor', 'soil', 'amendments']],
    ['/blog/cannabis-pests-mold-maine-2026', ['home-growing', 'outdoor', 'pests', 'mold']],
    ['/blog/cannabis-lst-training-maine-2026', ['home-growing', 'technique', 'lst', 'training']],
    ['/blog/cannabis-topping-autoflower-maine-2026', ['home-growing', 'technique', 'topping', 'autoflower']],
    ['/blog/cannabis-trimming-maine-2026', ['home-growing', 'harvest', 'trimming', 'drying']],
    ['/blog/cannabis-seedling-problems-maine-2026', ['home-growing', 'troubleshooting', 'seedling', 'early-growth']],
    ['/blog/cannabis-yellow-leaves-maine-2026', ['home-growing', 'troubleshooting', 'leaves', 'nutrients']],
    ['/blog/cannabis-overwatering-maine-2026', ['home-growing', 'troubleshooting', 'watering', 'overwatering']],
];

const URL_SECTION_HINTS = [
    // [path-substring, section-name]
    ['/blog/', 'Blog'],
    ['/guides/maine-cannabis-taxes-2026', 'Compliance & Legal'],
    ['/guides/maine-cannabis-schedule-iii', 'Compliance & Legal'],
    ['/guides/maine-cannabis-2026-operator-cost-update', 'Compliance & Legal'],
    ['/guides/maine-cannabis-caregiver', 'Compliance & Legal'],
    ['/guides/maine-cannabis-sun-grown-caregiver', 'Operations & Cultivation'],
    ['/guides/maine-cannabis-school-buffer', 'Compliance & Legal'],
    ['/guides/maine-dispensary-license', 'Licensing'],
    ['/guides/maine-dispensary-business-plan', 'Startup'],
    ['/guides/maine-dispensary-costs', 'Startup'],
    ['/guides/maine-cannabis-market', 'Business Essentials'],
    ['/guides/maine-dispensary-real-estate', 'Operations'],
    ['/guides/maine-dispensary-security', 'Operations'],
    ['/guides/maine-dispensary-packaging', 'Operations'],
    ['/guides/maine-cannabis-inventory-management', 'Operations & Technology'],
    ['/guides/maine-cannabis-wholesale-guide', 'Operations'],
    ['/guides/maine-dispensary-pos', 'Operations & Technology'],
    ['/guides/maine-cannabis-banking-solutions', 'Business Essentials'],
    ['/guides/maine-cannabis-staffing-licensing', 'Operations'],
    ['/guides/maine-cannabis-marketing-compliance', 'Compliance & Legal'],
    ['/guides/maine-cannabis-business-insurance', 'Business Essentials'],
    ['/guides/maine-cannabis-workers-comp-insurance', 'Business Essentials'],
    ['/guides/maine-cannabis-license-denied', 'Licensing'],
    ['/guides/cannabis-', 'Consumer Guide'],
    ['/guides/maine-cannabis-product-testing', 'Consumer Guide'],
    ['/guides/', 'Operator Guide'],
    ['/blog/cannabis-coa', 'Consumer Guide'],
    ['/blog/portland-maine-cannabis-rules', 'Policy & Legislation'],
    ['/blog/maine-cannabis-social-equity', 'Policy & Legislation'],
    ['/blog/ibogaine', 'Policy & Legislation'],
    ['/blog/trump-psychedelic', 'Policy & Legislation'],
    ['/blog/maine-cannabis-pesticide', 'Policy & Legislation'],
    ['/blog/greenhouse-cannabis-maine-2026', 'Home Cultivation'],
    ['/blog/outdoor-cannabis-grow-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-soil-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-pests-mold-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-lst-training-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-topping-autoflower-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-trimming-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-seedling-problems-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-yellow-leaves-maine-2026', 'Home Cultivation'],
    ['/blog/cannabis-overwatering-maine-2026', 'Home Cultivation'],
    ['/learn', 'Consumer Guide'],
    ['/all-guides', 'Library'],
    ['/find-a-dispensary', 'Finder'],
    ['/about/corrections', 'Editorial Standards'],
    ['/about/', 'About'],
    ['/experiments/', 'Experiments'],
    ['/resources/buy-cannabis-seeds-maine', 'Resources'],
];

function inferTopics(url, fm) {
    const explicit = extractTopics(fm);
    if (explicit.length > 0) return explicit;
    // URL-pattern inference
    for (const [pattern, topics] of URL_TOPIC_HINTS) {
        if (url.includes(pattern)) return topics;
    }
    return [];
}

function inferSection(url, fm) {
    const explicit = extractSection(fm);
    if (explicit) return explicit;
    // URL-pattern inference
    for (const [pattern, section] of URL_SECTION_HINTS) {
        if (url.includes(pattern)) return section;
    }
    return '';
}

function buildItems() {
    const files = listAstroFiles(PAGES_DIR);
    const items = [];
    for (const f of files) {
        const url = getUrl(f);
        if (!isConcretePageUrl(url)) continue;
        const text = fs.readFileSync(f, 'utf8');
        const fm = extractFrontmatter(text);
        const title = extractTitle(text, fm);
        const section = inferSection(url, fm);
        const topics = inferTopics(url, fm);
        items.push({ title, section, topics, url });
    }
    return items;
}

function main() {
    const args = process.argv.slice(2);
    const stdout = args.includes('--stdout');
    const dryRun = args.includes('--dry-run');
    const check = args.includes('--check');

    if (stdout && (dryRun || check)) {
        console.error('--stdout cannot be combined with --dry-run or --check.');
        process.exit(2);
    }

    if (!fs.existsSync(PAGES_DIR)) {
        console.error(`Pages directory not found: ${PAGES_DIR}`);
        process.exit(2);
    }
    if (!check && !fs.existsSync(path.dirname(DATA_FILE))) {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }

    const items = buildItems();
    const fresh = { items };
    const serialized = JSON.stringify(fresh, null, 2) + '\n';

    if (stdout) {
        process.stdout.write(serialized);
        return;
    }

    if (check) {
        if (!fs.existsSync(DATA_FILE)) {
            console.error(`Data file not found: ${DATA_FILE} — run without --check to create it.`);
            process.exit(1);
        }
        const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const existingUrls = new Set((existing.items || []).map(i => i.url));
        const freshUrls = new Set(items.map(i => i.url));
        const added = [...freshUrls].filter(u => !existingUrls.has(u));
        const removed = [...existingUrls].filter(u => !freshUrls.has(u));
        if (added.length === 0 && removed.length === 0) {
            console.log(`✓ autoRelatedData.json is fresh (${items.length} items).`);
            process.exit(0);
        }
        console.log(`✗ autoRelatedData.json is stale:`);
        if (added.length) console.log(`  +${added.length} new: ${added.slice(0,5).join(', ')}${added.length>5?'…':''}`);
        if (removed.length) console.log(`  -${removed.length} removed: ${removed.slice(0,5).join(', ')}${removed.length>5?'…':''}`);
        console.log(`Run: node scripts/data/regen-auto-related.cjs`);
        process.exit(1);
    }

    if (dryRun) {
        console.log(JSON.stringify(fresh, null, 2).slice(0, 500) + '\n…');
        console.log(`(dry-run — not written. ${items.length} items would be emitted.)`);
        process.exit(0);
    }

    fs.writeFileSync(DATA_FILE, serialized);
    console.log(`✓ Wrote ${items.length} items to ${path.relative(REPO, DATA_FILE)}`);
}

if (require.main === module) {
    main();
}

module.exports = { extractTitle, isConcretePageUrl };

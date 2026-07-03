#!/usr/bin/env node
/**
 * scripts/seo/linkify-body-internal-links.mjs
 *
 * Sprint 84 (internal linking follow-up to the 2026-07-03 audit).
 *
 * Walks every /apps/maine-cannabis/src/pages/guides/*-dispensary-guide.astro
 * file, finds the <article>...</article> body, and applies a curated set
 * of phrase->href rules to convert plain-text mentions into contextual
 * <a href> links. Idempotent: re-running never double-links because the
 * rule patterns include a negative-lookahead for "</a>" — text that is
 * already inside an anchor is skipped.
 *
 * The rule set is deliberately conservative. General words ("cannabis",
 * "dispensary", "Maine") are NOT in the rules — they have no single
 * canonical target. Only specific multi-word phrases with one clear
 * target page are linkified.
 *
 * Side effect: also adds a small "operator resources" links block to
 * the 3 B2B monetization pages (vendor directory, license, business
 * plan) that previously had 0 body links to city guides.
 *
 * Usage:
 *   node scripts/seo/linkify-body-internal-links.mjs --dry-run     # preview only
 *   node scripts/seo/linkify-body-internal-links.mjs --apply        # write changes
 *   node scripts/seo/linkify-body-internal-links.mjs --stats        # summary only
 *
 * The script is safe to re-run. It only ADDS links; it never removes
 * existing ones. The pre-existing RelatedArticles sidebar handles
 * bulk cross-linking — this script is the SURGICAL layer that adds
 * contextual body links only.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const REPO_ROOT = resolve(__dirname, '..', '..');
const GUIDES_DIR = resolve(REPO_ROOT, 'apps/maine-cannabis/src/pages/guides');

// --- Rule table (same as the audit's linkify_body()) --------------------
// Each tuple: [regex, target_href]
// Regex must include a negative lookahead for "</a>" so already-linked
// text is not re-linked. This makes the script idempotent.
const LINK_RULES = [
  // Licensing / municipal
  [/\bMaine OCP\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-license'],
  [/\bOCP license\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-license'],
  [/\bMaine cannabis license\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-license'],
  [/\bcannabis business license\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-license'],
  [/\bMunicipal authorization\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-license'],
  [/\bmunicipal approval\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-license'],
  // Costs / business
  [/\bstartup costs?\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-costs'],
  [/\bstartup investment\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-costs'],
  [/\bbusiness plan\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-business-plan'],
  // Operations
  [/\bMetrc-integrated POS\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-pos'],
  [/\bMetrc integration\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-pos'],
  [/\bMetrc API\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-pos'],
  [/\bPOS systems?\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-pos'],
  // Real estate
  [/\bzoning\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-zoning-requirements'],
  [/\bschool buffer\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-school-buffer'],
  // Tax
  [/\b280E\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-taxes-2026'],
  [/\bSection 280E\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-taxes-2026'],
  [/\bexcise tax\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-taxes-2026'],
  // Vendor directory
  [/\bbusiness insurance\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-business-insurance'],
  [/\bcannabis insurance\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-business-insurance'],
  [/\bworkers comp(ensation)?\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-workers-comp-insurance'],
  [/\bbanking solutions\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-banking-solutions'],
  [/\bcannabis-friendly banks?\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-banking-solutions'],
  [/\bcredit union\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-banking-solutions'],
  [/\bsecurity (vendor|system|plan|requirement)\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-security'],
  [/\bsecurity cameras?\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-security'],
  [/\bbudtender\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-staffing-licensing'],
  [/\b(IIC|AIC) (card|certification)\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-staffing-licensing'],
  [/\bmarketing compliance\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-marketing-compliance'],
  [/\bdispensary locations\b(?![^<]*<\/a>)/g, '/guides/maine-dispensary-locations'],
  [/\bsite selection\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-site-selection'],
  [/\bcommercial lease\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-commercial-lease-guide'],
  [/\bcultivation license\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-cultivation-guide'],
  [/\bcannabis regulations\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-regulations'],
  [/\bMaine cannabis laws\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-regulations'],
  [/\bMaine regulations\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-regulations'],
  [/\bMaine Revised Statutes\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-regulations'],
  [/\bOCP rules\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-regulations'],
  [/\bMaine cannabis market\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-market'],
  [/\bmarket data\b(?![^<]*<\/a>)/g, '/guides/maine-cannabis-market'],
];

// --- Linkification core --------------------------------------------------

/**
 * Walk a string and apply the LINK_RULES pattern-by-pattern to text OUTSIDE
 * of <a>...</a> blocks. Idempotent: text that is already inside an anchor
 * is left alone because the rules all carry a negative lookahead for </a>.
 *
 * The implementation uses a simple state machine over the source string:
 *   - inside_tag: between < and > — pass through
 *   - inside_link: between <a> and </a> — pass through
 *   - outside: text content — apply rules
 */
function linkifyBody(body) {
  let out = '';
  let i = 0;
  let inTag = false;
  let linkDepth = 0;
  // Skip rule application inside <script> and <style> blocks. JSON-LD
  // <script> blocks in particular contain escaped JSON and MUST NOT be
  // touched — inserting an <a href> into JSON text would break the
  // structured data and Google rich results.
  let skipDepth = 0;
  while (i < body.length) {
    const ch = body[i];
    if (inTag) {
      out += ch;
      if (body.startsWith('<a ', i) || body.startsWith('<a>', i)) linkDepth++;
      if (body.startsWith('</a>', i)) linkDepth = Math.max(0, linkDepth - 1);
      // Track opening of <script> and <style> blocks
      if (body.startsWith('<script', i) && !body.startsWith('</script', i)) {
        skipDepth++;
      }
      if (body.startsWith('<style', i) && !body.startsWith('</style', i)) {
        skipDepth++;
      }
      if (body.startsWith('</script>', i) || body.startsWith('</style>', i)) {
        skipDepth = Math.max(0, skipDepth - 1);
      }
      if (ch === '>') inTag = false;
      i++;
    } else if (linkDepth > 0) {
      out += ch;
      i++;
    } else if (skipDepth > 0) {
      // Inside a <script> or <style> block — pass through unchanged
      out += ch;
      i++;
    } else if (ch === '<') {
      inTag = true;
      out += ch;
      i++;
    } else {
      // Outside tag, outside link, outside script/style — try rules
      let matched = false;
      for (const [pattern, href] of LINK_RULES) {
        // Test whether any rule matches starting at position i. Use a slice
        // of the remaining body to bound the test (a rule will not match
        // anything past the first 80 chars of an unmatched starting position
        // since all our phrases are < 80 chars).
        const slice_ = body.substring(i, i + 80);
        // Match the regex at the current position. Use exec() instead
        // of match() with a /g regex because match() with /g returns
        // ALL matches as an array (not just the one at position 0).
        // Remove the /g flag for the position-anchored test.
        const anchored = new RegExp(pattern.source);
        const testMatch = anchored.exec(slice_);
        if (testMatch && testMatch.index === 0) {
          const phrase = testMatch[0];
          out += `<a href="${href}">${phrase}</a>`;
          i += phrase.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        out += ch;
        i++;
      }
    }
  }
  return out;
}

/**
 * Apply linkifyBody to a full .astro source file. Returns { content, count }
 * where count is the number of new <a href> tags added to the body.
 *
 * Skips linkification if no new matches would be added (idempotent).
 */
function processFile(source) {
  // Find the <article>...</article> block — body content lives there
  const articleMatch = source.match(/(\s*<article[^>]*>)([\s\S]*?)(<\/article>\s*)/);
  if (!articleMatch) {
    return { content: source, count: 0, skipped: 'no article tag' };
  }
  const [, openTag, body, closeTag] = articleMatch;
  const beforeCount = (body.match(/<a\s+href=/g) || []).length;
  const newBody = linkifyBody(body);
  const afterCount = (newBody.match(/<a\s+href=/g) || []).length;
  if (afterCount <= beforeCount) {
    return { content: source, count: 0, skipped: 'no new links' };
  }
  const newContent = source.slice(0, articleMatch.index) +
                     openTag + newBody + closeTag +
                     source.slice(articleMatch.index + articleMatch[0].length);
  return { content: newContent, count: afterCount - beforeCount, skipped: null };
}

// --- City guide cross-link block for B2B monetization pages -------------
// Pages that link OUT to city guides in their body. Currently: vendor
// directory, license, business plan. Adds a "City-by-city coverage"
// footer with the 10 largest Maine cities + their dispensary guides.
const B2B_PAGES = [
  'apps/maine-cannabis/src/pages/guides/maine-cannabis-vendor-directory.astro',
  'apps/maine-cannabis/src/pages/guides/maine-dispensary-license.astro',
  'apps/maine-cannabis/src/pages/guides/maine-dispensary-business-plan.astro',
];

const TOP_CITY_LINKS = [
  ['Portland', '/guides/portland-dispensary-guide'],
  ['Bangor', '/guides/bangor-dispensary-guide'],
  ['Lewiston', '/guides/lewiston-dispensary-guide'],
  ['South Portland', '/guides/south-portland-dispensary-guide'],
  ['Augusta', '/guides/augusta-dispensary-guide'],
  ['Biddeford', '/guides/biddeford-dispensary-guide'],
  ['Auburn', '/guides/auburn-dispensary-guide'],
  ['Brunswick', '/guides/brunswick-dispensary-guide'],
  ['Scarborough', '/guides/scarborough-dispensary-guide'],
  ['Waterville', '/guides/waterville-dispensary-guide'],
];

function buildCityLinksBlock() {
  const items = TOP_CITY_LINKS.map(
    ([name, href]) => `    <li><a href="${href}">${name} Dispensary Guide</a></li>`
  ).join('\n');
  return `  <section class="related-cities" style="background: rgba(13, 78, 80, 0.03); border-radius: 0.75rem; padding: 1.5rem 2rem; margin-top: 3rem;">
    <h2 style="margin-top: 0; font-size: 1.25rem; color: var(--color-primary);">City-by-City Coverage</h2>
    <p style="margin-bottom: 0.75rem; color: var(--color-text-light); font-size: 0.95rem;">
      For market-specific guidance on opening a Maine cannabis business, see our city-by-city dispensary guides. Each guide covers local licensing, zoning, real estate, and competition.
    </p>
    <ul style="columns: 2; column-gap: 2rem; margin: 0; padding-left: 1.25rem;">
${items}
    </ul>
  </section>
`;
}

// --- Main ---------------------------------------------------------------

async function listCityGuides() {
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(GUIDES_DIR);
  return files
    .filter(f => f.endsWith('-dispensary-guide.astro'))
    .map(f => resolve(GUIDES_DIR, f));
}

async function processB2BPage(filePath, apply) {
  const source = await readFile(filePath, 'utf8');
  // Check if the "City-by-City Coverage" block is already present
  if (source.includes('related-cities') || source.includes('City-by-City Coverage')) {
    return { file: filePath, action: 'skip', reason: 'already has city links block' };
  }
  // Find the </Layout> closing tag and insert before it
  const layoutClose = source.indexOf('</Layout>');
  if (layoutClose === -1) {
    return { file: filePath, action: 'skip', reason: 'no </Layout> tag' };
  }
  const block = buildCityLinksBlock();
  const newSource = source.slice(0, layoutClose) + '\n' + block + source.slice(layoutClose);
  if (apply) {
    await writeFile(filePath, newSource, 'utf8');
  }
  return { file: filePath, action: apply ? 'add' : 'preview', added: 10 };
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');
const statsOnly = args.includes('--stats');

async function main() {
  console.log(`Sprint 84: body-internal-link generator (${dryRun ? 'DRY-RUN' : apply ? 'APPLY' : 'PREVIEW'})`);
  console.log('─'.repeat(70));

  // Step 1: city guides
  const cityGuides = await listCityGuides();
  let totalAdded = 0;
  let filesChanged = 0;
  let filesSkipped = 0;
  for (const filePath of cityGuides) {
    const source = await readFile(filePath, 'utf8');
    const { content, count, skipped } = processFile(source);
    if (count > 0) {
      if (apply) await writeFile(filePath, content, 'utf8');
      totalAdded += count;
      filesChanged++;
      console.log(`  +${count.toString().padStart(2)}  ${basename(filePath)}${dryRun ? ' (preview)' : ''}`);
    } else {
      filesSkipped++;
      if (!statsOnly) {
        // quiet on verbose path
      }
    }
  }
  console.log(`City guides: ${filesChanged} changed, ${filesSkipped} skipped, ${totalAdded} new body links added.`);

  // Step 2: B2B monetization pages
  console.log('');
  for (const relPath of B2B_PAGES) {
    const fullPath = resolve(REPO_ROOT, relPath);
    const r = await processB2BPage(fullPath, apply);
    console.log(`  ${r.action === 'add' ? '+10  ' : r.action === 'preview' ? ' +10 ' : 'skip '}  ${basename(relPath)}  (${r.reason || `${r.added || 0} city links`})`);
  }

  if (!apply && !dryRun && !statsOnly) {
    console.log('');
    console.log('No files were modified. Pass --apply to write changes, or --dry-run to preview.');
  }
  if (apply) {
    console.log('');
    console.log(`✓ Applied. Run 'npx astro check && node scripts/check/content-health.cjs' to verify.`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
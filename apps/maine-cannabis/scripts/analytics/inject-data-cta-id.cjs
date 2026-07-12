#!/usr/bin/env node
/**
 * inject-data-cta-id.cjs
 *
 * MDG-ANALYTICS-001 Ticket 006 Surface C — inject data-cta-id attribute onto
 * CTA-shaped <a> and <button> elements across the MDG corpus.
 *
 * Scope (per Ticket 006 proposal §3.3):
 *   - ~170 candidate CTA-shaped elements (rough), 76 confirmed by heuristic below
 *   - 31 page/component files
 *   - Files in scope already include 2 with prior data-cta-id coverage
 *     (AffiliateClickTracker.astro, etc.); the script SKIPS anchors/buttons
 *     that already carry data-cta-id.
 *
 * Reversibility: git revert this commit's diff.
 *
 * Slug format:
 *   cta-<placement>-<page-slug>-<occurrence-index>
 *
 *   placement is one of the allowlist:
 *     header | hero | inline | footer | related | end-of-page | modal |
 *     navigation | download | form | search | directory | faq | citation
 *   placement is inferred from:
 *     1. class name (e.g. "footer-cta" -> footer)
 *     2. parent class (e.g. <header> -> header)
 *     3. fallback "inline"
 *
 * Audit:
 *   Each injected element receives a marker comment immediately preceding:
 *     <!-- analytics:cta-injected id=cta-... -->
 *
 * Refs:
 *   apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006-instrumentation-v1-proposal.md
 *
 * Usage:
 *   node scripts/analytics/inject-data-cta-id.cjs [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const COMPONENTS = path.join(ROOT, 'src', 'components');

const dryRun = process.argv.includes('--dry-run');

// Allowlist of placement tokens. Anything else gets bucketed as "inline".
const PLACE_ALLOWLIST = new Set([
  'header', 'hero', 'inline', 'footer', 'related', 'end-of-page',
  'modal', 'navigation', 'download', 'form', 'search', 'directory',
  'faq', 'citation'
]);

// Class-name -> placement mapping. First match wins.
const CLASS_PLACEMENT = [
  [/footer-cta/i,       'footer'],
  [/hero-?cta/i,        'hero'],
  [/header-?cta/i,      'header'],
  [/modal-?cta/i,       'modal'],
  [/related-?cta/i,     'related'],
  [/end-?of-?page-?cta/i, 'end-of-page'],
  [/download-?cta/i,    'download'],
  [/lead-?cta/i,        'form'],
  [/form-?cta/i,        'form'],
  [/search-?cta/i,      'search'],
  [/directory-?cta/i,   'directory'],
  [/faq-?cta/i,         'faq'],
  [/citation-?cta/i,    'citation'],
  [/primary-?cta/i,     'inline'],
  [/cta-/i,              'inline'],
  [/btn-/i,              'inline'],
];

// Heuristic: which elements are CTA-shaped.
const ELEMENT_RE = /<(?<tag>a|button)\b(?<attrs>[^>]*?)>/gi;

// Newline+\\s+ insertion marker — small comment, immediately before the element.
function marker(id) { return `<!-- analytics:cta-injected id=${id} -->`; }

// Decide placement token from element attrs.
function detectPlacement(attrs, parentContext = '') {
  // Pull class attribute(s).
  const classMatch = attrs.match(/class="([^"]*)"/i);
  const cls = classMatch ? classMatch[1] : '';
  for (const [re, placement] of CLASS_PLACEMENT) {
    if (re.test(cls)) return placement;
  }
  // Fall back to parent context if available.
  const parentMatch = parentContext.match(/<(?<tag>header|footer|nav|aside)\b/);
  if (parentMatch) {
    const t = parentMatch[1].toLowerCase();
    if (t === 'header' || t === 'nav') return 'header';
    if (t === 'footer') return 'footer';
    if (t === 'aside') return 'related';
  }
  return 'inline';
}

function pageSlugFromPath(filepath) {
  const rel = filepath.slice(ROOT.length).replace(/\\/g, '/');
  return rel
    .replace(/^\/src\/pages\//, '')
    .replace(/^\/src\/components\//, '')
    .replace(/\.astro$/, '')
    .replace(/\//g, '--');
}

function listFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.astro')) out.push(full);
    }
  };
  walk(PAGES);
  walk(COMPONENTS);
  return out;
}

function injectInFile(filepath) {
  const src = fs.readFileSync(filepath, 'utf8');
  const slug = pageSlugFromPath(filepath);
  let total = 0;

  // Track per-page counters per placement family to avoid slug collisions.
  // For components: each component instance is rendered under whichever page uses it,
  // but the static attribute slug is computed at SSG time. We'll use a stable
  // occurrence index per placement per page.
  const seenPlacements = new Map(); // placement -> count

  // We do not attempt full parent-context tracking; the inline fallback handles
  // ambiguous cases. The class-name heuristic is the primary signal.

  const newSrc = src.replace(ELEMENT_RE, (m, tag, attrs) => {
    // Skip if already wired
    if (/data-cta-id=/.test(attrs)) return m;

    // For <a>: skip pure non-navigational uses (mailto:, javascript:, tel:, # fragment).
    // We CAN include mailto: but they are tracked separately as lead_capture.
    // We mark them with placement=form for analytics.
    if (tag === 'a') {
      const hrefMatch = attrs.match(/\bhref="([^"]*)"/);
      if (hrefMatch) {
        const href = hrefMatch[1];
        if (href.startsWith('javascript:')) return m;
        if (href.startsWith('mailto:')) {
          // mailto CTAs are tracked by lead_capture; adding data-cta-id would
          // cause double counting (cta_view + lead_capture). Skip.
          return m;
        }
        if (href.startsWith('tel:')) return m;
        if (href === '#' || href.startsWith('#')) return m;
      }
    }
    // For <button>: skip type=submit inside an actual <form> only when we can't
    // reasonably expect exposure/select pairing; we still mark them.
    // (Inline scripts that aren't CTAs are skipped via the class heuristic.)

    // Quick check: must look CTA-shaped OR be a button.
    const classMatch = attrs.match(/class="([^"]*)"/i);
    const cls = classMatch ? classMatch[1] : '';
    const looksLikeCTA = /cta|btn-|hero|primary|footer|lead|download|signup|subscribe|book|join|get-started|learn-more|read-more/i.test(cls);
    if (tag !== 'button' && !looksLikeCTA) return m;

    // Compute placement
    const placement = detectPlacement(attrs);
    const n = (seenPlacements.get(placement) ?? 0) + 1;
    seenPlacements.set(placement, n);
    const id = `cta-${placement}-${slug}-${String(n).padStart(2, '0')}`;

    if (!PLACE_ALLOWLIST.has(placement)) {
      // Should never happen given detectPlacement returns only allowlist values, but be safe.
      return m;
    }

    total++;

    // Build replacement. Insert `data-cta-id="..."` before the closing `>` of the tag.
    const newAttrs = attrs.trim() + ` data-cta-id="${id}"`;
    const newOpen = `<${tag} ${newAttrs}>`;
    return `${marker(id)}\n${newOpen}`;
  });

  if (total === 0) return { filepath, count: 0 };
  if (!dryRun) fs.writeFileSync(filepath, newSrc, 'utf8');
  return { filepath, count: total };
}

function main() {
  const files = listFiles();
  const results = [];
  for (const f of files) {
    const r = injectInFile(f);
    if (r.count > 0) results.push(r);
  }
  results.sort((a, b) => b.count - a.count);
  const total = results.reduce((s, r) => s + r.count, 0);
  console.log(`${dryRun ? 'DRY-RUN: ' : ''}files modified: ${results.length}`);
  console.log(`${dryRun ? 'DRY-RUN: ' : ''}total CTA elements tagged: ${total}`);
  for (const r of results.slice(0, 30)) {
    console.log(`  ${r.count} × ${path.relative(ROOT, r.filepath)}`);
  }
  if (results.length > 30) console.log(`  ... and ${results.length - 30} more`);
}

if (require.main === module) main();
module.exports = { injectInFile, listFiles, pageSlugFromPath, detectPlacement };

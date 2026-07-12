#!/usr/bin/env node
/**
 * inject-data-faq.cjs
 *
 * MDG-ANALYTICS-001 Ticket 006 Surface B — inject data-faq and data-faq-id
 * attributes onto every <details> element inside <section class="faq-section">
 * (and equivalent shells) across the pages corpus.
 *
 * Scope (per Ticket 006 proposal §3.2):
 *   - 27 files containing <details> (city guides + a few long-form guides)
 *   - ~53 total <details> blocks
 *   - Slug: faq-<page-slug>-<block-index> per page
 *
 * Reversibility:
 *   git revert this commit's diff. v0 instrumentation in Layout.astro silently
 *   no-ops when [data-faq] is absent, restoring v0.5 pre-Ticket-006 behavior.
 *
 * Audit:
 *   Each modified file gets a comment marker "// analytics:faq-injected"
 *   immediately before each insertion, so a future inspection can identify
 *   which insertions were made by this script and which were hand-written.
 *
 * Refs:
 *   apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006-instrumentation-v1-proposal.md
 *   apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-reconciliation-vs-v0.5.md (D6)
 *
 * Usage:
 *   node scripts/analytics/inject-data-faq.cjs [--dry-run]
 *
 *   --dry-run: print what would be modified without writing files.
 *
 * Strategy:
 *   For each page file: locate every `<section class="faq-section">` block.
 *   Inside each block, locate every `<details` opening tag (handle both
 *   `<details>` and `<details ...attribute...>` shapes). Within a section, the
 *   first <details> gets faq_id "faq-<page-slug>-1", the second "faq-<page-slug>-2", etc.
 *   Replace the `<details` token with `<details data-faq data-faq-id="faq-<slug>-<n>"`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const COMPONENTS = path.join(ROOT, 'src', 'components');

const dryRun = process.argv.includes('--dry-run');

// Matches a `<section ... class="faq-section"` opening tag through its closing
// `</section>`. Non-greedy so multiple sections in one file each match.
const SECTION_RE = /<section\b[^>]*\bclass="[^"]*\bfaq-section\b[^"]*"[^>]*>([\s\S]*?)<\/section>/g;
// `<details>` or `<details ATTR="..." ATTR>` — the actual opening element.
const DETAILS_OPEN_RE = /<details(\s[^>]*?)?>/g;

function listPages() {
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

function pageSlugFromPath(filepath) {
  // maps /src/pages/guides/portland-dispensary-guide.astro to portland-dispensary-guide
  // /src/pages/about/authors.astro -> about--authors  (page-id uses -- for /)
  const rel = filepath.slice(ROOT.length).replace(/\\/g, '/');
  return rel
    .replace(/^\/src\/pages\//, '')
    .replace(/^\/src\/components\//, '')
    .replace(/\.astro$/, '')
    .replace(/\//g, '--');
}

function injectInFile(filepath) {
  const src = fs.readFileSync(filepath, 'utf8');
  const slug = pageSlugFromPath(filepath);
  const lines = src.split('\n');

  // We modify in linear order over the original string; tracking offsets is unnecessary
  // because we rebuild string content from sections and details matches.

  let totalChanges = 0;
  let sectionIdx = 0;

  const newSrc = src.replace(SECTION_RE, (wholeMatch, inner) => {
    sectionIdx++;
    let detailsIdx = 0;
    const newInner = inner.replace(DETAILS_OPEN_RE, (m, attrBody) => {
      detailsIdx++;
      const faqId = `faq-${slug}--s${sectionIdx}-${detailsIdx}`;
      // Marker comment is intentionally NOT in the rendered HTML (Astro strips comments
      // at build time) — it documents provenance only for the source file. But comments
      // inside a section are valid in .astro template bodies — they pass through to the
      // browser as HTML comments. To keep the rendered HTML minimal, we emit the marker
      // before each <details>, knowing it persists as `<!-- ... -->`. That markup is
      // permitted under MDG Content-Security-Policy and adds ~80 bytes per FAQ block.
      const marker = `<!-- analytics:faq-injected faq-id=${faqId} -->`;
      if (attrBody) {
        return `${marker}\n      <details data-faq data-faq-id="${faqId}"${attrBody}>`;
      } else {
        return `${marker}\n      <details data-faq data-faq-id="${faqId}">`;
      }
    });
    totalChanges += detailsIdx;
    return wholeMatch.replace(inner, newInner);
  });

  if (newSrc === src) return { filepath, changes: 0 };
  if (!dryRun) fs.writeFileSync(filepath, newSrc, 'utf8');
  return { filepath, changes: totalChanges };
}

function main() {
  const files = listPages();
  const results = [];
  for (const f of files) {
    const r = injectInFile(f);
    if (r.changes > 0) results.push(r);
  }
  results.sort((a, b) => b.changes - a.changes);
  const total = results.reduce((s, r) => s + r.changes, 0);
  console.log(`${dryRun ? 'DRY-RUN: ' : ''}files modified: ${results.length}`);
  console.log(`${dryRun ? 'DRY-RUN: ' : ''}total <details> blocks injected: ${total}`);
  for (const r of results.slice(0, 30)) {
    console.log(`  ${r.changes} × ${path.relative(ROOT, r.filepath)}`);
  }
  if (results.length > 30) console.log(`  ... and ${results.length - 30} more`);
}

if (require.main === module) main();
module.exports = { injectInFile, listPages, pageSlugFromPath };

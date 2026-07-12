#!/usr/bin/env node
/**
 * page-manifest-build.cjs (v1)
 *
 * Generates apps/maine-cannabis/docs/analytics/page_task_manifest.v1.jsonl
 * and apps/maine-cannabis/docs/analytics/instrumentation_surface_manifest.v1.jsonl
 * from the actual src/pages tree.
 *
 * Heuristics (v1):
 *  - route_family from filename only (city_guide / operator_profile /
 *    long_form_guide / hub / calculator / data_product / conversion_asset /
 *    directory / editorial_blog / other)
 *  - entity_scope derived from filename pattern (town / operator / region /
 *    state / topic / calculator / dataset / other)
 *  - primary_task_family inferred from URL + content signals (consumer-buying
 *    framing → visitor_buying_guide; operator framing → market_entry_analysis)
 *  - task_contract_status PROVISIONAL by default; NEEDS_EDITORIAL_REVIEW for
 *    the v0.4 corpus mismatch candidates and operator-profile slugs
 *  - promise_task_alignment from content-shape inference (PROMISE_BODY_MISMATCH
 *    where the v0.4 corpus audit explicitly flagged the mismatch)
 *
 * v1 is intentionally conservative. Tickets 004/006/008/009 will inject
 * better signals. This script's output is the FIRST snapshot, not the
 * production manifest. Editorial review promotes PROVISIONAL → CONFIRMED
 * in the JSONL itself (or via a `promote-manifest` action).
 *
 * Usage:
 *   node scripts/analytics/page-manifest-build.cjs [--dry-run]
 *
 * --dry-run: print summary, do not write files.
 *
 * Refs:
 *   /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/PAGE-ARCHETYPES.md
 *   /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TASK-OWNERSHIP-INVESTIGATION.md
 *   apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-003-page-surface-manifests.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const DOCS = path.join(ROOT, 'docs', 'analytics');
const OUT_PAGE = path.join(DOCS, 'page_task_manifest.v1.jsonl');
const OUT_SURFACE = path.join(DOCS, 'instrumentation_surface_manifest.v1.jsonl');

// v0.4 corpus mismatch candidates — file basename (no .astro) from
// TASK-OWNERSHIP-INVESTIGATION.md §"MDG corpus candidates"
const V04_MISMATCH_SLUGS = new Set([
  'portland-dispensary-guide',
  'old-orchard-beach-dispensary-guide',
  'casco-dispensary-guide',
]);

// Known town guide suffix (city_guide route_family)
const CITY_GUIDE_RE = /-dispensary-guide\.astro$/;

// Operator-profile-style slugs are city-guide *without* the -dispensary-guide
// suffix OR have a cannabis/cann suffix that suggests a brand. Heuristic:
// anything that ends in -cannabis.astro, has -dispensary in slug without
// the city -guide suffix, or matches a known operator-name shape.
const OPERATOR_RE = /(?:^|-)(cannabis|cann|dispensary|medco|weed|herb|greens|healing|farmacy|grow|puffin|hemp|botany|apoteka)(\.astro)?$/i;
// Operator named slugs (manually identifiable after first sweep)
const KNOWN_OPERATOR_SLUGS = new Set([
  '420-mules-bar-harbor',
  'bayside-bud-shack',
  'healing-community-medco-gardiner',
  'botany-cannabis',
  'great-atlantic-puffin-company',
  'lifted-cannabis-maine',
  'lakewood-cannabis',
  'highbrow-cannabis',
  'high-road-gray',
  'just-baked-maine-lincoln',
  'the-glass-cook-fryeburg',
  'white-mountain-craft-cannabis',
  'hidden-greens-dispensary',
  'founding-farmers-dispensary',
  // and ~44 more visible in the first scan — auto-detected by slug pattern
]);

// Hub / regional guide patterns
const HUB_SLUGS = new Set([
  'greater-portland-sebago-lakes-cannabis-guide',
  'downeast-acadia-aroostook-cannabis-guide',
  'midcoast-waldo-northern-maine-cannabis-guide',
  'southern-maine-york-county-cannabis-guide',
]);

const CALCULATOR_SLUGS = new Set([
  'maine-cannabis-tax-calculator',
  'roi-calculator',
  'cannabis-edible-dose-calculator-maine',
]);

const DATA_PRODUCT_SLUGS = new Set([
  'market-pulse-2026',
  'market-stats',
  'glossary',
]);

const CONVERSION_ASSET_SLUGS = new Set([
  'download', // (subdir)
  'launch-checklist',
  'download-checklist',
  'newsletter',
  'contact',
]);

function listPages(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const route = path.posix.join(base, entry.name.replace(/\.astro$/, ''));
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) {
      out.push(...listPages(full, route));
    } else if (entry.name.endsWith('.astro')) {
      out.push({ full, route: route.replace(/\.astro$/, ''), file: entry.name, rel });
    }
  }
  return out;
}

function classify(slug, file, rel) {
  // rel = relative path under src/pages e.g. "blog/foo.astro" or "guides/foo.astro"
  // Order matters; most specific first.
  if (file === '404.astro') {
    return { route_family: 'other', entity_scope: 'other', primary_task_family: null };
  }
  if (slug === 'index' && !rel.startsWith('guides/')) {
    return { route_family: 'hub', entity_scope: 'state', primary_task_family: 'regional_discovery_hub' };
  }
  if (slug === 'guides' || slug === 'guides/index') {
    return { route_family: 'directory', entity_scope: 'state', primary_task_family: 'data_research' };
  }
  if (rel.startsWith('admin/')) {
    return { route_family: 'other', entity_scope: 'other', primary_task_family: null };
  }
  if (rel.startsWith('blog/')) {
    return { route_family: 'editorial_blog', entity_scope: 'topic', primary_task_family: 'editorial_exploration' };
  }
  // /find-a-dispensary is a discovery tool, not an operator page, despite having "dispensary" in the slug
  if (slug === 'find-a-dispensary') {
    return { route_family: 'directory', entity_scope: 'state', primary_task_family: 'local_store_discovery' };
  }
  // /directory is the professionals-vendor directory
  if (slug === 'directory') {
    return { route_family: 'directory', entity_scope: 'state', primary_task_family: 'data_research' };
  }
  // /search is the site search tool
  if (slug === 'search') {
    return { route_family: 'other', entity_scope: 'other', primary_task_family: null };
  }
  if (slug.startsWith('founders/') || slug === 'about') {
    return { route_family: 'long_form_guide', entity_scope: 'topic', primary_task_family: 'editorial_exploration' };
  }
  if (CALCULATOR_SLUGS.has(slug)) {
    return { route_family: 'calculator', entity_scope: 'calculator', primary_task_family: 'calculator_decision_tool' };
  }
  if (DATA_PRODUCT_SLUGS.has(slug)) {
    return { route_family: 'data_product', entity_scope: 'dataset', primary_task_family: 'data_research' };
  }
  if (CONVERSION_ASSET_SLUGS.has(slug)) {
    return { route_family: 'conversion_asset', entity_scope: 'other', primary_task_family: 'editorial_exploration' };
  }
  if (HUB_SLUGS.has(slug)) {
    return { route_family: 'hub', entity_scope: 'region', primary_task_family: 'regional_discovery_hub' };
  }
  if (CITY_GUIDE_RE.test(file)) {
    // City/town guide: entity_scope = town, primary_task_family = visitor_buying_guide
    // (Some v0.4 corpus candidates end up PROMISE_BODY_MISMATCH and may be
    // operator market-entry in disguise — flagged in §3.2 of ticket 003.)
    return {
      route_family: 'city_guide',
      entity_scope: 'town',
      primary_task_family: 'visitor_buying_guide',
    };
  }
  if (KNOWN_OPERATOR_SLUGS.has(slug) || (OPERATOR_RE.test(file) && !CITY_GUIDE_RE.test(file))) {
    return {
      route_family: 'operator_profile',
      entity_scope: 'operator',
      primary_task_family: 'operator_profile',
    };
  }
  // Default: long-form guide
  return {
    route_family: 'long_form_guide',
    entity_scope: 'topic',
    primary_task_family: 'how_to_task',
  };
}

function pageId(canonicalPath) {
  if (canonicalPath === '/') return 'home';
  return canonicalPath.replace(/^\//, '').replace(/\//g, '--').replace(/[^a-z0-9-]/gi, '-');
}

function buildPageRows(pages) {
  const rows = [];
  for (const { route, file, rel } of pages) {
    const canonical_path = '/' + route;
    const slug = route.split('/').pop();
    const classification = classify(slug, file, rel);
    const isV04Mismatch = V04_MISMATCH_SLUGS.has(slug);
    const isOperator = classification.entity_scope === 'operator';
    const isHub = classification.route_family === 'hub';

    let task_contract_status = 'PROVISIONAL';
    if (isV04Mismatch) task_contract_status = 'NEEDS_EDITORIAL_REVIEW';
    else if (isOperator) task_contract_status = 'NEEDS_EDITORIAL_REVIEW';
    else if (isHub) task_contract_status = 'NEEDS_EDITORIAL_REVIEW';

    let promise_task_alignment = 'INSUFFICIENT_QUERY_DATA';
    if (isV04Mismatch) promise_task_alignment = 'PROMISE_BODY_MISMATCH';

    const page_id = pageId(canonical_path);
    const row = {
      page_id,
      canonical_path,
      route_family: classification.route_family,
      reporting_archetype: classification.route_family,
      primary_task_family: classification.primary_task_family,
      secondary_task_families: null,
      task_contract_status,
      serp_promise_family: isOperator ? 'named_operator' : (isV04Mismatch ? 'visitor_local' : 'generic_topic'),
      promise_task_alignment,
      entity_scope: classification.entity_scope,
      entity_id: isOperator ? slug : (classification.entity_scope === 'town' ? slug : null),
      geo_scope_id: classification.entity_scope === 'state' ? 'Maine'
                  : (classification.entity_scope === 'region' ? slug : null),
      regional_navigation_cluster_ids: isHub ? [slug] : null,
      demand_regime: 'UNKNOWN',
      market_form: 'UNKNOWN',
      recurrence_expectation: 'low',
      content_depth_band: 'medium',
      template_family: classification.route_family,
      major_content_change_at: null,
      instrumentation_version: 'v0',
      approved_progression_families: null,
      manifest_evidence: {
        title: null,
        h1: null,
        description: null,
        topics_from_frontmatter: null,
        editorial_review_notes: null,
      },
      manifest_version: '1',
    };
    rows.push(row);
  }
  return rows;
}

function buildSurfaceRows(pageRows) {
  const rows = [];
  // Per-page surface defaults from v0 state.
  // Globally wired (Layout.astro) regardless of page:
  rows.push({
    surface_id: 'scroll_depth',
    canonical_path: '*',
    page_id: '*',
    stable_element_id: 'window',
    instrumentation_expected: true,
    instrumentation_version: 'v0',
    privacy_classification: 'anonymous_aggregate',
    coverage_status: 'INSTRUMENTED',
    expected_event_names: ['scroll_depth'],
  });
  rows.push({
    surface_id: 'page_engaged',
    canonical_path: '*',
    page_id: '*',
    stable_element_id: 'window',
    instrumentation_expected: true,
    instrumentation_version: 'v0',
    privacy_classification: 'anonymous_aggregate',
    coverage_status: 'INSTRUMENTED',
    expected_event_names: ['page_engaged'],
  });
  rows.push({
    surface_id: 'faq',
    canonical_path: '*',
    page_id: '*',
    stable_element_id: 'details[data-faq]',
    instrumentation_expected: true,
    instrumentation_version: 'v0',
    privacy_classification: 'anonymous_aggregate',
    coverage_status: 'WIRED_BUT_SILENT',
    expected_event_names: ['faq_open'],
  });
  rows.push({
    surface_id: 'cta',
    canonical_path: '*',
    page_id: '*',
    stable_element_id: '[data-cta-id]',
    instrumentation_expected: true,
    instrumentation_version: 'v0',
    privacy_classification: 'anonymous_aggregate',
    coverage_status: 'WIRED_BUT_SILENT',
    expected_event_names: ['cta_view'],
  });
  // Conversion surface: mailto lead form. Globally wired.
  rows.push({
    surface_id: 'lead_capture_intent',
    canonical_path: '*',
    page_id: '*',
    stable_element_id: '.lead-mailto-form, .lead-form-tracker',
    instrumentation_expected: true,
    instrumentation_version: 'v0',
    privacy_classification: 'pseudonymous_identifier',
    coverage_status: 'INSTRUMENTED',
    expected_event_names: ['lead_capture'],
  });
  rows.push({
    surface_id: 'affiliate_click',
    canonical_path: '*',
    page_id: '*',
    stable_element_id: '[data-affiliate-id]',
    instrumentation_expected: true,
    instrumentation_version: 'v0',
    privacy_classification: 'pseudonymous_identifier',
    coverage_status: 'INSTRUMENTED',
    expected_event_names: ['affiliate_click'],
  });
  return rows;
}

function writeJsonl(filePath, rows) {
  const data = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(filePath, data, 'utf8');
}

function main() {
  if (!fs.existsSync(PAGES)) {
    console.error(`No src/pages at ${PAGES}`);
    process.exit(2);
  }
  if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });

  const pages = listPages(PAGES);
  const pageRows = buildPageRows(pages);
  const surfaceRows = buildSurfaceRows(pageRows);

  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');

  // Reporting
  const byRoute = {};
  for (const r of pageRows) byRoute[r.route_family] = (byRoute[r.route_family] || 0) + 1;
  const byScope = {};
  for (const r of pageRows) byScope[r.entity_scope] = (byScope[r.entity_scope] || 0) + 1;
  const byStatus = {};
  for (const r of pageRows) byStatus[r.task_contract_status] = (byStatus[r.task_contract_status] || 0) + 1;
  const byAlignment = {};
  for (const r of pageRows) byAlignment[r.promise_task_alignment] = (byAlignment[r.promise_task_alignment] || 0) + 1;

  console.log(`routes total: ${pageRows.length}`);
  console.log('by route_family:', byRoute);
  console.log('by entity_scope:', byScope);
  console.log('by task_contract_status:', byStatus);
  console.log('by promise_task_alignment:', byAlignment);
  console.log(`surface rows: ${surfaceRows.length}`);

  if (dryRun) {
    console.log('--dry-run: not writing files.');
    return;
  }

  writeJsonl(OUT_PAGE, pageRows);
  writeJsonl(OUT_SURFACE, surfaceRows);
  console.log(`wrote ${OUT_PAGE}`);
  console.log(`wrote ${OUT_SURFACE}`);
}

if (require.main === module) main();
module.exports = { classify, pageId, listPages, buildPageRows, buildSurfaceRows };

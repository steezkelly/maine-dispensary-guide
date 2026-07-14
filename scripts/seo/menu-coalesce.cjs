#!/usr/bin/env node
/**
 * menu-coalesce.cjs — Coalesce per-operator snapshots into a regional
 * strain / product heatmap. Reads from
 *   apps/maine-cannabis/src/data/dispensary-intel/<slug>/menu.snapshot.json
 * and writes to
 *   apps/maine-cannabis/src/data/dispensary-intel/coalesce/
 *
 * Outputs (initially):
 *   - products-by-operator.jsonl   (one row per (operator, sku))
 *   - strain-by-region.json        (strain -> {region: count} histogram)
 *
 * Usage:
 *   node scripts/seo/menu-coalesce.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = 'apps/maine-cannabis/src/data/dispensary-intel';
const OUT = `${ROOT}/coalesce`;

function loadSnapshots() {
  const snaps = [];
  if (!fs.existsSync(ROOT)) return snaps;
  for (const slug of fs.readdirSync(ROOT)) {
    if (slug === 'coalesce') continue;
    const f = `${ROOT}/${slug}/menu.snapshot.json`;
    if (!fs.existsSync(f)) continue;
    const snap = JSON.parse(fs.readFileSync(f, 'utf8'));
    snaps.push(snap);
  }
  return snaps;
}

function main() {
  const snaps = loadSnapshots();
  fs.mkdirSync(OUT, { recursive: true });

  const productsOut = [];
  const strainRegion = {};

  for (const snap of snaps) {
    for (const cat of snap.categories) {
      if (cat.extraction_status !== 'complete') continue;
      for (const p of cat.products) {
        productsOut.push({
          operator_slug: snap.operator.slug,
          operator_name: snap.operator.display_name,
          region: snap.operator.service_area_county,
          category: cat.name,
          sku: p.sku,
          name: p.name,
          strain_type: p.strain_type,
          brand_or_grower: p.brand_or_grower,
          price_low_usd: p.price_low_usd,
          price_high_usd: p.price_high_usd,
        });
        // Strain-by-region histogram (use name as the strain key for this initial version;
        // a future pass will normalize via a strain-synonym dictionary).
        const strainKey = (p.name || '').toLowerCase().trim();
        if (!strainKey) continue;
        if (!strainRegion[strainKey]) strainRegion[strainKey] = {};
        const r = snap.operator.service_area_county;
        strainRegion[strainKey][r] = (strainRegion[strainKey][r] || 0) + 1;
      }
    }
  }

  fs.writeFileSync(
    `${OUT}/products-by-operator.jsonl`,
    productsOut.map(r => JSON.stringify(r)).join('\n') + '\n'
  );

  // Strain-by-region summary: only strains seen at 2+ operators or 3+ counties
  // start to become trend signal. For now, emit everything with at least 2 operators.
  const strainByRegionSummary = {};
  for (const [strain, regions] of Object.entries(strainRegion)) {
    const opCount = Object.keys(regions).length;
    if (opCount >= 2 || Object.values(regions).reduce((a, b) => a + b, 0) >= 3) {
      strainByRegionSummary[strain] = regions;
    }
  }
  fs.writeFileSync(
    `${OUT}/strain-by-region.json`,
    JSON.stringify({ generated_at: new Date().toISOString(), strains: strainByRegionSummary }, null, 2)
  );

  const summary = {
    operators_loaded: snaps.length,
    products_total: productsOut.length,
    strains_tracked: Object.keys(strainByRegionSummary).length,
    operators_breakdown: snaps.map(s => ({
      slug: s.operator.slug,
      region: s.operator.service_area_county,
      products: s.categories.reduce((sum, c) => sum + c.products.length, 0),
    })),
  };
  fs.writeFileSync(`${OUT}/coalesce-summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) main();

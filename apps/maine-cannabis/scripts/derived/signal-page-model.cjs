'use strict';

/**
 * apps/maine-cannabis/scripts/derived/signal-page-model.cjs
 *
 * Read-only MDG Signal page-model derivation.
 *
 * Consumes the current MDG-DATA release at build time only. Produces a
 * deterministic JSON shape used by the /signal/ Astro routes. NEVER reads
 * dispensary-menu-prices (the prototype boundary is enforced in code, not just
 * in UI). NEVER exposes contact_email or contact_phone from the dispensary
 * directory.
 *
 * Inputs (relative to sourceRoot):
 *   manifest.json
 *   products/retail-licenses-by-municipality.csv
 *   products/retail-licenses-per-10k.csv
 *   products/dispensary-directory.csv
 *   products/retail-optin-gap.csv  (read for optin coverage state only;
 *                                   no per-municipality claim is made)
 *
 * Output shape:
 *   {
 *     releaseId, transformVersion,
 *     capabilities: { licensesByMunicipality, licensesPer10k, optinCoverage,
 *                     menuPrices, watchlist, changeAlerts },
 *     municipalities: [
 *       { city, geoid, licenses, population, density, acsVintage, dataAsOf,
 *         releaseId, slug,
 *         stores: [{ licenseId, legalName, dba, firstIssued }] }
 *     ],
 *     evidence: { sources: [...], methodologyPath, transformVersion }
 *   }
 *
 * The 12 curated municipalities are the ones used by the prototype at
 * .cache/mdg-signal-data-explorer/sketches/005; cities are looked up by
 * geoid from the source CSVs, not hard-coded numbers, so that a refreshed
 * MDG-DATA release that still includes these geoids produces the same model.
 */

const fs = require('node:fs');
const path = require('node:path');

// 11 curated municipalities confirmed in MDG-DATA release ded381696bddf56f
// (the prototype's 12th, Westbrook, appears in
// municipalities-without-retail-license and is therefore not a
// current-release retailer research subject). Each geoid was extracted from
// the current dispensary-directory.csv so a refreshed release that still
// includes these geoids produces the same model.
const CURATED_GEOIDS = Object.freeze([
  '2300560545', // Portland        (27 licenses, density 3.92)
  '2300571990', // South Portland  (11 licenses, density 4.08)
  '2301902795', // Bangor          (10 licenses, density 3.13)
  '2300138740', // Lewiston        ( 8 licenses, density 2.09)
  '2300102060', // Auburn          ( 7 licenses, density 2.85)
  '2301102100', // Augusta         ( 5 licenses, density 2.62)
  '2301180740', // Waterville      ( 6 licenses, density 3.51)
  '2303165725', // Sanford         ( 4 licenses, density 1.80)
  '2300508430', // Brunswick       ( 3 licenses, density 1.34)
  '2303137270', // Kittery         ( 2 licenses, density 1.91)
  '2301955565', // Orono           ( 4 licenses, density 3.24)
]);

const REQUIRED_INPUTS = Object.freeze([
  'manifest.json',
  'products/retail-licenses-by-municipality.csv',
  'products/retail-licenses-per-10k.csv',
  'products/dispensary-directory.csv',
]);

function requireFile(root, rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`signal-page-model: required input missing: ${rel}`);
  }
  return full;
}

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 1) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] !== undefined ? cells[i] : ''; });
    return row;
  });
}

function parseCsvLine(line) {
  // Minimal CSV: handles quoted fields with commas. The MDG-DATA CSVs do not
  // embed newlines inside quotes.
  const out = [];
  let i = 0;
  let buf = '';
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { buf += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      buf += ch; i += 1; continue;
    }
    if (ch === ',') { out.push(buf); buf = ''; i += 1; continue; }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    buf += ch; i += 1;
  }
  out.push(buf);
  return out;
}

function int(v) {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function num(v) {
  const n = Number.parseFloat(String(v || ''));
  return Number.isFinite(n) ? n : null;
}

function slug(city) {
  return String(city)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function derive({ sourceRoot }) {
  if (!sourceRoot) throw new Error('signal-page-model: sourceRoot is required');
  for (const rel of REQUIRED_INPUTS) requireFile(sourceRoot, rel);

  const manifestPath = path.join(sourceRoot, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const releaseId = String(manifest.release_id || '');

  const licensesRows = readCsv(path.join(sourceRoot, 'products', 'retail-licenses-by-municipality.csv'));
  const per10kRows = readCsv(path.join(sourceRoot, 'products', 'retail-licenses-per-10k.csv'));
  const directoryRows = readCsv(path.join(sourceRoot, 'products', 'dispensary-directory.csv'));

  const licensesByGeoid = new Map();
  for (const row of licensesRows) {
    const geoid = String(row.geoid || '');
    if (!CURATED_GEOIDS.includes(geoid)) continue;
    licensesByGeoid.set(geoid, {
      licenses: int(row.active_adult_use_cannabis_store_licenses),
      dataAsOf: String(row.data_as_of || ''),
      city: row.city || null,
    });
  }

  const per10kByGeoid = new Map();
  for (const row of per10kRows) {
    const geoid = String(row.geoid || '');
    if (!CURATED_GEOIDS.includes(geoid)) continue;
    per10kByGeoid.set(geoid, {
      population: int(row.population),
      density: num(row.rate_per_10k_display) ?? num(row.rate_per_10k_unrounded),
      acsVintage: int(row.acs_vintage),
    });
  }

  // City name resolution prefers retail-licenses-by-municipality (its meta
  // confirms it carries the city label) and falls back to dispensary-directory.
  const directory = directoryRows.filter((row) =>
    String(row.license_status || '').trim() === 'Active'
    && String(row.license_type_raw || '').trim() === 'Store'
  );
  const cityByGeoid = new Map();
  for (const row of directory) {
    const geoid = String(row.geoid || '');
    if (!CURATED_GEOIDS.includes(geoid)) continue;
    if (!cityByGeoid.has(geoid)) {
      cityByGeoid.set(geoid, String(row.city_raw || '').trim());
    }
  }

  const storesByGeoid = new Map();
  for (const row of directory) {
    const geoid = String(row.geoid || '');
    if (!CURATED_GEOIDS.includes(geoid)) continue;
    const list = storesByGeoid.get(geoid) || [];
    list.push({
      licenseId: String(row.license_id || '').trim(),
      legalName: String(row.legal_name || '').trim(),
      dba: String(row.dba || '').trim(),
      firstIssued: String(row.first_issue_date || '').trim(),
    });
    storesByGeoid.set(geoid, list);
  }

  const municipalities = [];
  for (const geoid of CURATED_GEOIDS) {
    const lic = licensesByGeoid.get(geoid);
    const per = per10kByGeoid.get(geoid);
    if (!lic || !per) {
      throw new Error(
        `signal-page-model: curated geoid ${geoid} missing in source products ` +
        `(licenses=${!!lic}, per10k=${!!per}); aborting to keep model honest`
      );
    }
    const city = (lic.city && lic.city.trim()) || cityByGeoid.get(geoid) || '';
    if (!city) throw new Error(`signal-page-model: city label missing for geoid ${geoid}`);
    municipalities.push({
      city,
      geoid,
      licenses: lic.licenses,
      population: per.population,
      density: per.density,
      acsVintage: per.acsVintage,
      dataAsOf: lic.dataAsOf,
      releaseId,
      slug: slug(city),
      stores: storesByGeoid.get(geoid) || [],
    });
  }

  // Deterministic ordering: density desc, then city asc.
  municipalities.sort((a, b) => {
    if (b.density !== a.density) return b.density - a.density;
    return a.city.localeCompare(b.city);
  });

  const optinPresent = fs.existsSync(path.join(sourceRoot, 'products', 'retail-optin-gap.csv'))
    || fs.existsSync(path.join(sourceRoot, 'products', 'retail-optin-gap.json'));

  return {
    releaseId,
    transformVersion: String(manifest.transform_version || ''),
    capabilities: {
      licensesByMunicipality: 'current',
      licensesPer10k: 'current',
      optinCoverage: optinPresent ? 'partial' : 'not_ready',
      menuPrices: 'not_ready',
      watchlist: 'proposed_paid',
      changeAlerts: 'proposed_paid',
    },
    municipalities,
    evidence: {
      releaseId,
      sources: ['ocp_licenses', 'census_acs5_population', 'ocp_dispensaries_firecrawl'],
      methodologyPath: '/data/methodology/retail-licenses-by-municipality',
      transformVersion: String(manifest.transform_version || ''),
      notes: [
        'License count and population come from MDG-DATA release ' + releaseId + '.',
        'Density is descriptive, not a demand or viability score.',
        'Per-municipality store list is filtered to Active store licenses.',
      ],
    },
  };
}

function renderTs(module) {
  // Render a deterministic, pretty-printed TS module so the build can import
  // it without re-parsing JSON at runtime.
  const json = JSON.stringify(module, null, 2);
  return [
    '/* eslint-disable */',
    '// Auto-generated by scripts/derived/signal-page-model.cjs. Do not edit.',
    '// Source: MDG-DATA release ' + module.releaseId,
    '// Regenerate via: node scripts/derived/signal-page-model.cjs --emit <out>',
    'export const SIGNAL_PAGE_MODEL = ' + json + ' as const;',
    'export type SignalPageModel = typeof SIGNAL_PAGE_MODEL;',
    '',
  ].join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  const emitIdx = args.indexOf('--emit');
  if (emitIdx === -1 || !args[emitIdx + 1]) {
    throw new Error('signal-page-model: --emit <output-path> is required');
  }
  const sourceRoot = path.join(
    __dirname, '..', '..', 'src', 'data', 'generated', 'mdg-data', 'current'
  );
  const model = derive({ sourceRoot });
  const outPath = args[emitIdx + 1];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderTs(model), 'utf8');
  process.stdout.write(`signal-page-model: wrote ${model.municipalities.length} municipalities to ${outPath}\n`);
}

if (require.main === module) {
  try { main(process.argv); }
  catch (error) { process.stderr.write(error.stack + '\n'); process.exit(1); }
}

module.exports = { derive, renderTs, CURATED_GEOIDS };

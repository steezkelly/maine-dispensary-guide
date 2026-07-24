'use strict';

/**
 * scripts/pdf/mdg-q3-2026-chart-data.cjs
 *
 * Q3 2026 PDF chart-data pipeline. Reads the verified Q3 2026 source pool
 * (raw CSVs + frozen figures from SOURCE-MATRIX.md) and produces 11
 * chart-data JSON files at apps/maine-cannabis/scripts/pdf/data/q3-2026/.
 *
 * Each JSON carries: id, title, source { url, retrieval_date, status },
 * observation_period, and data/tiers arrays.
 *
 * Verified figures are frozen per docs/research/q3-2026-source-pool.md.
 * Do NOT drift from these values.
 *
 * Run with: node scripts/pdf/mdg-q3-2026-chart-data.cjs
 */

const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');

const REPO = resolve(__dirname, '..', '..');
const DATA_DIR = resolve(REPO, 'apps/maine-cannabis/docs/research/q3-2026-data');
const OUT_DIR = resolve(REPO, 'apps/maine-cannabis/scripts/pdf/data/q3-2026');

// --- CSV parsing (minimal, handles quoted fields) ---

function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        current.push(field.trim());
        field = '';
        if (current.some((c) => c !== '')) rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }
  current.push(field.trim());
  if (current.some((c) => c !== '')) rows.push(current);
  return rows;
}

function csvToObjects(rows, headerRowIdx) {
  const header = rows[headerRowIdx];
  return rows.slice(headerRowIdx + 1).map((row) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

// --- Frozen verified figures (from SOURCE-MATRIX.md, do NOT drift) ---

const FROZEN = {
  retrieval_date: '2026-07-22',
  ocp_june_2026: { sales: 20688125, transactions: 425839, price_per_gram: 6.04 },
  ocp_ytd_2026: { sales: 119954243, transactions: 2439812, price_per_gram: 6.10 },
  ocp_cy2025_dashboard: { sales: 246817000, transactions: 4845000 },
  ocp_cy2025_statutory: { sales: 246423512, transactions: 4835682, price_per_gram: 6.62 },
  mrs_may_2026: {
    medical_taxable: 18916692.79,
    adult_use_taxable: 20283005.06,
    au_sales_tax_liability: 2839620.71,
    au_sales_tax_revenue: 2744931.97,
    au_excise_revenue: 1097908.09,
  },
  au_roster_2026_06_01: { total_active: 346, stores: 187, manufacturing: 80, cultivation: 76, testing: 3 },
  price_history: [
    { year: 2021, price: 12.75 },
    { year: 2022, price: 9.23 },
    { year: 2023, price: 7.77 },
    { year: 2024, price: 7.24 },
    { year: 2025, price: 6.62 },
    { year: '2026 YTD', price: 6.10 },
  ],
  cy2025_product_mix: {
    usable_cannabis: 137350000,
    concentrate: 71870000,
    infused: 37020000,
    plants: 183000,
  },
  medical_2025_annual: {
    printed_certificates: 112547,
    providers: 808,
    caregivers: 1539,
    dispensary_certificates: 90,
    dispensary_retail_locations: 62,
  },
  medical_roster_2026_06_01: {
    caregiver_rows: 1414,
    caregiver_with_retail_town: 272,
    active_dispensary_licenses: 95,
  },
};

// --- Chart builders ---

function sourceBlock(url, status) {
  return { url, retrieval_date: FROZEN.retrieval_date, status };
}

function chart1_adultUseMonthlySales() {
  return {
    id: 'adult-use-monthly-sales-trailing-12m',
    title: 'Maine adult-use monthly retail sales, trailing 12 months',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales',
      'OCP inventory-tracking data; preliminary, unaudited, subject to revision',
    ),
    observation_period: 'Jul 2025 - Jun 2026 (verified: Jun 2026 + YTD; full monthly series requires OCP dashboard export)',
    data: [
      { label: 'June 2026', value: FROZEN.ocp_june_2026.sales, kind: 'current' },
      { label: 'Jan-Jun 2026 YTD', value: FROZEN.ocp_ytd_2026.sales, kind: 'ytd' },
    ],
    note: 'Full trailing-12-month monthly series requires the OCP dashboard CSV export. The verified source pool contains June 2026 and YTD figures only. Preliminary, unaudited, subject to revision.',
  };
}

function chart2_ytdKpiCards() {
  const derivedReceiptValue = Math.round(FROZEN.ocp_ytd_2026.sales / FROZEN.ocp_ytd_2026.transactions * 100) / 100;
  return {
    id: '2026-ytd-kpi-cards',
    title: '2026 YTD adult-use KPI cards (Jan-Jun)',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales',
      'OCP inventory-tracking data; preliminary, unaudited, subject to revision',
    ),
    observation_period: 'Jan-Jun 2026',
    data: [
      { label: 'Sales revenue', value: FROZEN.ocp_ytd_2026.sales, kind: 'sales' },
      { label: 'Receipt transactions', value: FROZEN.ocp_ytd_2026.transactions, kind: 'transactions' },
      { label: 'Avg bud/flower price per gram', value: FROZEN.ocp_ytd_2026.price_per_gram, kind: 'price' },
      { label: 'Derived avg receipt value', value: derivedReceiptValue, kind: 'derived' },
    ],
    note: 'Derived average receipt value = sales / receipt transactions. Price/g is flower-specific, not basket-wide.',
  };
}

function chart3_priceCompression() {
  return {
    id: 'bud-flower-price-compression',
    title: 'Maine bud/flower average price per gram, 2021-2026 YTD',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf',
      'OCP annual reports 2021-2025 + live dashboard 2026 YTD; 2026 YTD is preliminary',
    ),
    observation_period: '2021-2025 (annual reports) + Jan-Jun 2026 (dashboard YTD)',
    data: FROZEN.price_history.map((p) => ({
      label: String(p.year),
      value: p.price,
      kind: p.year === '2026 YTD' ? 'provisional' : 'annual',
    })),
    note: 'Do not imply YTD average is a complete-year observation; dashboard is preliminary.',
  };
}

function chart4_productMixShift() {
  const total = Object.values(FROZEN.cy2025_product_mix).reduce((a, b) => a + b, 0);
  return {
    id: 'product-mix-shift',
    title: 'Maine adult-use product mix by sales dollars, CY2025',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf',
      'OCP 2025 Adult Use annual report; statutory complete-year data',
    ),
    observation_period: 'CY2025 (complete year)',
    data: [
      { label: 'Usable cannabis', value: FROZEN.cy2025_product_mix.usable_cannabis, kind: 'usable', share: Math.round(FROZEN.cy2025_product_mix.usable_cannabis / total * 1000) / 10 },
      { label: 'Concentrate', value: FROZEN.cy2025_product_mix.concentrate, kind: 'concentrate', share: Math.round(FROZEN.cy2025_product_mix.concentrate / total * 1000) / 10 },
      { label: 'Infused products', value: FROZEN.cy2025_product_mix.infused, kind: 'infused', share: Math.round(FROZEN.cy2025_product_mix.infused / total * 1000) / 10 },
      { label: 'Plants', value: FROZEN.cy2025_product_mix.plants, kind: 'plants', share: Math.round(FROZEN.cy2025_product_mix.plants / total * 1000) / 10 },
    ],
    note: 'Shares are of total product sales dollars. Plants may be too small to label directly. 2026 YTD category breakdown requires OCP dashboard export.',
  };
}

function chart5_ocpVsMrsLens(mrsRows) {
  // Extract MRS monthly adult-use taxable sales for the most recent 12 months available
  const auRows = mrsRows
    .filter((r) => r['Adult use'] !== undefined || r['Adult use\r'] !== undefined)
    .map((r) => ({
      year: parseInt(r.Year, 10),
      month: parseInt(r.Month, 10),
      au_taxable: parseFloat((r['Adult use'] || r['Adult use\r'] || '0').replace(/,/g, '')),
      med_taxable: parseFloat((r.Medical || r['Medical\r'] || '0').replace(/,/g, '')),
    }))
    .filter((r) => !isNaN(r.year) && !isNaN(r.month) && r.au_taxable > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const last12 = auRows.slice(-12);

  return {
    id: 'ocp-vs-mrs-monthly-lens',
    title: 'OCP tracked retail sales vs MRS taxable sales by filing period',
    source: sourceBlock(
      'https://www.maine.gov/revenue/taxes/tax-policy-office/sales-tax-reports',
      'MRS filing-period-based and revisable; OCP preliminary and unaudited',
    ),
    observation_period: 'MRS through May 2026; OCP through Jun 2026 (different systems/period semantics)',
    data: last12.map((r) => ({
      label: `${r.year}-${String(r.month).padStart(2, '0')}`,
      value: r.au_taxable,
      kind: 'mrs_au_taxable',
    })),
    note: 'Different systems/period semantics; May is latest common month; MRS history revises monthly. OCP monthly series requires dashboard export.',
  };
}

function chart6_auTaxReceipts(mrsRows) {
  const auRows = mrsRows
    .map((r) => ({
      year: parseInt(r.Year, 10),
      month: parseInt(r.Month, 10),
      sales_tax_revenue: parseFloat((r['Sales tax revenue'] || r['Sales tax revenue\r'] || '0').replace(/,/g, '')),
      excise_revenue: parseFloat((r['Excise tax revenue'] || r['Excise tax revenue\r'] || '0').replace(/,/g, '')),
    }))
    .filter((r) => !isNaN(r.year) && !isNaN(r.month) && (r.sales_tax_revenue > 0 || r.excise_revenue > 0))
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const last12 = auRows.slice(-12);

  return {
    id: 'adult-use-tax-receipts',
    title: 'Maine adult-use tax receipts, trailing 12 filing periods',
    source: sourceBlock(
      'https://www.maine.gov/revenue/taxes/tax-policy-office/sales-tax-reports',
      'MRS filing-period-based and revisable; revenue timing does not exactly equal sales month',
    ),
    observation_period: 'Through May 2026 (latest available MRS filing period)',
    data: last12.flatMap((r) => [
      { label: `${r.year}-${String(r.month).padStart(2, '0')} sales tax`, value: r.sales_tax_revenue, kind: 'sales_tax' },
      { label: `${r.year}-${String(r.month).padStart(2, '0')} excise`, value: r.excise_revenue, kind: 'excise' },
    ]),
    note: 'Annotate Jan 1, 2026 rate change (sales tax 10%->14%, excise $335/lb->$223/lb). Do not calculate a naive effective rate from same-row revenue.',
  };
}

function chart7_licenseMix(auLicenses) {
  // Dedupe by LICENSE, count active by category
  const seen = new Set();
  const counts = { Store: 0, Manufacturing: 0, Cultivation: 0, Testing: 0 };
  for (const row of auLicenses) {
    const lic = row.LICENSE;
    if (seen.has(lic)) continue;
    seen.add(lic);
    if (row.LICENSE_STATUS !== 'Active') continue;
    const cat = row.LICENSE_CATEGORY;
    if (counts[cat] !== undefined) counts[cat]++;
  }

  return {
    id: 'active-adult-use-license-mix',
    title: 'Active adult-use license mix by category, June 1, 2026 roster',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
      'Administrative roster snapshot, not sales or operating-performance proof',
    ),
    observation_period: 'OCP roster dated 2026-06-01, page last updated July 8, 2026',
    data: [
      { label: 'Stores', value: counts.Store, kind: 'store' },
      { label: 'Manufacturing', value: counts.Manufacturing, kind: 'manufacturing' },
      { label: 'Cultivation', value: counts.Cultivation, kind: 'cultivation' },
      { label: 'Testing', value: counts.Testing, kind: 'testing' },
    ],
    note: 'Unique active licenses, not businesses, locations open today, or raw CSV rows. Frozen verified total: 346.',
  };
}

function chart8_footprintByCounty(auLicenses) {
  const seen = new Set();
  const countyCounts = {};
  let unknownCounty = 0;
  for (const row of auLicenses) {
    const lic = row.LICENSE;
    if (seen.has(lic)) continue;
    seen.add(lic);
    if (row.LICENSE_STATUS !== 'Active') continue;
    const county = (row.LICENSE_COUNTY || '').trim();
    if (!county) {
      unknownCounty++;
    } else {
      countyCounts[county] = (countyCounts[county] || 0) + 1;
    }
  }

  const sorted = Object.entries(countyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([county, count]) => ({ label: county, value: count, kind: 'county' }));

  if (unknownCounty > 0) {
    sorted.push({ label: 'Unknown county', value: unknownCounty, kind: 'unknown' });
  }

  return {
    id: 'adult-use-footprint-by-county',
    title: 'Active adult-use license footprint by county, June 1, 2026',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search',
      'Administrative roster snapshot; footprint only, never county market size',
    ),
    observation_period: 'OCP roster dated 2026-06-01',
    data: sorted,
    note: 'Footprint only. Never title "county market size" or infer sales/demand. Two active records lack county.',
  };
}

function chart9_medicalProgramDivergence(medCaregivers, medEstablishments) {
  const caregiverRows = medCaregivers.length;
  const caregiverWithRetail = medCaregivers.filter((r) => (r.RETAIL_TOWN || '').trim() !== '').length;
  const uniqueDispensaryLicenses = new Set(medEstablishments.map((r) => r.LICENSE)).size;
  const activeDispensaries = new Set(
    medEstablishments.filter((r) => r.LICENSE_STATUS === 'Active').map((r) => r.LICENSE),
  ).size;

  return {
    id: 'medical-program-divergence',
    title: 'Maine medical program divergence: annual report vs June 2026 roster',
    source: sourceBlock(
      'https://legislature.maine.gov/doc/12333',
      'OCP 2025 Medical Use annual report + June 2026 dashboard/roster; certificates are not unique patients',
    ),
    observation_period: 'CY2025 annual report + June 1, 2026 roster snapshot',
    data: [
      { label: 'Printed certificates (CY2025 annual)', value: FROZEN.medical_2025_annual.printed_certificates, kind: 'annual' },
      { label: 'Providers (CY2025 annual)', value: FROZEN.medical_2025_annual.providers, kind: 'annual' },
      { label: 'Caregivers (CY2025 annual)', value: FROZEN.medical_2025_annual.caregivers, kind: 'annual' },
      { label: 'Caregiver roster rows (Jun 2026)', value: caregiverRows, kind: 'roster' },
      { label: 'Caregivers with retail town (Jun 2026)', value: caregiverWithRetail, kind: 'roster' },
      { label: 'Active dispensary licenses (Jun 2026)', value: activeDispensaries, kind: 'roster' },
      { label: 'Unique dispensary licenses (Jun 2026)', value: uniqueDispensaryLicenses, kind: 'roster' },
    ],
    note: 'Certificates != unique patients; current roster/dashboard caregiver disagreement disclosed. Dashboard card shows 1,412 caregivers vs roster 1,414.',
  };
}

function chart10_medicalAccessGeography(medCaregivers, medEstablishments) {
  // Caregiver residential counties
  const caregiverCounties = {};
  for (const r of medCaregivers) {
    const county = (r.RESIDENTIAL_COUNTY || '').trim();
    if (county) caregiverCounties[county] = (caregiverCounties[county] || 0) + 1;
  }

  // Dispensary cities
  const dispensaryCities = {};
  const seenLic = new Set();
  for (const r of medEstablishments) {
    if (seenLic.has(r.LICENSE)) continue;
    seenLic.add(r.LICENSE);
    const city = (r.LICENSE_CITY || '').trim();
    if (city) dispensaryCities[city] = (dispensaryCities[city] || 0) + 1;
  }

  const topCaregiverCounties = Object.entries(caregiverCounties)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([county, count]) => ({ label: county, value: count, kind: 'caregiver_county' }));

  const dispensaryCityList = Object.entries(dispensaryCities)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ label: city, value: count, kind: 'dispensary_city' }));

  return {
    id: 'medical-access-geography',
    title: 'Maine medical cannabis access geography, June 2026',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/open-data/medical-use/registrant-search',
      'Administrative roster snapshot; public fields constrained by 22 MRS 2425-A(14)',
    ),
    observation_period: 'OCP roster dated 2026-06-01',
    data: [
      ...topCaregiverCounties,
      ...dispensaryCityList,
    ],
    note: 'Do not compute "patients per caregiver" because certificates are not unique patients and may include reprints. County tables from 2025 annual report require separate extraction.',
  };
}

function chart11_marketStructureSnapshot() {
  return {
    id: 'market-structure-snapshot',
    title: 'Maine cannabis market structure snapshot, CY2025 + June 2026',
    source: sourceBlock(
      'https://www.maine.gov/dafs/ocp/resources/annual-reports',
      'OCP 2025 annual reports + live dashboard; program definitions differ, do not sum into single dispensary total',
    ),
    observation_period: 'CY2025 annual reports + June 2026 live dashboard',
    data: [
      { label: 'Adult-use CY2025 sales (live dashboard edition)', value: FROZEN.ocp_cy2025_dashboard.sales, kind: 'dashboard' },
      { label: 'Adult-use CY2025 sales (frozen statutory edition)', value: FROZEN.ocp_cy2025_statutory.sales, kind: 'statutory' },
      { label: 'Adult-use CY2025 transactions (live dashboard)', value: FROZEN.ocp_cy2025_dashboard.transactions, kind: 'dashboard' },
      { label: 'Adult-use CY2025 transactions (frozen statutory)', value: FROZEN.ocp_cy2025_statutory.transactions, kind: 'statutory' },
      { label: 'Adult-use active establishments (12/31/25)', value: 343, kind: 'annual' },
      { label: 'Adult-use stores (12/31/25)', value: 180, kind: 'annual' },
      { label: 'Medical caregivers (year-end 2025)', value: FROZEN.medical_2025_annual.caregivers, kind: 'annual' },
      { label: 'Medical dispensary retail locations (year-end 2025)', value: FROZEN.medical_2025_annual.dispensary_retail_locations, kind: 'annual' },
      { label: 'Medical reported caregiver stores (year-end 2025)', value: 286, kind: 'annual' },
    ],
    note: 'Program definitions differ; do not sum these into a single "dispensary" total. Dashboard edition is ~$246.817M; frozen statutory edition is $246.424M.',
  };
}

// --- Main ---

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Read raw CSVs
  const mrsText = readFileSync(resolve(DATA_DIR, 'mrs-may-2026-cannabis-sales.csv'), 'utf8');
  const mrsAllRows = parseCsv(mrsText);
  // Find the header row (Year, Month, ...)
  const mrsHeaderIdx = mrsAllRows.findIndex((r) => r[0] === 'Year' && r[1] === 'Month');
  const mrsRows = csvToObjects(mrsAllRows, mrsHeaderIdx);

  const auText = readFileSync(resolve(DATA_DIR, 'ocp-au-licenses-2026-06-01.csv'), 'utf8');
  const auAllRows = parseCsv(auText);
  const auHeaderIdx = 0;
  const auLicenses = csvToObjects(auAllRows, auHeaderIdx);

  const medCgText = readFileSync(resolve(DATA_DIR, 'ocp-med-caregivers-2026-06-01.csv'), 'utf8');
  const medCgAllRows = parseCsv(medCgText);
  const medCaregivers = csvToObjects(medCgAllRows, 0);

  const medEstText = readFileSync(resolve(DATA_DIR, 'ocp-med-establishments-2026-06-01.csv'), 'utf8');
  const medEstAllRows = parseCsv(medEstText);
  const medEstablishments = csvToObjects(medEstAllRows, 0);

  // Build all 11 charts
  const charts = [
    chart1_adultUseMonthlySales(),
    chart2_ytdKpiCards(),
    chart3_priceCompression(),
    chart4_productMixShift(),
    chart5_ocpVsMrsLens(mrsRows),
    chart6_auTaxReceipts(mrsRows),
    chart7_licenseMix(auLicenses),
    chart8_footprintByCounty(auLicenses),
    chart9_medicalProgramDivergence(medCaregivers, medEstablishments),
    chart10_medicalAccessGeography(medCaregivers, medEstablishments),
    chart11_marketStructureSnapshot(),
  ];

  // Write each chart JSON
  const written = charts.map((chart) => {
    const path = resolve(OUT_DIR, chart.id + '.json');
    writeFileSync(path, JSON.stringify(chart, null, 2) + '\n');
    return { id: chart.id, path };
  });

  return { charts: written, dir: OUT_DIR };
}

if (require.main === module) {
  const result = main();
  process.stderr.write(`mdg-q3-2026-chart-data.cjs: wrote ${result.charts.length} chart-data JSONs to ${result.dir}\n`);
  result.charts.forEach((c) => process.stderr.write(`  - ${c.id}\n`));
}

module.exports = { main };

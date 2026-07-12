'use strict';
const fs = require('fs');
const path = require('path');
const ocpLic = require('./ocp-licenses.cjs');  // for parseCsv
const store = require('../lib/store.cjs');

/**
 * adapters/ocp-firecrawl-ingest.cjs
 *
 * Ingest path for OCP retail-sales and opt-in data extracted from the
 * Power BI dashboards via Firecrawl's interact tool. Per the operator
 * override 2026-07-12, this is the production ingest path.
 *
 * Workflow:
 *   1. Operator runs `firecrawl interact` against the Power BI embed URL.
 *   2. Operator saves the markdown report to:
 *      $MDG_DATA_ROOT/raw/ocp_sales_firecrawl/{tab_slug}.md
 *      $MDG_DATA_ROOT/raw/ocp_optin_firecrawl/{tab_slug}.md
 *   3. The engine's `data:mdg:fetch` discovers the files, archives
 *      them content-addressed, and the manual-adapter path
 *      (ocp-retail-sales-manual / ocp-optin-manual) profiles them.
 *   4. The `data:mdg:normalize` step calls the appropriate
 *      firecrawl-derived normalizer (this file) which produces
 *      DATA-MODEL.md-shaped sales_observation / optin_record rows.
 *
 * The opt-in dashboard has 3 tabs:
 *   - "Adult Use Cannabis Opt-in by Municipality" (per-municipality)
 *   - "Municipality Opt-in and Search" (searchable table)
 *   - "Municipality Opt-in by License Type" (totals)
 *
 * The retail-sales dashboard has 3 tabs:
 *   - "Sales Revenue" (annual + monthly + by-product-category)
 *   - "Sales Transactions" (annual + monthly + by-product-category)
 *   - "Price Per Gram" (annual + monthly)
 *
 * Schema observations (per the live 2026-07-12 Firecrawl capture):
 *   - Sales Revenue tab:
 *     "Sales Revenue Annual Trend,<7 yearly values>"
 *     "Sales Revenue - Previous 12 Months,<12 monthly values>"
 *     "Sales Revenue - By Product Category,<48 values: 4 categories x 12 months>"
 *     (categories: Concentrate, Infused Product, Plants, Usable Cannabis)
 *   - Sales Transactions tab: same structure, different unit (count)
 *   - Price Per Gram tab:
 *     "Price Per Gram (Annual Trend),<7 yearly values>"
 *     "Price Per Gram - Month Over Month (Previous 12 Months),<12 monthly values>"
 *   - Opt-in tabs:
 *     Per-municipality list as "**MunicipalityName:** True/False" bullet items.
 *     Total-totals tab: "Total Adult Use Opt-ins by License Type, Cultivation, <n>, Manufactoring, <n>, Retail, <n>, Testing, <n>"
 */

const SALES_TAB_PARSERS = {
    'sales_revenue': parseSalesRevenue,
    'sales_transactions': parseSalesTransactions,
    'price_per_gram': parsePricePerGram
};

const OPTIN_TAB_PARSERS = {
    'optin_by_municipality': parseOptinByMunicipality,
    'optin_by_license_type': parseOptinByLicenseType
};

function findTabFile(dir, tabSlug) {
    // We require the file to contain AT LEAST ONE distinguishing word
    // from the tab slug that's NOT a common prefix (e.g. 'sales' is
    // common to sales_revenue and sales_transactions, so we skip it).
    // This way sales_revenue matches files with 'revenue' or
    // 'revenue-full' or 'revenue.md', and sales_transactions matches
    // files with 'transactions' or 'tab2' or similar.
    if (!fs.existsSync(dir)) return null;
    const COMMON_PREFIX = new Set(['sales', 'ocp', 'retail', 'use', 'optin', 'adult', 'cannabis', 'tab']);
    const slugWords = tabSlug.toLowerCase().split('_')
        .filter(w => !COMMON_PREFIX.has(w));
    const candidates = fs.readdirSync(dir).filter(f => {
        const fn = f.toLowerCase().replace(/[_-]/g, '');
        return slugWords.some(w => fn.includes(w));
    });
    if (!candidates.length) {
        // Fallback: explicit tab number mapping
        const tabNumMap = {
            sales_revenue: 'tab1',
            sales_transactions: 'tab2',
            price_per_gram: 'tab3',
            optin_by_municipality: 'tab1',  // primary opt-in tab
            optin_by_license_type: 'tab3'    // license-type breakdown (last tab)
        };
        const num = tabNumMap[tabSlug];
        if (num) {
            const match = fs.readdirSync(dir).find(f => f.toLowerCase().includes(num));
            if (match) candidates.push(match);
        }
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.length - a.length);
    return path.join(dir, candidates[0]);
}

function scanMarkdownTable(text, sectionHeader) {
    // Locate the section, then scan lines after it for a markdown table.
    // Returns { headers: [...], rows: [[...], ...] } or null.
    const idx = text.indexOf(sectionHeader);
    if (idx < 0) return null;
    const lines = text.slice(idx).split('\n');
    let headerLine = null;
    let dataLines = [];
    let pastSep = false;
    for (const l of lines) {
        const trimmed = l.trim();
        if (trimmed.startsWith('|')) {
            if (!headerLine) headerLine = trimmed;
            else if (trimmed.includes(':---')) { pastSep = true; continue; }
            else if (pastSep) dataLines.push(trimmed);
        } else if (headerLine) break;
    }
    if (!headerLine || !dataLines.length) return null;
    const headers = headerLine.split('|').map(s => s.trim()).filter(s => s && !s.includes('---'));
    const rows = dataLines.map(line => line.split('|').map(s => s.trim()).filter(s => s));
    return { headers, rows };
}

function parseMonthName(year, monthName) {
    const months = ['january','february','march','april','may','june',
        'july','august','september','october','november','december'];
    const m = months.indexOf(monthName.toLowerCase());
    if (m < 0) return null;
    return new Date(Date.UTC(Number(year), m, 1));
}

function parseNumberList(s) {
    if (!s) return [];
    return s.split(',').map(v => {
        v = v.trim();
        if (!v) return null;
        // Strip $ and commas in numbers like "$6,594,069.77"
        const cleaned = v.replace(/[$,`]/g, '');
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
    }).filter(x => x !== null);
}

function parseSalesRevenue(text) {
    // The dashboard emits a table with columns:
    //   "Start of Month Month,Concentrate,Infused Product,Plants,Usable Cannabis,Total"
    // Plus a chart series "Sales Revenue Annual Trend" and
    // "Sales Revenue - Previous 12 Months".
    // We parse both: annual trend values + last 12 months values +
    // the by-product-category × 12-month matrix from the table.
    //
    // Two emit formats observed in firecrawl interact captures:
    //   Format A (revenue-full.md): markdown tables with explicit Year/Month
    //     columns and `$1,234,567.89` cell values
    //   Format B (tab1.md): CSV-like lines:
    //     Sales Revenue,<7 annual values>
    //     Sales Revenue - Total Month Over Month,<12 monthly values>
    //     Sales Revenue - By Product Category,<48 values: 4 categories x 12 months>
    const observations = [];
    // Format A: markdown tables
    const annualTable = text.match(/### Annual Data Points\s*\|[^|]*\|[^|]*\|\s*\n([\s\S]+?)(?=\n---|\n## )/);
    if (annualTable) {
        const rows = annualTable[1].split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
        for (const row of rows) {
            const cells = row.split('|').map(c => c.trim()).filter(c => c);
            if (cells.length < 2) continue;
            const yearMatch = cells[0].match(/(\d{4})/);
            const valMatch = cells[1].replace(/[\$,\`]/g, '');
            if (yearMatch && /^-?\d+(\.\d+)?$/.test(valMatch)) {
                observations.push({
                    reporting_period: yearMatch[1],
                    metric_raw: 'Sales Revenue Annual Trend',
                    metric_norm: 'retail_sales_usd',
                    product_category_raw: 'total',
                    product_category_norm: 'total',
                    value: Number(valMatch),
                    unit: 'USD',
                    preliminary: true
                });
            }
        }
    }
    const scanMonthlyTable = scanMarkdownTable(text, '### Month-Over-Month Data Points');
    if (scanMonthlyTable) {
        const { rows } = scanMonthlyTable;
        for (const cells of rows) {
            if (cells.length < 2) continue;
            const monthMatch = cells[0].match(/(?:(\d{4})\s+(\w+))|(?:(\w+)\s+(\d{4}))/);
            if (!monthMatch) continue;
            // monthMatch[1]+[2] = "2025 July" form; [3]+[4] = "July 2025" form
            const year = monthMatch[1] || monthMatch[4];
            const monthName = monthMatch[2] || monthMatch[3];
            const dt = parseMonthName(year, monthName);
            if (!dt) continue;
            const val = Number(cells[1].replace(/[\$,\`]/g, ''));
            if (!Number.isFinite(val)) continue;
            observations.push({
                reporting_period: dt.toISOString().slice(0, 10),
                metric_raw: 'Sales Revenue Month Over Month',
                metric_norm: 'retail_sales_usd',
                product_category_raw: 'total',
                product_category_norm: 'total',
                value: val,
                unit: 'USD',
                preliminary: true
            });
        }
    }
    // (Format A monthly parsing handled above; Format B below)
    // Format B: CSV-like lines (early-firecrawl captures). Two sub-forms:
    //   B2: bare "Sales Revenue" header + values (no "Annual Trend" suffix;
    //       appears in the tab1.md interact capture)
    const annualMatch = text.match(/Sales Revenue Annual Trend[,\s]+([\d.,\s]+?)(?=\n|Sales Revenue -|$)/);
    const annualMatchBare = text.match(/^Sales Revenue,([\d.,]+)$/m);
    if (annualMatchBare && observations.length === 0) {
        const vals = parseNumberList(annualMatchBare[1]);
        const startYear = 2026 - vals.length + 1;
        for (let i = 0; i < vals.length; i++) {
            observations.push({
                reporting_period: String(startYear + i),
                metric_raw: 'Sales Revenue Annual Trend',
                metric_norm: 'retail_sales_usd',
                product_category_raw: 'total',
                product_category_norm: 'total',
                value: vals[i],
                unit: 'USD',
                preliminary: true
            });
        }
    }
    if (annualMatch && observations.length === 0) {
        const vals = parseNumberList(annualMatch[1]);
        // The annual values correspond to fiscal years ending 2020..2026
        // (7 years). We can't reliably get the year labels from the
        // interact output; we flag source_snapshot_date as 2026-07-12
        // (Firecrawl capture date) and use 2020..2026 as inferred years.
        const startYear = 2026 - vals.length + 1;
        for (let i = 0; i < vals.length; i++) {
            observations.push({
                reporting_period: String(startYear + i),
                metric_raw: 'Sales Revenue Annual Trend',
                metric_norm: 'retail_sales_usd',
                product_category_raw: 'total',
                product_category_norm: 'total',
                value: vals[i],
                unit: 'USD',
                preliminary: true
            });
        }
    }
    // Last 12 months (CSV-like list of 12 values)
    const monthlyMatch = text.match(/Sales Revenue - (?:Previous 12 Months|Total Month Over Month)[,\s]+([\d.,\s]+?)(?=\n|Sales Revenue|$)/);
    if (monthlyMatch) {
        const vals = parseNumberList(monthlyMatch[1]);
        // The most recent month is 2026-06 (June 2026 per the dashboard)
        for (let i = vals.length - 1; i >= 0; i--) {
            const offset = vals.length - 1 - i;
            const dt = new Date(Date.UTC(2026, 5 - offset, 1));
            observations.push({
                reporting_period: dt.toISOString().slice(0, 10),
                metric_raw: 'Sales Revenue Previous 12 Months',
                metric_norm: 'retail_sales_usd',
                product_category_raw: 'total',
                product_category_norm: 'total',
                value: vals[i],
                unit: 'USD',
                preliminary: true
            });
        }
    }
    // By-product-category × 12-month matrix: 4 categories × 12 values.
    // Format A: markdown table with header columns
    //   "Month | Usable Cannabis | Plants | Infused Product | Concentrate | Total"
    // Format B: comma-separated value list.
    const scanCatTable = scanMarkdownTable(text, '### Category Breakdown Data Points');
    if (scanCatTable) {
        const { headers, rows } = scanCatTable;
        const categoryCols = headers.slice(1, headers.length - 1);
        const normalizedCats = categoryCols.map(c => c.toLowerCase().replace(/ /g, '_'));
        for (const row of rows) {
            const cells = row;
            if (cells.length < 2) continue;
            const monthMatch = cells[0].match(/(?:(\d{4})\s+(\w+))|(?:(\w+)\s+(\d{4}))/);
            if (!monthMatch) continue;
            // monthMatch[1]+[2] = "2025 July" form; [3]+[4] = "July 2025" form
            const year = monthMatch[1] || monthMatch[4];
            const monthName = monthMatch[2] || monthMatch[3];
            const dt = parseMonthName(year, monthName);
            if (!dt) continue;
            for (let i = 0; i < categoryCols.length; i++) {
                const valCell = cells[1 + i];
                if (!valCell) continue;
                const val = Number(valCell.replace(/[\$,\`]/g, ''));
                if (!Number.isFinite(val)) continue;
                observations.push({
                    reporting_period: dt.toISOString().slice(0, 10),
                    metric_raw: 'Sales Revenue By Product Category',
                    metric_norm: 'retail_sales_usd',
                    product_category_raw: categoryCols[i],
                    product_category_norm: normalizedCats[i],
                    value: val,
                    unit: 'USD',
                    preliminary: true
                });
            }
        }
    }
    const byCatMatch = text.match(/Sales Revenue - By Product Category[,\s]+([\d.,\s]+?)(?=\n|$)/);
    if (byCatMatch) {
        const vals = parseNumberList(byCatMatch[1]);
        const categories = ['Usable Cannabis', 'Plants', 'Infused Product', 'Concentrate'];
        if (vals.length === 48 && categories.length === 4) {
            for (let c = 0; c < 4; c++) {
                for (let m = 11; m >= 0; m--) {
                    const idx = c * 12 + (11 - m);
                    const offset = 11 - m;
                    const dt = new Date(Date.UTC(2026, 5 - offset, 1));
                    observations.push({
                        reporting_period: dt.toISOString().slice(0, 10),
                        metric_raw: 'Sales Revenue By Product Category',
                        metric_norm: 'retail_sales_usd',
                        product_category_raw: categories[c],
                        product_category_norm: categories[c].toLowerCase().replace(/ /g, '_'),
                        value: vals[idx],
                        unit: 'USD',
                        preliminary: true
                    });
                }
            }
        }
    }
    return observations;
}

function parseSalesTransactions(text) {
    const observations = [];
    // KPI tiles
    const kpiAmount = text.match(/Sales Amount June 2026,([\d$,.]+)/);
    const kpiTxns = text.match(/Number of Sales Transactions June 2026,([\d,.]+)/);
    const kpiPrice = text.match(/Average Price per Gram \(Bud\/Flower\) June 2026,\$([\d.]+)/);
    const kpiYtdAmount = text.match(/Sales Amount Total Calendar Year to Date,([\d,.$]+)/);
    const kpiYtdTxns = text.match(/Number of Sales Transactions Total Calendar Year to Date,([\d,.]+)/);
    const kpiYtdPrice = text.match(/Average Price per Gram \(Bud\/Flower\) Average for Calendar Year to Date,\$([\d.]+)/);
    // Annual
    const annualMatch = text.match(/^Sales Transactions,([\d.,\s]+?)$/m);
    if (annualMatch) {
        const vals = parseNumberList(annualMatch[1]);
        const startYear = 2026 - vals.length + 1;
        for (let i = 0; i < vals.length; i++) {
            observations.push({
                reporting_period: String(startYear + i),
                metric_raw: 'Sales Transactions Annual',
                metric_norm: 'transactions',
                product_category_raw: 'total',
                product_category_norm: 'total',
                value: vals[i],
                unit: 'transactions',
                preliminary: true
            });
        }
    }
    // Last 12 months
    const monthlyMatch = text.match(/Sales Transactions - Total Month Over Month,([\d.,\s]+?)$/m);
    if (monthlyMatch) {
        const vals = parseNumberList(monthlyMatch[1]);
        for (let i = vals.length - 1; i >= 0; i--) {
            const offset = vals.length - 1 - i;
            const dt = new Date(Date.UTC(2026, 5 - offset, 1));
            observations.push({
                reporting_period: dt.toISOString().slice(0, 10),
                metric_raw: 'Sales Transactions Month Over Month',
                metric_norm: 'transactions',
                product_category_raw: 'total',
                product_category_norm: 'total',
                value: vals[i],
                unit: 'transactions',
                preliminary: true
            });
        }
    }
    // By-product-category × 12-month
    const byCatMatch = text.match(/Sales Transactions - By Product Category,([\d.,\s]+?)$/m);
    if (byCatMatch) {
        const vals = parseNumberList(byCatMatch[1]);
        const categories = ['Usable Cannabis', 'Plants', 'Infused Product', 'Concentrate'];
        if (vals.length === 48 && categories.length === 4) {
            for (let c = 0; c < 4; c++) {
                for (let m = 11; m >= 0; m--) {
                    const idx = c * 12 + (11 - m);
                    const offset = 11 - m;
                    const dt = new Date(Date.UTC(2026, 5 - offset, 1));
                    observations.push({
                        reporting_period: dt.toISOString().slice(0, 10),
                        metric_raw: 'Sales Transactions By Product Category',
                        metric_norm: 'transactions',
                        product_category_raw: categories[c],
                        product_category_norm: categories[c].toLowerCase().replace(/ /g, '_'),
                        value: vals[idx],
                        unit: 'transactions',
                        preliminary: true
                    });
                }
            }
        }
    }
    // Add KPI tiles as derived observations
    if (kpiAmount) {
        observations.push({
            reporting_period: '2026-06-01',
            metric_raw: 'KPI Sales Amount June 2026',
            metric_norm: 'retail_sales_usd',
            product_category_raw: 'total',
            product_category_norm: 'total',
            value: Number(kpiAmount[1].replace(/[\$,\`]/g, '')),
            unit: 'USD',
            preliminary: true
        });
    }
    if (kpiTxns) {
        observations.push({
            reporting_period: '2026-06-01',
            metric_raw: 'KPI Number of Sales Transactions June 2026',
            metric_norm: 'transactions',
            product_category_raw: 'total',
            product_category_norm: 'total',
            value: Number(kpiTxns[1].replace(/[\$,\`]/g, '')),
            unit: 'transactions',
            preliminary: true
        });
    }
    if (kpiPrice) {
        observations.push({
            reporting_period: '2026-06-01',
            metric_raw: 'KPI Average Price per Gram June 2026',
            metric_norm: 'avg_price_per_gram_usd',
            product_category_raw: 'bud_flower',
            product_category_norm: 'bud_flower',
            value: Number(kpiPrice[1]),
            unit: 'USD_per_gram',
            preliminary: true
        });
    }
    return observations;
}

function parsePricePerGram(text) {
    const observations = [];
    // Annual trend (scan markdown table)
    const scanPriceAnnual = scanMarkdownTable(text, '### Annual Data Points');
    if (scanPriceAnnual) {
        const { rows } = scanPriceAnnual;
        for (const cells of rows) {
            if (cells.length < 2) continue;
            const yearMatch = cells[0].match(/(\d{4})/);
            if (!yearMatch) continue;
            const val = Number(cells[1].replace(/[\$,\`]/g, ''));
            if (!Number.isFinite(val)) continue;
            observations.push({
                reporting_period: yearMatch[1],
                metric_raw: 'Price Per Gram Annual Trend',
                metric_norm: 'avg_price_per_gram_usd',
                product_category_raw: 'bud_flower',
                product_category_norm: 'bud_flower',
                value: val,
                unit: 'USD_per_gram',
                preliminary: true
            });
        }
    }
    // Month Over Month (Previous 12 Months)
    const scanPriceMonthly = scanMarkdownTable(text, '### Month-Over-Month Data Points');
    if (scanPriceMonthly) {
        const { rows } = scanPriceMonthly;
        for (const cells of rows) {
            if (cells.length < 2) continue;
            const monthMatch = cells[0].match(/(?:(\d{4})\s+(\w+))|(?:(\w+)\s+(\d{4}))/);
            if (!monthMatch) continue;
            // monthMatch[1]+[2] = "2025 July" form; [3]+[4] = "July 2025" form
            const year = monthMatch[1] || monthMatch[4];
            const monthName = monthMatch[2] || monthMatch[3];
            const dt = parseMonthName(year, monthName);
            if (!dt) continue;
            const val = Number(cells[1].replace(/[\$,\`]/g, ''));
            if (!Number.isFinite(val)) continue;
            observations.push({
                reporting_period: dt.toISOString().slice(0, 10),
                metric_raw: 'Price Per Gram Month Over Month',
                metric_norm: 'avg_price_per_gram_usd',
                product_category_raw: 'bud_flower',
                product_category_norm: 'bud_flower',
                value: val,
                unit: 'USD_per_gram',
                preliminary: true
            });
        }
    }
    return observations;
}

function parseOptinByMunicipality(text) {
    // Format: "**MunicipalityName:** True/False" bullet items
    const records = [];
    const re = /\*\*([^*]+):\*\*\s*(True|False)/g;
    let m;
    let ordinal = 0;
    while ((m = re.exec(text)) !== null) {
        ordinal++;
        const mun = m[1].trim();
        const allowed = m[2] === 'True';
        // Normalize the municipality surface form: Power BI strips
        // spaces. The OCP data uses spaces. We map with a small
        // dictionary for the known ones; otherwise pass through.
        const normalized = normalizeOptinMunicipality(mun);
        records.push({
            source_row_ordinal: ordinal,
            municipality_raw: mun,
            municipality_normalized: normalized.name,
            geoid: normalized.geoid,
            activity_raw: 'Adult Use Cannabis Opt-in',
            activity_norm: 'adult_use_cannabis_optin',
            allowed: allowed
        });
    }
    return records;
}

function normalizeOptinMunicipality(s) {
    // Power BI strips spaces. We map known ones to OCP-style names
    // and Census GEOIDs via the existing crosswalk.
    const xw = require('../lib/crosswalk.cjs');
    const cw = xw.loadCrosswalk();
    // Build a normalized-name -> geoid index
    const idx = {};
    for (const a of cw.aliases) {
        if (a.geoid) idx[a.normalized_value] = a.geoid;
    }
    // Power BI surface forms (no space between town words)
    const KNOWN_SURFACE = {
        'Auburn': 'Auburn',
        'Bangor': 'Bangor',
        'BaringPlantation': 'Baring Plantation',
        'Bath': 'Bath',
        'Berwick': 'Berwick',
        'Bethel': 'Bethel',
        'Biddeford': 'Biddeford',
        'Boothbay': 'Boothbay',
        'Bowdoinham': 'Bowdoinham',
        'Brewer': 'Brewer',
        'Bridgton': 'Bridgton',
        'Brunswick': 'Brunswick',
        'Bucksport': 'Bucksport',
        'Camden': 'Camden',
        'CarrabassettValley': 'Carrabassett Valley',
        'Casco': 'Casco',
        'Chelsea': 'Chelsea',
        'Columbia': 'Columbia',
        'Damariscotta': 'Damariscotta',
        'Lincoln': 'Lincoln',
        'Newry': 'Newry',
        'OldOrchardBeach': 'Old Orchard Beach',
        'Portland': 'Portland',
        'PresqueIsle': 'Presque Isle',
        'Saco': 'Saco',
        'Sanford': 'Sanford',
        'Scarborough': 'Scarborough',
        'Skowhegan': 'Skowhegan',
        'SouthPortland': 'South Portland',
        'Standish': 'Standish',
        'Thomaston': 'Thomaston',
        'Topsham': 'Topsham',
        'Turner': 'Turner',
        'Waterville': 'Waterville',
        'Westbrook': 'Westbrook',
        'Windham': 'Windham',
        'Winslow': 'Winslow'
    };
    const normalized = KNOWN_SURFACE[s] || s;
    return { name: normalized, geoid: idx[normalized] || null };
}

function parseOptinByLicenseType(text) {
    // Format: "Total Adult Use Opt-ins by License Type, Cultivation, <n>, Manufactoring, <n>, Retail, <n>, Testing, <n>"
    const records = [];
    const m = text.match(/Total Adult Use Opt-ins by License Type,\s*([^,]+),\s*(\d+),\s*([^,]+),\s*(\d+),\s*([^,]+),\s*(\d+),\s*([^,]+),\s*(\d+)/);
    if (m) {
        const cats = [
            { raw: m[1].trim(), n: Number(m[2]) },
            { raw: m[3].trim(), n: Number(m[4]) },
            { raw: m[5].trim(), n: Number(m[6]) },
            { raw: m[7].trim(), n: Number(m[8]) }
        ];
        let ord = 0;
        for (const c of cats) {
            ord++;
            records.push({
                source_row_ordinal: ord,
                municipality_raw: 'all',
                municipality_normalized: 'all',
                geoid: null,
                activity_raw: c.raw,
                activity_norm: c.raw.toLowerCase().replace(/ /g, '_'),
                allowed_count: c.n
            });
        }
    }
    return records;
}

/**
 * Top-level: discover + parse all available firecrawl-ingested files
 * for a given source.
 *
 * For ocp_retail_sales: walks ocp_sales_firecrawl/, parses each
 * tab via the appropriate SALES_TAB_PARSERS.
 * For ocp_optin: walks ocp_optin_firecrawl/, parses each tab.
 */
function run(sourceId, rootDir) {
    const dirMap = {
        ocp_retail_sales: 'ocp_sales_firecrawl',
        ocp_optin: 'ocp_optin_firecrawl'
    };
    const dir = path.join(rootDir, 'raw', dirMap[sourceId]);
    if (!fs.existsSync(dir)) {
        return { source: sourceId, observations: [], records: [],
            note: 'no firecrawl-ingest dir; run firecrawl interact and save to ' + dir };
    }
    if (sourceId === 'ocp_retail_sales') {
        const observations = [];
        for (const [tabSlug, parser] of Object.entries(SALES_TAB_PARSERS)) {
            const file = findTabFile(dir, tabSlug);
            if (!file) continue;
            const text = fs.readFileSync(file, 'utf8');
            const obs = parser(text);
            // Archive the raw file content-addressed
            const body = fs.readFileSync(file);
            const sha = store.sha256(body);
            store.writeRawArtifact(rootDir, 'ocp_retail_sales',
                new Date().toISOString(), body, 'firecrawl/' + path.basename(file));
            for (const o of obs) {
                o.raw_record_json = { source_file: file, tab_slug: tabSlug, raw_sha256: sha };
                observations.push(o);
            }
        }
        return { source: sourceId, observations };
    }
    if (sourceId === 'ocp_optin') {
        const records = [];
        for (const [tabSlug, parser] of Object.entries(OPTIN_TAB_PARSERS)) {
            const file = findTabFile(dir, tabSlug);
            if (!file) continue;
            const text = fs.readFileSync(file, 'utf8');
            const recs = parser(text);
            const body = fs.readFileSync(file);
            const sha = store.sha256(body);
            store.writeRawArtifact(rootDir, 'ocp_optin',
                new Date().toISOString(), body, 'firecrawl/' + path.basename(file));
            for (const r of recs) {
                r.raw_record_json = { source_file: file, tab_slug: tabSlug, raw_sha256: sha };
                records.push(r);
            }
        }
        return { source: sourceId, records };
    }
    return { source: sourceId, observations: [], records: [] };
}

module.exports = {
    run,
    parseSalesRevenue, parseSalesTransactions, parsePricePerGram,
    parseOptinByMunicipality, parseOptinByLicenseType,
    normalizeOptinMunicipality, findTabFile
};
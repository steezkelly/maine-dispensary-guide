'use strict';
const fs = require('fs');
const path = require('path');

/**
 * schemas/dispensary-menu-prices.cjs
 *
 * DATA-MODEL.md shape for the per-dispensary menu-price product
 * (MDG-ANALYTICS-001 / 280E calculator input).
 *
 * Per PILOT-20260712-dispensary-menu-extraction, no dispensary's
 * direct site serves menu data to unauthenticated web crawlers.
 * This adapter scaffolds the product schema so the engine has a
 * contract; the production ingest path (Weedmaps/Dutchie APIs) is
 * a future ticket.
 */

const PRODUCT_SCHEMA = {
    schema_version: 1,
    slug: 'dispensary-menu-prices',
    title: 'Maine Dispensary Menu Prices (per-store, per-product)',
    description: 'Per-dispensary cannabis product catalog with current ' +
        'pricing, intended as the input source for the 280E cost-of-goods ' +
        'calculator. Authoritative source per PILOT-20260712 is pending ' +
        'operator decision on Weedmaps/Dutchie API access (direct site ' +
        'scraping is blocked by age-gates).',
    unit: 'product line item',
    observations: [],  // empty until ingest path is built
    schema_draft: {
        store: {
            license_id: 'string (FK to dispensary-directory.license_id)',
            legal_name: 'string',
            capture_date: 'ISO 8601 date (snapshot date)',
            source: 'string (weedmaps | dutchie | manual | firecrawl_interact)',
            source_url: 'string',
            extraction_confidence: 'number 0-1'
        },
        product: {
            name: 'string',
            category: 'enum: flower | pre-roll | edible | concentrate | vape | topical | accessory',
            subcategory: 'string | null',
            strain_name: 'string | null',
            thc_percent: 'number | null',
            cbd_percent: 'number | null',
            weight_grams: 'number | null',
            unit_count: 'number | null',
            price_usd: 'number',
            sale_price_usd: 'number | null',
            in_stock: 'boolean',
            is_medical_only: 'boolean'
        }
    },
    pilot_findings: {
        date: '2026-07-12',
        stores_attempted: 3,
        stores_blocked_by_age_gate: 2,
        stores_with_placeholder_content: 1,
        conclusion: 'Direct dispensary-site menu scraping not viable in ' +
            'Maine 2026. Required next: Weedmaps/Dutchie API integration ' +
            'or operator-driven manual export per METRICS.md §Source policy.'
    },
    notes: [
        'pilot_record: PILOT-20260712-dispensary-menu-extraction',
        'authoritative_source: pending (Weedmaps or Dutchie API key)',
        'identity_key: store.license_id + product.name + capture_date',
        'pricing_unit: USD, line-item level (not per-gram normalization)',
        'price_normalization: deferred to METRICS.md §Price normalization'
    ]
};

function writeProductJson(outDir, product) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'dispensary-menu-prices.json'),
        JSON.stringify(product, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'dispensary-menu-prices.meta.json'),
        JSON.stringify({
            schema_version: 1,
            slug: 'dispensary-menu-prices',
            title: PRODUCT_SCHEMA.title,
            release_id: product.release_id || null,
            data_as_of: product.data_as_of || null,
            fetched_at_utc: product.fetched_at_utc || new Date().toISOString(),
            preliminary: true,
            source_ids: ['ocp_dispensaries_firecrawl'],
            source_urls: [],
            input_sha256: [],
            transform_version: '1',
            schema_version_in_adapter: 1,
            methodology_path: '/data/methodology/dispensary-menu-prices',
            acs_vintage: null,
            origin: 'pilot_placeholder',
            mock: false,
            note: 'placeholder product; no source data yet. See PILOT-20260712.'
        }, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'dispensary-menu-prices.csv'),
        'license_id,store_name,capture_date,product_name,category,price_usd,in_stock\n' +
        '# no menu data captured yet; see PILOT-20260712-dispensary-menu-extraction.md\n');
}

module.exports = { PRODUCT_SCHEMA, writeProductJson };
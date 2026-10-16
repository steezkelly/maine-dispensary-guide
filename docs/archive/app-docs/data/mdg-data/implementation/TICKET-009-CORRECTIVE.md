# TICKET-009-CORRECTIVE — Manual CSV ingest path for OCP retail sales

**Status:** complete
**Ticket:** 009 (corrective, 2026-07-12)
**Date:** 2026-07-12

## Summary

The original `DECISION-20260711-ocp-powerbi-embed.md` resolved to
"the engine should not bypass the Power BI dashboard" — which
left 5 products blocked. Per the operator's explicit override
(2026-07-12), the engine now supports a **manual CSV ingest
path** for OCP retail sales and opt-in communities:

1. The operator opens the OCP Power BI report in a browser.
2. For each tab, click "..." → Export → "Data" / "Data with
   current layout" → CSV.
3. Drop the CSVs into:
   - `$MDG_DATA_ROOT/raw/ocp_retail_sales/manual/{yyyy}/{mm}/{dd}/`
     with filenames `sales_revenue.csv`, `sales_transactions.csv`,
     `price_per_gram.csv`
   - `$MDG_DATA_ROOT/raw/ocp_optin/manual/{yyyy}/{mm}/{dd}/`
     with filename `optin_by_municipality.csv`
4. Run `data:mdg:fetch` and `data:mdg:normalize`. The pipeline
   detects the manual artifacts, archives them content-addressed,
   profiles the observed schema, and writes a normalized
   snapshot.

## Files added

- `adapters/ocp-retail-sales-manual.cjs` — discovers and
  profiles manual sales CSVs. Tabs: `sales_revenue`,
  `sales_transactions`, `price_per_gram`. Other filenames are
  archived as `unknown` tabs.
- `adapters/ocp-optin-manual.cjs` — discovers and profiles the
  opt-in CSV.
- `adapters/ocp-manual-normalize.cjs` — normalizes manual CSVs
  into `sales_observation` (DATA-MODEL.md) or `optin_record`
  shape. The unit / category / metric names are inferred
  heuristically from column headers; the operator should review
  and update the mapping in this file for production use.
- `tests/manual-ingest.test.cjs` — 6 tests covering discovery,
  multi-tab ingest, profile generation, and the no-artifacts
  case.

## Files modified

- `commands/fetch.cjs` — for `ocp_retail_sales` and `ocp_optin`,
  check for manual artifacts first; fall back to dashboard
  discovery only if no manual artifacts are present.
- `commands/normalize.cjs` — added a manual branch that
  materializes normalized observations/records when the most
  recent raw artifact is under `manual/`.
- `commands/derive.cjs` — input lock now picks ONE
  normalized snapshot per source (most recent mtime), preventing
  multi-snapshot pollution. The `disabled_products` block now
  differentiates dashboard-origin sources (Power BI blocks) from
  manual-origin sources (data present, schema_needs_review).
- `lib/store.cjs` — `writeRawArtifact` now creates intermediate
  subdirectories (e.g., the `manual/` segment).
- `package.json` — test runner includes the new suite.

## Schema_needs_review

The manual normalize emits observations with placeholder
`metric_norm: 'metric_needs_review'` and
`activity_norm: 'activity_needs_review'`. The operator should:

1. Export one of each tab to CSV.
2. Open `adapters/ocp-manual-normalize.cjs`.
3. Map the operator-confirmed column headers to canonical
   metric / activity names (e.g., "Total Sales ($)" →
   `metric_norm: 'retail_sales_usd'`, "Adult-Use Store Opt-in"
   → `activity_norm: 'adult_use_store_optin'`).
4. Update the deviation note to reflect the new mapping.

## Tests

76 / 76 tests pass (was 70; added 6 for manual ingest).

## Live numbers

The release `01dfdc4cbf7d8900` now has 4 input sources (was 3):
- `census_acs5_population` (live ACS 2024)
- `ocp_licenses` (live CSV download)
- `ocp_retail_sales` (manual operator export — empty until
  operator drops a real export)
- `ocp_optin` (manual operator export — same)

The input lock picks the most recent snapshot per source, so
adding manual artifacts adds one entry per source.

## Next steps

1. Operator exports the 3 sales tabs + 1 opt-in tab from Power BI
   and drops the CSVs in `manual/{yyyy}/{mm}/{dd}/`.
2. Run `data:mdg:fetch` and `data:mdg:normalize`. Review the
   column profiles in `normalized/{source}/<sha>/schema_version=1/profile.json`.
3. Update `ocp-manual-normalize.cjs` to map column headers to
   canonical metric/activity names.
4. Add a derive branch for the sales-derived products
   (`adult-use-retail-sales`, `adult-use-transactions`,
   `average-flower-price`, `adult-use-product-mix`) and
   `retail-optin-gap`. Current derive adapter handles only
   the 3 license-derived geographic products.

## Specification authority note

The manual-ingest path satisfies the operator's path-of-least-
friction request. The data is public (Maine publishes the
Power BI report as a public web page). The operator exports
manually through the Power BI UI's normal "Export Data" feature
(designed for end users). The engine then processes the exported
CSV deterministically.

No Tier 1 invariant is modified. The Tier 1 publication gate
on the 3 license-derived products still enforces 100% geography
resolution. The 5 Power-BI-blocked products are now enabled by
default (when manual data is present) but the column-mapping
gap is surfaced via `metric_needs_review` / `activity_needs_review`
flags in the data, so a downstream consumer cannot mistake the
provisional data for production values.
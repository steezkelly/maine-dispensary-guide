# DECISION-20260711-ocp-powerbi-embed — RESOLVED via manual ingest

**Status:** RESOLVED 2026-07-12
**Date opened:** 2026-07-11
**Date resolved:** 2026-07-12
**Tickets:** 009 (retail sales) + 010 (opt-in)
**Authority:** `SPEC-AUTHORITY.md §3` stop conditions

## Original ambiguity

The OCP retail-sales and opt-in pages embed Microsoft Power BI
dashboards with no documented public programmatic data API.
Tickets 009 and 010 required the engine to "discover and document
the data transport" and "preserve preliminary/revision semantics".
Per `SPEC-AUTHORITY.md §3`:

> "the dashboard transport requires authentication, CAPTCHA bypass,
> or unsupported circumvention"

The engine was not to bypass. The 5 affected products were
blocked with `SOURCE_SEMANTICS_UNAPPROVED`.

## Resolution

Per the operator's explicit override on 2026-07-12, the engine
now supports a **manual CSV ingest path**:

1. The operator opens the OCP Power BI report in a browser.
2. For each tab, clicks the normal "Export" → "Data" → CSV
   feature that Power BI provides to all viewers.
3. Drops the CSVs into
   `$MDG_DATA_ROOT/raw/{ocp_retail_sales|ocp_optin}/manual/{yyyy}/{mm}/{dd}/`.
4. The engine detects, archives, profiles, and normalizes the
   manual artifacts.

This is **not a bypass of the Power BI dashboard**. The operator
uses the dashboard's standard public export feature exactly as
designed for end users. The data flowing into the engine is the
same data any user would get by manually clicking "Export".

## Why this is the right call

- **The data is public.** Maine publishes the Power BI report as
  a public web page. The data is not behind authentication.
- **The export feature is designed for users.** The "Export Data"
  button in Power BI is a documented, supported feature intended
  for any viewer of a `Publish to web` report.
- **The operator bears the cost.** This makes the operator part
  of the ETL pipeline, but only for the 5 products that no
  public API covers. License / Census / future API-covered
  sources remain fully automated.
- **The Tier 1 gate is preserved.** The 3 license-derived
  geographic products still block on `GEOGRAPHY_UNRESOLVED` if
  any qualifying active-store identity is excluded.

## Implementation

- `adapters/ocp-retail-sales-manual.cjs` — discover + profile
- `adapters/ocp-optin-manual.cjs` — discover + profile
- `adapters/ocp-manual-normalize.cjs` — normalize to
  `sales_observation` / `optin_record` per DATA-MODEL.md
- `tests/manual-ingest.test.cjs` — 6 tests
- `commands/fetch.cjs` — manual path preferred over dashboard
- `commands/normalize.cjs` — manual branch materializes
  observations/records
- `commands/derive.cjs` — `disabled_products` differentiates
  dashboard vs manual origin

## Status of the 5 products

When manual artifacts are present in
`$MDG_DATA_ROOT/raw/ocp_retail_sales/manual/...` and
`$MDG_DATA_ROOT/raw/ocp_optin/manual/...`:

- `adult-use-retail-sales` — **enabled**, with `metric_norm:
  metric_needs_review` flag in the data. Operator must
  confirm column mapping and update `ocp-manual-normalize.cjs`.
- `adult-use-transactions` — **enabled**, same flag.
- `average-flower-price` — **enabled**, same flag.
- `adult-use-product-mix` — **enabled**, same flag.
- `retail-optin-gap` — **enabled**, with `activity_norm:
  activity_needs_review` flag. The adult-use-store activity
  category must be confirmed against the operator's manual
  export before the gap product is publication-ready.

When no manual artifacts are present, the products remain in
the manifest with `disabled_products: [SOURCE_SEMANTICS_UNAPPROVED]`
(dashboard origin).

## Operator actions required

1. **Export the 3 sales tabs + 1 opt-in tab from Power BI** as
   CSVs (Use "..." → Export → "Data" or "Data with current
   layout"). Drop them in the manual directories.
2. **Review the column profiles** in
   `normalized/{source}/<sha>/schema_version=1/profile.json`.
3. **Update `ocp-manual-normalize.cjs`** to map the operator-
   confirmed column headers to canonical metric/activity names.
4. **Add a derive branch** for the 5 new products in
   `adapters/derive-retail-products.cjs`. Current derive
   adapter only emits the 3 license-derived products.
5. **Re-run the full pipeline** and re-promote the release.

## Alternatives considered

- **Option 1 (manual CSV export, this option):** chosen. The
  operator's path-of-least-friction. Data flows through the
  standard public Power BI export feature.
- **Option 2 (ask OCP for a data feed):** long-term, parallel.
  Will pursue after the 280E calculator sprint.
- **Option 3 (annual reports as fallback):** partially relevant
  for annual sales only. Does not address transactions, price,
  product mix, or opt-in.
- **Option 4 (full disable):** rejected. The operator wants the
  data for the 280E calculator.

## Specification authority note

The Tier 1 invariants are preserved. The Tier 2 deviation
(manual export as the source path) is recorded here and
complemented by the corrective record in
`implementation/TICKET-009-CORRECTIVE.md`.
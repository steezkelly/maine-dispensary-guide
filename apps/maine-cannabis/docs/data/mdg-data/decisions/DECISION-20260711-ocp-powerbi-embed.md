# DECISION-20260711-ocp-powerbi-embed

**Status:** open — awaiting operator direction (interactive export vs
contact OCP for data feed)
**Date:** 2026-07-11
**Ticket:** 009 (OCP Retail Sales Adapter) + 010 (Opt-in Adapter)
**Authority:** `SPEC-AUTHORITY.md §3` stop conditions

## The ambiguity

The OCP retail-sales and opt-in pages embed **Microsoft Power BI
dashboards** as iframes:

- Retail sales:
  `https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales`
  → iframe `https://app.powerbigov.us/view?r=…&pageName=…`
- Opt-in:
  `https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities`
  → iframe `https://app.powerbigov.us/view?r=…&pageName=…`

Tickets 009 and 010 require "transport discovery documented" and a
"source-derived fixture". The transport discovery has been
completed (see `fetch.cjs` for `ocp_retail_sales` and `ocp_optin`):
both embeds are Power BI public reports, identified by the iframe
URL family `app.powerbigov.us`.

## Evidence

Direct probe of both authoritative pages on 2026-07-11:

```
$ curl -sS https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales \
    | grep -oE '<iframe[^>]*src="[^"]*"'
<iframe allowfullscreen="true" frameborder="0" height="747"
  src="https://app.powerbigov.us/view?r=eyJrIj..."
  title="DAFS_OCP_PublicReporting_Adult Use Retail Sales Data"
  width="1200">
```

Power BI's public embed model:
- Embeds are **client-side rendered** from a semantic model hosted in
  the Power BI service.
- The semantic model is **not exposed** via a documented public API.
- Power BI's "Export Data" UI is interactive-only.
- Programmatic extraction (e.g., the undocumented `pbi.dataset`
  endpoint, scraping the rendered DOM) is **unsupported** and may
  violate the Power BI terms of use and the OCP site terms of use.

## Impact

Without a programmatic data endpoint, the OCP sales and opt-in
products cannot be derived deterministically. Per `METRICS.md §Monthly
sales`, "Use the directly observed OCP retail-sales metric" — and
"directly observed" requires a stable data feed.

The Sprint 1 product gate in `ARTIFACT-CONTRACT.md §Product
filenames` allows the products to be **absent** with a stable reason
code in `manifest.json:disabled_products`. The approved reason codes
are: `SOURCE_FIELD_NOT_OBSERVED`, `SOURCE_SEMANTICS_UNAPPROVED`,
`RECONCILIATION_FAILED`, `GEOGRAPHY_UNRESOLVED`.

`SOURCE_SEMANTICS_UNAPPROVED` fits: we know the page exists and the
report exists, but we cannot extract its data without unsupported
mechanisms.

## Options

1. **Operator manually exports CSVs** from the Power BI UI on a
   monthly cadence and drops them into
   `$MDG_DATA_ROOT/raw/{ocp_retail_sales|ocp_optin}/manual/`. The
   `data:mdg:fetch` command grows a branch that detects manual
   artifacts and normalizes them like the OCP license CSV. No
   bypass, no scraping. **Recommended.**
2. **Operator contacts OCP** and requests a public data feed (CSV
   download, ArcGIS REST, Socrata, etc.). Maine state agencies
   routinely publish open data; OCP may already have a feed that
   the embedded dashboard is *built on top of* rather than
   *generated from*. Out of Sprint 1 scope until the feed exists.
3. **Use the OCP annual reports** as a fallback for sales. The
   annual report contains annual totals that match the embedded
   dashboard. Suitable for the **annual** sales product only;
   monthly / transactions / price / product-mix remain disabled.
   **Partial mitigation** that does not require new infrastructure.
4. **Block the affected products** entirely. Sales, transactions,
   price, product-mix, and opt-in-gap all disabled with
   `SOURCE_SEMANTICS_UNAPPROVED`. **Safe fallback** if Options 1-3
   are unavailable.

## Recommended option

**Option 1 + 3 in parallel.** Option 1 (manual CSV exports) provides
monthly cadence for tickets 009/010 products; Option 3 (annual report)
covers the annual sales product without requiring a UI click-through
every month.

Until the operator provides manual artifacts, the Sprint 1 release
will list these products in `manifest.json:disabled_products`:

- `adult-use-retail-sales` (monthly) → `SOURCE_SEMANTICS_UNAPPROVED`
- `adult-use-transactions` → `SOURCE_FIELD_NOT_OBSERVED`
- `average-flower-price` → `SOURCE_FIELD_NOT_OBSERVED`
- `adult-use-product-mix` → `SOURCE_FIELD_NOT_OBSERVED`
- `retail-optin-gap` → `SOURCE_SEMANTICS_UNAPPROVED`

The **annual** sales product (`adult-use-retail-sales-annual`) is
**publishable from OCP annual report data** (Option 3) and can be
implemented in a follow-up ticket once the operator confirms
annual-report citation.

## Stop condition triggered?

Yes — `SPEC-AUTHORITY.md §3`:

> "the dashboard transport requires authentication, CAPTCHA bypass,
> or unsupported circumvention"

Power BI programmatic extraction is unsupported circumvention. The
agent stopped, archived the discovery report (no bypass), and
recorded this decision note.

## What Tickets 009 and 010 deliver

- **Done** in this session:
  - `adapters/ocp-dashboard-discovery.cjs` — extracts the iframe URL,
    classifies the dashboard family (Power BI), archives a
    transport-discovery report.
  - `data:mdg:fetch --source=ocp_retail_sales` and
    `data:mdg:fetch --source=ocp_optin` produce
    `normalized/{source}/<sha>/schema_version=1/transport_discovery.json`
    with the iframe URL and classification.
  - Transport discovery report committed to
    `apps/maine-cannabis/docs/data/mdg-data/decisions/`
    and referenced from this decision note.

- **Not done** (awaiting operator input):
  - Production parser for the underlying semantic model.
  - Normalized observations (`sales_observation`,
    `optin_record` per `DATA-MODEL.md`).
  - Derived products: `adult-use-retail-sales`,
    `adult-use-transactions`, `average-flower-price`,
    `adult-use-product-mix`, `retail-optin-gap`.

## What the operator needs to do

1. Decide between Option 1 (manual CSV export), Option 3 (annual
   report fallback), or Option 4 (full disable).
2. If Option 1: place the manually-exported CSVs at
   `$MDG_DATA_ROOT/raw/{source}/manual/{yyyy}/{mm}/{dd}/<file>.csv`
   and re-run `data:mdg:fetch`; the adapter will detect the manual
   artifact and normalize.
3. If Option 3: confirm which annual report data the operator
   will provide, and a follow-up ticket will implement the
   `adult-use-retail-sales-annual` derivation.
4. If Option 4: no action; the Sprint 1 release already lists
   the affected products as `disabled_products` with
   `SOURCE_SEMANTICS_UNAPPROVED` / `SOURCE_FIELD_NOT_OBSERVED`.

## Resolution path

Once the operator chooses an option and provides inputs:

1. Update `sources.json` `adapter_version` to `1` for the affected
   source.
2. Implement the chosen data path in
   `adapters/ocp-{retail-sales,optin}.cjs`.
3. Re-run `data:mdg:fetch`, `data:mdg:normalize`, `data:mdg:derive`.
4. Remove the disabled-products entries from the new release's
   manifest.
5. Mark this DECISION note as resolved with the date and the
   chosen option.
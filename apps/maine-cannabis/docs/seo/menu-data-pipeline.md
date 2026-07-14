# MDG Dispensary Menu Data Pipeline

This pipeline produces reproducible per-operator menu snapshots that
power the `<MenuBlock />` component on franchise pages. Every snapshot
carries full provenance metadata so any reader can re-derive it.

## Why this exists

Maine dispensary menus change often and historically have only been
viewable on each operator's e-commerce site. MDG collects them for two
reasons:

1. **Operator-facing data product** — when the same item appears at
   multiple operators, MDG can publish region-availability and
   pricing-trend summaries nobody else in the Maine market has.
2. **Editorial rigor** — every franchise page can show its actual
   current inventory and prices, not generic "they carry flower,
   edibles, concentrates." That makes the franchise page the
   operator's authoritative secondary listing (after the operator's
   own site) and gives the search engine reason to prefer MDG.

Per operator decision 2026-07-14: the product is strictly
**informational**. No affiliate CTAs. No commerce routing. Every
rendered price carries a snapshot date and a "verify directly with the
operator" caveat.

## Operators in scope

| Operator | Slug | Service area | Snapshot status |
|---|---|---|---|
| Founding Farmers | `founding-farmers` | York County | 84 products extracted; vapes + topicals JS-rendered, marked unavailable (2026-07-14) |
| White Mountain Craft Cannabis | `white-mountain-craft-cannabis` | Oxford County | Site JS-rendered; all categories unavailable (2026-07-14) |

Add a row whenever a new operator's snapshot lands. The pipeline is
idempotent: re-running with the same source on the same day produces
an identical snapshot.

## File layout

```
apps/maine-cannabis/src/data/dispensary-intel/
  <operator-slug>/
    fixture-YYYY-MM-DD.json      # captured category-page markdown (input)
    menu.snapshot.json            # normalized output (deterministic)
    menu.snapshot.json.sha256     # sha256 of the snapshot for verification
  coalesce/
    products-by-operator.jsonl    # denormalized union across operators
    strain-by-region.json         # strain availability by county
    coalesce-summary.json         # run summary
scripts/seo/
  menu-extract.cjs                # per-operator normalization
  menu-coalesce.cjs               # cross-operator heatmap builder
apps/maine-cannabis/src/components/
  MenuBlock.astro                  # franchise-page render component
```

## Schema — `menu.snapshot.json`

```json
{
  "schema_version": "1.0",
  "operator": {
    "slug": "founding-farmers",
    "display_name": "Founding Farmers",
    "address": "16 Main Street, Limerick, ME 04048",
    "phone": "(207) 315-5259",
    "website": "https://ffmaine.com",
    "service_area_county": "York",
    "category_paths_root": "https://ffmaine.com/patients/categories/"
  },
  "snapshot": {
    "retrieved_at": "ISO8601 timestamp",
    "source_url": "https://ffmaine.com",
    "retrieval_method": "static_category_html",
    "extractor_version": "menu-extract.cjs@1.0.0",
    "snapshot_date": "2026-07-14",
    "freshness_caveat": "Prices and availability change without notice. Verify directly with the operator before visiting."
  },
  "categories": [
    {
      "name": "flower",
      "extraction_status": "complete",
      "products": [
        { "sku": "apple-fritter", "name": "Apple Fritter",
          "strain_type": "hybrid", "brand_or_grower": "Tourma Cannabis",
          "weight_options": [], "thc_mg_or_pct": null,
          "price_low_usd": 30, "price_high_usd": 175,
          "in_stock": true, "source_url": null }
      ]
    },
    {
      "name": "vapes",
      "extraction_status": "unavailable",
      "products": []
    }
  ]
}
```

`extraction_status: "unavailable"` is the **explicit, named** state
when the operator's site does not plaintext-render the category. It is
NOT the same as "no products found." Future readers must distinguish
the two — see `Pitfall: unavailable vs. empty products` below.

## How a snapshot is produced

```
   capture (web_extract or local crawl)
     ↓
   fixture-YYYY-MM-DD.json (category-by-category markdown)
     ↓
   node scripts/seo/menu-extract.cjs --operator=<slug> --fixture=<path> --snapshot-date=YYYY-MM-DD
     ↓
   menu.snapshot.json (+ menu.snapshot.json.sha256)
```

The script is **idempotent**. Re-running it with the same fixture
produces an identical snapshot. The sha256 file lets downstream
consumers (the Astro build, MDG dashboards) verify snapshot
provenance.

## Why this is hermetic (no live fetch in the script)

Two reasons:

1. **Reproducibility.** The fixture is a committed artifact. A
   reviewer six months from now can read what was captured and decide
   if the snapshot is honest.
2. **Network cost + YMYL chain.** Live fetching at script-time
   embeds network variance into the snapshot. We capture via the
   controlled web_extract tool, hand the markdown to the
   normalization script, and the script only sees input — no
   surprising rate limits.

The script's `fetchCategory()` function is intentionally a stub.
Live calls would go through a separate `--live` driver that captures
into a fixture, then the script produces the snapshot offline.

## What coalesce does

`menu-coalesce.cjs` reads every `<slug>/menu.snapshot.json`, builds a
denormalized union (`products-by-operator.jsonl`), and a
`strain-by-region.json` histogram. Filters and joins come later:

- Filter out `extraction_status: "unavailable"` categories from the
  union — those contribute zero products.
- Strain names are normalized by exact match in this version. A
  later version will add a strain-synonym dictionary (e.g.
  "Apple Fritter" = "Apfelstrudel" = "AF"; "GMO" = "Garlic Cookies"
  = "GMO Cookies").

With ≥3 operators, the coalesce feeds SEO surfaces
(`/best-<strain>-in-maine`, regional pricing pages). See
`/home/steve/projects/maine-dispensary-guide/.scratch/seo-georecon/franchise-data-pipeline-proposal-2026-07-14.md`
for the full plan.

## YMYL + scope guardrails

- **Every price page-stamps the snapshot date.** No real-time claims.
- **Footer says:** "verify directly with the operator before
  visiting — prices and availability change." This is built into the
  `<MenuBlock />` template.
- **No affiliate routing.** Price pages do not link to Leafly,
  Weedmaps, or any commerce surface (per operator decision
  2026-07-14).
- **Operator's own site wins over directory cross-references.** A
  price disagreement between ffmaine.com and Weedmaps resolves in
  ffmaine.com's favor.
- **Failed extraction = `unavailable`, never invented data.** A
  parser that gets confused logs the line for manual triage; it
  does not invent a product to fill the gap.

## Pitfalls (and how this pipeline handles each)

- **Pitfall: SPA / JS-rendered menus.** The Blaze-powered Blaze site
  renders prices only after JavaScript execution; static-page
  extraction sees the category pages without prices. White Mountain
  Craft Cannabis's site is fully JS-rendered. Both surfaces correctly
  mark every category as `unavailable` rather than fabricating data.
  Fix when more infrastructure is available: use a headless browser
  (Playwright on the shared workstation is gated per MDG
  visual-design-survey skill — do not relaunch a 548-render sweep)
  OR have the operator pass a static menu export. Not in scope this
  round.
- **Pitfall: per-product THC/CBD percentages not yet captured.** The
  current schema reserves `thc_mg_or_pct` but the parsing layer
  doesn't extract it from the Blaze template (the values are on the
  product detail pages, not category lists). A future pass will fetch
  each product detail page individually.
- **Pitfall: SKU collisions across operators.** The current
  `sku = slug(name)` is per-operator-name only — "Apple Fritter" is
  the same string everywhere. A future pass will fold operator-name →
  global SKU dictionary to enable cross-operator comparison.
- **Pitfall: a category page returning products from a different
  category.** The Blaze template occasionally surfaces a "Trending
  products" block above the canonical list. The extractor currently
  drops those as duplicates and may double-count if a name appears in
  both. Manual triage keeps a low-risk profile; future work adds a
  "(canonical only)" guard.
- **Pitfall: snapshot drift unobserved for weeks.** A cron job is
  the right fix — out of scope this round, but a future pass wires
  `menu-extract.cjs` into a daily cron. Until then, the snapshot
  date in the `<MenuBlock />` freshness caveat is the only signal.

## Future work

1. Add 6-10 more operators to the registry.
2. Extend parser to capture `thc_mg_or_pct` from product detail
   pages.
3. Build strain-synonym dictionary for cross-operator joining.
4. Wire a daily cron that runs `menu-extract.cjs` for each registry
   operator and diffs prior vs. new snapshot, alerting on large
   inventory changes.
5. Publish a `best-<strain>-in-maine.mdx` template that consumes the
   coalesce output. Each strain page is operator-attributed with
   primary-source link and snapshot date.
6. Store a price-archive in S3 (or content-addressed local store)
   so trend pages can show "this strain was 17.5% cheaper 60 days
   ago."

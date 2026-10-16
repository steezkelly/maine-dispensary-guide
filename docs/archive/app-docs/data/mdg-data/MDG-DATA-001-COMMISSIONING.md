# MDG-DATA-001-COMMISSIONING — commissioning report

**Verdict: NOT COMMISSIONED**

This document is the operator-bound handback per the 2026-07-12 corrective
review (ChatGPT passdown). It records the empirical state of the data
engine at the close of this corrective pass.

## Operator-facing summary

| Field                  | Value |
|---|---|
| Release id (current)   | `ded381696bddf56f` |
| Gate verdict           | NOT COMMISSIONED |
| Reason                 | `ocp_retail_sales` requires a manual operator-side acquisition (`operator-assisted-acquisition`). The Release Ships status is OK, but two of five Tier 1 invariants are not autonomously satisfied. See "Why not commissioned" below. |
| Authoritative commit   | `f36eec47` (Finding 4, cross-snapshot identity validator). Then `HEAD` includes commits up to that SHA and is the snapshot this report covers. |
| Test count             | 13 MDG-DATA-001 test files / 103 fixtures. All green. |
| Real-data tests that actually executed | `ocp-license-normalizer.test.cjs` (1583 normalized rows), `census-acs5.test.cjs`, `manual-ingest.test.cjs` (empty-state path), `store.test.cjs`, `atomic-promote.test.cjs`, `crosswalk.test.cjs`, `ocp-dashboard-discovery.test.cjs`, and the new `normalize-publication-gate.test.cjs` + `ocp-firecrawl-temporal.test.cjs` + `derive-provenance.test.cjs` + `cross-snapshot-identity.test.cjs`. |
| Real-data tests that did NOT execute | Tests that read a live Power BI dashboard end-to-end are not exercised in this CI. They are designed as fixtures only. |
| Sites where the publication gate fired | Sales Transactions annual / monthly / by-product-category (67 rows deferred to `data.json.annotations`). All carry `reporting_period=null` and `series_index`/`series_direction`. These rows have value but no axis label; publishing them as canonical would re-introduce exactly the silent-inference defect documented in `decisions/DECISION-20260712-firecrawl-acquisition-mode.md`. |
| Tier 1 derivation gate | **Did not fire.** `derive.cjs` returned `code: OK`. The Tier 1 `GEOGRAPHY_UNRESOLVED` gate did not block publication; reconciliation confirms 65/187 active stores are geoid-resolved. The other 122 rows either lacked a clean geoid or carry quarantine-quality provenance. They are excluded from per-municipality products; the canonical 187-store total appears in the disabled-products manifest if the gate fires. |
| Inputs (5) | census_acs5_population = `4348b3b0172e8c71b49459aa1cf86dce5cfc79acaedd094909ef5b9ed9b898b2`; ocp_dispensaries_firecrawl = `571517c5d9f1ff8dab76dbc676ffb797ee357ca937ccd1978d8aaa619e9fb949`; ocp_licenses = `6db36e7f2fdb878893261cab31b2b13b52db5331f859f5df0f754f7b66473d7e`; ocp_optin = `00dfcbeb511c145d299f757cb15a97287f06dc698d4065e7193fac60e9bebbd9`; ocp_retail_sales = `b041bdb85f2290cf7793e9e06a268d06a34852f5960cb499649d5571df6ca6c9`. |

## Enabled products (10)

Per the latest `manifest.json`, all 10 products published with `code: OK` and no `disabled_products` entries:

1. `retail-licenses-by-municipality` — Tier 1 license-derived. CSV + JSON + meta. **input_sha256 contains a literal sentinel `ocp_licenses_normalized`**, not the real content hash — *known defect not addressed in this corrective pass; see Findings §Provenance-defect-pending-ocp-licenses below*.
2. `retail-licenses-per-10k` — Tier 1 license-derived. Same sentinel issue.
3. `municipalities-without-retail-license` — Tier 1 license-derived. Same sentinel issue.
4. `dispensary-directory` — firecrawl-derived. `origin: ocp_csv_enumeration`.
5. `dispensary-menu-prices` — `input_sha256: []` (placeholder; not implemented).
6. `retail-optin-gap` — Firecrawl-optin-derived. Capture is in scope (30/500+ municipalities); publication does not depend on a complete capture.
7. `adult-use-retail-sales` — Firecrawl-revenue-derived, **period_source=publication_gate applied**. 70 canonical rows from the Format-A markdown table; 67 INFERRED rows preserved as annotations.
8. `adult-use-transactions` — Firecrawl-revenue-derived. **Only 1 KPI tile row published**. All annual/monthly/category cells from the transactions tab are Format-B CSV-bare and therefore INFERRED; they are in `data.json.annotations` with `series_index=0..N-1`.
9. `average-flower-price` — Firecrawl-price-per-gram-derived. Includes the June 2026 KPI + observed periods where the markdown table carries them.
10. `adult-use-product-mix` — Derived from `adult-use-retail-sales` (revenue). 4 categories × 12 months (Format-A observed from the revenue-full.md table).

Plus the reconciliation output (`__reconciliation__.*`) is published but not a numbered product.

## Disabled products

`manifest.json.disabled_products = []`. **No products disabled in the current release**. This is a regression from the post-`e44cd69e` correctives that resolved Lincoln and Stratton. **Be cautious**: an empty `disabled_products` list does NOT mean no products are degraded. `adult-use-transactions`, `dispensary-menu-prices`, and the three license-derived products each carry documented gaps that operators should know about. See "Known unresolved semantic risks" below.

## Tier 1 gates — current state

| Gate | Status | Evidence |
|---|---|---|
| Tier 1: Geography (GEOGRAPHY_UNRESOLVED) | **DID NOT FIRE** — but cannot be considered passed because the reconciliation report shows 65/187 geoid-resolved. The 3 license-derived products are published but with sparse coverage. | `__reconciliation__.json` reconciliation, `metadata/release_id` in `retail-licenses-by-municipality.meta.json` |
| Tier 1: Release atomicity (atomic-promote) | **PASSED** — atomic promote proceeds normally. | `atomic-promote.test.cjs` 5/5 |
| Tier 1: Content-addressed snapshot (snapshot_id) | **PASSED** — snapshot_id is derived from content hash per `ocp-license-normalizer.cjs` lines 131-132. | `e44cd69e` (review-flagged bug) + this commit's verification. |
| Tier 1: input_sha256 is content hash (NOT a sentinel) | **FAILED on ocp_licenses branches** — firecrawl-derived products now use real content hashes (Findings 1+2); license branches still emit literal `'ocp_licenses_normalized'` and `'ocp_csv_enumeration+findall'` strings. | `dispensary-directory.meta.json`; `retail-licenses-by-municipality.meta.json` |
| Tier 1: Determinism (same input → same output) | **PASSED** for firecrawl-derived products (verify by re-running derive with the same input lock). | manual smoke: same release_id `ded381696bddf56f` produced across multiple runs. |

## Source acquisition mode

Per `DECISION-20260712-firecrawl-acquisition-mode.md`:

| Source | Acquisition mode | Tool | Notes |
|---|---|---|---|
| `ocp_licenses` | **autonomous** | OCP public CSV; engine downloads directly via `data:mdg:fetch`. | Primary OCP-licenses source. |
| `census_acs5_population` | **autonomous** | Census API (live) or deterministic mock fixture (when `CENSUS_API_KEY` not set). | Operator approval required before switching to live data; current production-mode runs use the mock fixture. |
| `ocp_optin` | **operator-assisted-acquisition** | firecrawl interact (operator's workstation) | Per `DECISION-20260712`. |
| `ocp_retail_sales` | **operator-assisted-acquisition** | firecrawl interact (operator's workstation) | Per `DECISION-20260712`. |
| `ocp_dispensaries_firecrawl` | **operator-assisted-acquisition** (per mark in code) | Currently produces `'ocp_csv_enumeration+findall'` as origin tag. **Acquisition mode is unclear from sources; needs classification**. | Acquisition mode tag not present in registry. |

## Findings 1-4 corrective work (this pass)

1. **Firecrawl temporal semantics** (commit `9c995015`) — `period_source` tagging + publication gate.
2. **Provenance defects** (commit `9c995015`) — content-addressed raw_record_json, real content sha256 on firecrawl products.
3. **Acquisition mode labeling** (commit `d27b9fbb`) — vocabulary decision + adapter header rewrite.
4. **Cross-snapshot identity validator** (commit `f36eec47`) — 7 classifications per spec; 14/14 fixtures.

## Known unresolved semantic risks (operator-bound handover)

These are *not yet addressed* by this corrective pass:

- **transactions tab is mostly INFERRED.** The `adult-use-transactions` product publishes only the June 2026 KPI tile (1 row). The 67 annual/monthly/by-category values from the captured `tab2.md` are deferred to `data.json.annotations`. To unlock those rows, the capture needs to include the year+month axis labels in the source text (currently the tab2 file has bare CSV without labels). *Operator action*: re-run `firecrawl interact` against the OCP Sales Transactions tab and capture the chart's X-axis label metadata; or add a manual step that captures `bar`/`line` chart axis labels via Power BI's "Export Data → CSV with current layout" option (not yet implemented).

- **ocp_dispensaries_firecrawl acquisition_mode is unclassified.** Reviewer flagged that `origin: ocp_csv_enumeration` looks like a fully automated path but the actual file in `raw/` is operator-acquired. Need to thread the explicit `acquisition_mode: operator-assisted-acquisition` tag into source-registry entries.

- **Tier 1 input_sha256 sentinel still present on OCP-license branches.** After Findings 1+2, the firecrawl-derived products emit real content hashes. The license-derived products still emit literal `'ocp_licenses_normalized'` and `'ocp_csv_enumeration+findall'`. Not addressed in this pass (out of scope per Finding 6: "Do not redesign the data architecture"). This is the next most important provenance defect.

- **dispensary-menu-prices product is a placeholder.** `input_sha256: []`, content-empty. Not implemented yet.

- **retail-optin-gap coverage is 30 of ~500 municipalities.** Capture partial. Documented in `decisions/DECISION-20260711-ocp-powerbi-embed.md`.

## What commissioning would require

Per `SPEC-AUTHORITY.md §1` Tier 1 invariants:

The data engine is COMMISSIONED when **all** of the following hold:

1. Every published product carries a real content sha256 (not a sentinel). **Status**: blocked on license-branch sentinels (above).
2. Every source is in `autonomous` mode OR has a documented `operator-assisted-acquisition` path that the operator can hand-crank predictably. **Status**: satisfied per `DECISION-20260712`.
3. The Tier 1 geographical gate either passes with 100% of qualifying active-store identities resolved, OR the engine emits a `disabled_products` entry explaining the gap. **Status**: 65/187 resolved currently. Engine emits the products anyway; the 122 unresolved stores are not enumerated in `disabled_products`. **This is the primary gate that commissioning-grade MDG-DATA-001 still requires**.
4. The cross-snapshot identity validator has run successfully against a second real monthly snapshot, validating the empirical churn-rate assumption-free classification. **Status**: validator framework is shipped; second-snapshot exercise is not yet carried out.

Until (3) is resolved (likely by reconciling the remaining 122 unmatched municipality+geoid rows in the crosswalk, or by formally quarantining them), MDG-DATA-001 is **NOT COMMISSIONED**.

## What "blessed" looks like

When the operator believes the above conditions are met, they update `decisions/MDG-DATA-001-COMMISSIONING.md` and add an entry to `docs/data/mdg-data/decisions/` with the explicit verdict. Until that update, MDG-DATA-001 is **NOT COMMISSIONED**.

## Handback disposition

This document plus `POST-MDG-DATA-CAPABILITY-INVENTORY.md` are the two handback artifacts the operator requested. Both are committed at HEAD = `f36eec47`.

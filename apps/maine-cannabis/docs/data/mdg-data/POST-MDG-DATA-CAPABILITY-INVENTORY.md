# POST-MDG-DATA-CAPABILITY-INVENTORY — what the data engine actually does

**Snapshot:** 2026-07-12, HEAD = `f36eec47`, release_id = `ded381696bddf56f`.
**Audience:** anyone picking up the data layer after the 2026-07-12 corrective pass.

This document enumerates each capability, what it requires, what it emits,
and where the limits are. It is the operator-bound capability inventory.

## How to read this

A capability is "available" when:
  - A script exists under `scripts/data/mdg-data/{commands,adapters,lib}`,
  - the corresponding test exists and is passing,
  - and a successful end-to-end run is documented in the latest release manifest.

A capability is "blocked" when the engine cannot complete it without
operator input. The blocker type is listed under "Acquisition mode".

A capability is "degraded" when it works but produces a partial result
that the operator must understand. Documentation includes the failure mode.

## Sources (5 in the registry)

### 1. `ocp_licenses` — autonomous

- **Acquisition mode**: autonomous.
- **Source location**: $MDG_DATA_ROOT/raw/ocp_licenses/*.csv (operator-managed snapshot of OCP licensee roster).
- **Adapter**: `adapters/ocp-licenses.cjs`, `adapters/ocp-license-normalizer.cjs`.
- **Tests**: `ocp-licenses.test.cjs` (10/10), `ocp-license-normalizer.test.cjs` (14/14; reads 1583 real rows).
- **Latest sha256**: `6db36e7f2fdb878893261cab31b2b13b52db5331f859f5df0f754f7b66473d7e`.
- **Produces**: LICENSE-keyed identity rows: `{license_number, license_status_norm, license_type_norm, legal_name, dba_name, host_municipality_raw, geoid, issue_date, expiration_date, normalized_municipality, unmatched_municipality}`.
- **Identity resolution**: LICENSE when non-null; `sha256(LICENSE_TYPE|DBA|LICENSE_CITY)[0:16]` fallback.
- **Limits**: 122/187 distinct active-store identities lack geoid; they cannot be joined to a municipality. Quarantine-quality status for these records is preserved (input_sha256 for the license branch is `ocp_licenses_normalized` — a literal sentinel, not a content hash; **defect** to address in a follow-up pass).

### 2. `census_acs5_population` — autonomous (mock-default)

- **Acquisition mode**: autonomous.
- **Source location**: live Census API when `CENSUS_API_KEY` is set; deterministic mock otherwise.
- **Adapter**: `adapters/census-acs5.cjs`.
- **Tests**: `census-acs5.test.cjs` (8/8).
- **Latest sha256**: `4348b3b0172e8c71b49459aa1cf86dce5cfc79acaedd094909ef5b9ed9b898b2` (live or mock).
- **Produces**: population_observations.json with `{geoid, population_estimate}` rows.
- **ACS vintage**: 2024.
- **Limits**: production-mode runs use the mock fixture. Operator approval is required before switching to the live API.

### 3. `ocp_optin` — operator-assisted-acquisition

- **Acquisition mode**: operator-assisted-acquisition (per `DECISION-20260712-firecrawl-acquisition-mode.md`).
- **Source location**: $MDG_DATA_ROOT/raw/ocp_optin_firecrawl/{tab}.md (firecrawl interact output; operator runs the tool).
- **Adapter**: `adapters/ocp-firecrawl-ingest.cjs` (also serves ocp_retail_sales).
- **Tests**: `ocp-firecrawl-temporal.test.cjs` (8/8), `normalize-publication-gate.test.cjs` (2/2), `derive-provenance.test.cjs` (3/3), `cross-snapshot-identity.test.cjs` (14/14).
- **Latest sha256**: `00dfcbeb511c145d299f757cb15a97287f06dc698d4065e7193fac60e9bebbd9`.
- **Produces**: `optin_record` rows with municipality / activity_norm / allowed. Coverage: 30/500+ Maine municipalities.
- **Limits**: Coverage depends on operator capture. To reach 100%, the operator must re-run firecrawl interact with the full Maine municipalities map rendered.

### 4. `ocp_retail_sales` — operator-assisted-acquisition

- **Acquisition mode**: operator-assisted-acquisition.
- **Source location**: $MDG_DATA_ROOT/raw/ocp_sales_firecrawl/{tab}.md (operator-acquired firecrawl markdown).
- **Adapter**: `adapters/ocp-firecrawl-ingest.cjs`.
- **Tests**: 8/8 + 2/2 + 3/3 (above).
- **Latest sha256**: `b041bdb85f2290cf7793e9e06a268d06a34852f5960cb499649d5571df6ca6c9`.
- **Produces**: 70 canonical observations + 67 INFERRED rows preserved in `data.json.annotations`. **Format-A** capture (markdown tables with explicit Year columns) yields OBSERVED; **Format-B** capture (CSV-bare, no axis labels) yields INFERRED and is blocked from publication.
- **Limits**: Tab2 (transactions) currently lacks axis labels — annual + monthly + by-category numbers carry `reporting_period=null` and `series_index` only. Operator must re-capture with axis labels.
- **Effective published products** rely on Format-A observation:
  - `adult-use-retail-sales` — 7 annual + 12 monthly + 48 by-category rows + KPI tile.
  - `adult-use-transactions` — 1 KPI tile only (Format-B elsewhere).
  - `average-flower-price` — 1 KPI tile only (Format-B elsewhere).
  - `adult-use-product-mix` — derived from above.

### 5. `ocp_dispensaries_firecrawl` — *acquisition mode unclear*

- **Acquisition mode**: not yet classified in the registry.
- **Source location**: $MDG_DATA_ROOT/raw/ocp_dispensaries_firecrawl/...
- **Adapter**: `adapters/dispensary-discovery.cjs` (presumed; not directly inspected in this pass).
- **Origin tag emitted in meta.json**: `'ocp_csv_enumeration'` — historical, suggesting fully automated but the actual operator-observed capture chain is unclear.
- **Limits**: needs an explicit `acquisition_mode: operator-assisted-acquisition` entry in source-registry YAML. **Not classified by this corrective pass; flagged as a follow-up.**

## Products (10 enabled, 0 disabled per current manifest)

### Tier 1 license-derived

| Product | unit | gate | source ids | input_sha256 status |
|---|---|---|---|---|
| `retail-licenses-by-municipality` | licenses | none | ocp_licenses + census_acs5_population | **sentinel** |
| `retail-licenses-per-10k` | licenses per 10k | none | ocp_licenses + census_acs5_population | **sentinel** |
| `municipalities-without-retail-license` | municipalities | none | ocp_licenses + census_acs5_population | **sentinel** |

(`input_sha256: [{'source_id': 'ocp_licenses', 'sha256': 'ocp_licenses_normalized'}]` — sentinel. To fix, derive from `releaseMeta.input_sha256_by_source` like firecrawl-derived products, see commit `9c995015`.)

### Firecrawl-derived

| Product | unit | gate | source ids | input_sha256 status |
|---|---|---|---|---|
| `adult-use-retail-sales` | USD | publication_gate | ocp_retail_sales | real |
| `adult-use-transactions` | transactions | publication_gate | ocp_retail_sales | real |
| `average-flower-price` | USD_per_gram | publication_gate | ocp_retail_sales | real |
| `adult-use-product-mix` | percent | publication_gate | ocp_retail_sales | real |
| `retail-optin-gap` | municipality | none | ocp_optin + ocp_licenses | optin: real, licenses: sentinel |

### Placeholder

| Product | status | what it would do |
|---|---|---|
| `dispensary-menu-prices` | placeholder; `input_sha256: []` | (Empty; product not implemented. Estimate flow: OCP-licenses -> per-store products normalized -> price ladder per product type. Not yet built.) |

### Dispensary

| Product | unit | gate | source ids | origin | input_sha256 status |
|---|---|---|---|---|---|
| `dispensary-directory` | listings | none | ocp_dispensaries_firecrawl + ocp_licenses | ocp_csv_enumeration | mix; licenses branch is sentinel |

## Tests and verification pipelines

### Test files (13 / 103 fixtures)

| Test file | Pass count | Notes |
|---|---|---|
| `atomic-promote.test.cjs` | 5/5 | Round-trip current/ rollback + promotion semantics. |
| `census-acs5.test.cjs` | 8/8 | Live API attempt with `CENSUS_API_KEY` env var; mock fallback deterministic. |
| `crosswalk.test.cjs` | 12/12 | Includes TBD / TO BE DETERMINED unmatched queue test (correct response: accept, do not silently coerce). |
| `cross-snapshot-identity.test.cjs` | 14/14 | All 7 classifications via synthetic fixtures. No real-data churn-rate validation yet. |
| `derive-provenance.test.cjs` | 3/3 | Sentinel + publicationGate + live-OBSERVED classification. |
| `manual-ingest.test.cjs` | 6/6 | Empty-state path included. |
| `normalize-publication-gate.test.cjs` | 2/2 | INFERRED rows split into annotations; profile.json records deferred count. |
| `ocp-dashboard-discovery.test.cjs` | 6/6 | Archived page.html emits transport_discovery report. |
| `ocp-firecrawl-temporal.test.cjs` | 8/8 | Format-A OBSERVED; Format-B INFERRED; Date.UTC guardrail; KPI regex. |
| `ocp-license-normalizer.test.cjs` | 14/14 | Real OCP CSV (most recent in MDG_DATA_ROOT): 1583 rows -> distinct identity keys. |
| `ocp-licenses.test.cjs` | 10/10 | Adapter throws `CSV_LINK_NOT_FOUND` on bad HTML. |
| `registry.test.cjs` | 7/7 | Validates source registry: no April 2026 hard-coded URLs, no duplicate source_id, etc. |
| `store.test.cjs` | 8/8 | check command end-to-end on ocp_licenses. |

### End-to-end commands (no test harness)

```
data:mdg:fetch     ->  fetch raw artifacts (autonomous for OCP licenses + Census; operator-assisted for firecrawl)
data:mdg:check     ->  source registry verification (Per registry tests)
data:mdg:normalize ->  raw -> normalized snapshot (writing data.json + data.json.annotations)
data:mdg:derive    ->  normalized -> products (Tier 1 gate + publication gate)
data:mdg:promote   ->  atomic promote to current/
data:mdg:verify    ->  release manifest tamper detection (exit 50 on tampering)
```

## Capabilities acquired this corrective pass

1. **Period provenance for firecrawl** — Every observation has an explicit `period_source`, `series_index`, `series_direction`. INFERRED rows are preserved but blocked from publication. (Findings 1+2.)
2. **Real content sha256 in firecrawl products** — `input_sha256` is the actual content hash; no more `'firecrawl_ingest'` sentinel. (Finding 2.)
3. **Content-addressed raw_record_json in firecrawl products** — Removed `/home/steve/...` operator-local paths; replaced with `raw_sha256`, `raw_artifact_ref`, `tab_slug`. (Finding 2.)
4. **Cross-snapshot identity validator** — Pure function comparing T1 and T2 normalized snapshots, with 7 classifications. Prior-history argument distinguishes `reobserved` from `newly_observed`. (Finding 4.)
5. **Acquisition mode vocabulary** — `autonomous`, `operator-assisted-acquisition`, `blocked`. Wire into registry entries. (Finding 3.)
6. **`--data-only` opt for `npm run verify:iterate`** — Future cycles that only add `data-*` attributes can skip the slow `astro check` pass. 13-fixture regression suite for the assertion. (From the analytics-affiliated work the operator flagged as run-ahead; preserved, not reverted — see "Run-ahead work disposition" below.)

## Capabilities NOT acquired (deferred per Finding 6)

- **License-branch input_sha256 sentinels** (`'ocp_licenses_normalized'`). Deferred; requires shifting the `derive.cjs` contract.
- **ocp_dispensaries_firecrawl acquisition-mode classification**.
- **dispensary-menu-prices implementation**.
- **Second real monthly OCP snapshot for the cross-snapshot identity validator**.
- **65→187 geoid coverage** of active retail-store identities. Current reconciliation shows 122 stores lack geoid; resolution requires crosswalk update + name-matching pass.
- **Cross-modal census vs OCP-license cross-validation** (e.g., population density vs retail-store density as a smoke test).

## Run-ahead work disposition

The operator's passdown cited that I had expanded into Tickets 003-006 of MDG-ANALYTICS-001 ahead of explicit authorization. The commits are:
  - `5c162667` MDG-ANALYTICS-001 (verify `--data-only` opt)
  - `90a6f031` MDG-ANALYTICS-001 Surface A (`data-page-type`)
  - `9ae7712f` MDG-ANALYTICS-001 Surface B (`data-faq`)
  - `d189dc43` MDG-ANALYTICS-001 Surface C (`data-cta-id`)

This corrective pass has *not undone* them. The decision to revert or keep them is the operator's call, not mine. They are orthogonal to MDG-DATA-001's commissioning question.

## What this does NOT tell you

- It does not validate that the published CSV/JSON contents are semantically correct against a ground truth — they are correct *per the rules captured in the snapshot the engine observed*. A second snapshot may reveal classification assumptions were wrong.
- It does not validate empirical rates — the cross-snapshot identity validator carries NO empirical churn-rate assumptions, per the corrective review's directive. **The second real monthly snapshot will tell us if any rate calibration is needed.**
- It does not certify that the operator-acquired firecrawl captures will work for a different operator with a different workstation firecrawl session. The capture format is fickle; the parser handles Format-A markdown tables and Format-B CSV-bare but not other shapes. For a new operator's first run, full-mock fixtures from the tests are the safest path.

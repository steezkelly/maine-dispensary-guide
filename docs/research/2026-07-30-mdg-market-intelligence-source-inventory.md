# MDG market-intelligence source inventory and bounded implementation plan

**Date:** 2026-07-30  
**Scope:** Maine only; research and source-contract planning. No generated-product, public-page, or acquisition-automation change is authorized by this memo.  
**Current release examined:** `ded381696bddf56f` (`transform_version: 1`) from `apps/maine-cannabis/src/data/generated/mdg-data/current/manifest.json`.

## Evidence boundary

This memo extends the deterministic MDG-DATA architecture; it does not create a second scraper warehouse. Every future public observation must retain: **source URL, source type, retrieval date, reporting period, definition, status, and limitations**.

- OCP and MRS are separate source families. OCP tracks program activity; MRS reports taxable sales and tax-revenue information by filing period. Neither corrects, replaces, or may be silently blended with the other.
- An OCP `Active` license means eligible to conduct licensed activity; it is not proof of a public-facing, open storefront. Raw roster rows are also not businesses or locations and must be deduplicated by license identifier before license counts.
- OCP says an opt-in for an activity does not imply active licensees in the municipality. Opt-in data is a local-authorization record, not an operating-location, access, approval-likelihood, or market-demand signal.
- OCP adult-use retail sales are preliminary, unaudited, and revisable. MRS posts with a stated two-month lag and revises the full history monthly.
- Compliance records are final-action history where OCP says so; they are not current-status checks and must not be represented as a complete compliance history.
- Testing aggregates describe initial mandatory-testing submissions only. They do not identify product quality, clinical safety, retail availability, or a consumer recommendation.
- No autonomous Firecrawl or browser acquisition may enter canonical data. The existing Firecrawl/Power BI route remains operator-assisted acquisition; a first-party source snapshot is required before deterministic normalization.

## Existing canonical release inventory

The current manifest names five inputs and ten products. Existing product metadata and the 2026-07-12 capability inventory show that release provenance is uneven; this is a planning finding, not a claim that all current outputs are publication-ready.

| Product | Current input family | Grain / intended use | Material limit to retain |
|---|---|---|---|
| `adult-use-retail-sales` | OCP retail-sales dashboard capture | statewide, reported sales observations | preliminary, unaudited, revisable; currently operator-assisted capture |
| `adult-use-transactions` | OCP retail-sales dashboard capture | statewide receipt transactions | observed KPI is not permission to infer annual/monthly series where dashboard axes were not captured |
| `average-flower-price` | OCP retail-sales dashboard capture | statewide average flower/bud price per gram | not basket price, margin, cost, quality, or an operator outcome |
| `adult-use-product-mix` | OCP retail-sales dashboard capture | statewide category sales share | category line items are not customer transactions |
| `retail-licenses-by-municipality` | OCP license roster + Census ACS | unique qualifying license identities by municipality | active license is not an open storefront; unresolved geography must remain visible |
| `retail-licenses-per-10k` | OCP license roster + Census ACS | license density | footprint denominator, not demand, access, or revenue |
| `municipalities-without-retail-license` | OCP license roster + Census ACS | municipality roster gap | not an underserved, white-space, or investment claim |
| `retail-optin-gap` | OCP opt-in + OCP license roster | authorization/roster comparison | partial coverage; opt-in does not establish active operations |
| `dispensary-directory` | OCP dispensary capture + OCP licenses | dated discovery/listing records | acquisition mode and location semantics require explicit classification |
| `dispensary-menu-prices` | no verified populated input | reserved product | placeholder only; no price assertions until first-party snapshots and contract exist |

### Existing engine constraints that govern expansion

1. Raw source bytes belong in `$MDG_DATA_ROOT` under the content-addressed `raw/` tree; normalized snapshots and releases must retain input hashes.
2. The Git-tracked Astro input is only `apps/maine-cannabis/src/data/generated/mdg-data/current/`.
3. The current commission report is explicitly **NOT COMMISSIONED**. It names unresolved geography, provenance, source-classification, and second-snapshot validation issues.
4. The existing license, sales, and opt-in interfaces are useful foundations, but a new product must not inherit their limitations without exposing them in its own metadata.

## Primary-source inventory and source contracts

The following is the bounded acquisition map. “Primary” describes the issuer, not a guarantee of completeness or finality.

| Source ID / source URL | Source type / transport | Refresh or reporting cadence | Canonical grain and required definition | Status and limitations | Recommended contract action |
|---|---|---|---|---|---|
| OCP adult-use licensee search — https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search | primary state regulator; downloadable CSV/XLSX plus dashboard | downloadable roster monthly; page says weekly refresh | license-level administrative roster; preserve license status, type, host municipality, issue/expiry date, and snapshot date | owner/principal rows can duplicate a license; `Active` is eligibility to conduct business, not proof of open retail operation | **P1 source foundation:** archive each source snapshot, normalize by license number, run cross-snapshot lifecycle classification without calling a disappearance a closure |
| OCP adult-use retail sales — https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales | primary state regulator; public Power BI dashboard | monthly, preceding reporting month | statewide OCP program sales, receipt transactions, price-per-gram, and category observations | preliminary, unaudited, revisable; public programmatic Power BI route previously closed; do not infer unlabeled axes | retain existing operator-assisted/manual export contract; do not expand until an export has period labels and source capture metadata |
| OCP adult-use opt-in communities — https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities | primary state regulator; public dashboard/courtesy record | no reliable machine cadence stated | municipality + activity authorization status | OCP cannot guarantee accuracy; opt-in does not mean a licensee is actively operating; partial captured coverage is not statewide coverage | **P2 supporting source:** retain as authorization evidence only; municipal ordinance is the primary binding-law record |
| Maine Revenue Services sales-tax reports — https://www.maine.gov/revenue/taxes/tax-policy-office/sales-tax-reports | primary state revenue agency; linked XLSX | posted about the 15th monthly; stated two-month lag; full history updated monthly | statewide medical/adult-use taxable sales, tax liability, sales-tax and excise revenue by MRS filing-period reporting | confidentiality suppression can affect store groups; filing period may not equal sales month; history revises | **P1 source foundation:** version each monthly XLSX, capture workbook name and retrieval date, preserve MRS source family separately from OCP |
| OCP adult-use compliance — https://www.maine.gov/dafs/ocp/open-data/adult-use/compliance-data | primary state regulator; rendered final-agency-action table + redacted linked documents | quarterly; page recorded through March 2026, updated April 16, 2026 | final agency action by license number, action date/type, settled fine, linked document | legal categories changed over time; OCP notes annual reports may differ and records are not current-status verification or complete historical-program verification | **P1 bounded product:** a dated OCP compliance and testing record with action source link, retrieval date, historical-status warning, and no risk score |
| OCP adult-use testing — https://www.maine.gov/dafs/ocp/open-data/adult-use/testing-data | primary state regulator; aggregate tables plus quarterly XLSX | quarterly; Q2 2026 page updated July 15, 2026 | aggregate initial mandatory test samples by quarter/analyte/matrix | excludes retests and R&D samples; aggregate fail rates cannot identify products, stores, or safety outcomes | include with compliance record only after source-shape fixture confirms workbook headers and denominator rules |
| OCP medical open-data hub — https://www.maine.gov/dafs/ocp/open-data/medical-use | primary state regulator; hub to roster, program and compliance systems | source-specific | medical roster/program/compliance source catalogue | medical definitions differ from adult use; certificates are not unique patients | defer implementation until an explicit medical-use source contract isolates program definitions |
| Maine Legislature statutes and agency rules | primary legal source / binding municipal law must come from municipality | event-driven; enactment/effective-date review required | statute/rule/ordinance change event with citation, effective date, jurisdiction, and legal-status class | a state page cannot prove a local ordinance; current law, proposed changes, guidance, and historical notices cannot be collapsed | **P2 supporting source:** regulatory-change ledger limited to primary official state and town sources, with legal review boundary and no outcome prediction |

### Transport posture

- Downloadable OCP rosters and linked MRS workbooks are the clearest deterministic source transports.
- OCP sales and opt-in dashboards remain manual/operator-assisted where the official Power BI public interface cannot be reliably fetched. Standard viewer export is acceptable only when the operator acquires and places the source file in the raw store; normalization and release remain deterministic.
- Compliance and testing pages presently expose bounded, public aggregates. A source-shape fixture and header/row validation must precede any parser.
- Municipal legal records require an explicit town-primary document URL. OCP’s opt-in compilation may seed research but cannot substitute for a binding local record.

## Ranked implementation backlog

Ranking combines reader value, primary-source feasibility, and whether the product can be built without unsupported operating or financial inference.

| Rank | Product | Reader question answered | Evidence floor | Why it is bounded | Explicit exclusion |
|---:|---|---|---|---|---|
| 1 | **License provenance and lifecycle snapshots** | “What did OCP’s dated roster show, by license type/status/municipality, and what changed between source snapshots?” | two archived OCP roster snapshots; license-number identity; snapshot and retrieval dates; reconciliation classifications | extends an existing canonical input and makes change language auditable | no claims of openings, closures, public access, store count, demand, or commercial outcome |
| 2 | **OCP compliance and testing record** | “What final actions and aggregate initial-testing observations did OCP publish for a stated period?” | source-page snapshot, linked final-action URLs, quarterly data file/table, definition and exclusion fields | primary sources already publish structured historical data | no current-status, safety, quality, product, or business-risk score |
| 3 | **MRS revision-aware tax history** | “What did the revenue agency publish in each edition, and when was a historical tax-filer value revised?” | monthly source workbook snapshots, sheet/row schema, report/retrieval dates, OCP/MRS family labels | MRS file is directly downloadable and the revision problem is real | no inferred tax burden, margin, consumer price, or same-month reconciliation with OCP |
| 4 | **Municipal authorization evidence ledger** | “Which primary municipal record documents an authorization status for a particular activity?” | town ordinance/meeting record URL, jurisdiction, activity, legal status/effective date, retrieval date | enriches opt-in leads with binding local evidence | no probability of approval, operating demand, or market-entry claim |
| 5 | **First-party menu availability snapshots** | “What did an operator’s own menu display at a given time?” | dated first-party source snapshot, operator identity, capture method, product/price/availability status | potentially differentiated only after a narrow pilot and explicit acquisition decision | no autonomous Firecrawl, affiliate routing, cross-store price comparison before coverage threshold, or `unavailable = zero` |
| 6 | **Medical program structure series** | “What did OCP publish about medical-program participation under its own definitions?” | source-specific annual/dashboard/roster observations and definition lock | useful but semantics are more heterogeneous than adult use | no conversion of certificates to patients or caregiver registrations to storefronts |

## First implementation cards

### Card A — license provenance and lifecycle snapshots

**Recommended scope:** source registry/adapter/tests only; no public page changes and no generated-output change until the second source snapshot is archived and validated.

**Acceptance contract:**

1. Archive two OCP adult-use roster source snapshots with source URL, retrieval date, published “last updated” date, SHA-256, and source-file name.
2. Normalize unique identity by license number; preserve rows whose identity cannot be resolved without silently merging them.
3. Emit the existing cross-snapshot validator vocabulary: `same_identity`, `identity_attribute_changed`, `identity_conflict`, `newly_observed`, `no_longer_observed`, `reobserved`, and `blocked_identity_review`. Preserve changed/conflict attributes so readers can distinguish an attribute change from an identity conflict. Emit `reobserved` only when retained prior disappearance history establishes a prior present-to-absent event; otherwise an identity absent from the earlier snapshot and present in the latest is `newly_observed`.
4. Explicitly prohibit rendering `no_longer_observed` as “closed,” “opened,” or “operating,” and do not treat `identity_conflict` as a lifecycle conclusion.
5. Require metadata for source URL, source type, retrieval date, reporting period, definition, status, and limitations.

**Why first:** the engine already has OCP-license normalization and a cross-snapshot validator; this card adds release-grade provenance and an actual second-snapshot exercise before a public lifecycle product is contemplated.

### Card B — OCP compliance and testing record

**Recommended scope:** source-contract fixtures and deterministic parser for one adult-use compliance page/table plus one testing-quarter workbook; no scoring, recommendations, or page integration.

**Acceptance contract:**

1. Preserve each final-action entry’s published action date, license number, action type, settled amount exactly as presented, and linked document URL when present.
2. Preserve page-level refresh date and a clear historical/current-status limitation on every output.
3. Preserve testing observation period, analyte, matrix, numerator, denominator, and OCP’s initial-testing/retest exclusion.
4. Version the quarterly testing workbook and fail normalization if expected headers or denominator fields change.
5. Retain legal-change annotations as source-context only; do not calculate a cross-period enforcement trend without an explicit definition-break treatment.

**Why second:** it is a bounded, primary-source record with direct reader utility and can be released as factual history without inventing a quality, compliance, or commercial rating.

## Gates before later work

- Resolve or explicitly document **all current sentinel provenance defects** before any new product relies on their source family: `firecrawl_ingest` in the retail-sales products and `retail-optin-gap`; `ocp_licenses_normalized` in both `retail-optin-gap` and `dispensary-directory`; `ocp_csv_enumeration+findall` in `dispensary-directory`; and any subsequent sentinel found during release validation. A product may not inherit a sentinel as if it were a content hash.
- Reconcile the currently documented geographic coverage limitation before presenting municipal license outputs as statewide enumerations.
- Keep the existing OCP/MRS distinction in code, metadata, and reader-facing labels.
- Obtain a reviewed acquisition-mode decision and 5–10 site pilot before any operator/menu data collection beyond a first-party proof-of-shape. Record coverage, block rate, extraction completeness, and per-site cost before expansion.
- Treat the regulatory-change ledger as legal-source indexing, not legal advice. Any user-facing legal interpretation needs separate source and editorial review.

## Source record

Repository evidence examined: current MDG-DATA manifest; `POST-MDG-DATA-CAPABILITY-INVENTORY.md`; `MDG-DATA-001-COMMISSIONING.md`; existing Q3 2026 `SOURCE-MATRIX.md`; OCP open-data pages; and MRS sales-tax-report page. Official web sources were re-fetched on 2026-07-30. This memo is a source-contract and prioritization artifact, not a data release.

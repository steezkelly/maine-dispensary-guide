# Q3 2026 Maine Cannabis Industry Report — Source Pool

**Prepared:** 2026-07-22
**Report title (working):** Maine Cannabis Industry Report — Q3 2026
**Report timing:** in-quarter Q3 2026 (published during Q3, using latest available data)
**Data cutoff:** 2026-07-22 (OCP adult-use and medical dashboards: through June 2026; MRS tax-filer workbook: through May 2026; OCP 2025 annual reports: complete CY2025)

This file is the editor's and verifier's map to the verified source pool for the Q3 2026 PDF. It is the single entry point for "where do I find the verified number, source URL, and status label for X?" before any chart or paragraph is written. Every chart in the report should be able to cite a row here.

## Anchor edition for CY2025

The report is published during Q3 2026, not at year-end. We anchor CY2025 to the **live OCP adult-use retail-sales dashboard edition** (~$246.817M / ~4,845,XXX) because that is what readers see today. The OCP 2025 Adult Use Annual Report text ($246.424M / 4,835,682) remains the frozen statutory benchmark and is presented in the same article as a separate, labeled line so both editions are visible and the source identity is preserved. Source identity is never collapsed.

## Files in this source pool

| File | Path | Purpose | Use it for |
|---|---|---|---|
| Source matrix (Maine market data + chart plan) | `apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md` | OCP, MRS, OCP annual reports, license rosters, with primary URLs, freshness, and chart plan. | All Maine-internal market-data and chart construction. |
| MRS May 2026 cannabis sales workbook | `apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.xlsx` | MRS Monthly Taxable Cannabis Sales (xlsx, May 2026 latest) | Tax chart through May; tax-filer semantics. |
| MRS May 2026 cannabis sales CSV (derived) | `apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.csv` | Same workbook as CSV (LibreOffice-converted) | Programmatic reads. |
| OCP adult-use licenses CSV (June 1, 2026 snapshot) | `apps/maine-cannabis/docs/research/q3-2026-data/ocp-au-licenses-2026-06-01.csv` | Per-license adult-use roster | License mix, county footprint, business counts. |
| OCP medical caregivers CSV (June 1, 2026 snapshot) | `apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-caregivers-2026-06-01.csv` | Per-caregiver medical roster | Medical program, caregiver geography, retail-town distribution. |
| OCP medical establishments CSV (June 1, 2026 snapshot) | `apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-establishments-2026-06-01.csv` | Per-establishment medical roster | Dispensary counts, status mix. |
| Legal/regulatory source matrix | `docs/research/q3-2026-legal-regulatory-source-matrix.md` | Maine legal/regulatory state on 2026-07-22. 24 source rows, 14 timeline candidates, 12 current-vs-proposed table rows. Operative vs enacted-future-effective vs proposed is correctly separated. | All legal/regulatory prose and the Q3 timeline. |
| National-context source matrix | `docs/research/market-stats-national-source-matrix-2026-07-22.md` | Industry, technology, and national-context claims. 39 rows, 4 required updates, 14 explicit exclusions, 5 recommended visuals. | National/industry context for the report and the rewrite of `apps/maine-cannabis/src/pages/market-stats.astro`. |
| Sibling research (do not duplicate) | `docs/research/market-stats-national-source-pack-2026-07-09.md` | Earlier national-context source pack, 13 days out of date. | Reference only. |

## Verified Maine market snapshot (Q3 2026)

These are the in-quarter values that are ready to publish. They were verified by the Q3 source-pool subagent run on 2026-07-22 against primary OCP, MRS, and OCP annual-report sources.

| Metric | June 2026 | 2026 YTD (Jan–Jun) | Source |
|---|---:|---:|---|
| Adult-use sales (OCP dashboard) | $20,688,125 | $119,954,243 | OCP adult-use retail sales dashboard (preliminary, unaudited, revisable) |
| Adult-use receipt transactions (OCP dashboard) | 425,839 | 2,439,812 | OCP adult-use retail sales dashboard |
| Average bud/flower price per gram (OCP dashboard) | $6.04 | $6.10 | OCP adult-use retail sales dashboard |
| Medical registered caregivers (OCP dashboard card) | 1,412 | — | OCP medical program at-a-glance dashboard |
| Medical registered caregivers (roster CSV) | 1,414 | — | OCP medical registrant search CSV (June 1, 2026) |
| Medical registered employees/assistants | 17 | — | OCP medical program at-a-glance dashboard (anomalous; flag for clarification) |
| Adult-use active unique licenses (roster) | 346 | — | OCP adult-use licensee-search CSV (June 1, 2026) |
| Adult-use stores (roster) | 187 | — | OCP adult-use licensee-search CSV |
| Adult-use manufacturing (roster) | 80 | — | OCP adult-use licensee-search CSV |
| Adult-use cultivation (roster) | 76 | — | OCP adult-use licensee-search CSV |
| Adult-use testing (roster) | 3 | — | OCP adult-use licensee-search CSV |
| Medical active unique dispensary licenses | 95 | — | OCP medical registrant search CSV (June 1, 2026) |
| Medical registered providers (annual report) | — | 808 | OCP 2025 Medical Use Annual Report |
| Medical printed patient certificates (annual report) | — | 112,547 | OCP 2025 Medical Use Annual Report |

MRS May 2026 (latest available; two-month publication lag):

| Metric | May 2026 | Source |
|---|---:|---|
| Medical taxable sales | $18,916,692.79 | MRS Monthly Taxable Cannabis Sales workbook |
| Adult-use taxable sales | $20,283,005.06 | MRS Monthly Taxable Cannabis Sales workbook |
| Adult-use sales-tax liability | $2,839,620.71 | MRS workbook |
| Adult-use sales-tax revenue | $2,744,931.97 | MRS workbook |
| Adult-use excise-tax revenue | $1,097,908.09 | MRS workbook |

## Anchor edition for CY2025 (maine-internal annual)

| Edition | CY2025 sales | Transactions | Avg price/g | Use for |
|---|---:|---:|---:|---|
| **Live OCP dashboard (anchor)** | ~$246,817,000 | ~4,845,XXX | $6.62 | Headline CY2025 figure in the report. The reader sees this number on OCP today. |
| OCP 2025 Annual Report (frozen statutory) | $246,423,512 | 4,835,682 | $6.62 | Secondary, labeled line. The statutory reporting edition. |

Both numbers appear in the report, with the edition labeled. The annual report figure must not silently replace the live dashboard figure.

## Status labels (mandatory)

| Source | Required label |
|---|---|
| OCP adult-use retail sales dashboard (any month) | "OCP inventory-tracking data; preliminary, unaudited, subject to revision." |
| OCP testing data | "Initial mandatory testing; retests excluded." |
| MRS taxable sales | "Maine Revenue Services sales tax-filer data; filing-period-based, revisable monthly." |
| OCP licensee-search CSV | "Roster dated YYYY-MM-DD; page last updated YYYY-MM-DD. Unique active licenses, not businesses or open locations." |
| OCP 2025 annual report (live dashboard figures) | "Live dashboard edition; history is revisable." |
| OCP 2025 annual report (statutory figures) | "Frozen statutory edition; 28-B M.R.S. §113." |
| MSA, Headset, Cannabis Benchmarks, Vangst, Leafly, Whitney, BDSA, etc. | Always name the source class; never present as authoritative national "actual" without primary URL. |
| Proposed rule (OCP Ch. 5/40 drafts posted 2026-07-15) | "Proposed, not binding. Hearing 2026-08-03; comments due 2026-08-14." |
| Enacted but not yet effective (P.L. 2025 chs. 504/506/512/514/611) | "Enacted; ordinary effective date 2026-07-29. Not operative on report cutoff." |

## Editorial rules

1. Every chart footer includes: source, observation period, retrieval date (2026-07-22), and status label.
2. Never call June "final." "Latest complete month" refers to calendar coverage, not audit/finality.
3. The 14% adult-use sales tax and the reduced weight/plant-based excise schedule are *separate* taxes. Do not describe the excise tax as a "14% tax" or the retail tax as a "wholesale tax."
4. OCP and MRS are not interchangeable. OCP reflects inventory-tracking retail activity; MRS reflects tax filing periods, which MRS warns do not always correspond to the month sales occurred. They must never be averaged, merged, or used as a correction to one another.
5. Maine does not maintain a central patient registry. Never relabel printed certificates as "patients."
6. Proposed rules, enacted-but-not-effective laws, and failed/withdrawn bills must each be labeled and not collapsed into the operative-now column.
7. Re-fetch the OCP proposed-rules page and the OCP/MRS implementation material after 2026-08-14 and again before publication to capture any adoption/effective-date changes.

## What the source pool does NOT include

- Per-vendor Maine operator counts (not publicly disclosed; fabricating would be YMYL-red-zone).
- A non-trivial county sales breakdown (no OCP-published county sales series; license and caregiver geographic data show footprint, not demand).
- A unified July 2026 OCP monthly snapshot (OCP June is the latest complete month; July is partial).
- Real-time national cannabis pricing beyond Headset's 12-market panel (Headset's national extrapolation is a derived number, not a measured one).
- Public Power BI semantic-model programmatic access for the OCP retail-sales report (verified 2026-07-22: `app.powerbigov.us` returns the viewer error page for the resource key; `api.powerbigov.us` returns 403). Future operator-assisted manual CSV export of the three OCP tabs (Sales Revenue, Number of Sales Transactions, Average Price per Gram) remains the project-canonical path.
- Wholesale spot data refresh since November 21, 2025. Cannabis Benchmarks publishes weekly; the most recent pull is required before publication.

## Verification path before any chart is generated

1. Confirm the chart's required numbers appear in the relevant row of this source pool with the correct status label.
2. Re-fetch any URL whose freshness window crosses the chart's intended period. Do not rely on a single earlier pull.
3. Cross-check OCP and MRS monthly figures against each other only when both are explicitly published for the same calendar month; never substitute one for the other.
4. For any chart that uses the new market-stats `national-context` rewrites, also check `docs/research/market-stats-national-source-matrix-2026-07-22.md` §8.2 for required frontmatter updates (hemp effective date; broader rescheduling; wholesale spot refresh; CO/CA price tightening).
5. For any chart that touches Q3 rules, check `docs/research/q3-2026-legal-regulatory-source-matrix.md` for operative vs enacted-future-effective vs proposed status.

# Round 17 — User-Visible Data Trust Reconciliation Audit

**Date:** 2026-07-14
**Status:** evidence complete; source edits deferred for integration
**Scope:** homepage, `/find-a-dispensary`, `/guides/maine-ocp-license-map`, and `/roi-calculator`

## Executive finding

The audited surfaces currently conflate or insufficiently distinguish three different things:

1. an **official annual-report snapshot**;
2. an **OCP live licensee-search download**; and
3. an **MDG editorial/directory snapshot**.

The direct primary source resolves one key annual-report claim: the OCP's 2025 Adult Use Cannabis Program Annual Report, published February 13, 2026, records the following **as of December 31, 2025**:

| Metric | Official annual-report value |
|---|---:|
| Active adult-use establishments | 343 |
| Cultivation facilities | 78 |
| Products manufacturing facilities | 81 |
| Cannabis retail stores | 180 |
| Testing facilities | 4 |

Therefore, a claim that the same report records **187 retail stores** is not supportable. `343 = 78 + 81 + 180 + 4`.

The official OCP Adult Use Applicant, Licensee, and Entity Search states that its downloadable data was last updated **July 8, 2026** and is refreshed on a stated weekly cycle. The project's separate July 8 roster field records `107` deduped Store-type licenses across `49` municipalities. That is a different snapshot and a different deduplication definition; it must not be compared as a simple drop from the annual-report establishment total.

## Source precedence

1. **OCP 2025 AUCP Annual Report** — authoritative for the 2025 year-end establishment snapshot.
2. **OCP adult-use licensee search/download** — authoritative for current search/download status at its own publication date.
3. **OCP opt-in data** — authoritative for municipal opt-in context, but OCP explicitly warns that opt-in does not prove an active licensee operates in that municipality.
4. **MDG editorial guides and historic snapshots** — useful context only; never label them live without a reproducible current refresh.

## Audited surfaces and dispositions

| Surface | Current issue | Evidence | Required reconciliation | Round 17 action |
|---|---|---|---|---|
| `src/data/site-stats.json` | Top-level annual retail count is 187 and attributes it to the OCP 2025 report. | Official report says 180. | Change the annual value/source to 180 and retain the live 107/49 roster separately. Also remove the unsupported attribution of the 65-municipality field to the annual report. | Deferred: shared source must compose with design branch. |
| Homepage | “Live”/current presentation mixes annual and roster values; hero copy says “Forty-four guides” while other site copy exposes materially different guide counts. A decorative sparkline is presented beside market data without a published source series. | Source inspection of `index.astro`; current roster field is dated July 8, 2026. | Make the panel explicitly roster-scoped (107/49, date, definition); label 180 as the 2025 annual report total; remove unsupported numeric hero copy; label decorative chart as non-data or remove it. | Deferred: `index.astro` is within the broad design composition. |
| `/find-a-dispensary` | The city list is an April 2026 snapshot but current reader-facing copy describes entries as active/OCP-licensed without sufficient snapshot qualification. Its directory count describes editorial entries, not an OCP total. | File comments identify April 2026 extraction; OCP later published a July 8 download. | Rename/scope the section as an April 2026 snapshot, mark every count historical, and point readers to OCP for current verification. Rebuild from an approved fresh pipeline before reinstating any live claim. | Deferred: the design worktree currently changes this page. |
| `/guides/maine-ocp-license-map` | Title promises a data/tracker/map experience; FAQ says the page mirrors a filterable OCP dataset; static cards mix 187 + 78 + 81 + 4 + courier 12 while calling the total 343. County density and “opportunity” claims lack a current reproducible source. | Source inspection plus official annual-report arithmetic. | Reframe as a static annual-report context page; correct cards to 180/78/81/4 = 343; remove the mirror/tracker promise; suppress unverified current county-density and opportunity statements; link to official OCP search. | Deferred: source reconciliation must be integrated with design work. |
| `/roi-calculator` | $246.4M ÷ 187 is presented as $1.31–$1.32M per store. | OCP annual report gives 180; calculation is $1,369,019.51, or about **$1.37M**. | Update every coupled table, FAQ, metadata, and methodology reference to 180 and $1.37M. Preserve its status as a statewide annual-report average, not a live store-level benchmark. | Deferred: public content source should not be patched independently of design integration. |

## Explicitly non-equivalent numbers

| Value | What it can mean | What it must not be called |
|---:|---|---|
| 343 | OCP 2025 year-end active AU establishments | current live store total |
| 180 | OCP 2025 year-end active cannabis retail stores | July 2026 live roster count |
| 107 | Project's deduped Store-type licensee roster as of July 8, 2026 | a like-for-like annual-report establishment count |
| 49 | Project's roster municipalities as of July 8, 2026 | statewide municipal opt-in total |
| 65 | Legacy MDG market-snapshot host-municipality value | OCP 2025 annual-report aggregate, unless independently reproduced and sourced |

## Pipeline finding

`apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs` returns `cgStores` from its live-count helper but writes `live.caregiverStorefronts`. That mismatch can write an undefined caregiver value during a refresh. Correct it as a small tested pipeline fix (`live.cgStores`) in the same integration reconciliation patch—not as an isolated competing source change.

## Patch manifest for the integrator

1. Add a regression test that parses `site-stats.json` and the four designated surfaces, asserting the official annual-report tuple `78/81/180/4 = 343` and rejecting the false annual-report 187 claim.
2. Update the centralized stats source and refresh-script explanation without overwriting the dated live roster fields.
3. Apply the homepage data-label treatment and remove the stale “Forty-four guides” assertion.
4. Reframe the finder snapshot and license-context page as described above; do not call a static list a live tracker.
5. Update ROI arithmetic consistently: `$246,423,512 / 180 = $1,369,019.51`, displayed as `$1.37M` where rounding is appropriate.
6. Re-run source checks, build, focused content assertions, and production verification from the integration worktree.

## Why Round 17 did not edit the public source

The current design branch has broad committed edits across shared layouts/components and many pages, including `/find-a-dispensary`. Applying these changes in a parallel branch would create a needless integration conflict and violate the preserve-and-isolate decision in the coordination memo. This audit is therefore a bounded evidence record and a patch-ready manifest—not a claim that the live site is already corrected.

## Primary sources

- OCP, **2025 Adult Use Cannabis Program Annual Report**, February 13, 2026: https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf
- OCP, **Adult Use Applicant, Licensee, and Entity Search**: https://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search
- OCP, **Adult Use Opt-in Communities**: https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities

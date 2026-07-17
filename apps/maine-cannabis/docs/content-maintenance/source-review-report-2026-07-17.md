# Source-review priority report

**As of:** 2026-07-17

This report joins page-level GSC impressions/clicks and GA4 pageviews to evidence freshness. It creates **small source-review tasks before content expansion**: review the source and dependent pages first; do not expand copy until the task is closed.

## Prioritized source-review tasks

| Priority | Claim | Canonical page | Evidence status | Organic impressions | GA4 pageviews | Correction / propagation | Small task |
| ---: | --- | --- | --- | ---: | ---: | --- | --- |
| 12 | `ocp-testing-rule-current-vs-proposed-2026` | /guides/maine-cannabis-product-testing-guide | due soon (6d) | 0 | 6 | /about/corrections#maine-ocp-testing-rule-watch-2026; 6 dependent page(s), 1d SLA | Revalidate `ocp-rulemaking-testing-2026-07`; correct source claim and propagate before expansion. |

## Method and limits

- GSC facts are aggregated by canonical page from the supplied page-dimension export. GA4 facts are aggregate pageviews; neither dataset identifies a person.
- `mdg_source_select` is an optional trust/verification signal only. A click indicates that a visitor opened a marked source/reference link; it is **not** evidence that the claim is accurate, that the source was read, or that there is commercial intent.
- Pages without page-dimension GSC data receive zero GSC exposure rather than an invented value. Reviewers must replace fixture/legacy extracts with current finalized exports before acting on a production priority.
- Correction references and propagation SLAs are workflow controls. Record the actual dependent-page completion date in the correction entry or task evidence.

## Full claim register

- **ocp-testing-rule-current-vs-proposed-2026** — /guides/maine-cannabis-product-testing-guide; primary_regulator_rulemaking; source date 2026-07-01; verified 2026-07-16; owner editorial-compliance; cadence 7d; status due_soon.
- **au-edible-dose-cap-10mg-200mg** — /guides/maine-cannabis-edibles-compliance; primary_statute; source date 2023-10-25; verified 2026-07-05; owner editorial-compliance; cadence 90d; status current.
- **maine-au-establishments-2025-annual-report** — /market-stats; primary_regulator_annual_report; source date 2025-12-31; verified 2026-07-14; owner data-market; cadence 30d; status current.
- **maine-au-sales-2025-2464m** — /market-stats; primary_regulator_annual_report; source date 2026-01-13; verified 2026-07-09; owner data-market; cadence 30d; status current.
- **maine-au-tax-reset-2026** — /market-stats; primary_session_law; source date 2026-01-01; verified 2026-07-09; owner editorial-compliance; cadence 180d; status current.
- **wells-adult-use-opt-in-2025-vote** — /guides/wells-dispensary-guide; municipal_record; source date 2025-06-10; verified 2026-07-04; owner city-guides; cadence 30d; status current.

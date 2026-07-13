# ICA release-1 pilot baseline — 2026-07-13

## Decision

Ship a 10-route instrumented pilot: six business dependency pages and four consumer discovery pages. This is not an A/B test and does not claim causality.

## Current module audit

- `Layout.astro` injects the same Launch Checklist box and hard-coded `RelatedArticles` inventory on every `/guides/*` article.
- Every selected route already renders one page-level `AutoRelated` rail.
- `RelatedArticles` duplicates the canonical generated inventory and must be suppressed on pilot routes.
- `NextStep` is used only on three founder-story pages. Its `steps.find(path !== currentPath)` behavior is incorrect but outside this pilot.
- Existing runtime analytics emit `cta_view` for `[data-cta-id]` and `page_engaged` after 30 visible seconds or visibility return.

## Settled baseline window

- GSC: 2026-06-12 through 2026-07-10, final data, page dimension.
- GA4: same dates, pagePath/device/pageReferrer plus `page_engaged` and `cta_view` event probes.
- GA4 query completed with zero API failures.
- No `page_engaged` or `cta_view` rows exist in this settled window because this instrumentation was deployed after the window. Post-rollout event data is therefore the pilot baseline for those events.
- `cta_id` is emitted but is not a registered GA4 custom dimension. Exact slot-level exposure reporting remains operator-gated; page-level aggregate `cta_view` is available without a new event taxonomy.

## Selected cohort

| Route | Cohort | GSC clicks / impressions | GA4 views / sessions / engaged |
|---|---|---:|---:|
| `/guides/maine-dispensary-license` | business | 2 / 580 | 9 / 9 / 4 |
| `/guides/maine-cannabis-opt-in-tracker` | business | 0 / 78 | 2 / 2 / 2 |
| `/guides/maine-cannabis-zoning-requirements` | business | 2 / 34 | 3 / 2 / 2 |
| `/guides/maine-cannabis-site-selection` | business | 0 / 39 | 0 / 0 / 0 |
| `/guides/maine-cannabis-inventory-management` | business | 0 / 122 | 0 / 0 / 0 |
| `/guides/maine-metrc-compliance-guide` | business | 1 / 56 | 2 / 1 / 1 |
| `/blog/best-maine-edibles-2026` | consumer | 20 / 234 | 26 / 24 / 14 |
| `/blog/best-maine-dispensaries-2026` | consumer | 13 / 328 | 22 / 21 / 10 |
| `/blog/maine-dispensary-gift-cards` | consumer | 2 / 214 | 2 / 2 / 1 |
| `/guides/machias-dispensary-guide` | consumer | 3 / 48 | 7 / 7 / 3 |

## Exclusions

- Active title-treatment cohort, including Bar Harbor and dispensary-costs pages.
- Operator-profile pages awaiting cannibalization evidence.
- Acadia/travel canonical pair because recent expansion and consolidation contaminate baseline.
- Founder-story `NextStep` cleanup; separate bounded follow-up.

## Mapping review

Business editorial path:

`license → opt-in → zoning → site selection → real estate`, plus `inventory → Metrc → waste management`.

Consumer editorial path:

`best edibles → first-time buyer`, `best dispensaries → cheapest comparison`, `gift cards → best dispensaries`, and `Machias → Downeast regional comparison`.

Contextual actions remain separate: launch checklist, ROI calculator, METRC/compliance downloads, first-timer resource, and directory search.

## Query definitions

1. GSC: page; clicks, impressions, CTR, position; final 28-day window ending 2026-07-10.
2. GA4 page baseline: `pagePath`; screenPageViews, sessions, engagedSessions, userEngagementDuration, bounceRate.
3. GA4 device: `pagePath + deviceCategory`; views and sessions.
4. GA4 arrivals: `pagePath + pageReferrer`; views.
5. GA4 events: `pagePath + eventName`; eventCount filtered to `cta_view` and `page_engaged`.

The structured manifest is `docs/analytics/ICA_PILOT_MANIFEST_2026-07-13.json`.

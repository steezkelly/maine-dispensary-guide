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

## Deployment and measurement clock

- State: `deployment_verified`.
- Production commit: `50fda8fb9fe26eaf394e90ad6828f2a062e2c897`.
- Conservative treatment/measurement clock start: `2026-07-13T17:17:25Z`, the fresh production-verification timestamp rather than the local edit or push time.
- Production verification: all 10 canonical routes returned exactly one editorial next step, one contextual action, and one `AutoRelated` rail in that order; no manual discovery rail remained.
- Browser verification: 20 desktop/mobile checks; zero axe violations at all recorded impact levels; no horizontal overflow; 44px action targets; keyboard focus and reduced-motion checks passed.
- GitHub Actions run `29269220675`: Build, production smoke, and production deploy jobs completed successfully; preview-only jobs were skipped on the main push.
- Post-rollout `cta_view` and `page_engaged` observations begin after the measurement-clock timestamp. This release remains observational; do not infer causal lift from before/after movement alone.
- Exact slot-level reporting still depends on operator registration of `cta_id` as a GA4 custom dimension. Until then, use page-level aggregate exposure and destination-session evidence.

# ICA GA4 delivery check — 2026-07-13 (pre-treatment)

## Purpose

Verify that the registered GA4 `cta_id` custom dimension is queryable and
establish whether any ICA release-1 event data can validly be evaluated.

## Query execution

- **Executed:** 2026-07-13T18:50:40Z (14:50:40 EDT)
- **GA4 property:** `532778727`
- **Data source:** authenticated GA4 Data API `getMetadata` and `runReport`
- **Date range:** 2026-07-13 through `today`
- **Pilot measurement clock:** 2026-07-13T21:17:25Z

The check ran **2 hours, 26 minutes, and 45 seconds before** the conservative
pilot measurement clock. It is therefore a configuration/pre-treatment
snapshot, not a pilot performance result.

## Confirmed

The Data API exposes this custom dimension:

| API name | UI name | Scope |
|---|---|---|
| `customEvent:cta_id` | `cta_id` | Event |

This independently confirms the GA4 Admin screenshot evidence: the dimension
is registered and queryable through the Data API.

## `cta_view` results in the pre-treatment snapshot

| Breakdown | Result |
|---|---|
| Total `cta_view` events | 31 |
| Sessions with `cta_view` | 5 |
| Distinct `cta_id` rows | 14 |
| Pages with `cta_view` | 3: `/`, `/blog/maine-cannabis-delivery-business-guide-2026`, `/roi-calculator` |
| ICA editorial IDs (`editorial-next-*`) | 0 |
| ICA contextual IDs (`contextual-action-*`) | 0 |

All 14 observed IDs were pre-existing `cta-inline-*` values. The highest
counts were `cta-inline-index-06`, `cta-inline-index-07`, and
`cta-inline-index-08` (4 events / 3 sessions each).

## Classification

**ICA mapping review: NOT YET ELIGIBLE.**

- GA4 configuration and queryability are verified.
- Existing site CTA telemetry is present, which confirms the reporting path is
  alive.
- No observation occurs after the pilot measurement clock, so these events
  cannot evidence ICA exposure, arrivals, destination engagement, or mapping
  quality.
- No ICA implementation change is warranted from this result.

## Required follow-up

Run the same three reports only after the pilot clock and normal GA4 processing
latency:

1. `cta_view` by `customEvent:cta_id`, filtered to `cta_view`;
2. `cta_view` by `pagePath`, filtered to `cta_view`;
3. `cta_view` by date, filtered to `cta_view`.

Treat ICA exposure as verified only when IDs beginning `editorial-next-` or
`contextual-action-` appear. Retain/revise/revert decisions require a settled
observation window and destination-arrival/engagement evidence, not event
counts alone.

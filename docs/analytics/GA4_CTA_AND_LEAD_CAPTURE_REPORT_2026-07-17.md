# GA4 CTA telemetry and lead-capture submit-intent report — 2026-07-17

## Scope and decision boundary

This is a read-only GA4 Data API observation for GitHub issue #72. It validates that the current CTA pilot telemetry is arriving and that `lead_capture` can be reported at its currently available grain.

- It does **not** establish conversion lift.
- `lead_capture` means **submit intent** emitted by the client. It is **not** confirmation that Formspree accepted a submission or that a lead was fulfilled.
- The four-day window is an early post-rollout observation, not a settled performance window.

## Query record

| Field | Value |
| --- | --- |
| Property | `532778727` |
| API | GA4 Data API `v1beta` `properties/{property}:runReport` |
| Metadata endpoint | `properties/532778727/metadata` |
| Queried at (UTC) | 2026-07-17T16:04:28.035091+00:00 |
| Date range | 2026-07-13 through 2026-07-16 inclusive |
| Event metric | `eventCount` |
| CTA filter | `eventName` exactly `cta_view` |
| Lead filter | `eventName` exactly `lead_capture` |

The Data API metadata response reported `customEvent:cta_id` as an available dimension. It did **not** report `customEvent:form_name`; a direct report request using that dimension failed with HTTP 400 / `INVALID_ARGUMENT`.

## CTA telemetry validation

CTA query dimensions: `date`, `customEvent:cta_id`, and `pagePath`.

| Date | `cta_view` events |
| --- | ---: |
| 2026-07-13 | 40 |
| 2026-07-14 | 29 |
| 2026-07-15 | 23 |
| 2026-07-16 | 9 |
| **Total** | **101** |

The query returned 68 date/CTA/page rows. Both pilot identifier families were observed:

| Identifier family | Observed IDs | Events |
| --- | --- | ---: |
| `editorial-next-` | `editorial-next-edibles-to-first-visit`, `editorial-next-license-to-opt-in`, `editorial-next-opt-in-to-zoning` | 3 |
| `contextual-action-` | `contextual-action-edibles-first-timer-guide`, `contextual-action-license-launch-checklist`, `contextual-action-opt-in-launch-checklist` | 3 |

Result: **CTA telemetry is queryable by `cta_id`, and both requested pilot prefixes are present in the post-rollout sample.** This confirms data arrival only; the sample is too small and too early to support lift claims.

## Lead-capture reporting

Lead query dimensions: `date` and `pagePath`, because `customEvent:form_name` is not a reportable custom dimension in the property metadata.

| Date | Page path | `lead_capture` submit-intent events |
| --- | --- | ---: |
| 2026-07-15 | `/download-checklist` | 1 |
| **Total** |  | **1** |

`form_name` cannot currently be used for the requested per-form breakdown. Registering an event-scoped GA4 custom dimension for the exact `form_name` parameter is required before that analysis becomes available; registration is not historical backfill.

## Next measurement step

- Keep the current report labeled as submit intent.
- Do not expand ICA mappings or claim conversion lift from this observation.
- After `form_name` is registered and a settled observation window exists, rerun the lead query by `date`, `customEvent:form_name`, and `pagePath` to produce the intended per-form exploration.

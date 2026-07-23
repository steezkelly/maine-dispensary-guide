# MDG Signal — Measurement Note

**Date:** 2026-07-23
**Owner:** MDG Signal vertical-slice (kanban t_8dc65ba5, branch `feat/mdg-signal-vertical-slice-2026-07-23`)
**Status:** read-only vertical slice, prototype boundary in force

## What is measured

The MDG Signal slice emits a small set of intent events so we can see
how the read-only surface is used without conflating them with
conversion. All events are pushed via `window.dataLayer.push({ event: name, ... })`
and forwarded to GA4 through `gtag('event', name, payload)` from the
existing `SignalIntentTracker.astro` component.

| Event name        | Trigger                                                                 | Payload                                  |
|-------------------|-------------------------------------------------------------------------|------------------------------------------|
| `municipality_select` | User opens a `/signal/[municipality]/` route (deduplicated by slug) | `signal_label: <city>`                   |
| `peer_add`        | User clicks *Add peer* on a research page                               | `signal_label: <city>`, `signal_section: 'comparison'` |
| `source_open`     | Evidence drawer opens                                                   | `signal_label: <city or page id>`        |
| `watchlist_open`  | Proposed-paid watchlist preview opens                                   | `signal_label: <city>`                   |
| `alert_preview`   | Proposed-paid alert anatomy renders                                      | `signal_label: <city>`                   |

## Where the events go

- `window.dataLayer` (GA4 standard) — picked up by the GA4 tag already
  loaded on the page.
- `gtag('event', ...)` direct call — fallback when GA4 is unavailable.

No custom endpoint is used. No Personally Identifiable Information is
attached; `signal_label` is the city name only.

## Interpretation

These events are **leading indicators of interest**, not signals of
intent to pay. A `watchlist_open` does not mean the user is willing to
pay for a saved watchlist; it means the user opened the preview. Treat
the volume of preview opens as evidence that the preview is reaching
people, not as a forecast of conversion.

## Threshold for "the slice has earned the next step"

The slice earns the right to be considered for production hardening
(accounts, persistence, alert delivery, exports) when, in any rolling
**30-day window** beginning after the preview URL is in operator hands:

- At least **25** distinct users reach `/signal/<any-municipality>/`,
  AND
- At least **5** distinct users open the **proposed-paid watchlist preview**
  (`watchlist_open`), AND
- At least **1** documented **external operator reaction** has been
  recorded in `docs/audits/mdg-signal-sprint-1-reaction-*.md`.

Until all three thresholds are observed, MDG Signal remains a read-only
research surface. Auth, billing, persistence, alert delivery, and
exports stay explicitly out of scope.

# ICA GA4 custom-dimension configuration evidence — 2026-07-13

## Evidence source

Operator-provided GA4 Admin screenshot:

```text
/home/steve/Pictures/Screenshots/Screenshot 2026-07-13 at 14-41-15 Analytics.png
```

The screenshot is retained locally as operator-provided evidence; it is not
copied into the repository.

## Visible facts

The GA4 **Custom definitions → Custom dimensions** table visibly lists:

| Dimension name | Description (visible summary) | Scope | User property / parameter | Last changed |
|---|---|---|---|---|
| `faq_id` | Per-FAQ reach identifier | Event | `faq_id` | Jul 12, 2026 |
| `event_trigger` | Trigger for engagement signals | Event | `trigger` | Jul 12, 2026 |
| `cta_id` | Per-CTA reach identifier | Event | `cta_id` | Jul 12, 2026 |

## ICA impact

This corrects the earlier ICA baseline/manifest assertion that `cta_id` was not
registered. It was already registered before the ICA production measurement
clock (`2026-07-13T17:17:25Z`). Therefore custom-definition creation is not an
ICA blocker.

## What this evidence does not establish

A configuration screenshot does not establish:

- that post-rollout ICA `cta_view` events reached GA4;
- that `cta_id` values are available in a GA4 UI exploration or Data API
  response;
- processing/retention timing or cardinality behavior;
- CTA exposure volume, visitor behavior, destination engagement, or causal
  impact.

## Next verification

After post-rollout ICA events have processed, inspect GA4 DebugView, a report,
or the Data API for `cta_view` segmented by the event-scoped `cta_id`
dimension. Confirm values beginning `editorial-next-` and
`contextual-action-` appear before using slot-level ICA reporting.

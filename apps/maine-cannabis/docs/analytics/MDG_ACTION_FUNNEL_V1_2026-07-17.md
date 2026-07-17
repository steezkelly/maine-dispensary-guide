# MDG Action Funnel v1 — 2026-07-17

`mdg-action-funnel-v1.sql` reports the aggregate action path:

`mdg_action_exposure → mdg_action_select → same-site destination arrival → mdg_active_attention`.

The query separates **editorial next steps**, **contextual conversion actions**,
and **AutoRelated modules** by stable `placement_id`. It reads only aggregate
counts keyed by site paths and same-site referrers; it does not select user or
session identifiers.

## Event contract

Each meaningful CTA emits the following stable dimensions on both exposure and
selection:

- `action_id`
- `action_family`
- `placement_id`
- `destination_family`

Selections for internal routes also emit `destination_path`, which is a
canonical path rather than a URL, title, or CTA copy. Exposures require at
least 50% viewport intersection for 750 ms. Selection analytics are queued
through `gtag` and request beacon transport, but handlers never prevent or
delay the native link or form-control action.

A destination arrival means a same-site page view whose referrer is a same-site
source path. It is navigation evidence only. Do **not** call it a lead,
conversion, or completed task unless that destination has its own separately
defined completion event (for example `mdg_conversion_complete`).

## Attribution boundary

The SQL emits two explicitly separate grains. `action_cta` rows contain CTA
exposure and selection counts only. `source_destination_outcome` rows contain
arrival and active-attention counts for a source/destination path pair and are
labelled `unattributable_to_individual_cta`. Multiple CTA IDs can share a
destination, so these destination outcomes must not be summed, compared, or
reported as action-level CTA results without a future action-level attribution
key.

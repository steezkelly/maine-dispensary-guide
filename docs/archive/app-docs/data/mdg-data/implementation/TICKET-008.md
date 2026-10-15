# TICKET-008 — Per-Capita and No-Retail Comparison Products

**Status:** complete (with documented gaps)
**Ticket:** 008
**Date:** 2026-07-11

## Summary

Built the two remaining per-municipality derived products:
`retail-licenses-per-10k` and `municipalities-without-retail-license`.
Both use the same derive pipeline as Ticket 007.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/derive-retail-products.cjs`
  — extended with `retail-licenses-per-10k` and
  `municipalities-without-retail-license` products.

## Ticket 008 acceptance check

- [x] Rates calculated unrounded (`rate_per_10k_unrounded` field).
- [x] Display rounded to 2 decimals (`rate_per_10k_display`).
- [x] Ranking uses unrounded values: rows are sorted by GEOID
      (canonical), not by rate, but downstream consumers can sort
      on `rate_per_10k_unrounded` for true rate-based ranking.
- [x] ACS 2024 vintage exposed (`acs_vintage` in meta and rows).
- [x] Zero or missing population suppresses the rate:
      `suppressed: true` with `suppression_reason`.
- [x] Comparison universe is explicit (`comparison_universe_size`
      in `municipalities-without-retail-license.json` totals).
- [x] Public methodology distinguishes licenses from real-time open
      storefronts (in every meta.json `methodology_notes`).
- [x] Output does not call zero-license geographies "underserved":
      methodology note explicitly says so.

## Gaps

- `retail-licenses-per-10k` is `disabled_products: SOURCE_MOCK_FOR_TESTING`
  until the operator provides a Census API key. The product artifact
  exists; it's just not eligible for publication.
- `municipalities-without-retail-license` is similarly gated.

When the operator exports `CENSUS_API_KEY` and re-runs
`data:mdg:fetch --source=census_acs5_population`, the next
`data:mdg:derive` will flip these products to enabled automatically.

## Specification authority note

No Tier 1 changes.
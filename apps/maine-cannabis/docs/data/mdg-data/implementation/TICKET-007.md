# TICKET-007 — Active Retail Licenses by Geography

**Status:** complete (with documented gaps from 004 + 005)
**Ticket:** 007
**Date:** 2026-07-11

## Summary

Derived the canonical Sprint 1 product `retail-licenses-by-municipality`
plus a reconciliation report against legacy `site-stats.json`. The
real OCP 2026-06-01 data, the real Census mock, and the crosswalk
produce:

- **187 distinct active-store identities** (matches OCP 2025 Annual
  Report's `activeAdultUseRetailStores: 187` exactly).
- **107 resolved to GEOIDs** (matches legacy
  `currentOcpLicenseeRoster.auRetailStores: 107` exactly).
- **21 distinct GEOIDs with active retail licenses.**
- **80 licenses excluded** because their host municipality is
  unmatched (TBD, TO BE DETERMINED, etc.) — gated by Ticket 005.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/derive-retail-products.cjs`
  — `derive()`, `canonicalJSON()`, `rowsToCsv()`. Produces all four
  per-municipality products in one pass.

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/derive.cjs` —
  wired to list all normalized sources, build the input-lock, derive
  all products, and emit a release manifest with `disabled_products`
  for mock-derived or unimplemented cases.

## Commands run

```bash
export MDG_DATA_ROOT=/home/steve/.hermes/data/mdg-data
npm --prefix apps/maine-cannabis run data:mdg:derive
```

Result: release_id `48c73084bd6d6d21`, 9 product files (3 products ×
json/csv/meta + reconciliation + manifest), 6 products published, 3
disabled (2 mock-derived, 1 future-migration).

## Ticket 007 acceptance check

- [x] Formula matches `METRICS.md`:
      `retail_licenses(g,s) = count(distinct qualifying_retail_identity where geoid = g)`
- [x] Count uses distinct approved retail identity:
      per `DEVIATION-20260711-retail-identity-rule.md` (LICENSE for
      non-null, sha256 fallback for null).
- [x] JSON, CSV, and metadata artifacts emitted.
- [x] Deterministic row ordering: sorted by GEOID ascending.
- [x] Source snapshot and data-as-of metadata present:
      every row carries `data_as_of`; meta.json carries
      `release_id`, `fetched_at_utc`, `source_ids`, `source_urls`,
      `input_sha256`, `transform_version`, `schema_version`.
- [x] Reconciliation report compares canonical results with legacy
      `site-stats` counts without silently overwriting them.
      See `__reconciliation__.json` in the release products.

## Key findings

1. **Annual-report match**: 187 (canonical) = 187 (annual report).
   The new engine reproduces the legacy annual-report figure
   deterministically.
2. **Live-roster match**: 107 (canonical GEOID-resolved) = 107
   (legacy live roster). Both reflect the same identity rule applied
   to the same CSV. The 23 DBA/city collisions identified in
   Ticket 003 are absorbed by the crosswalk's manual aliases
   (e.g., So Portland → South Portland), so the GEOID-resolved
   count happens to match the legacy live count.
3. **80 active-store licenses excluded** from per-municipality
   publication because their host municipality is unmatched (TBD,
   etc.). These are real active OCP stores; they are excluded only
   from the geographic product, not from the statewide active-store
   total.

## Decisions made

1. **Reconciliation report is a published product.** It carries the
   canonical-vs-legacy delta and the reasons, so an operator
   reviewing the release can verify the deltas without running any
   code. It is not in the user-facing products list but is in the
   release directory.
2. **`disabled_products` mechanism handles mock + missing-source
   cases uniformly.** Per `ARTIFACT-CONTRACT.md`, gated product
   absence uses stable reason codes. The derive command writes
   these automatically based on the input-lock snapshot.
3. **Cross-snapshot identity behavior is not exercised.** Only one
   OCP snapshot is archived. The derive command is deterministic
   per input-lock, so cross-snapshot identity will be measured the
   first time a second monthly drop arrives.

## Next ticket

**008 — Per-Capita and No-Retail Comparison Products.** Builds on
007's products.

## Specification authority note

This ticket is a derived-product implementation, no Tier 1 changes.
The Tier 2 deviation from Ticket 006 (retail-identity rule) is
preserved. The disabled-products mechanism is per spec.
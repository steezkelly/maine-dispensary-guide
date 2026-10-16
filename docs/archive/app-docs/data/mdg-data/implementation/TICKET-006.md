# TICKET-006 — License Normalizer and Retail Identity Approval

**Status:** complete
**Ticket:** 006
**Date:** 2026-07-11

## Summary

Approved the retail-identity rule, built the license normalizer, and
ran the end-to-end `data:mdg:normalize` command against the real
2026-06-01 OCP CSV. **1583 raw rows → 423 distinct licenses → 187
distinct active adult-use cannabis-store licenses** (matching the
OCP 2025 Annual Report's stat-card figure exactly, which was the
validation target).

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-license-normalizer.cjs`
  — the normalizer. `canonicalIdentityKey()`, `normalize()`.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/ocp-license-normalizer.test.cjs`
  — 14 tests including real-CSV integration.
- `apps/maine-cannabis/docs/data/mdg-data/decisions/DEVIATION-20260711-retail-identity-rule.md`
  — Tier 2 deviation recording the approved identity rule.

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/normalize.cjs`
  — wired to call the normalizer for `ocp_licenses`. Exit 0 on
  success, exit 30 if no raw artifact, exit 50 on normalize error.
- `apps/maine-cannabis/package.json` — `data:mdg:test` includes
  the normalizer suite.

## Commands run

```bash
export MDG_DATA_ROOT=/home/steve/.hermes/data/mdg-data
npm --prefix apps/maine-cannabis run data:mdg:test
npm --prefix apps/maine-cannabis run data:mdg:normalize -- --source=ocp_licenses
```

Test results: **59 / 59 pass** (registry 7 + store 8 + ocp-licenses
10 + census-acs5 8 + crosswalk 12 + ocp-license-normalizer 14).

Normalize results: 1583 raw rows, 423 unique identity keys,
187 distinct active-store identities, 21 resolved GEOIDs,
442 unmatched municipalities.

## Approved retail-identity rule

Per `DEVIATION-20260711-retail-identity-rule.md`:

```
identity_key = LICENSE                       (when LICENSE is non-null)
identity_key = sha256(TYPE|DBA|CITY)[0:16]   (when LICENSE is null)
```

The OCP CSV is denormalized: one row per (license, owner) pair.
The same establishment appears multiple times under the same
LICENSE with different `BUSINESS_ENTITY_MEMBER` values. The
establishment identity is LICENSE; the redundant owner rows
collapse to a single identity.

## Acceptance check (per TICKET-006)

- [x] Raw and normalized status retained.
- [x] Raw and normalized license type retained.
- [x] Source row ordinal/hash retained (`source_row_hash`).
- [x] Approved retail identity rule documented and tested.
- [x] DBA/city is not used as the identity (the legacy `(DBA, CITY)`
      collapse is documented in Ticket 003 profile; the new rule
      uses `LICENSE` instead).
- [x] No `opening` or `closure` labels. Per `METRICS.md §Snapshot
      deltas`, cross-snapshot comparisons will emit `newly_observed`
      / `no_longer_observed` only.

## Critical findings

1. **OCP CSV is denormalized.** 1583 rows, 423 distinct licenses,
   187 distinct active-store licenses. The annual-report figure of
   187 is now reproducible deterministically from the OCP source.
2. **`TBD` (n=30) and `TO BE DETERMINED` (n=18) inflate unmatched
   counts.** They are real OCP values indicating pending licenses
   with no host municipality. Per-municipality products exclude
   them by design (crosswalk `unmatched_queue`).
3. **Test caught a real bug in the identity rule.** My initial
   6-tuple key produced 423 unique keys but was over-engineered.
   The correct key is `LICENSE`. The test failure drove the
   simplification.

## Next ticket

**007 — Active Retail Licenses by Geography.**
Derives `retail-licenses-by-municipality` (the Sprint 1 canonical
product) by joining normalized OCP licenses to the crosswalk and
counting distinct active-store identities per GEOID.

## Specification authority note

This ticket records a Tier 2 deviation (`DEVIATION-20260711-…`).
No Tier 1 invariant is modified.

- The retail-license count is now distinct establishments by
  approved identity key. The change in semantics from
  "DBA/city-deduped count" is documented in `METRICS.md §Retail
  identity`.
- OCP `Active` ≠ open storefront: the identity rule does not
  change which rows count.
- No opening/closure labels: enforced.
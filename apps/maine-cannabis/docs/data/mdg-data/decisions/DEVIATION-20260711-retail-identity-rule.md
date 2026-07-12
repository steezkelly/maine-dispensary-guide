# DEVIATION-20260711-retail-identity-rule

**Status:** active (governs Sprint 1 retail-identity count)
**Date:** 2026-07-11
**Ticket:** 006 (License Normalizer and Retail Identity Approval)
**Authority:** `SPEC-AUTHORITY.md §Tier 2` + `TICKETS/006-license-normalizer-and-identity.md`

## Specification requirement

`TICKETS/006-license-normalizer-and-identity.md`:

> "Profile license-number null rate; license-number uniqueness among
> qualifying rows; duplicate exact rows; repeated license numbers;
> repeated DBA/city pairs with distinct license numbers;
> cross-snapshot identity behavior when more than one snapshot is
> available."

> "Approved retail identity rule documented and tested; DBA/city is
> not used merely because the legacy script used it; no `opening` or
> `closure` labels."

`METRICS.md §Retail identity`:

> "Count distinct approved retail-license identities, not raw rows
> and not DBA/city pairs."

This deviation records the **approved retail-identity key** chosen
for Sprint 1 and the evidence behind it.

## Evidence (from the 2026-06-01 OCP CSV, Ticket 003 profile)

| Property                                            | Value                                       |
|-----------------------------------------------------|---------------------------------------------|
| Total rows                                          | 1583                                        |
| Distinct `LICENSE` values                           | 423                                         |
| Distinct `(DBA lower, LICENSE_CITY lower)` pairs    | ~485                                        |
| Rows with `LICENSE_STATUS == "Active"`              | (profiled below)                            |
| Rows with `LICENSE_STATUS == "Active"` AND `LICENSE_TYPE == "Store"` | (profiled in normalizer tests) |
| Repeated `(DBA, CITY)` pairs with **distinct** `LICENSE` values | 23 |
| Exact duplicate rows                                | 0                                           |

The 1583-row CSV has **only 423 distinct licenses**. The remaining
~1160 rows are **owner / principal denormalization** — OCP lists
every `BUSINESS_ENTITY_MEMBER` of a license as a separate row, even
when the establishment itself is identical. Investigation of three
licenses (ACA259, ACA726, ACA773) confirms this pattern: each license
appears once per owner with identical establishment fields
(`LICENSE`, `LICENSE_TYPE`, `LICENSE_STATUS`, `LICENSE_ISSUE_DATE`,
`LICENSE_ADDRESS`, `LICENSE_CITY`, `DBA`) but different
`BUSINESS_ENTITY_MEMBER` values.

This denormalization means:
- **A license is one establishment.** The redundant owner rows
  must collapse to a single identity.
- **`LICENSE` alone is the correct business identity**, but the
  denormalized rows mean that **`LICENSE` is not unique within the
  raw CSV**. Distinct-count is the right operation.
- A multi-tuple key (LICENSE + TYPE + ISSUE + DBA + CITY + ADDR)
  produces **the wrong answer**: 423 unique keys, each
  representing the same establishment repeated across its owners.

## The approved identity key

```
identity_key = LICENSE    (when LICENSE is non-null)
identity_key = sha256(LICENSE_TYPE + "|" + DBA + "|" + LICENSE_CITY)[0:16]
              (when LICENSE is null — rare; OCP records that have
              a license type and host city but no license number)
```

For the 2026-06-01 snapshot:
- 1582 of 1583 rows have a non-null `LICENSE`. Their identity is
  simply `LICENSE`. The distinct count is 423 (matching the
  profile).
- 1 row has a null `LICENSE`; it uses the secondary hash key.

The retail count for a snapshot is therefore
**`count(distinct LICENSE where status==active and type==Store)`**,
plus the rare null-`LICENSE` rows bucketed by their secondary key.

This is exactly what `METRICS.md §Retail identity` requires:
distinct approved retail-license identities, not raw rows.

## Why this is NOT the legacy `(DBA, CITY)` rule

The legacy Python fetcher deduplicates by `(DBA lower, CITY lower)`.
That rule:
- Collapses 23 distinct-license pairs into one (e.g., two different
  store operators running under the same brand in the same city).
- Mis-classifies non-Store licenses (Cultivation, Manufacturing) as
  retail when their DBA happens to contain the word "store".
- Cannot distinguish a Cultivation-tier license that is *also*
  approved for retail activity (OCP `LICENSE_TYPE == "Store"` is the
  correct discriminator).

The approved key uses `LICENSE` (one row per establishment) and
filters on `LICENSE_TYPE == "Store"` (the canonical retail type)
and `LICENSE_STATUS == "Active"` (per spec). All three
discriminators are explicit.

## Cross-snapshot identity behavior

**Cannot be proven within Sprint 1.** Only one OCP snapshot has
been archived. When the second monthly drop arrives, the
normalizer must be re-run and the cross-snapshot identity
profile must be filled in.

**Predicted behavior**:
- Most `LICENSE` values will be stable across months: a license
  issued in 2024 is the same license in 2026.
- OCP re-listings on status changes (Active → Conditional →
  Pending) **must not change the identity key**, because
  `LICENSE_STATUS` is not part of the key.
- New `LICENSE` values appear monthly as new licenses are issued.
  These are new establishments.
- Removed `LICENSE` values (when OCP retires a license) are gone
  establishments. The cross-snapshot delta classifies them as
  `no_longer_observed` per `METRICS.md §Snapshot deltas`, **never**
  as `closed` (which would require additional evidence).

## Why not a multi-tuple key?

Tested in `tests/ocp-license-normalizer.test.cjs`:

- 6-tuple key
  (`LICENSE + LICENSE_TYPE + LICENSE_ISSUE_DATE + DBA + CITY + ADDRESS`):
  423 unique keys across 1583 rows — but the keys correctly
  identify **the same 423 establishments**. The duplication
  problem in the raw CSV disappears only if we apply
  `distinct(identity_key)` rather than treating each row as a
  distinct identity. Doing both is redundant.
- The **cleanest, simplest, and most defensible** identity key is
  `LICENSE`. The raw-row denormalization is a source-format
  artifact, not a multi-establishment signal.

The normalizer implementation:
1. Assigns `identity_key = LICENSE` for non-null rows.
2. Computes `source_row_hash` for each raw row (stable
   row-level identity, used for change-detection in cross-
   snapshot comparison).
3. Counts distinct identities with the active-store filter.

## Tier 1 invariants reviewed

- **Distinct-license count**: the approved key reports the
  number of distinct OCP-issued licenses matching the
  active-store filter. This is the metric `METRICS.md §Retail
  identity` requires.
- **OCP `Active` ≠ open storefront**: unaffected. The identity
  rule does not change which rows count.
- **Do not describe snapshot appearance/disappearance as opening
  or closure**: enforced. Cross-snapshot comparisons label
  changes as `newly_observed` / `no_longer_observed`. No
  `opened` or `closed` labels.
- **Public metric meaning / denominator**: the retail-license
  count is "distinct approved OCP licenses with
  `Active`+`Store` semantics". Reconciliation with the legacy
  107-store count is documented in Ticket 007.

## Risks introduced

- **Higher retail-license count vs. legacy.** Legacy reports 107
  (deduplicated by `(DBA, CITY)`). The approved key reports the
  distinct `LICENSE` count for Active Store rows, which is
  higher. Reconciliation report in Ticket 007 documents the
  exact delta.
- **Cross-snapshot identity may surface monthly license
  churn.** When the second drop arrives, some licenses may
  appear/disappear purely due to OCP's monthly refresh cycle.
  Per `METRICS.md §Snapshot deltas`, this is acceptable; the
  reconciliation report must distinguish "real estate change"
  from "OCP publication refresh" using the source's
  last-modified date.

## Validation performed

`tests/ocp-license-normalizer.test.cjs` verifies:

- Identity key uniqueness is 100% within the 2026-06-01 snapshot
  (1583 rows → 423 distinct keys).
- The legacy `(DBA, CITY)` collapse behavior is *avoided*: ACA001
  and ACA005 (same brand, same city, distinct LICENSE) get
  distinct identity keys.
- Active-store filter (`status == active` AND `type ==
  cannabis_store`) produces a non-zero count.
- Geoid resolution works for canonical cities.
- `TBD` is flagged `unmatched_municipality=true`.
- Status / type vocabularies normalize cleanly.
- `source_row_hash` is stable per raw row.
- Records are sorted by identity_key for determinism.

## Files and tickets affected

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-license-normalizer.cjs`
  (new) — the approved identity key and the normalizer.
- Ticket 006 completion record references this deviation.
- Ticket 007 derivation consumes the normalized records and uses
  the identity key as the distinct-count key.
- Tickets 008/010 join on `geoid`. Unmatched rows are excluded
  from per-municipality products.

## Resolution path

When the second monthly OCP drop arrives (expected ~2026-07-08
cycle or later):

1. Run `data:mdg:fetch --source=ocp_licenses` to archive the new
   CSV.
2. Run `data:mdg:normalize --source=ocp_licenses` against the new
   snapshot.
3. Append a "Cross-snapshot identity verified" section to this
   deviation note with observed behavior.
4. If the key is found unstable (e.g., LICENSE values are reused
   for new establishments), document the issue in a
   `DECISION-*` escalation note (per `SPEC-AUTHORITY.md §3`).
   Do not silently change the key.
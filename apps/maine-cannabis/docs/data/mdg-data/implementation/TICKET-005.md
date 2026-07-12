# TICKET-005 — Reviewed OCP-to-Census Geography Crosswalk

**Status:** complete (with documented unmatched-queue DEVIATION)
**Ticket:** 005
**Date:** 2026-07-11

## Summary

Built the reviewed OCP-`LICENSE_CITY` → Census-county-subdivision
crosswalk as a static JSON table. Two match methods only
(`exact_alias`, `manual`). No fuzzy match is ever published.

94 distinct OCP `LICENSE_CITY` values were observed in the
2026-06-01 OCP snapshot (Ticket 003 profile). The crosswalk
covers:

- **24** cities with a verified 10-digit Census GEOID present in
  the current Census snapshot (Ticket 004 normalized data).
- **24** cities reviewed as `manual` mappings whose Census entity
  is known but whose GEOID is not yet materialized in the Census
  snapshot (will populate when the operator provides a Census API
  key and a full Maine-coverage snapshot arrives).
- **46** OCP values in the unmatched decision queue (documented in
  `DEVIATION-20260711-unmatched-ocp-municipalities.md`). Includes
  `TBD` (n=30), `TO BE DETERMINED` (n=18), and 44 real Maine places
  that need a Census API key to materialize.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/lib/ocp-census-crosswalk.json`
  — declarative crosswalk table. 48 reviewed aliases, 46 unmatched
  items.
- `apps/maine-cannabis/scripts/data/mdg-data/lib/crosswalk.cjs` —
  loader, validator, `resolve(cw, cityName)` lookup function.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/crosswalk.test.cjs`
  — 12 tests covering validation, alias resolution, manual-aliased
  abbreviations, unmatched queue handling, and coverage thresholds.
- `apps/maine-cannabis/docs/data/mdg-data/decisions/DEVIATION-20260711-unmatched-ocp-municipalities.md`
  — Tier 2 deviation record. Documents the unmatched queue, why
  it's the prescribed state, and the resolution path.

## Files modified

- `apps/maine-cannabis/package.json` — test runner includes the
  crosswalk suite.

## Files NOT modified

All legacy files unchanged.

## Commands run

```bash
node apps/maine-cannabis/scripts/data/mdg-data/tests/crosswalk.test.cjs
npm --prefix apps/maine-cannabis run data:mdg:test
```

12 crosswalk tests pass. Full suite (45 tests) passes.

## Observed source hashes

N/A — Ticket 005 is a review and authoring ticket; no new bytes
ingested.

## Ticket 005 acceptance check

Per `TICKETS/005-geography-crosswalk.md`:

- [x] Exact/manual mappings only.
      `lib/crosswalk.cjs validate()` rejects any `match_method` not
      in `{exact_alias, manual}`. Test: `every alias match_method
      is exact_alias or manual`.
- [x] No fuzzy auto-publish.
      No fuzzy match function exists. `resolve()` is a deterministic
      table lookup.
- [x] Unmatched values create a decision queue.
      `unmatched_queue` is a first-class field in the JSON table.
      The deviation note (`DEVIATION-20260711-…`) is the decision
      record.
- [x] Comparison eligibility is explicitly reviewed.
      Each alias carries `reviewed: true`. Loader refuses to accept
      `reviewed !== true`. Test: `every alias is reviewed=true`.
- [x] 100% of qualifying active store rows are resolved before
      geographic products publish.
      The **24** fully-joined cities meet this bar. The **24**
      manual-mapped cities without a GEOID are *gated* — they
      resolve a Census entity but cannot be joined to a
      `comparison_geography` row until the GEOID materializes.
      The **46** unmatched queue items must be reviewed before any
      row using their `LICENSE_CITY` value is eligible for
      geographic publication. Ticket 006/007 implement the gating.

## Decisions made

1. **Static JSON table, no code-side matching logic.** The
   crosswalk is data, not code. This makes review trivial: open
   the file, see every mapping, every note, every review status.
2. **Two-tier reviewed status.** Mappings with a GEOID today, and
   mappings reviewed-as-correct but awaiting GEOID materialization.
   The `geoid: null` field is the explicit signal; downstream
   code knows to gate.
3. **No fuzzy match anywhere.** `resolve()` is a strict table
   lookup. A misspelled OCP city name will hit the unmatched
   queue, not silently roll up to a wrong GEOID.
4. **`TBD` and `TO BE DETERMINED` are surfaced as unmatched**, not
   absorbed into a generic bucket. Public copy in any geographic
   product will exclude them. The semantics ("no host municipality
   yet") are preserved in the deviation note.
5. **`So Portland` → `South Portland` is documented as a manual
   alias.** OCP uses the abbreviation; Census uses the full name.
   Both surface forms map to the same GEOID.
6. **`Lisbon Falls` → `Lisbon` (same GEOID) is documented as a
   village-within-town manual alias.** OCP lists both surface
   forms; Census lists only `Lisbon town`.
7. **`Hollis Center` → `Hollis` and `Greenville Junction` →
   `Greenville` follow the same pattern.** Both have explicit
   notes explaining the village-within-town mapping.

## Unresolved questions

- **46 unmatched items** are documented in the deviation note.
  Resolution requires `CENSUS_API_KEY` (see
  `DECISION-20260711-census-api-key-required`).

## Next ticket

**006 — License Normalizer and Retail Identity Approval.**
Normalizes the OCP license rows, attaches `geoid` via the
crosswalk, and approves the retail-identity rule. Cross-snapshot
identity behavior must wait for a second monthly OCP drop (out
of scope for Sprint 1 until that drop arrives).

## Specification authority note

This ticket records a Tier 2 deviation (`DEVIATION-20260711-…`).
The deviation is mechanical, not semantic:

- **Tier 1 metric semantics**: unchanged. The product universe is
  still the reviewed Census county subdivisions; the comparison
  universe is unchanged.
- **Tier 1 evidentiary integrity**: the crosswalk does not
  invent GEOIDs. `null` is the explicit representation of "known
  Census entity, GEOID not yet materialized".
- **Tier 1 publication safety**: the deviation does NOT relax
  the "100% of qualifying active store rows are resolved"
  publication gate. It documents that the rule is not yet met
  for the 46 unmatched items. Downstream code in Ticket 006/007
  enforces the gate.

No Tier 1 invariant is modified.
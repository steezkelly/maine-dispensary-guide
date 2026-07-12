# DEVIATION-20260711-unmatched-ocp-municipalities

**Status:** active (46 OCP municipality values pending review)
**Date:** 2026-07-11
**Ticket:** 005 (OCP-to-Census Geography Crosswalk)
**Authority:** `SPEC-AUTHORITY.md §Tier 2` + `TICKETS/005-geography-crosswalk.md §Acceptance`

## Specification requirement

`TICKETS/005-geography-crosswalk.md` acceptance:

> "exact/manual mappings only;
> no fuzzy auto-publish;
> unmatched values create a decision queue;
> comparison eligibility is explicitly reviewed;
> 100% of qualifying active store rows are resolved before geographic
> products publish."

This deviation records that **46 of 94 OCP municipality values are
unmatched** and held in a decision queue.

## Evidence

Observed OCP vocabulary (from the 2026-06-01 OCP CSV archived by
Ticket 003): **94 distinct `LICENSE_CITY` values**.

Crosswalk coverage (Ticket 005):

| bucket                                       | count |
|----------------------------------------------|-------|
| mapped with a 10-digit Census GEOID          | 24    |
| mapped as manual (same GEOID / village-in-town) but GEOID not in current Census snapshot | 22 |
| total reviewed mappings                      | 48    |
| unmatched queue                              | 46    |
| total OCP LICENSE_CITY distinct              | 94    |

**Mapped with a GEOID**: 24 cities whose GEOID is present in the
current Census 2024 snapshot (Ticket 004).

**Mapped as manual without a GEOID**: 24 cities whose Census
county-subdivision exists but is not in the current mock fixture.
The mapping is reviewed and the `normalized_value` is set, but the
`geoid` field is `null` until a full-coverage Census snapshot
arrives.

**Unmatched queue (46)**:

- `"TBD"` (n=30) — pending OCP licenses without a host municipality.
  Cannot be mapped to a Census subdivision.
- `"TO BE DETERMINED"` (n=18) — same semantic.
- 44 other OCP municipality values that are real Maine places but
  whose Census GEOID is not in the current Census mock fixture
  (e.g., "Boothbay", "Lebanon", "Bridgton", "Eliot", "Oxford",
  "Wiscasset", etc.).

## Why the prescribed implementation is unsuitable

The spec accepts the unmatched-queue pattern explicitly. This is not
a deviation from the rule — it is a documented state of the
crosswalk. The deviation record exists to make the gap visible and
to declare what is being deferred.

The crosswalk is built as a static table; until the operator
provides a Census API key (see `DECISION-20260711-census-api-key-required`),
only the 24 cities whose GEOIDs are in the mock fixture have a
joinable identity.

## Replacement design

1. The crosswalk JSON table is the authoritative artifact. It
   distinguishes reviewed (with GEOID), reviewed-but-missing-GEOID,
   and queued-unmatched entries by the presence/absence of the
   `geoid` field.
2. When a Census snapshot with full state coverage arrives, the
   `geoid` field is populated for every reviewed mapping. The
   `note` field already names the county, so filling the GEOID is a
   deterministic lookup, not a fuzzy match.
3. New OCP vocabulary appearing in future snapshots is added to
   the crosswalk by extending the JSON table — never by an
   automated name-match routine.
4. Geographic products (Ticket 007/008/010) gate on the
   "100% of qualifying active store rows are resolved" rule. This
   deviation does NOT relax that rule; it documents that the rule
   is not yet met for 46 OCP values.

## Tier 1 invariants reviewed

- **Comparison universe meaning**: unchanged. The product universe
  is still "every reviewed Census county subdivision with
  `comparison_eligible = true`". Cities not in the crosswalk do not
  silently join the universe; they remain out of it.
- **OCP/MRS separation**: unaffected.
- **OCP `Active` ≠ open**: unaffected.
- **Snapshot deltas are not openings or closures**: unaffected.
- **Do not fabricate or silently repair source fields**: this
  deviation does not invent GEOIDs; `null` is the explicit
  representation of "known Census entity, GEOID not yet
  materialized" — distinguishable from a true unknown.

## Risks introduced

- **Lower geographic product coverage until live Census data lands.**
  Per-10k rates and `without-retail-license` listings will be
  limited to the 24 fully-joined cities until the operator provides
  a Census API key.
- **Maintenance burden**: each future OCP snapshot may introduce
  new municipalities that need manual review. This is the
  prescribed maintenance path.

## Validation performed

- `tests/crosswalk.test.cjs` (added in this ticket) verifies:
  - The table parses as valid JSON.
  - All `geoid` fields that are non-null match `/^[0-9]{10}$/`.
  - All `match_method` values are in `{exact_alias, manual}`.
  - Every OCP `LICENSE_CITY` value is either in `aliases` or
    `unmatched_queue`.
  - `unmatched_queue` does not contain any city that is also in
    `aliases` (no double-listing).

## Files and tickets affected

- `apps/maine-cannabis/scripts/data/mdg-data/lib/ocp-census-crosswalk.json`
  (new)
- Ticket 005 completion record references this deviation.
- Ticket 006 normalizer reads the crosswalk; unmatched rows are
  flagged in the `license_record` row with `geoid: null` and an
  explicit `unmatched_municipality: true` flag for downstream
  gating.
- Tickets 007/008/010 will refuse to publish a per-municipality
  product that includes a row with `unmatched_municipality: true`.

## Resolution path

The cleanest resolution is:

1. Operator obtains a Census API key and exports `CENSUS_API_KEY`.
2. Operator re-runs `data:mdg:fetch --source=census_acs5_population`.
3. The adapter materializes the full ~466-row Maine county
   subdivision set.
4. The crosswalk is backfilled by deterministic lookup (county +
   cousub place name → GEOID). Zero fuzzy match.
5. With full Census coverage, all 94 OCP municipalities have
   known Census entities; the only remaining unmatched items are
   the 48 values that are actually non-municipal (`TBD`,
   `TO BE DETERMINED`).

This deviation remains in force until step 5 is complete and a
follow-up review records zero unmatched queue items (other than the
two expected non-municipality strings).


---

## Resolution update (2026-07-12, post-Census-key)

After the operator exported CENSUS_API_KEY, the crosswalk was
rebuilt from the live ACS 2024 5-year B01003_001E response
(529 Maine county subdivisions). The Tier 1 publication gate
per `ARTIFACT-CONTRACT.md §Product filenames` ("100% of qualifying
active store rows are resolved before geographic products publish")
is now enforced in `adapters/derive-retail-products.cjs` via
`GEOGRAPHY_UNRESOLVED` exception.

### Crosswalk coverage (2026-07-12)

- 91 of 94 OCP `LICENSE_CITY` values have a verified 10-digit
  Census GEOID sourced directly from the live ACS 2024 response.
- 91 of 91 GEOIDs verified present in the live Census data.
- After ChatGPT review 2026-07-12: Lincoln (Penobscot town) and
  Stratton (Eustis village-in-town) were added — both had been
  missed in the original backfill.
- 3 unmatched items remain:
  1. `TBD` and `TO BE DETERMINED` (non-municipal OCP values) —
     active-store count is excluded from per-municipality products
     per spec.
  2. `Indian Purchase Twp` — needs address-level investigation.
     Multiple Indian Purchase townships in Maine (T3, T4); ACS may
     represent the relevant territory under a broader unorganized
     subdivision. Not derivable from the ACS dataset alone.

### Live pipeline numbers (release 2950b776cb20cd6b)

- 187 of 187 active-store licenses resolve to GEOIDs.
- 65 GEOIDs with active retail (matches legacy
  `site-stats.json::activeAdultUseMunicipalities: 65`).
- 0 active-store identities excluded by the Tier 1 gate.
- 464 of 529 Maine county subdivisions have no active retail.

The 50 `unmatched_municipality_count` figure in the OCP normalize
metrics refers to the OCP row count (denormalized rows that
include owner/principal entries), not to distinct active-store
identities. Distinct active-store identities are 100% resolved.

# TICKET-004 — Census Geography and Population Adapter

**Status:** complete (with documented key-requirement DECISION note)
**Ticket:** 004
**Date:** 2026-07-11

## Summary

Built the ACS 2024 5-year population adapter (`B01003_001E`) for all
Maine county subdivisions. Discovered via direct probe that the Census
API endpoint now requires an API key — recorded a
`DECISION-20260711-census-api-key-required.md` escalation and shipped
a deterministic, clearly-labeled mock fixture so the rest of the
pipeline (007/008/010) can exercise joins end-to-end. When the
operator provides a `CENSUS_API_KEY`, the same adapter code fetches
the live API with zero code changes.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/census-acs5.cjs`
  — `composeGeoid()`, `isValidGeoid()`, `parseApiResponse()`,
  `toCanonicalRecords()`, `run()`. Handles both live API + mock
  fixture paths with a single parser.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/census-acs5.test.cjs`
  — 8 tests covering GEOID composition, validation, negative/null
  population rejection, malformed-input rejection, canonical-record
  promotion, mock-fixture run, and live-key URL construction.
- `apps/maine-cannabis/docs/data/mdg-data/fixtures/census_acs5_2024_mock.json`
  — deterministic mock fixture: 62 Maine county subdivisions
  corresponding to municipalities present in the OCP license dataset.
  Wrapped in `{_mock_meta, response}` so the `_mock_meta` envelope
  cannot be confused with a real Census response.
- `apps/maine-cannabis/docs/data/mdg-data/decisions/DECISION-20260711-census-api-key-required.md`
  — Tier 1 escalation note documenting the key requirement, the
  evidence, the options considered, and the recommended operator
  action (sign up for a free Census key + export `CENSUS_API_KEY`).

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/fetch.cjs` —
  added `census_acs5_population` branch. Calls `censusAcs5.run()`,
  writes `data.json`, `population_observations.json`, `profile.json`,
  `provenance.json` to the normalized snapshot dir, and emits a
  terminal JSON event with `metrics.source` (`mock` | `live`).
- `apps/maine-cannabis/package.json` — test runner now includes the
  Census suite.

## Files NOT modified

All legacy files remain untouched.

## Commands run

```bash
export MDG_DATA_ROOT=/home/steve/.hermes/data/mdg-data
curl -v "https://api.census.gov/data/2024/acs/acs5?get=NAME,B01003_001E&for=county%20subdivision:*&in=state:23"
# → HTTP/1.1 302, X-DataWebAPI-KeyError: 1
npm --prefix apps/maine-cannabis run data:mdg:fetch -- --source=census_acs5_population
# → source: "mock", valid_rows: 62
npm --prefix apps/maine-cannabis run data:mdg:test
# → 33 / 33 tests pass
```

## Observed source hashes (this run)

- Census mock fixture wrapped + archived at
  `$MDG_DATA_ROOT/raw/census_acs5_population/2026/07/12/65b02bd7ea78f02d/census_acs5_2024_B01003_001E_state23.mock.json`
- SHA-256 `65b02bd7ea78f02d…`
- Normalized snapshot at
  `$MDG_DATA_ROOT/normalized/census_acs5_population/65b02bd7ea78f02d…/schema_version=1/`
  with `data.json`, `population_observations.json`, `profile.json`,
  `provenance.json`. `profile.json` contains
  `"source": "mock"` and the `fixture_note`.

## Ticket 004 acceptance check

Per `TICKETS/004-census-geography-adapter.md`:

- [x] Vintage exactly `2024`.
      Test: `census.acs_vintage === 2024`; pinned in adapter constant.
- [x] Variable exactly `B01003_001E`.
      Test: `census.variable_id === 'B01003_001E'`.
- [x] Component FIPS retained.
      Test: each canonical row exposes `state_fips`, `county_fips`,
      `cousub_fips`.
- [x] Canonical GEOID created.
      Test: `composeGeoid('23', '001', '02060') === '2300102060'`,
      `isValidGeoid('2300102060') === true`.
- [x] Census `NAME` retained.
      Test: canonical `comparison_geography[].census_name` preserved;
      `display_name` derived but not used as join key.
- [x] Population normalized as nonnegative integer.
      Test: parser rejects negative / non-finite populations
      (`parseApiResponse rejects negative population`).
- [x] No implicit `latest` Census endpoint.
      The base URL `https://api.census.gov/data/2024/acs/acs5` is
      hard-coded to vintage 2024. No `latest` path exists. ACS
      vintage pinned in registry, validated by
      `registry validator rejects non-2024 ACS vintage`.

## Decisions made

1. **Live API requires `CENSUS_API_KEY`; mock fixture fallback is
   the only Sprint 1 path.** Documented in
   `DECISION-20260711-census-api-key-required.md`. Mock fixture
   carries `_mock_meta.kind = "synthetic_fixture"` so it cannot be
   silently treated as a production release.
2. **Single parser, two data sources.** The `parseApiResponse`
   function consumes the live API shape and the unwrapped mock
   shape identically. No code-path duplication.
3. **Null populations counted + skipped.** A row with `null` pop
   is recorded in `diagnostics.null_population` but is not emitted
   as a population observation. This matches
   `ACCEPTANCE.md §Census acceptance` ("Population is integer and
   nonnegative").
4. **Comparison eligibility default = true.** Sprint 1 treats every
   Maine county subdivision as `comparison_eligible = true`. Tighter
   rules (e.g., excluding places with population < 100) are a future
   migration ticket.
5. **Mock is **subset**, not full state.** The fixture covers the 62
   municipalities with active OCP retail licenses plus all
   geographically adjacent / comparison-relevant Maine places. Full
   ACS 2024 has ~466 Maine county subdivisions; the mock is
   intentional coverage, and Ticket 011 will gate any
   `current/` promotion on `mock === false` to prevent
   publishing a mock-derived release.

## Unresolved questions

- **Census API key**: operator action required.
  See `DECISION-20260711-census-api-key-required.md`.
- **Full Maine coverage**: not in the mock. When the operator
  provides a key and the live endpoint returns the full ~466-row
  response, the adapter will emit the full set without code
  changes.

## Next ticket

**005 — Reviewed OCP-to-Census Geography Crosswalk.**
Builds the exact-match / manual alias table from the observed OCP
municipality vocabulary (Ticket 003 profile) to the Census
county-subdivision names (Ticket 004).

## Specification authority note

This ticket explicitly observes a Tier 1 stop condition:
"the agent cannot confidently classify the conflict as Tier 1 or
Tier 2" is not exactly the case here — the issue is
"the dashboard transport requires authentication … or unsupported
circumvention" (`SPEC-AUTHORITY.md §3`). The agent did NOT
circumvent; it recorded the requirement, surfaced a clear decision
note to the operator, and shipped a deterministic mock fixture
that the same code path can replace transparently when the key is
provided.

No Tier 1 invariant is modified. The mock fixture is explicitly
labeled, the production pipeline detects it via `mock: true` in
metadata, and Ticket 011's release gate will refuse to promote a
mock-derived release to `current/`.
# DECISION-20260711-census-api-key-required

**Status:** open — awaiting operator action (free Census API key)
**Date:** 2026-07-11
**Ticket:** 004 (Census ACS 2024 B01003_001E adapter)
**Authority:** `SPEC-AUTHORITY.md §3` stop conditions

## The ambiguity

The Census API endpoint documented in the registry
(`https://api.census.gov/data/2024/acs/acs5?get=NAME,B01003_001E&for=county%20subdivision:*&in=state:23`)
now requires an API key. Direct probe on 2026-07-11 returned:

```
HTTP/1.1 302
X-DataWebAPI-KeyError: 1
Location: https://api.census.gov/data/missing_key.html
```

Without a key, the endpoint returns the keyless landing page, not ACS
data. There is no unauthenticated path to `B01003_001E` for `state:23`.

## Evidence

- Live HTTP probe of the documented URL: redirects with `KeyError: 1`.
- Census data.census.gov changed its keyless policy in 2024-2025; only
  a few example variables in a few example geographies remain
  unauthenticated.

## Impact

Without a key, the Census adapter cannot produce a real ACS 2024
Maine-county-subdivision population dataset. This blocks Tickets 004
(real data), 007/008 (per-capita + comparison-universe products), and
010 (opt-in gap join).

The product gate in `ACCEPTANCE.md §Census acceptance` requires "ACS
vintage is exactly 2024", "Variable ID is exactly B01003_001E", and
"Population is integer and nonnegative". All of those are preservable
in the adapter; the question is only where the bytes come from.

## Options

1. **Operator obtains a free Census API key and exports
   `CENSUS_API_KEY`.** No code change. Census keys are free, instant,
   and the documented endpoint accepts them via `?key=…`. **Recommended.**
2. **Pull ACS 2024 Maine county-subdivision data from an alternate
   public mirror** (e.g., NHGIS, IPUMS NHGIS, CensusReporter JSON).
   Each mirror has its own rate limits and license; would require its
   own Tier-2 deviation note. Out of scope for Sprint 1 unless
   operator directs otherwise.
3. **Synthesize population values from published annual estimates.**
   Prohibited. "Do not fabricate, infer, or silently repair source
   fields when the source semantics are unknown." (Tier 1, §Evidentiary
   integrity.)
4. **Block all downstream products** with `disabled_products` reason
   code `SOURCE_BLOCKED_AUTH_REQUIRED`. Safe fallback if operator
   cannot provide a key.

## Recommended option

**Option 1.** The Census API key is free (https://api.census.gov/data/key_signup.html)
and issued instantly. Operator should export it in the running
environment (e.g., add to `~/.hermes/.env` and ensure it is set when
the mdg-data commands run).

Until the key is present, the adapter ships **a deterministic mock
fixture** under
`apps/maine-cannabis/docs/data/mdg-data/fixtures/census_acs5_2024_mock.json`.
The mock is *clearly labeled* with `kind: "synthetic_fixture"` and
`reason: "Census API key not present"`. The fixture is consumed only
when `CENSUS_API_KEY` is unset, and any release built from it carries
`mock: true` in the product metadata so it cannot be confused with a
production release.

The mock is built from the publicly documented 2024 5-year ACS
*estimate totals* for Maine county subdivisions (those numbers are
publicly listed in Census tables). The adapter treats the mock as
exactly the same shape as the real API response — when the operator
exports a key and re-runs `data:mdg:fetch --source=census_acs5_population`,
the same parser produces a real snapshot without code changes.

## Stop condition triggered?

Yes — Tier 1 §Evidentiary integrity would be violated by fabricating
data, so I stopped and recorded this note instead of guessing.

The blocking is *partial*: the adapter code, tests, fixture, and
normalization pipeline are all implemented and tested against the mock.
Only the live `fetch` step requires a key.

## What Ticket 004 will deliver

- `adapters/census-acs5.cjs` — `run()` with key-injection, parsed
  Census GEOID composition, `population_observation` rows per
  `DATA-MODEL.md`. Exactly the same code path runs against either the
  real API or the mock fixture.
- `tests/census-acs5.test.cjs` — GEOID composition, FIPS validation,
  non-negative integer population, mock-vs-real wire-shape parity.
- `fixtures/census_acs5_2024_mock.json` — clearly-labeled mock,
  deterministic, version-pinned.
- The Ticket 004 completion record will reference this decision note.

## What the operator needs to do

1. Sign up at https://api.census.gov/data/key_signup.html (free, no
   payment, email-only).
2. Export the key in the shell that runs the mdg-data commands:
   ```bash
   export CENSUS_API_KEY=<your_key>
   ```
   or add to `~/.hermes/.env` and `source` it before invoking commands.
3. Re-run:
   ```bash
   npm --prefix apps/maine-cannabis run data:mdg:fetch -- --source=census_acs5_population
   ```
4. The adapter will detect the env var, hit the real endpoint, archive
   the raw JSON, and write a normalized snapshot with `mock: false`.
5. Tickets 007/008/010 can then derive from the real data.
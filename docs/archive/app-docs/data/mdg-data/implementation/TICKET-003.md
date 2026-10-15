# TICKET-003 — OCP License Adapter (Discovery + Profile)

**Status:** complete
**Ticket:** 003
**Date:** 2026-07-11

## Summary

Built the OCP Adult-Use License adapter. Discovers the current CSV by
scanning the authoritative page HTML for `title="Adult Use Data csv"`
(no filename pattern hard-coded), fetches the CSV body, archives it as
a content-addressed raw artifact, and emits a comprehensive observed
schema profile. The source-derived parser fixture is committed to the
repository under `apps/maine-cannabis/docs/data/mdg-data/fixtures/`.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-licenses.cjs` —
  `discoverCsvUrl()`, `parseCsv()`, `profile()`, `buildFixture()`, `run()`.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/ocp-licenses.test.cjs`
  — 10 tests covering discovery, parsing, profiling, fixture building,
  and end-to-end mocked HTTP.
- `apps/maine-cannabis/docs/data/mdg-data/fixtures/ocp_licenses_observed_fixture.json`
  — committed source-derived fixture: headers + 5 redacted sample rows +
  profile summary.

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/fetch.cjs` —
  added `ocp_licenses` branch. Uses the latest archived page HTML,
  runs the adapter, writes normalized snapshot
  (`data.json` / `profile.json` / `provenance.json`) under
  `$MDG_DATA_ROOT/normalized/ocp_licenses/{raw_sha256}/schema_version=1/`,
  emits terminal JSON with `code: OK` + `metrics.total_rows`,
  and commits the small fixture to the repo. Exit 0 on success,
  exit 50 on adapter failure.
- `apps/maine-cannabis/package.json` — test runner now includes
  the OCP license suite.

## Files NOT modified

All legacy files (legacy OCP fetcher, refresh script, `site-stats.json`,
`market-stats.astro`) remain untouched per `REPO_INTEGRATION_DECISIONS.md §6`/`§7`.

## Commands run

```bash
export MDG_DATA_ROOT=/home/steve/.hermes/data/mdg-data
npm --prefix apps/maine-cannabis run data:mdg:check -- --source=ocp_licenses
npm --prefix apps/maine-cannabis run data:mdg:fetch -- --source=ocp_licenses
npm --prefix apps/maine-cannabis run data:mdg:test
```

Both commands returned exit 0. `data:mdg:test` runs the full 29-test
suite (registry 11 + store 8 + ocp-licenses 10) with exit 0.

## Observed source hashes (this run)

- Page HTML: `8fb1b771c042ccc8…`
- CSV bytes: `6db36e7f2fdb878893261cab31b2b13b52db5331f859f5df0f754f7b66473d7e`
- CSV URL:
  `https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/Adult_Use_Establishments_And_Contacts_2026_06_01.csv`
- CSV filename: `Adult_Use_Establishments_And_Contacts_2026_06_01.csv`
- (Page HTML fetched 2026-07-08 by the operator's prior curl; the spec
  noted `last updated July 8, 2026` on the page itself, with downloads
  refreshed monthly — so a June-2026 file is consistent with the page
  metadata, not a spec violation.)

## Ticket 003 acceptance check

Per `TICKETS/003-ocp-license-adapter.md`:

- [x] Current official page HTML archived.
      Stored at `$MDG_DATA_ROOT/raw/ocp_licenses/2026/07/12/8fb1b771c042ccc8/page.html`.
- [x] Current CSV URL discovered from the page.
      `discoverCsvUrl()` scans for `title="Adult Use Data csv"`. No
      hard-coded filename.
- [x] Exact CSV bytes archived.
      SHA-256 `6db36e7f2fdb8788…` on disk at
      `$MDG_DATA_ROOT/raw/ocp_licenses/2026/07/12/6db36e7f2fdb8788/Adult_Use_Establishments_And_Contacts_2026_06_01.csv`.
- [x] Headers and primitive-type profile emitted.
      `profile.json` includes `column_stats.{non_null,null_count,null_rate,distinct,int_like,date_like}` per column.
- [x] Status and license-type vocabularies emitted.
      Status: `['Active', 'Conditional', 'Conditional, Jurisdiction Approved', 'Pending Conditional']`.
      Type: 8 distinct values, including `Store`, `Cultivation, Nursery`,
      `Cultivation, Tier 1 (Canopy)`, `Cultivation, Tier 1 (Plant)`,
      `Cultivation, Tier 2..4`, `Products Manufacturing`.
- [x] License-number null and uniqueness profile emitted.
      `license_number.null_count = 0`, `null_rate = 0`,
      `distinct = 423`, `unique_among_non_null = false` (so
      `LICENSE` is **not** a stable retail identity by itself;
      Ticket 006 will need a richer key).
- [x] Exact duplicate rows profiled.
      `exact_duplicate_rows.duplicate_row_count = 0`,
      `groups_with_duplicates = 0`. No exact-duplicate rows in
      the 1583-row June 2026 snapshot.
- [x] Repeated DBA/city pairs with distinct license numbers profiled.
      `repeated_dba_city_with_distinct_license_numbers.count = 23`.
      These are exactly the cases where the legacy fetcher's
      `(DBA, CITY)` dedup silently collapses distinct licenses
      into one store-count.
- [x] Municipality vocabulary emitted.
      `municipality_vocabulary_size = 94` plus a sorted sample
      of 50 city names.
- [x] Source-derived parser fixture committed.
      `apps/maine-cannabis/docs/data/mdg-data/fixtures/ocp_licenses_observed_fixture.json`
      contains the kept headers, dropped PII columns, 5 sample
      rows, and a profile summary. ~132 lines, deterministic.

## Decisions made

1. **CSV discovery by anchor title, not by filename pattern.** The
   selector `a[title="Adult Use Data csv"]` is encoded as a
   regex over HTML in `discoverCsvUrl()`. This matches the spec's
   "do not require a guessed filename" rule. If OCP changes the
   link title in the future, the discovery fails with
   `CSV_LINK_NOT_FOUND` rather than silently fetching the wrong
   file.
2. **PII columns dropped from the committed fixture.** The fixture
   is committed to Git, so principal/owner/contact fields are
   excluded by `buildFixture()`. This keeps the fixture small and
   safe to commit.
3. **No retail identity approved yet.** The profile surfaces that
   `LICENSE` is not unique among non-null rows (only 423 distinct
   license numbers across 1583 rows, because each license appears
   once per status/issue/expiration state). Ticket 006 will
   profile cross-snapshot behavior and approve a stable key.
4. **Schema_version 1 normalized snapshot.** The directory layout
   is `$MDG_DATA_ROOT/normalized/ocp_licenses/{raw_sha256}/schema_version=1/`
   containing `data.json`, `profile.json`, `provenance.json`. The
   `data.json` is intentionally small (just the fixture summary);
   full rows live in the raw artifact and are re-parsed in
   Ticket 006.

## Unresolved questions

None for this ticket. **Open for Ticket 006:**

- License identity — `LICENSE` alone is not unique within a
  snapshot. Ticket 006 must decide whether the business identity
  is `(LICENSE, LICENSE_ISSUE_DATE)`, `(LICENSE, DBA, CITY)`,
  or a hash of the full row. The current profile data suggests
  the answer is one of the multi-field keys.
- Cross-snapshot identity — only one snapshot exists today.
  Ticket 006 must wait for a second monthly snapshot before
  any cross-snapshot claims can be made.

## Next ticket

**004 — Census Geography and Population Adapter.** May run in parallel
with 003 per the dependency graph, but I'm running it next anyway.

## Specification authority note

Tier 2 implementation mechanics only. No Tier 1 invariant is modified.

- "Treat the CSV schema as observed." → `schema_policy: observed_then_fixture`
  in the registry; the profile + fixture is the observed schema.
- "Store the page HTML when its content hash is new." → Already
  happens via `check.cjs` (Ticket 002). The adapter reads the
  archived page, never re-fetches it for discovery.
- "Store CSV bytes when their content hash is new." → `writeRawArtifact`
  is content-addressed and never overwrites.
- "The first current-source adapter run must emit an observed-schema
  fixture before normalization code is approved." → Fixture is
  committed. Ticket 006 normalization code is gated on this.

No Tier 1 invariant is modified.
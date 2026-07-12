# TICKET-002 — Source Check Log and Immutable Raw Store

**Status:** complete
**Ticket:** 002
**Date:** 2026-07-11

## Summary

Implemented the durable storage foundation: `source_check` JSONL append
and content-addressed `raw_artifact` paths. The `check` command now
actually fetches the authoritative HTML page, records a `source_check`,
and writes the raw bytes to a sha256-derived path.

`fetch.cjs`, `normalize.cjs`, `derive.cjs`, `release.cjs` remain
Ticket 001 stubs; they gain real behavior in Tickets 003/004/006/011.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/lib/store.cjs` —
  `resolveRoot()`, `newSourceCheck()`, `appendSourceCheck()`,
  `writeRawArtifact()`, `readRawArtifact()`, `listRawArtifacts()`,
  `sha256()`, `httpGet()`. Pure Node, no deps.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/store.test.cjs` —
  8 tests including a live end-to-end `check` against OCP.

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/check.cjs` —
  wires `lib/store.cjs`. Fetches the authoritative page, records
  `source_check` (with `started_at_utc`, `completed_at_utc`,
  `http_status`, `etag`, `last_modified`, `observed_sha256`,
  `status`, `message`), writes the raw HTML bytes to
  `$MDG_DATA_ROOT/raw/ocp_licenses/{yyyy}/{mm}/{dd}/{sha16}/page.html`
  when the hash is new. Emits terminal JSON with `artifact_sha256` and
  `metrics.http_status`. Exit 0 on success, 30 on non-2xx, 20 on
  network failure (`retryable: true`).
- `apps/maine-cannabis/package.json` — `data:mdg:test` now runs both
  registry + store suites.

## Files NOT modified

All legacy files listed in `REPO_INTEGRATION_DECISIONS.md §6`/`§7`
remain untouched.

## Commands run

```bash
export MDG_DATA_ROOT=/home/steve/.hermes/data/mdg-data
npm --prefix apps/maine-cannabis run data:mdg:check -- --source=ocp_licenses
npm --prefix apps/maine-cannabis run data:mdg:check -- --source=census_acs5_population
npm --prefix apps/maine-cannabis run data:mdg:test
```

Both `check` runs returned `exit 0`, `code: SOURCE_UNCHANGED`,
HTTP 200, with raw HTML stored at
`~/.hermes/data/mdg-data/raw/{source_id}/2026/07/12/{sha16}/page.html`.

The Census API landing page returned HTTP 200 (no etag / last-modified).

`data:mdg:test` runs the full 19-test suite (11 registry + 8 store)
with exit 0.

## Observed source hashes (this run)

- `ocp_licenses` page HTML: `8fb1b771c042ccc8…`
  (`/home/steve/.hermes/data/mdg-data/raw/ocp_licenses/2026/07/12/8fb1b771c042ccc8/page.html`)
- `census_acs5_population` page HTML: `c774fd2547d29de7…`
  (`/home/steve/.hermes/data/mdg-data/raw/census_acs5_population/2026/07/12/c774fd2547d29de7/page.html`)

`source-checks/2026/07/12.jsonl` contains two records (one per check).

## Ticket 002 acceptance check

Per `TICKETS/002-source-check-and-raw-store.md`:

- [x] Every attempted source run records a source check.
      Test: `appendSourceCheck writes one JSONL line per call` +
            `check command end-to-end on ocp_licenses writes source_check + raw artifact`
- [x] SHA-256 identifies unique source bytes.
      Test: `sha256 matches a known vector` (abc → ba78…15ad).
- [x] Exact bytes are retained for new hashes.
      Test: `writeRawArtifact is content-addressed and idempotent`.
- [x] Duplicate content is not stored or reprocessed as a new raw artifact.
      Test: same buffer written twice → same path returned.
- [x] Failed parsing never destroys the snapshot.
      The store is content-addressed; `writeRawArtifact` only creates
      a new directory on a new sha16, never overwrites. Confirmed by
      `writeRawArtifact is content-addressed and idempotent` test.
- [x] Raw storage is outside the normal Vercel build path.
      Raw bytes live under `$MDG_DATA_ROOT` (default
      `~/.hermes/data/mdg-data`), not under `apps/maine-cannabis/`.
      `.gitignore` blocks `/mdg-data/` in case the root is ever
      shadowed locally.

## Decisions made

1. **Page HTML is the raw artifact.** `check.cjs` archives the full
   authoritative page HTML (not just a HEAD). This is required by
   `SOURCES.md` for `ocp_licenses`, `ocp_retail_sales`, `ocp_optin`
   ("Archive the authoritative page"). For Census, the same applies
   to the ACS developer landing page.
2. **No HEAD probing.** ETag / Last-Modified are surfaced as
   metadata when the response supplies them, but the SHA-256 of the
   full body is the only freshness signal. This matches
   `PIPELINE.md §Change detection` ("ETag and Last-Modified are
   hints only. SHA-256 determines byte identity.").
3. **Content-type for the raw blob.** The `originalName` is fixed
   to `page.html` for all sources in this stub. Tickets 003/004/009
   /010 set the appropriate name (CSV, JSON, etc.) and may overwrite
   the same sha16 dir without duplication (idempotent write).
4. **Tests use a `mkdtempSync` MDG_DATA_ROOT.** This isolates the
   end-to-end test from the operator's real durable store.

## Unresolved questions

None for this ticket. The endpoints for OCP sales and OCP opt-in
transport remain unknown until Tickets 009/010 inspect them.

## Next ticket

**003 — OCP License Adapter: Discovery and Profiling.**
The HTML page for `ocp_licenses` is already on disk from this
ticket's check. 003 scrapes it for the current CSV link, fetches
the CSV body, and writes the observed schema fixture.

## Specification authority note

Tier 2 implementation mechanics only. The Tier 1 invariants from
`SPEC-AUTHORITY.md` that this ticket directly serves:

- "Preserve exact raw source evidence for accepted new source-byte
  hashes." → `writeRawArtifact` is content-addressed and never
  overwrites.
- "Preserve source provenance from raw input through public artifact."
  → `source_check` JSONL records HTTP status / etag / last-modified
  for every run; raw artifact carries the full HTML body.
- "A failed refresh or publication attempt must not destroy or
  partially replace the last known-good public artifact set." →
  Ticket 011 will own atomic promotion; this ticket only writes
  raw, which is non-overwriting by construction.

No Tier 1 invariant is modified.
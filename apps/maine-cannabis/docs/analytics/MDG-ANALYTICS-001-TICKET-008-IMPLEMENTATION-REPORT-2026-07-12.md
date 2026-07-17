# MDG-ANALYTICS-001 Ticket 008 — Implementation Report

**Status:** IMPLEMENTED — read-only join surface only
**Date:** 2026-07-12
**Authorization:** G4=4c scope hash verified before implementation
**Proposal:** `MDG-ANALYTICS-001-TICKET-008-CROSS-SOURCE-PAGE-WINDOW-JOIN-BATCH-APPROVAL.md`
**Contract:** `ticket-008.v1`

## Scope delivered

- `ticket008-page-window-join.cjs`
  - canonicalizes GA4/GSC/Vercel paths to `canonical_page_path`
  - normalizes GA4 `YYYYMMDD` dates to ISO dates
  - joins at `(canonical_page_path, measurement_date)` grain
  - preserves GA4 and Vercel observations separately
  - classifies `both`, `ga4_only`, `vercel_only`, and blocked states
  - records source deltas without averaging, summing, min/max selection, or silent replacement
  - carries page-manifest identity and release IDs
  - marks pre-2026-07-12 conversion windows `WINDOW_MEASUREMENT_DEGRADED`
  - marks A5 Speed Insights rows `MEASUREMENT_BLOCKED`
  - emits a separate evidence manifest with counts, output hash, and privacy assertion
  - performs no network access and no production writes

- `ticket008-page-window-join.test.cjs`
  - 32 passing unit tests covering canonicalization, date handling, source normalization, join grain, source presence, deltas, manifest identity, late-window status, A5 blocking, release IDs, privacy assertion, and deterministic ordering.

## Verification evidence

```text
Ticket 007 tests: 25/25 passed, 0 failed
Ticket 008 tests: 32/32 passed
Data-integrity: all docs match reality
verify:iterate: clean
```

The historical CLI exercise used a Ticket 007 artifact plus a temporary synthetic A4 fixture. The temporary fixture was not committed and is not production evidence. The Ticket 007 artifact was subsequently rejected (G1/G6 failure and missing durable BQ provenance) and removed; this historical exercise is not valid production evidence or an approved downstream input.

```text
Historical input (removed after rejection): apps/maine-cannabis/data/ga4-ingest/2026-07-12/canonical_release.json
Output: /tmp/ticket008-output/page-window-join.json
Rows: 691
Statuses: 688 missing_vercel, 1 measurement_blocked, 2 missing_ga4
Source presence: 688 ga4_only, 1 both, 2 vercel_only
A5 blocked: 1
Privacy assertion: true
```

The 691-row result is a contract exercise, not a claim about live Vercel coverage, because the A4 input used for the CLI exercise was synthetic. No Vercel A4 production dataset was fabricated or committed.

## Explicit non-actions

- No GA4, BigQuery, or Vercel API calls.
- No Vercel settings or environment changes.
- No instrumentation or page-source changes.
- No Ticket 009+ work.
- No A5 Speed Insights workaround.
- No OCP, Firecrawl, dispensary, opt-in, menu-price, or production-optimization work.

## Rollback

```bash
git revert <ticket-008-commit-sha>
npm run verify:push
```

## Next boundary

Stop at Ticket 008. Ticket 009 requires separate authorization after review of this implementation and its evidence contract.

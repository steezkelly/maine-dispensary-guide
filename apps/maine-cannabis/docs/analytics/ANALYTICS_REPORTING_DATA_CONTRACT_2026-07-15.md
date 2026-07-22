# GSC Search Analytics Daily-Fact Contract — 2026-07-15

## Purpose

`gsc-search-analytics-daily.cjs` upserts finalized, one-day query/page facts in
the private `$MDG_GSC_DATA_ROOT/gsc-search-analytics.jsonl` ledger (default
`~/.hermes/data/mdg-gsc`). Raw query data never belongs in the repository. The
ledger is for trend and misroute analysis; it is not a replacement for an
explicit ad-hoc rolling GSC report.

## Producer contract

- Default source window: one Los Angeles calendar day, ending three calendar
  days before extraction (`America/Los_Angeles`).
- `--days=N` is an explicit N-day source window. Only records where
  `sourceStartDate === sourceEndDate` are composable as daily facts.
- Each new row includes `snapshotDate`, `sourceStartDate`, `sourceEndDate`,
  `sourceTimezone: "America/Los_Angeles"`, and `sourceDataState: "final"`.
- Calendar arithmetic is date-based, not fixed 24-hour subtraction, so the
  window remains correct across DST transitions.
- An empty response fails closed unless `--allow-no-data` is explicit.
- A dirty existing ledger or snapshot set fails closed before a write. Run the
  backed-up normalizer before resuming collection.
- A repeated `(source day, query, page)` replaces that fact atomically rather
  than creating an analytical duplicate.
- Dry-run and cron output contain aggregate counts/status only, never row data.

## Consumer contract

`gsc-misroute-audit.cjs` accepts only rows with finalized one-day provenance.
It intentionally excludes legacy provenance-free and rolling-window rows rather
than mixing incomparable measurements.

For a report window, the consumer:

1. filters by `sourceEndDate`, not extraction-time `snapshotDate`;
2. collapses repeated extractions of the same `(source day, query, page)` to the
   latest extraction; and
3. aggregates distinct source days by `(query, page)`: clicks/impressions sum,
   CTR recomputes from totals, and position is impression-weighted.

A report with no compatible daily facts fails rather than silently using the
legacy JSONL history. Query-bearing reports must be written below the validated
private root; stdout and repository paths are not valid sinks.

## Storage and health contract

- `gsc-ledger.cjs --normalize` creates a timestamped private backup and SHA-256
  manifest before rewriting anything. Rolling, non-final, malformed, and
  otherwise incompatible rows move to owner-readable private quarantine.
- Normalized ledgers and snapshots use atomic write-and-rename and owner-only
  permissions.
- Root and report containment checks resolve symlinks and reject aliases into
  the repository or outside the private root.
- `gsc-ledger-health.cjs` reports only freshness dates, counts, permissions,
  wrapper/cron registration, and log age. It never loads rows into its output.
- Search Analytics remains top-row data with unknown exhaustiveness; a row
  count below the limit is not a completeness guarantee.

## Verification

- `node --test apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.test.cjs`
- `node --test apps/maine-cannabis/scripts/seo/gsc-misroute-audit.test.cjs`
- `node --test apps/maine-cannabis/scripts/seo/gsc-ledger.test.cjs`
- `node --test apps/maine-cannabis/scripts/seo/gsc-ledger-health.test.cjs`

The CI workflow runs the focused GSC suites.

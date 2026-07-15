# GSC Search Analytics Daily-Fact Contract — 2026-07-15

## Purpose

`gsc-search-analytics-daily.cjs` appends finalized, one-day query/page facts to
`apps/maine-cannabis/data/gsc-search-analytics.jsonl`. The data is for trend and
misroute analysis; it is not a replacement for an explicit ad-hoc rolling GSC
report.

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
legacy JSONL history.

## Verification

- `node --test apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.test.cjs`
- `node --test apps/maine-cannabis/scripts/seo/gsc-misroute-audit.test.cjs`

The CI workflow runs both focused suites.

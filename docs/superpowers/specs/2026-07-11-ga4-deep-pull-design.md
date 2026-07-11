# GA4 Deep Pull — Design Spec

**Date:** 2026-07-11
**Author:** Hermes (via brainstorming + executing-plans skills)
**Status:** Draft, pending user review
**Trigger:** User asked "do we have GA set up correctly so we can pull specific data about users." Confirmed via screenshot that service account has Viewer access on GA4 property 532778727. Pageview tracking is live (Measurement ID `G-614GHG67ZQ`). `lead_capture` events are instrumented in `LeadMailtoForm.astro:144` and `LeadFormTracker.astro:114`. Daily cron never wired. Need: one-time deep pull, recurring infra deferred.

## Goal

Pull a comprehensive snapshot of every GA4 dimension and metric the property can expose, since the property was created through today (2026-07-11). Deliver raw data (JSONL) for agentic downstream processing, plus a structured markdown index and a lightweight HTML dashboard so the user can visually review trends without a toolchain.

Out of scope: daily cron wiring (separate session), Meta pixel integration (user deferred to "another time"), user-level PII extraction (GA4 doesn't expose this anyway — only `userPseudoId` hashed IDs).

## Deliverables

1. `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs` — single-script runner, all queries defined as data at the top.
2. `apps/maine-cannabis/data/ga4-pull-2026-07-11/raw/*.jsonl` — one JSONL file per query, plus `meta.json` (run timestamp, property ID, totals) and `_failures.jsonl` if any query failed.
3. `apps/maine-cannabis/data/ga4-pull-2026-07-11/index.md` — human-readable summary with headline numbers and pointers to raw files. Sections: by-page, by-geography, by-source, by-device, lead-capture funnel, time-series.
4. `apps/maine-cannabis/data/ga4-pull-2026-07-11/dashboard.html` — self-contained page, Chart.js via CDN, fetches the JSONL files, renders the time series + top-N bar charts. No build step.

## Queries (10 total)

| # | Name | Dimensions | Metrics | Notes |
|---|---|---|---|---|
| 1 | `pageviews` | `pagePath`, `pageTitle` | `screenPageViews`, `engagementDuration`, `bounceRate` | Per-page engagement |
| 2 | `geography` | `country`, `city`, `region` | `totalUsers`, `sessions` | Audience location |
| 3 | `acquisition` | `sessionSource`, `sessionMedium`, `sessionCampaignName` | `sessions`, `engagedSessions`, `engagementRate` | How users arrive |
| 4 | `technology` | `deviceCategory`, `browser`, `operatingSystem`, `screenResolution` | `users` | Device mix |
| 5 | `lead_capture` | `customEvent:form_name`, `customEvent:page_path`, `customEvent:stage` | `eventCount` | Lead funnel, custom-event scope |
| 6 | `user_journey` | `userPseudoId`, `sessionId`, `pagePath`, sequence | `screenPageViews` | Per-session paths, sampled to top users if volume is high |
| 7 | `new_vs_returning` | `newVsReturning` | `totalUsers`, `engagementRate`, `sessions` | Audience health |
| 8 | `timeseries` | `date` | `users`, `sessions`, `screenPageViews`, `eventCount` | Growth trend, one row per day |
| 9 | `landing_pages` | `landingPagePlusQueryString` | `sessions`, `bounceRate` | Where users enter |
| 10 | `exit_pages` | `pagePath` (exit scope) | `exits` | Where users leave |

All queries use `dateRanges: [{ startDate: '2020-01-01', endDate: 'today' }]` — full history per user direction. No row limit on small queries; cap large ones (user_journey, geography, pageviews) at 10000 rows with a "truncated" note in `meta.json` if hit.

## Implementation

### Script structure

```
ga4-deep-pull.cjs
├── QUERIES[]              // append-only, one entry per query: { name, dimensions, metrics, request }
├── HEADER                 // package, imports, env
├── main()
│   ├── loadEnv()          // reads $GOOGLE_APPLICATION_CREDENTIALS, GA4_PROPERTY_ID
│   ├── runQuery(q)        // wraps analyticsdata.properties.runReport with pagination
│   ├── for each QUERIES[]:
│   │   ├── try { runQuery → JSONL }
│   │   └── catch → append to _failures.jsonl
│   ├── writeMeta()        // total events, queries run, failures, timestamp, property ID
│   ├── writeIndexMd()     // reads JSONL, generates markdown tables (top 20 per query)
│   └── writeDashboard()   // copies a static template, swaps in data file URLs
└── exit (code 0 even with partial failures, prints summary)
```

### Dependencies

- `googleapis@^173.0.0` already in `package.json`. Use `google.analyticsdata('v1beta')` client.
- No new deps.
- Dashboard uses Chart.js via CDN (`https://cdn.jsdelivr.net/npm/chart.js`). No npm install. Stack-of-record compliant: plain HTML/JS, no React/Vite.

### Research pass

Inline within `writeIndexMd()`. For each headline finding (e.g., "0% CTR on town pages" — if that shows up), do one `web_search` for industry benchmark in the same niche (cannabis, low-traffic affiliate sites), append 1-2 lines of context to the index section. Bounded: max 5 research calls per run.

### Verification gate (verification-before-completion rule)

Script MUST print before exit:
- Per-query row count (e.g., `[pageviews] 142 rows → raw/pageviews.jsonl`)
- 3-line JSONL sample per query
- `meta.json` content
- Total events captured across all queries
- Failures count (0 expected; >0 = partial)

User reviews these before declaring complete.

### Failure handling

- Per-query try/catch. Failures don't abort the run.
- Failed queries go to `raw/_failures.jsonl` with: `{ query, error, timestamp }`
- Exit code 0 even with partial failures (the deliverable is partial, not failed)
- Meta records `partial: true` if any query failed

### Idempotency

Script wipes and rewrites `data/ga4-pull-2026-07-11/` each run. Safe to re-run.

## File-level contract

### `raw/<query>.jsonl`

One JSON object per line. Schema:
```json
{"dimensions": {"pagePath": "/", "pageTitle": "Home"}, "metrics": {"screenPageViews": 142, "engagementDuration": 87.3}, "_dateRange": "2020-01-01_to_2026-07-11"}
```

### `meta.json`

```json
{
  "runAt": "2026-07-11T...",
  "propertyId": "532778727",
  "measurementId": "G-614GHG67ZQ",
  "queriesRun": 10,
  "queriesFailed": 0,
  "totalRows": 1234,
  "dateRange": {"start": "2020-01-01", "end": "2026-07-11"},
  "truncated": ["user_journey:hit 10000 row cap"]
}
```

### `index.md` outline

```
# GA4 Deep Pull — 2026-07-11
Property: 532778727 (G-614GHG67ZQ) | Date range: full history | Rows: N

## Headline
- Total users: X
- Total sessions: Y
- Total pageviews: Z
- lead_capture events: N
- Avg engagement: M seconds

## By page (top 20)
[table]

## By geography (top 20)
[table]

## By source
[table]

## By device
[table]

## Lead capture funnel
[table by form_name]

## Time series
[ASCII sparkline or 20-row table — full chart in dashboard.html]

## Research context
[1-2 lines per headline metric]

## Files
[list of raw/*.jsonl with row counts]
```

### `dashboard.html`

- Chart.js line chart: users/sessions/pageviews per date from `timeseries.jsonl`
- Chart.js bar chart: top 10 pages by pageviews
- Chart.js bar chart: top 10 sources
- Chart.js pie/doughnut: device category split
- Loads JSONL via `fetch()`, parses with `JSON.parse` per line
- Plain HTML, no build, opens directly in browser

## Risks & unknowns

- **GA4 data retention.** Default GA4 retention is 14 months for event data; user-level is also 14 months. The "full history" pull will be capped by this. Add a note in `index.md` if the property is older than 14 months.
- **Custom event dimension availability.** Query 5 uses `customEvent:form_name` etc. These are populated by the GA4 client when events fire with those fields. If `lead_capture` events never fired (the audit said 0 events), this query returns 0 rows. The 0 itself is a finding.
- **Rate limits.** GA4 Data API: 10,000 requests/day per property, 10 concurrent per property. This script does 10 queries. Not a risk.
- **Service account token expiry.** Google SDK auto-refreshes. Not a risk.
- **Property ID correctness.** 532778727 is from the 2026-07-08 audit. Confirm against the user's screenshot before run; the access screenshot shows the property name but not the numeric ID. Will ask user to confirm before kicking off the run.

## Out of scope (deferred)

- Daily cron wiring — separate session
- Meta pixel pull — user said "another time"
- Lead-magnet funnel re-instrumentation — different work
- Schema.org verification on dashboards/embed pages — separate session

## Open question for user before run

**Confirm the numeric GA4 Property ID.** The 2026-07-08 audit says `532778727`. The property-access screenshot the user shared shows "Maine Dispensary Guide" but doesn't show the numeric ID. Before kicking off the script, I'll ask the user to confirm via GA Admin → Property Settings (top right).
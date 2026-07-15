# Analytics Reporting Data Contract — 2026-07-15

Scope: decision-readiness audit for the existing Maine Dispensary Guide analytics/reporting pipeline only. This document covers Google Search Console extraction/snapshots, GA4 reporting/custom events, weekly engagement reporting, and reconciliation/validation logic. It does not approve dashboards, new tracking systems, BigQuery, automations, new metrics, or GA4/GSC setting changes.

## Executive decision-readiness verdict

After the fixes in this audit, the pipeline is safe for bounded operational reads:

- **GSC query/page rows** can support page-routing diagnostics and CTR-opportunity triage when each row's source window is respected.
- **GA4 engagement reports** can support directional weekly engagement review for pages/events that appear in GA4, but missing rows must be treated as “no returned rows,” not proof of zero user behavior.
- **GA4 `lead_capture`** can support form-submit intent monitoring only. It is not a completed-lead or delivered-email metric.
- **Cross-source reconciliation** can support candidate QA and instrumentation-health checks. It cannot support causal lift, attribution claims, or page-day joins unless source windows and data-state semantics match.

## Report contracts

### 1) GSC Search Analytics snapshot

- **Producer:** `apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs`.
- **Sink:** `apps/maine-cannabis/data/gsc-search-analytics.jsonl`.
- **Source API:** Google Search Console Search Analytics `searchanalytics.query` for property `https://mainedispensaryguide.com/`.
- **Authentication:** service account with `https://www.googleapis.com/auth/webmasters.readonly`.
- **Dimensions:** `query`, `page`.
- **Metrics:** `clicks`, `impressions`, `ctr`, `position`.
- **Default date range:** one finalized GSC calendar day ending three days before extraction (`--days=1`, `--end-offset-days=3`). GSC request dates are Search Console dates in `America/Los_Angeles` semantics.
- **Optional date range:** `--days=N` extends the source window backwards from the lagged end date. Any `N > 1` window is a rolling investigation window and must not be summed as daily facts.
- **Sort order:** source-native Search Console ordering: clicks descending; ties arbitrary. The script records `sourceSortOrder: "clicks_desc_ties_arbitrary"`. It does **not** request impressions-descending order.
- **Filters:** none beyond `type=web` default and the implicit site property.
- **Data state:** `final`.
- **Row limit:** default 1,000 (`--limit=N` supported, API max governed by GSC).
- **No-data behavior:** zero rows now exits non-zero and does not append unless `--allow-no-data` is explicitly supplied.
- **Known limitations:** Search Console can omit days without data, returns top rows rather than guaranteed complete data, has arbitrary tie order, and old JSONL rows without `sourceStartDate`/`sourceEndDate` are historical rolling snapshots. Do not combine old rolling rows with new one-day facts without a consumer-side compatibility rule.

### 2) GSC misroute audit

- **Producer:** `apps/maine-cannabis/scripts/seo/gsc-misroute-audit.cjs`.
- **Source:** local `gsc-search-analytics.jsonl` rows that include `page`.
- **Dimensions:** `query`, `page`, derived page category (`home`, `blog`, `learn`, `guide`, `about`, `meta`, `resource`, `download`, `other`).
- **Date range:** optional filter by `snapshotDate` via `--days=N`; otherwise all v2 rows.
- **Sort/order logic:** within each query, pages are sorted by impressions descending by the local script. Top pages and CTR losers are also sorted by local impression count.
- **Filters:** excludes v1 GSC rows without a `page` field; CTR losers require position `< 11`, impressions `>= 10`, and clicks `=== 0`.
- **Definitions:**
  - Multi-page query = same query observed on at least two MDG pages.
  - Misroute = a blog/home/learn page has more impressions than a guide page for the same query.
  - CTR loser = a row with first-page average position, at least 10 impressions, and zero clicks.
- **Known limitations:** current dedupe keeps the max-impression snapshot per `(query,page)`, which is useful for surfacing candidates but not a source-of-record trend. For trend or before/after claims, use rows with explicit `sourceStartDate`/`sourceEndDate` and compare like windows only.

### 3) GSC indexing report

- **Producer:** `apps/maine-cannabis/scripts/seo/gsc-indexing-check.cjs`.
- **Sinks:** `apps/maine-cannabis/data/gsc-indexing-cache.json` and dated `apps/maine-cannabis/data/gsc-indexing-report-YYYY-MM-DD.json`.
- **Source API:** Google Search Console URL Inspection API.
- **Dimensions:** URL-level inspection target.
- **Date range:** point-in-time inspection at extraction time, not a historical date range.
- **Sort order:** none; output order is script/source-list order.
- **Filters:** URL list and any script-side inclusion rules.
- **Definitions:** URL inspection status is a source-provided current verdict, not an organic traffic metric.
- **Known limitations:** dated archives can be missing when the runner/scheduler fails; rerunning on the same date overwrites that date's archive. It is useful for operational indexing checks, not traffic forecasting.

### 4) GA4 lead-capture snapshot

- **Producer:** `apps/maine-cannabis/scripts/seo/ga4-lead-capture-daily.cjs`.
- **Sink:** `apps/maine-cannabis/data/ga4-lead-capture.jsonl`.
- **Source API:** GA4 Data API `properties.runReport`.
- **Property:** numeric property from `GA4_PROPERTY_ID`.
- **Dimensions:** `date`, `pagePath`, `eventName`.
- **Metrics:** `eventCount`, `sessions`.
- **Date range:** last 7 days from extraction date.
- **Sort order:** none requested; consumers must not infer ranking from row order.
- **Filters:** `eventName` exactly `lead_capture`.
- **Definition:** `lead_capture` means a tracked client-side form-submit event/intent. It does not prove Formspree acceptance, mail client send, inbox delivery, human qualification, or revenue.
- **Known limitations:** `form_id` remains `null` unless an event-scoped custom dimension is registered and queried. Synthetic/probe traffic is not reliably attributable unless the event payload carries a registered probe marker or a separately auditable test property/window is used. A no-row response can mean no event data, inaccessible data, misconfiguration, late arrival, or filtering; do not treat it as confirmed zero completed leads.

### 5) GA4 weekly engagement report

- **Producer:** `scripts/analytics/ga4-engagement-weekly.cjs`.
- **Sink:** `apps/maine-cannabis/docs/analytics/ENGAGEMENT_WEEKLY_<YYYY-MM-DD>.md`.
- **Source API:** GA4 Data API `properties.runReport` against property `532778727`.
- **Custom-event families:** `scroll_depth`, `page_engaged`, `faq_open`, `cta_view`.
- **Headline dimensions/metrics:** dimension `date`; metrics `engagedSessions`, `engagementRate`, `averageSessionDuration`, `sessionsPerUser`, `screenPageViewsPerUser`, `sessions`, `activeUsers`.
- **Page engagement dimensions/metrics:** dimensions `pagePath`, `pageTitle`; metrics `screenPageViews`, `engagedSessions`, `engagementRate`, `averageSessionDuration`, `sessions`.
- **Date range:** `7daysAgo` through `today` per GA4 Data API semantics.
- **Sort order:** page-engagement section orders by `screenPageViews` descending. Other sections should be treated as API/default order unless explicitly stated.
- **Filters:** event totals filter to the four MDG event names; event-specific sections filter to their individual event names.
- **Definitions:** weekly engagement is a directional activity report from GA4 event/page data, not a conversion report.
- **Known limitations:** missing custom dimensions (`customEvent:percent`, `customEvent:faq_id`, `customEvent:faq_question`, `customEvent:cta_id`, `customEvent:cta_destination`, `customEvent:cta_text`) cause the affected sections to degrade to no rows. No returned rows should be surfaced as a warning/limitation, not silently interpreted as zero engagement.

### 6) GA4 deep pull and data-only validation

- **Producers:** `apps/maine-cannabis/scripts/analytics/ga4-deep-pull.cjs`, `apps/maine-cannabis/scripts/analytics/data-only-assert.cjs`, and related tests.
- **Source:** rendered/static site artifacts plus GA4 access checks where applicable.
- **Dimensions:** event names, `data-*` instrumentation attributes, and page surfaces defined by the scripts.
- **Date range:** script-specific; static validation has no date range.
- **Sort order:** none unless the script states one.
- **Filters:** script-specific selectors and allowlists.
- **Definitions:** validates whether instrumentation exists and whether configured pulls can run. It does not prove production users generated those events.
- **Known limitations:** cannot identify synthetic/probe traffic as production traffic unless the event schema includes a registered attribution marker and the report filters on it.

## Ranked findings

### Verified defects

1. **GSC extraction requested/assumed impressions-descending ordering even though the Search Analytics API documents clicks-descending ordering and has no `orderBy` request field.** Fixed by removing `orderBy`, updating the extractor contract, and recording `sourceSortOrder` on new rows.
2. **GSC default snapshots overlapped by design (`--days=7`) while being appended as daily snapshots.** Fixed by changing the default to a lagged one-day finalized source window and writing `sourceStartDate`/`sourceEndDate` metadata.
3. **GSC zero-row responses could complete as successful append operations.** Fixed by failing closed unless `--allow-no-data` is explicit.
4. **GSC row provenance was insufficient for safe joins and trend comparisons.** Partially fixed by adding source window, timezone, data-state, and sort-order fields to new rows. Historical rows remain limited.
5. **`lead_capture` was documented in some repo state as “lead capture” without a hard distinction between submit intent and completed lead.** Contract now defines it as intent only; no code setting changed.
6. **GA4 weekly engagement can render no-data event sections as benign prose.** Contract now requires consumers to treat no returned rows as a limitation/warning, not proof of zero engagement. A code change for all sections was not made because the existing report already states the known missing-instrumentation/custom-dimension reasons for several sections.

### Unverified concerns

1. **GA4 synthetic/probe traffic attribution.** Repo evidence shows probes and closure notes, but current event payload/report definitions do not prove reliable attribution of probe traffic inside GA4 production reports.
2. **GA4 service-account access and current live data availability.** This environment has no confirmed GA4 credential/property access; no live API calls were made in this audit.
3. **Current GSC scheduler health.** Existing governance docs state cron is blocked, but this audit did not alter host scheduling or verify a scheduler service.
4. **Whether current production has all `data-faq` / `data-cta-id` instrumentation needed for full weekly report sections.** Existing docs/scripts flag gaps; this audit did not perform a browser crawl.

## Verification plan

1. **Static contract verification:** run `node --check` on the modified extractor and relevant analytics scripts.
2. **Dry-run request verification:** with valid GSC credentials, run `node apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs --dry-run --limit=10` and confirm the logged request uses `dataState: "final"`, no `orderBy`, one lagged source day, and row metadata includes source-window fields.
3. **No-data fail-closed verification:** temporarily query an impossible window or mock `rows: []`; confirm the extractor exits non-zero without appending unless `--allow-no-data` is passed.
4. **Snapshot-overlap verification:** compare two consecutive default runs; source windows should advance by one day and not overlap. Any `--days=N` run with `N > 1` must be labeled as a rolling investigation window in downstream notes.
5. **GA4 lead-contract verification:** run the lead script only with approved read-only credentials and confirm output rows are described as `lead_capture` event intent, not completed leads; reconcile a sample against Formspree/operator inbox only outside this scope and only with approval.
6. **Weekly engagement verification:** run `node scripts/analytics/ga4-engagement-weekly.cjs --dry-run`; after approved credentials exist, run `--live` and inspect whether no-row sections are explicitly treated as limited evidence.
7. **Reconciliation verification:** before using any cross-source report, assert matching source windows, timezone semantics, and data-state fields. Reject joins between old GSC rolling snapshots and GA4 page-day rows unless a compatibility note explains the mismatch.

## Decisions supported afterward

Supported:

- Which query/page pairs are visible in Google Search for the extracted source window.
- Which pages may be cannibalizing or misrouting search demand, as triage candidates.
- Whether GA4 engagement instrumentation is returning rows for the named event families.
- Whether `lead_capture` intent events are present by page/date in GA4.
- Whether a report is safe to read, stale, blocked, or limited by missing source rows.

Not supported:

- Completed leads, email delivery, qualified opportunities, or revenue from `lead_capture` alone.
- Causal lift from content/design changes without controlled before/after windows and stable definitions.
- Accurate attribution of synthetic/probe traffic in production GA4 reports without an approved registered attribution dimension/filter.
- Summing historical overlapping GSC snapshots as daily facts.
- Cross-source page-day decisions when GSC source dates, GA4 dates, timezone semantics, or data-state fields differ.
- Deployment/release decisions; this audit did not deploy or change GA4/GSC settings.

## External source notes

- Google Search Console Search Analytics API documentation states that results are sorted by clicks descending unless grouped by date, ties are arbitrary, days without data are omitted, `startDate`/`endDate` use PT semantics, `rowLimit`/`startRow` are request fields, and `dataState` controls finalized vs fresh data.
- GA4 Data API documentation states that `runReport` returns rows for requested dimensions/metrics and that empty/zero rows require careful handling; rows with all-zero metrics are not returned unless `keepEmptyRows` is used and recorded data exists.

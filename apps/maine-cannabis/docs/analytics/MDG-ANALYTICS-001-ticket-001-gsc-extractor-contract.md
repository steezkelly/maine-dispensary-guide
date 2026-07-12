# MDG-ANALYTICS-001 — Ticket 001 — GSC Extractor Contract Forensic

**Scope:** Read-only forensic of the Google Search Console (GSC) source path
in `mainedispensaryguide.com`, as it stands against v0.5 source contracts
(`SOURCES.md` §A0 and §A1) for Ticket 001.

**Working dir:** `/home/steve/projects/maine-dispensary-guide`
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/`
**Spec ref (Tier 1):** `965528ade88...` (2026-07-11) — `SOURCES.md` A0/A1
**Current main:** `aba1c48d6be85b7680341f9a54109d123ec3bc00`
**Parent state:** Tickets 000–012 reading pass already done; this report
focuses strictly on the GSC source path (A0/A1). GA4 (A) and Vercel (C) are
out of scope.

---

## 1) Source contract A1 — Google Search Console API (Search Analytics)

### 1.1 Inventory of GSC extractor scripts in the repo

Search commands run (from repo root):

```
rg -l "searchanalytics.googleapis" -g '!node_modules' -g '!dist'
rg -l "searchconsole"          -g '!node_modules' -g '!dist'
rg -l "gsc-search"             -g '!node_modules' -g '!dist'
rg -l "GoogleSearchConsole"    -g '!node_modules' -g '!dist'
```

**Finding:** No repo file contains the literal `searchanalytics.googleapis`
or `GoogleSearchConsole`. All GSC code paths import via `googleapis`
and use `google.searchconsole({version:'v1'})` (the SDK calls
`searchanalytics.googleapis.com/v1/webmasters/...` under the hood).

| File | Purpose | Audit-trail posture |
|---|---|---|
| `apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs` | Daily Search Analytics extract: top query+page pairs by impressions, append to JSONL. **Primary A1 collector.** v2 schema adds `page` dimension. | **Append-only** to `apps/maine-cannabis/data/gsc-search-analytics.jsonl` (see §1.4). No extractor version, no extract id, no `dataState`, no timezone stamp, no requested-window metadata in row or in sidecar. |
| `apps/maine-cannabis/scripts/seo/gsc-indexing-check.cjs` | URL Inspection API walk of every sitemap URL; writes 24h-TTL cache + dated archived JSON. | **Cache overwrites** `gsc-indexing-cache.json` on every run; **daily archive** is immutable-by-naming (`gsc-indexing-report-YYYY-MM-DD.json`). Has `timestamp` + `sourceUrl`. |
| `apps/maine-cannabis/scripts/seo/gsc-misroute-audit.cjs` | Reads JSONL, derives misroutes / cannibalization / CTR-loser view. Purely a consumer of A1 data, no API calls. | Reads only — no extract-side provenance. |
| `scripts/analytics/investigate-gsc-spike.cjs` | One-off per-day deep pull (query+page+date), paginates with `startRow`. Used for the 2026-07-07 operator-name spike. | Writes `gsc-spike-investigation-YYYY-MM-DD.jsonl` once per invocation. Overwrites the file if rerun same date — **no idempotency guarantee**. No provenance metadata. |
| `scripts/_diag-gsc-ga4-list.cjs` | Diagnostic helper to list GSC sites. Not on the extract path. | n/a |

The `webmasters.readonly` scope and the canonical `https://mainedispensaryguide.com/`
site URL (trailing slash hardcoded; verified via `sites.list` 2026-07-13) are
shared across all of the above.

### 1.2 npm script registration (A1 collectors)

```
$ node -e "console.log(JSON.stringify(require('/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/package.json').scripts,null,2))" | grep gsc
  "seo:gsc-indexing":                "node ./scripts/seo/gsc-indexing-check.cjs",
  "seo:gsc-indexing:limit":          "node ./scripts/seo/gsc-indexing-check.cjs --limit=10",
  "seo:gsc-search-analytics":        "node ./scripts/seo/gsc-search-analytics-daily.cjs",
  "seo:gsc-search-analytics:dry-run":"node ./scripts/seo/gsc-search-analytics-daily.cjs --dry-run",
  "seo:gsc-misroute-audit":          "node ./scripts/seo/gsc-misroute-audit.cjs",
  "seo:gsc-misroute-audit:week":     "node ./scripts/seo/gsc-misroute-audit.cjs --days=7"
```

**Confirmed present.** `seo:gsc-search-analytics` and `:dry-run` exist as
required by Ticket 001 ("Search Analytics API" branch).

### 1.3 Per-extractor field-by-field forensic

#### A. `gsc-search-analytics-daily.cjs` (primary A1 collector)

Read full file (177 LOC). Findings per spec attribute:

| Attribute | Current state | Spec requirement (SOURCES.md §A1) | Drift |
|---|---|---|---|
| **dimensions requested** | `['query', 'page']` (v2, 2026-07-13). v1 was `['query']` only — those rows are still in the JSONL without `page`. | "preserve requested dimensions, filters, aggregation, `dataState`, row limit, pagination, and window" | **Partial drift:** dimensions live in requestBody, but the JSONL row shape (just `keys[0]`, `keys[1]`) loses the literal dimension array. A consumer cannot tell from the JSONL alone whether a row came from a query-only or query+page extract. v1 rows are silently missing `page`. |
| **rowLimit / pagination** | `rowLimit: ROW_LIMIT` (`--limit`, default `1000`). **No `startRow` loop.** One call per invocation. | "rowLimit of 1–25,000 with startRow pagination"; "paginate where a bounded diagnostic requires it" | **Drift:** The collector declares itself the daily fact but caps at 1k rows. For a 7-day default window that's usually fine, but it explicitly does NOT paginate, so the response is bounded by GSC's ordering + first-N. |
| **dataState** | **Not set.** Relies on GSC default (`all` — includes fresh/incomplete). | "use explicit `dataState`"; "finalized data by default, with `dataState` controls for fresh/incomplete data" | **Drift:** Missing entirely. The collector silently accepts 2-3-day-lag "fresh" data into a file that downstream code treats as a fact table. The header even admits "GSC's searchanalytics API has a 2-3 day data lag" but does nothing about it. |
| **date semantics (Pacific Time)** | `startDate`/`endDate` are computed from `new Date()` then `toISOString().slice(0,10)` → **UTC dates**, not Pacific. | "preserve PT date semantics" | **Drift:** `ymd(new Date())` returns the UTC calendar date. For any extract run between 16:00–23:59 PT the JSONL `snapshotDate` will be the *next* UTC day, not the operator's local day. The `startDate`/`endDate` window sent to GSC is also a UTC window — meaning late-PT runs effectively shift the requested window one day into the future. No TZ hint in the request body and no PT annotation in the file. |
| **sort order (orderBy)** | `orderBy: [{field:'impressions', sortOrder:'DESCENDING'}]`. | "click-descending result order; arbitrary order for click ties; bounded/top-data results that do not guarantee all rows"; "never use unsupported `orderBy`" | **Drift:** `orderBy` is set to a *value* (impressions DESCENDING). The Search Analytics API's documented default is *clicks DESCENDING*. Using `impressions` as orderBy works (Google supports the field) but is **not** the canonical default. The contract says results are "click-descending" by default and "arbitrary" on tie — sorting by impressions re-orders the result set and the file becomes "top by impressions among rows returned by this extract" rather than the GSC-canonical "top by clicks". The spec mandates that locally-sorted results carry that label explicitly — they do not. |
| **output sink** | JSONL at `apps/maine-cannabis/data/gsc-search-analytics.jsonl`. **Not** a dated directory; one rolling file. | "do not add overlapping rolling snapshots as daily facts"; archive vs rolling distinction | **Drift:** Single rolling JSONL. Each daily cron run appends N rows. With `--days=7` default, two consecutive runs overlap by 6 days → each (date, query, page) tuple appears once per snapshotDate. The misroute audit (`gsc-misroute-audit.cjs` lines 100-110) compensates by deduping "keep max-impressions snapshot per (query,page) pair", but the raw file IS the overlap-by-design that the spec forbids. **No `snapshotDate` ∈ rowDate filter on append; rows are tagged only with the date the script ran, not the GSC calendar date they belong to.** |
| **idempotency (does it delete + recreate?)** | No `rm`, `unlink`, `delete`, `rmdir`, or `rmSync` in the entire script (`rg "delete|rmdir|rmSync"` returns no hits). **Pure append.** | n/a in spec, but contract drift | **Not destructive.** Append-only is the *opposite* failure mode: idempotent in the filesystem sense but **non-idempotent in the analytical sense** — re-running with the same `--days=N` writes duplicate (snapshotDate, query, page) rows. A rerun of yesterday's snapshot for any reason (retry, debug) inflates the JSONL and breaks trend math unless the dedupe pass is run. |
| **provenance (source extract id, extractor version, requested window, timezone)** | None of: `extractId`, `extractorVersion`, `requestedWindow`, `timezone`, `dataState`, `requestBody`. Row schema is `{snapshotDate, query, page, clicks, impressions, ctr, position}`. | "Every extract records source, source-native names, query definition/version, extraction timestamp, requested window, timezone/date semantics, settlement state, bounding/suppression notes, and extractor version." (Global source rule.) | **Major drift.** None of the eight required provenance fields are present in either the row or any sidecar file. The JSONL cannot be back-traced to: which script version, which `requestBody`, which `dataState`, what PT window was requested, what the snapshotDate semantics actually are, or whether rows are settled vs fresh. |

#### B. `gsc-indexing-check.cjs` (URL Inspection — separate API)

| Attribute | Current state | Spec requirement (SOURCES.md §A1) | Drift |
|---|---|---|---|
| **endpoint** | `urlInspection.index.inspect` (URL Inspection API, not Search Analytics) | "Search Analytics API documents: click-descending result order..." | URL Inspection is a **different endpoint family**; it is not the A1 "Search Analytics" source. Ticket 001's A1 narrative does not bind this script to A1's row semantics — it is an A1 *sibling* source. Document for completeness. |
| **dimensions requested** | n/a (URL-level verdict, not search-analytics rows) | n/a | n/a |
| **rowLimit / pagination** | Walks all sitemap URLs with bounded concurrency (8 workers). No pagination param. | URL Inspection API doesn't paginate by `startRow`. | OK |
| **dataState** | None | "use explicit `dataState`" | URL Inspection doesn't have a `dataState`; verdict + coverageState are returned directly. No drift. |
| **date semantics** | `lastCrawlTime` is returned by Google (RFC 3339, UTC). No PT conversion in script. | "preserve PT date semantics" (per A1) | **Minor drift:** `lastCrawlTime` is stored as the raw RFC 3339 string from Google. Cross-source joins that normalize to PT would need conversion downstream. |
| **sort order** | n/a | n/a | n/a |
| **output sink** | Two files: `gsc-indexing-cache.json` (overwritten, 24h TTL) + `gsc-indexing-report-YYYY-MM-DD.json` (dated archive). | "do not add overlapping rolling snapshots as daily facts" | **Mostly OK.** Cache overwrites but archive is immutable by date. Disk evidence: `gsc-indexing-report-2026-07-06.json`, `-07.json`, `-10.json` (note: no `-08`/`-09` archive — see Drift §3.1). |
| **idempotency** | Rerun on same day overwrites cache but also overwrites the dated report. | n/a | **Note:** Running the script twice on the same day gives you only the latest snapshot in the dated file. The cache is the authoritative "last run" view. |
| **provenance** | `timestamp` (ISO), `sourceUrl`. No extractor version, no dataState, no requested window (the "window" is implicit = "current inspection state"). | Global source rule | **Partial drift:** two of eight fields. |

#### C. `investigate-gsc-spike.cjs` (one-off diagnostic, paginated)

| Attribute | Current state | Drift |
|---|---|---|
| **dimensions** | `['query','page','date']` | OK (good — date dimension in addition to v2's page) |
| **rowLimit / pagination** | `rowLimit: 25000`, `startRow` loop until short response. | OK — this is the only collector that actually paginates. |
| **dataState** | Not set. | Drift (same as primary) |
| **date semantics** | Single hardcoded `DATE` from argv, no TZ. | Drift (UTC vs PT) |
| **sort order** | None (raw order from GSC). | OK |
| **output sink** | Single JSONL `gsc-spike-investigation-<DATE>.jsonl`, overwritten on rerun. | **Drift:** no archive; rerun clobbers. |
| **idempotency** | Destructive — `fs.writeFileSync` to a fixed path per date. | Drift |
| **provenance** | None. | Drift |

### 1.4 Does the existing collector create an immutable archive?

**No** for the primary A1 collector (`gsc-search-analytics-daily.cjs`):
- Single rolling JSONL. Append-only. No dated archive path.
- No `rm`/`unlink`/`rmdir` anywhere in the script.
- Four different snapshotDates (2026-07-06, 2026-07-08, 2026-07-09, 2026-07-10)
  are interleaved in one file. Downstream code (misroute-audit) dedupes by
  (query, page) keeping max-impressions, which silently discards lower-snapshot
  evidence.

**Yes** for URL Inspection (`gsc-indexing-check.cjs`):
- Dated archive `gsc-indexing-report-YYYY-MM-DD.json`.
- But disk shows **no `gsc-indexing-report-2026-07-08.json` or `-09.json`**;
  only 06, 07, 10. Either the script didn't run those days, or the cron
  missed. See Drift §3.1.

### 1.5 Comparison with `SOURCES.md` §A1

| Spec rule (A1) | Current implementation | Verdict |
|---|---|---|
| "click-descending result order" preserved | Collector uses `impressions DESCENDING` instead. | **Non-conforming.** |
| "arbitrary order for click ties" preserved | Sort overrides ties. | **Non-conforming** (cosmetic — GSC's tie-break is opaque). |
| "bounded/top-data results that do not guarantee all rows" | rowLimit 1000, single call, no pagination. | **Conforming in effect** but the spec wants explicit labeling of boundedness in metadata. |
| "rowLimit of 1–25,000 with startRow pagination" | rowLimit OK; pagination **missing**. | **Partially conforming** — primary collector does NOT paginate. The diagnostic script does. |
| "PT date semantics" | UTC slicing everywhere; no PT hint. | **Non-conforming.** |
| "finalized data by default, with `dataState` controls for fresh/incomplete data" | No `dataState`; defaults to `all` (fresh). | **Non-conforming** — opposite of spec default. |
| "preserve requested dimensions, filters, aggregation, dataState, row limit, pagination, and window" | Dimensions in row (partially via `page`/`query` keys), but **no** filters/aggregation/dataState/limit/pagination/window recorded. | **Non-conforming.** |
| "label locally sorted results as `top by impressions among rows returned by this extract`" | Not labeled anywhere. | **Non-conforming.** |
| "do not add overlapping rolling snapshots as daily facts" | Default `--days=7` produces 6-day-overlap on consecutive cron runs. | **Non-conforming.** |
| Global source rule: extractor version, requested window, timezone, etc. | None of eight required fields present. | **Non-conforming.** |

**Bottom line (A1):** The current collector is a *rolling append-only snapshot*
that explicitly admits (header comment line 44-49) it is "a continuous stream
instead of a one-shot artifact." It is useful as an operational diagnostic
but **does not satisfy the A1 contract as written**. Specifically, the
`orderBy: impressions`, missing `dataState`, missing pagination, missing
PT/TZ semantics, and absence of provenance metadata are blocking drift for
Ticket 001 acceptance ("preserve click-descending/bounded semantics; use
explicit `dataState`; preserve PT date semantics; paginate where a bounded
diagnostic requires it; never label returned rows a complete
impression-ranked universe").

---

## 2) Source contract A0 — Search Console Bulk Data Export to BigQuery

### 2.1 Repo search for any sign of the BDE link

Search command (from repo root):
```
rg -i "bulk data|search-console-bulk|gsc.*bigquery" --no-ignore -g '!node_modules' --hidden
```

**Result:** No matches in any tracked source file. The only hits are in
`dist/` (compiled HTML containing the phrase "bulk" in unrelated copy) —
none of those reference `searchconsole.googleapis.com`, `search_console_*`
BigQuery tables, or `bulk_data_export`.

Cross-check:
```
rg "bigquery|@google-cloud/bigquery" -g '!node_modules' -g '!dist'
```
**Result:** No hits anywhere in the repo (source or build). The
`googleapis` package is used (for Search Analytics + URL Inspection), but
`@google-cloud/bigquery` is not installed and there is no BigQuery
client code anywhere.

### 2.2 Package-level check

`apps/maine-cannabis/package.json` (read via `node -e ... | grep gsc`)
registers only the A1 collectors (see §1.2). No `seo:gsc-bulk-export`,
no `seo:gsc-bigquery-sync`, no BDE-related script.

There is no `bigquery`, no `bq`, no `gcloud`, no service-account-key
binding for BDE in any environment reference.

### 2.3 Spec-side: what would need to exist for A0 to be enabled?

From `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/SOURCES.md` §A0:

> "Preferred production Discovery/Acquisition warehouse when enablement is
> available. ... Production preference: use Bulk Data Export for
> warehouse-oriented page/query analysis; retain the Search Analytics API
> for targeted diagnostics and operational probes; record export
> enablement date and prove historical availability; preserve
> anonymized-query limitations."

From `TICKETS/001-source-contract-repair.md`:

> "First decision: Search Console Bulk Data Export — Attempt to
> enable/prove Search Console Bulk Data Export to BigQuery. If available,
> make it the preferred production Discovery/Acquisition warehouse.
> Record: property; BigQuery project/dataset; export enablement date;
> table schema; anonymized-query limitation; historical availability."

### 2.4 A0 status verdict

**NOT ENABLED** — **UNKNOWN** whether it can be enabled.

**Evidence for "not enabled":**
- No repo code references BDE or BigQuery (§2.1, §2.2).
- No collector script in `package.json` writes to BigQuery.
- No GSC UI export-link artifacts, no `gsc-bulk-export-*` artifacts,
  no `bigquery-*` artifacts in `apps/maine-cannabis/data/`.

**Evidence for "unknown enablement":**
- The repo does not contain the GCP-side configuration (project id,
  dataset id, service-account scope for BigQuery) needed to even attempt
  enablement.
- Whether MDG's GSC property owner has set up the BDE link is **not**
  knowable from repo evidence alone — that decision lives in the GSC
  web UI / Cloud project, which is outside the repo.
- The spec (`SOURCES.md` A0) and Ticket 001 itself frame this as an
  *attempt* ("Attempt to enable/prove..."), which confirms the
  enablement state is not yet established.

**What would have to exist** (spec-derived acceptance list) for A0 to
flip to ENABLED:
1. A GSC UI Bulk Data Export link to a BigQuery project/dataset (operator action — not in repo).
2. The BigQuery project id + dataset id recorded somewhere reproducible (env var, repo doc, or extractor).
3. An extractor that reads the `searchdata_*` (or property-specific) tables into the repo's analytics surface, OR a documented access pattern for downstream scripts.
4. A "enablement date" stamp + a pre-link historical-availability note (per spec, "preserve historical pre-link limitations").
5. A documented anonymized-query policy statement.
6. A BDE-vs-API role-distinction note in code/docs (currently absent — see Drift §3.2).

---

## 3) Drift + risk inventory

### 3.1 Symptomatic snapshot counts

```
$ cd /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/data

$ wc -l gsc-search-analytics.jsonl
2880 gsc-search-analytics.jsonl
```

**First 5 lines** (note: v1 schema, no `page` field — these rows are pre-2026-07-13):
```
{"snapshotDate":"2026-07-06","query":"420 mules bar harbor","clicks":1,"impressions":23,"ctr":0.043478260869565216,"position":9.73913043478261}
{"snapshotDate":"2026-07-06","query":"best rosin in maine","clicks":1,"impressions":11,"ctr":0.09090909090909091,"position":4.727272727272727}
{"snapshotDate":"2026-07-06","query":"best weed in maine","clicks":1,"impressions":1,"ctr":1,"position":3}
{"snapshotDate":"2026-07-06","query":"cannabis workers permit","clicks":1,"impressions":3,"ctr":0.3333333333333333,"position":31.666666666666668}
{"snapshotDate":"2026-07-06","query":"cannabis?","clicks":1,"impressions":1,"ctr":1,"position":3}
```

**Last 5 lines** (v2 schema with `page` — these rows are 2026-07-10 post-v2 cutover):
```
{"snapshotDate":"2026-07-10","query":"yes","page":"https://mainedispensaryguide.com/blog/best-maine-dispensaries-2026","clicks":0,"impressions":1,"ctr":0,"position":1}
{"snapshotDate":"2026-07-10","query":"yes","page":"https://mainedispensaryguide.com/guides/maine-dispensary-license","clicks":0,"impressions":1,"ctr":0,"position":2}
{"snapshotDate":"2026-07-10","query":"yes maine","page":"https://mainedispensaryguide.com/guides/maine-cannabis-2026-operator-cost-update","clicks":0,"impressions":1,"ctr":0,"position":5}
{"snapshotDate":"2026-07-10","query":"yes maine","page":"https://mainedispensaryguide.com/market-stats","clicks":0,"impressions":1,"ctr":0,"position":6}
{"snapshotDate":"2026-07-10","query":"york maine dispensary","page":"https://mainedispensaryguide.com/guides/york-dispensary-guide","clicks":0,"impressions":18,"ctr":0,"position":15.444444444444445}
```

**Schema drift visible inline:** first 5 rows lack `page`; last 5 rows have it. Same file. The JSONL is **schizophrenic** across the v1→v2 cutover. Consumers must handle both shapes (and the misroute-audit already does, via `'page' in r` check at line 88).

```
$ ls gsc-indexing-*
gsc-indexing-cache.json
gsc-indexing-report-2026-07-06.json
gsc-indexing-report-2026-07-07.json
gsc-indexing-report-2026-07-10.json

$ wc -l gsc-indexing-*.json
    45 gsc-indexing-cache.json
  2013 gsc-indexing-report-2026-07-06.json
  2037 gsc-indexing-report-2026-07-07.json
    45 gsc-indexing-report-2026-07-10.json
  4140 total
```

**First 5 records** (representative; identical shape across all four files; shown for `gsc-indexing-cache.json`):
```
{
  "timestamp": "2026-07-10T02:03:58.366Z",
  "sourceUrl": "https://mainedispensaryguide.com/",
  "results": [
    { "url": "https://mainedispensaryguide.com", "status": "INDEXED", "verdict": "PASS", "coverage": "Submitted and indexed", "lastCrawl": "2026-07-09T20:26:44Z", "robotsTxt": "ALLOWED" },
    { "url": "https://mainedispensaryguide.com/about", "status": "INDEXED", "verdict": "PASS", "coverage": "Submitted and indexed", "lastCrawl": "2026-06-23T06:32:47Z", "robotsTxt": "ALLOWED" },
    { "url": "https://mainedispensaryguide.com/about/authors", "status": "NEUTRAL", "verdict": "NEUTRAL", "coverage": "Crawled - currently not indexed", "lastCrawl": "2026-07-05T04:43:39Z", "robotsTxt": "ALLOWED" },
    { "url": "https://mainedispensaryguide.com/about/corrections", "status": "INDEXED", "verdict": "PASS", "coverage": "Submitted and indexed", "lastCrawl": "2026-07-05T04:43:39Z", "robotsTxt": "ALLOWED" },
    { "url": "https://mainedispensaryguide.com/about/our-team", "status": "INDEXED", "verdict": "PASS", "coverage": "Submitted and indexed", "lastCrawl": "2026-05-30T18:20:03Z", "robotsTxt": "ALLOWED" }
  ]
}
```

**Drift notes:**
- `gsc-indexing-report-2026-07-10.json` and `gsc-indexing-cache.json` are
  byte-identical (both 45 lines, same `timestamp`). Either (a) the script
  crashed mid-run on 2026-07-10 and only persisted 5 results before
  writing, or (b) the dated archive was copied from cache.
- The 2026-07-06 and 2026-07-07 dated reports both have ~2013 / 2037 lines
  (full sitemap walk). The 2026-07-10 file does not — it's 45 lines (~5
  records). Net: **two full archival snapshots + one truncated**.
- **Missing archive days**: 2026-07-08 and 2026-07-09 have no
  `gsc-indexing-report-*.json` on disk. Either the cron was not yet
  installed, or it failed silently. This is a **gap in audit trail**
  for those days.

```
$ wc -l apps/maine-cannabis/data/gsc-spike-investigation-2026-07-07.jsonl
126 gsc-spike-investigation-2026-07-07.jsonl
```

**First 5 lines** (operator-name spike diagnostic, v2 schema with `date`):
```
{"date":"2026-07-07","query":"above all greenery fryeburg","page":"https://mainedispensaryguide.com/guides/fryeburg-dispensary-guide","clicks":1,"impressions":5,"ctr":0.2,"position":10}
{"date":"2026-07-07","query":"280e consultant nyc","page":"https://mainedispensaryguide.com/guides/maine-cannabis-schedule-iii-dual-license-280e","clicks":0,"impressions":1,"ctr":0,"position":76}
{"date":"2026-07-07","query":"420 mules","page":"https://mainedispensaryguide.com/guides/420-mules-bar-harbor","clicks":0,"impressions":2,"ctr":0,"position":7.5}
{"date":"2026-07-07","query":"above all greenery","page":"https://mainedispensaryguide.com/guides/above-all-greenery-dispensary","clicks":0,"impressions":4,"ctr":0,"position":7}
{"date":"2026-07-07","query":"above all greenery fryeburg","page":"https://mainedispensaryguide.com/guides/above-all-greenery-dispensary","clicks":0,"impressions":2,"ctr":0,"position":6}
```

**Last 5 lines**:
```
{"date":"2026-07-07","query":"white mountain craft cannabis fryeburg maine","page":"https://mainedispensaryguide.com/guides/white-mountain-craft-cannabis","clicks":0,"impressions":1,"ctr":0,"position":9}
{"date":"2026-07-07","query":"yes","page":"https://mainedispensaryguide.com/blog/best-cannabis-strains-maine-outdoor-2026","clicks":0,"impressions":1,"ctr":0,"position":3}
{"date":"2026-07-07","query":"yes maine","page":"https://mainedispensaryguide.com/guides/maine-cannabis-2026-operator-cost-update","clicks":0,"impressions":1,"ctr":0,"position":5}
{"date":"2026-07-07","query":"yes maine","page":"https://mainedispensaryguide.com/market-stats","clicks":0,"impressions":1,"ctr":0,"position":6}
{"date":"2026-07-07","query":"york maine dispensary","page":"https://mainedispensaryguide.com/guides/york-dispensary-guide","clicks":0,"impressions":1,"ctr":0,"position":13}
```

### 3.2 Spec audit claims vs. reality

| Spec claim (or implicit invariant) | Repo reality | Verdict |
|---|---|---|
| A0 (BDE to BigQuery) preferred warehouse | Not enabled; no BDE references in repo. | **Drift:** repo is purely A1. |
| A1 used for "targeted Discovery/Acquisition diagnostics and operational probes" | A1 is the only signal source for everything (search analytics, indexing, spikes). Used as de-facto warehouse even though spec reserves that role for A0. | **Drift:** role mismatch — A1 is being asked to do A0's job. |
| "The legacy `gsc-search-analytics-daily.cjs` is a rolling snapshot collector, not a daily fact table." | Repo confirms (header comment line 46-48). | **Conforming** — the existing implementation matches the spec's diagnosis of itself. |
| Spec demands removal of "unsupported `orderBy`" | `orderBy: [{field:'impressions', sortOrder:'DESCENDING'}]` is **supported** by GSC API, so this is *not* "unsupported orderBy" — but it IS a deviation from the canonical clicks-DESCENDING default. | **Partial drift:** orderBy is supported; choice is non-default. |
| Spec demands "preserve PT date semantics" | Code uses `toISOString()` slicing — UTC. | **Non-conforming.** |
| Spec demands "explicit `dataState`" | Missing entirely. | **Non-conforming.** |
| Spec demands "paginate where a bounded diagnostic requires it" | Primary collector does not paginate; diagnostic does. | **Partially conforming.** |
| Spec demands "label locally sorted results as `top by impressions among rows returned by this extract`" | Not labeled. | **Non-conforming.** |
| Spec demands "do not add overlapping rolling snapshots as daily facts" | Default `--days=7` produces 6-day overlap on consecutive cron runs. | **Non-conforming.** |
| Spec demands archive with extract id, extractor version, requested window, timezone, dataState, settlement state, bounding/suppression notes | None of these fields in any artifact. | **Non-conforming.** |
| Indexed `gsc-indexing-report-*.json` files appear dated + immutable | Disk evidence: 06, 07, 10 present; 08, 09 missing; 10 is truncated/identical to cache. | **Drift:** archive is fragile (missing days, truncated last day). |
| Misroute audit `gsc-misroute-audit.cjs` is a *consumer* of A1 data, not part of A1 contract | Header comment says it exists "to make [the v2 data] actionable for operators." | **Conforming** as a derivative view, but it sits outside the A1 contract scope. |

### 3.3 Blockers for downstream Tickets

**Ticket 002 — Source Capability Forensics (Vercel + instrumentation context):**
- Not directly blocked by GSC drift; GA4 + Vercel tickets are scoped to their own sources (parent's parallel agents A and C handle).
- However, Ticket 002 acceptance ("source-native bounce/engagement names are preserved" for Vercel) requires the canonical `sitedish`, `route`, etc. naming. The GSC side does **not** need to be settled for Ticket 002 to ship, but it should be noted that GSC's A1 contract gap will surface again at Ticket 008.

**Ticket 008 — Cross-Source Page-Window Join:**
- **Blocked** by GSC A1 drift. The join contract requires "GSC page-day and query-window semantics remain distinct; different windows are never compared as identical." Today the collector stamps rows with `snapshotDate` (the date the script ran) not the GSC row date, and the 7-day default window makes "today's snapshot" and "yesterday's snapshot" overlapping. A join to GA4 page-day data with no window metadata will silently equate "snapshot from 2026-07-10 7-day window" with "GA4 page-day for 2026-07-10" — a mis-join.
- **Blocked** by missing `dataState`. Without `final`/`all`, late-arriving GSC events can match a settled GA4 day and produce phantom cross-source correlations.
- **Blocked** by UTC vs PT semantics. If GA4 is normalized to PT and GSC is sliced in UTC, joins will misalign by one calendar day for cron runs after 16:00 PT.

**Ticket 011 — Opportunity Engine:**
- **Blocked** by missing `dataState`. Spec demands "opportunity generation consumes state transitions, not raw metric ranking; opportunity IDs survive settled-window evidence refresh; immutable detection snapshot is preserved; E0–E4 evidence grade mandatory." Without `dataState` and a settlement horizon, evidence grades E0/E1 are unknowable and opportunity IDs are not stable across snapshots.
- **Blocked** by missing provenance (extract id, extractor version, requested window). The opportunity engine needs to know *which extract* an evidence row came from to assign E0/E1 grades and to detect re-extracts that would invalidate opportunity IDs.
- **Blocked** by overlapping rolling snapshots. The dedupe-by-max-impressions in the misroute audit is a *consumer-side* workaround that masks the underlying contract violation; downstream opportunities built from "best snapshot per (query,page)" can silently lose evidence when a more recent snapshot has *lower* impressions than a prior one (e.g. seasonal dips).
- **Blocked** by v1↔v2 schema schizophrenia in the JSONL. Any opportunity generator that doesn't defensively check `'page' in r` (as the misroute audit does) will throw on the v1 rows.
- **Partial unblock** if A0 (BDE) is enabled: a settled-window warehouse would let the opportunity engine re-read evidence per opportunity-ID with explicit settlement state, sidestepping the A1 daily-snapshot problem entirely.

### 3.4 Net risk summary for Ticket 001 acceptance

The Ticket 001 acceptance criteria from `TICKETS/001-source-contract-repair.md` are:

- "preferred acquisition source selected with evidence" — **A0 status is NOT ENABLED + UNKNOWN. Needs operator-side evidence (GSC UI / GCP project).**
- "API and bulk-export roles are distinct" — **A1 in repo is currently serving the warehouse role that spec reserves for A0. Distinctness is not preserved.**
- "overlapping snapshots cannot be summed as daily facts" — **Current implementation produces overlapping snapshots. No enforcement.**
- "source provenance and completeness limitations are machine-readable" — **No provenance in any artifact. Limitations are buried in code comments, not in the data.**

**Recommendation to parent (for ticket-001 acceptance gate):** treat all four acceptance criteria as failing on the A1 path. Either (a) flip the role by enabling A0 and demoting A1 to diagnostics, or (b) re-author the A1 collector to satisfy SOURCES.md §A1 (explicit `dataState: 'final'`, PT date semantics, paginated, provenance sidecar, dated archive, no overlap-on-default-window). Do not accept the current collector as A1-compliant on the spec's own terms.

---

## Replay commands (parent can re-execute every claim)

```bash
# --- A1.1 Inventory GSC extractor scripts ---
cd /home/steve/projects/maine-dispensary-guide
rg -l "searchanalytics.googleapis" -g '!node_modules' -g '!dist'
rg -l "searchconsole"          -g '!node_modules' -g '!dist'
rg -l "gsc-search"             -g '!node_modules' -g '!dist'
rg -l "GoogleSearchConsole"    -g '!node_modules' -g '!dist'

# --- A1.2 Confirm npm scripts ---
node -e "console.log(JSON.stringify(require('./apps/maine-cannabis/package.json').scripts,null,2))" | grep gsc

# --- A1.3 Read each extractor (each fully) ---
cat apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs
cat apps/maine-cannabis/scripts/seo/gsc-indexing-check.cjs
cat apps/maine-cannabis/scripts/seo/gsc-misroute-audit.cjs
cat scripts/analytics/investigate-gsc-spike.cjs

# --- A1.3 attribute checks ---
rg "dataState|orderBy|startRow" apps/maine-cannabis/scripts/seo/ scripts/analytics/
rg "Pacific|America/Los_Angeles|tz\b" apps/maine-cannabis/scripts/seo/ scripts/analytics/
rg "delete|rmdir|rmSync" apps/maine-cannabis/scripts/seo/

# --- A2.1 BDE/BigQuery search ---
rg -i "bulk data|search-console-bulk|gsc.*bigquery" --no-ignore -g '!node_modules' --hidden
rg "bigquery|@google-cloud/bigquery" -g '!node_modules' -g '!dist'

# --- Spec side A0/A1 ---
ls /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/
cat /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/SOURCES.md
cat /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/001-source-contract-repair.md
cat /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/008-cross-source-page-window-join.md
cat /home/steve/Documents/mdg-analytics-intelligence-package-v0.5/TICKETS/011-opportunity-engine.md

# --- 3.1 Snapshot counts ---
cd apps/maine-cannabis/data
wc -l gsc-search-analytics.jsonl
head -5 gsc-search-analytics.jsonl
tail -5 gsc-search-analytics.jsonl
ls gsc-indexing-*
wc -l gsc-indexing-*.json
head -c 1500 gsc-indexing-cache.json
head -c 1500 gsc-indexing-report-2026-07-06.json
head -c 1500 gsc-indexing-report-2026-07-07.json
head -c 1500 gsc-indexing-report-2026-07-10.json
wc -l gsc-spike-investigation-2026-07-07.jsonl
head -5 gsc-spike-investigation-2026-07-07.jsonl
tail -5 gsc-spike-investigation-2026-07-07.jsonl

# --- Current main / status ---
cd /home/steve/projects/maine-dispensary-guide
git rev-parse HEAD
git status --short
git log --oneline -1 -- apps/maine-cannabis/scripts/seo/gsc-search-analytics-daily.cjs
git log --oneline -1 -- scripts/analytics/investigate-gsc-spike.cjs
```

---

DONE: uncommitted
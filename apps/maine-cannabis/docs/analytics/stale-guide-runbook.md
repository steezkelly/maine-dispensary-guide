# Stale-guide report — runbook

**Card:** [`docs/governance/cards/2026-07-21-stale-guide-dashboard.md`](../../../../governance/cards/2026-07-21-stale-guide-dashboard.md)
**Script:** [`apps/maine-cannabis/scripts/seo/stale-guide-report.cjs`](../../scripts/seo/stale-guide-report.cjs)
**Baseline:** [`docs/audits/stale-guide-baseline-2026-07-21.md`](../../../../audits/stale-guide-baseline-2026-07-21.md)

## Purpose

This runbook ships the read-only `stale-guide-report.cjs` that flags MDG guide
and blog pages where the file's `modifiedDate` frontmatter is older than 90
days AND the page is still pulling real GSC impressions over the last 28 days.
The 2026 r/localseo synthesis (threads `1s50vo8`, `1t1fbef`, and the WhiteSpark
2026 local-search survey `1oq70pv`) converged on **review velocity > total
count** as the dominant local-pack signal. By analogy, AI Overviews and ChatGPT
citation in 2026 appear to favour pages whose `dateModified` was bumped
recently — stale-but-still-ranking pages are exactly the cohort the report
surfaces, so a content editor can refresh them on the next sprint and recover
ranking headroom without writing net-new copy. This script is **read-only**:
it does not touch any Astro file, does not deploy, and does not schedule a
cron. The dashboard visualisation and any cadence wiring are an
operator-gated child card (see [Open follow-ups](#open-follow-ups)).

## How to run

The script is a single CommonJS file under `apps/maine-cannabis/scripts/seo/`.
It is runnable from any cwd via an absolute path. The three commands below
match the acceptance evidence in the card contract:

```bash
# 1) usage (exit 0)
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs --help

# 2) JSON to stdout — non-empty object even when 0 pages match
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs \
  --gsc-csv ./gsc-last-28d.csv --limit 10 --json

# 3) Markdown table to stdout — pipe into a file or pager
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs \
  --gsc-csv ./gsc-last-28d.csv --limit 10 --md > /tmp/stale.md
```

Optional flags: `--limit N` (top N after filter+sort), `--today YYYY-MM-DD`
(override the operator-pinned `2026-07-21` for replay/regression runs). If
neither `--json` nor `--md` is passed, `--json` is implied.

## GSC CSV format

The script reads a single CSV file (default: `./gsc-last-28d.csv`). Header
must be exact, lower-case, no BOM:

```
page,clicks,impressions,ctr,position
```

| Column        | Type    | Notes                                                                                       |
|---------------|---------|---------------------------------------------------------------------------------------------|
| `page`        | URL     | Absolute URL as returned by GSC; the script strips `https://mainedispensaryguide.com/` and the `guides/` or `blog/` prefix before matching the local `.astro` filename |
| `clicks`      | integer | GSC clicks in the date window                                                               |
| `impressions` | integer | GSC impressions in the date window — used by the filter (`> 50`)                            |
| `ctr`         | float   | 0-1 fraction; the script multiplies by 100 for the markdown table                           |
| `position`    | float   | 1-based average position; rendered to 1 decimal in markdown                                 |

The CSV is the canonical export from the OpenSEO MCP
`get_search_console_performance` tool, scoped to the
`4b687621-d649-420a-9e3a-7af5a9354297` project and `last_28_days` window, with
`dimensions: ["page"]` and `rowLimit: 500`. The 2026-07-21 export covered the
**2026-06-20 → 2026-07-18** GSC window and returned 265 rows. An adapter
(JSON→CSV) lives at `/tmp/gsc-convert.cjs` during the initial build; the CSV
itself is committed next to the runbook as `gsc-last-28d.csv` at the worktree
root for replay.

## Filter

- `impressions_28d > 50` (window: 2026-06-20 → 2026-07-18)
- `days_since_modified > 90` (today is operator-pinned to `2026-07-21`)
- Sort: `impressions_28d` descending
- Sources: every `.astro` under `apps/maine-cannabis/src/pages/guides/` and
  `apps/maine-cannabis/src/pages/blog/`, excluding `admin/`, `index.astro`,
  `all-cities.astro`, and `all-guides.astro`. The script walks the two source
  trees recursively; sub-directories like `guides/regions/` are picked up
  automatically as long as they end in `.astro`.

## Sample output

The real 2026-07-21 run, against `gsc-last-28d.csv` (265 GSC rows) and the
2 source trees (232 .astro files scanned), surfaced **0** pages that meet
both filter conditions. The 2026-05-13 sweep that updated the city-guide
cohort bumped every page in that batch to exactly 69 days old on
2026-07-21 — close to the 90-day threshold but still inside the freshness
window. The next-most-stale cohort (`2026-06-05`, 46 days) holds the
`bar-harbor-dispensary-guide`, `maine-cannabis-edibles-compliance`, and
`maine-cannabis-events-2026` pages.

The script's own `--md` output is the authoritative artefact:

```
# Stale-guide report

Generated: 2026-07-21T...
Filter: impressions_28d > 50 AND days_since_modified > 91 (today = 2026-07-21)
GSC CSV: `gsc-last-28d.csv`
Sources: `apps/maine-cannabis/src/pages/guides`, `apps/maine-cannabis/src/pages/blog`

Pages scanned: 232. Kept: 0. Skipped: 8 missing modifiedDate, 0 no GSC row, 0 low impressions, 224 fresh.

| Page | Modified | Days old | Impressions (28d) | Position | CTR |
|---|---|---:|---:|---:|---:|
```

For context, the baseline audit (`docs/audits/stale-guide-baseline-2026-07-21.md`)
also lists the 10 oldest high-impression pages that *would* have triggered the
filter if the freshness threshold were 70 days instead of 90 — useful for
sprint planning but not the script's authoritative output.

## Open follow-ups

- **Cron wiring + dashboard visual layer are operator-gated.** This card
  builds the read-only report. The scheduled-export + dashboard-visualisation
  follow-on is a separate card because `docs/governance/AGENT_WORKING_ORDERS.md`
  line 69 records that **GSC scheduled measurement has no `cron.service` on
  this host** — until that host-side blocker is cleared, any "auto-refresh
  every Monday" plan would silently fail. Do not attempt to wire a cron here.
- **Apply the same recency lens to review velocity.** The WhiteSpark 2026
  local-search factors thread (`r/localseo 1oq70pv`) puts review signals at
  the #1 local-pack factor for 2026. MDG has not yet wired the GBP review
  cadence into the content refresh playbook — a follow-up card should bridge
  the gap between "guide is stale" (this script) and "operator review on the
  GBP profile is stale" (separate GBP audit).
- **Re-baseline after the next monthly sweep.** Because the 2026-05-13 cohort
  is at exactly 69 days, it will cross the 90-day threshold around
  2026-08-11 (without intervention). Re-running this script on or after that
  date will surface the cohort. Until then, an empty result is the expected
  output and is a sign that the May sweep is still protecting ranking.

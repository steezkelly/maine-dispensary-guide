# Stale-guide report — runbook

**Kanban task:** `t_e88b0645` (integration authority; authoring history is in commits `2711d2ad` and `106980d4`)
**Script:** [`apps/maine-cannabis/scripts/seo/stale-guide-report.cjs`](../../scripts/seo/stale-guide-report.cjs)
**Baseline:** [`docs/audits/stale-guide-baseline-2026-07-21.md`](../../../../audits/stale-guide-baseline-2026-07-21.md)

## Purpose

This runbook ships the read-only `stale-guide-report.cjs` that flags MDG guide
and blog pages where the file's `modifiedDate` is older than the page's
freshness tier (30 days for time-sensitive pages; 90 days for evergreen pages)
and the page is still pulling real GSC impressions over the last 28 days.
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
Run these examples from the repository root. Source discovery is anchored to
the repository, while a relative `--gsc-csv` path is resolved from the current
working directory:

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

Optional flags: `--limit N` (top N after filter+sort),
`--threshold-mode evergreen|time-sensitive|both`, `--evergreen-days N`,
`--time-sensitive-days N`, and `--today YYYY-MM-DD`. The default date remains
operator-pinned to `2026-07-21` so the checked-in baseline is reproducible;
pass the current date explicitly for a new measurement. If neither `--json`
nor `--md` is passed, `--json` is implied.

## GSC CSV format

The script reads a single CSV file (default: `./gsc-last-28d.csv`). Header
must be exact, lower-case, no BOM:

```
page,clicks,impressions,ctr,position
```

| Column        | Type    | Notes                                                                                       |
|---------------|---------|---------------------------------------------------------------------------------------------|
| `page`        | URL     | Absolute guide/blog URL as returned by GSC; slash and slash-less variants are aggregated before matching the route to a local `.astro` source |
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
- Time-sensitive routes: `days_since_modified > 30`
- Evergreen routes: `days_since_modified > 90`
- `today` defaults to the replay date `2026-07-21`; use `--today` for a new run
- Sort: `impressions_28d` descending
- Sources: every `.astro` under `apps/maine-cannabis/src/pages/guides/` and
  `apps/maine-cannabis/src/pages/blog/`, excluding `admin/`, `index.astro`,
  `all-cities.astro`, and `all-guides.astro`. The script walks the two source
  trees recursively; sub-directories like `guides/regions/` are picked up
  automatically as long as they end in `.astro`.

## Sample output

The real 2026-07-21 run, against `gsc-last-28d.csv` (265 GSC rows) and the
2 source trees (233 `.astro` files scanned), surfaced **14 time-sensitive**
pages and **0 evergreen** pages. The evergreen city-guide cohort remained
inside its 90-day window; the 14 time-sensitive pages exceeded 30 days.

The script's own `--md` output is the authoritative artefact:

```
# Stale-guide report

Generated: 2026-07-21T...
Filter: impressions_28d > 50, threshold_mode=both, evergreen_days=90, time_sensitive_days=30, today=2026-07-21
GSC CSV: `gsc-last-28d.csv`
Sources: `apps/maine-cannabis/src/pages/guides`, `apps/maine-cannabis/src/pages/blog`

Pages scanned: 233. Kept: 14 (time-sensitive=14, evergreen=0). Limited to: 10. Skipped: 8 missing modifiedDate, 0 tier-filtered, 3 no GSC row, 14 low impressions, 194 fresh.

## time-sensitive (threshold: > 30 days, 10 pages)
```

The complete 14-row result and interpretation are recorded in the baseline
audit (`docs/audits/stale-guide-baseline-2026-07-21.md`).

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
  date will surface the evergreen cohort. Time-sensitive results can remain
  non-empty before then and should be reviewed on their 30-day cadence.

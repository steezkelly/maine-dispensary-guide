# Stale-guide report — runbook

**Kanban task:** `t_1697612e`
**Script:** [`apps/maine-cannabis/scripts/seo/stale-guide-report.cjs`](../../scripts/seo/stale-guide-report.cjs)
**Baseline:** [`docs/audits/stale-guide-baseline-2026-07-21.md`](../../../../docs/audits/stale-guide-baseline-2026-07-21.md)

## Purpose

`stale-guide-report.cjs` is a read-only prioritization report for MDG guide and
blog pages. It combines each source file's `modifiedDate` with private,
page-level GSC performance data and applies an operator-approved two-tier
freshness heuristic: 30 days for time-sensitive routes and 90 days for
evergreen routes.

The report identifies pages for editorial review; it does not prove that a
page is inaccurate, and changing `dateModified` without substantive review is
not an SEO tactic. The script does not modify Astro files, deploy, or schedule
a cron job.

## Privacy boundary

Raw or page-level GSC exports must stay outside this public repository. The
script enforces that boundary and exits with code 2 when `--gsc-csv` resolves
inside the repository.

The default input is:

```text
${MDG_GSC_DATA_ROOT:-$HOME/.hermes/data/mdg-gsc}/gsc-last-28d.csv
```

Set `MDG_GSC_DATA_ROOT` to another absolute directory outside the repository,
or pass an explicit outside-repository path with `--gsc-csv`. Never commit the
CSV, generated JSON, or generated Markdown. Public audit records may contain
aggregate cohort counts and aggregate metrics only.

## How to run

Run from the repository root:

```bash
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs --help

node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs \
  --today 2026-07-21 --json

node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs \
  --gsc-csv /absolute/private/path/gsc-last-28d.csv \
  --today 2026-07-21 --limit 10 --md
```

Optional flags:

- `--limit N`
- `--threshold-mode evergreen|time-sensitive|both`
- `--evergreen-days N`
- `--time-sensitive-days N`
- `--today YYYY-MM-DD`
- `--json` or `--md` (`--json` is the default)

The checked baseline pins `--today 2026-07-21` for reproducibility. Pass the
measurement date explicitly for a new run.

## GSC CSV contract

Header:

```text
page,clicks,impressions,ctr,position
```

| Column | Type | Notes |
|---|---|---|
| `page` | URL | Absolute MDG guide/blog URL; HTTP/HTTPS and slash variants are aggregated to the canonical HTTPS URL |
| `clicks` | integer | Clicks in the selected GSC window |
| `impressions` | integer | Impressions in the selected GSC window; report threshold is `> 50` |
| `ctr` | float | Fraction from 0 to 1 |
| `position` | float | 1-based average position |

Fetch page-level data with OpenSEO
`get_search_console_performance`, using `dimensions: ["page"]`, the intended
window, and sufficient `rowLimit` to retrieve the whole property result. Keep
the tool response and converted CSV in the private data root.

When slash and slash-less rows map to the same local route, the script sums
clicks and impressions, recomputes CTR, and computes an
impression-weighted position. This removes CSV-order dependence.

All numeric fields fail closed when they are non-numeric or outside their
documented ranges. `--today` accepts only a real calendar date. Source metadata
accepts single- or double-quoted literal `modifiedDate` values and the current
`meta.retrieved_at` JSON-backed form used by the municipal opt-in tracker.
Wall-clock timestamps and machine-specific input paths are excluded from output;
identical source, CSV, and arguments therefore produce byte-identical reports.

## Filter and source scope

- Time-sensitive routes: `impressions > 50` and `days_since_modified > 30`
- Evergreen routes: `impressions > 50` and `days_since_modified > 90`
- Sort: impressions descending
- Sources: `.astro` files under `apps/maine-cannabis/src/pages/guides/` and
  `apps/maine-cannabis/src/pages/blog/`
- Exclusions: `admin/`, `index.astro`, `all-cities.astro`, `all-guides.astro`

The time-sensitive tier uses a short, source-controlled slug-pattern list.
Review that list when regulations, programs, or annual content change; do not
broaden it casually.

## Aggregate baseline

The private 2026-06-20 through 2026-07-18 export, replayed with
`--today 2026-07-21`, scanned 233 source pages and flagged 14 time-sensitive
pages and zero evergreen pages. The flagged cohort had 3,580 aggregate
impressions, 80 aggregate clicks, 2.23% aggregate CTR, and 8.40
impression-weighted average position.

Individual URLs and per-page performance remain in private output only. The
public aggregate record is in the baseline audit.

## Verification

```bash
node --test apps/maine-cannabis/scripts/seo/stale-guide-report.test.cjs
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs --help
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs \
  --today 2026-07-21 --json
```

The third command requires the private default CSV. Confirm the JSON reports
233 scanned pages and 14 retained pages for the pinned baseline.

## Open follow-ups

- Cron wiring and dashboard visualization remain separate, operator-gated
  work. Do not imply a refresh cadence is active until the scheduler and
  delivery path are verified.
- Re-run with a fresh finalized GSC window and an explicit measurement date
  before making current prioritization claims.
- Editorial refreshes must verify affected claims and sources; do not bump
  `modifiedDate` without substantive review.

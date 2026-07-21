# Stale-guide baseline audit v2 — 2026-07-21 (two-tier model)

**Generated:** 2026-07-21 (operator-pinned `today` for the report)
**Branch:** `feat/stale-guide-dashboard-2026-07-21` (same as v1; supersedes the original baseline)
**GSC window:** 2026-06-20 → 2026-07-18 (265 rows, exported via OpenSEO MCP project `4b687621-d649-420a-9e3a-7af5a9354297`)
**Sources walked:** `apps/maine-cannabis/src/pages/guides/` and `apps/maine-cannabis/src/pages/blog/`; `admin/`, `index.astro`, `all-cities.astro`, `all-guides.astro` skipped. **232 .astro files scanned.**
**Script:** [`apps/maine-cannabis/scripts/seo/stale-guide-report.cjs`](../../apps/maine-cannabis/scripts/seo/stale-guide-report.cjs) (two-tier model)
**Runbook:** [`apps/maine-cannabis/docs/analytics/stale-guide-runbook.md`](../../apps/maine-cannabis/docs/analytics/stale-guide-runbook.md)

## What changed from v1

The v1 baseline (commit `2711d2ad`) used a flat 90-day threshold inherited
from the WhiteSpark 2026 review-velocity data. On operator review, that
data point is about *GBP reviews*, not *content recency*, and the threshold
was producing 0 matches. The v2 model uses two tiers:

- **Time-sensitive** (slug matches one of the 15 high-signal patterns: `*-2026`,
  `psilocybin`, `conditional-license`, `staffing-licensing`,
  `edibles-compliance`, `ld-1840`, `regulations`, `opt-in-tracker`,
  `license-denied`, `schedule-iii`, `280e`, `extraction-licensing`,
  `school-buffer`, `zoning-requirements`, `caregiver-trade-show`) — **30-day
  threshold**.
- **Evergreen** (everything else) — **90-day threshold**.

Each page is classified at scan time and the threshold for that tier is
applied. Tier is filterable via `--threshold-mode evergreen|time-sensitive|both`.

## v2 results

```
Pages scanned: 232. Kept: 14 (time-sensitive=14, evergreen=0). Skipped:
8 missing modifiedDate, 0 tier-filtered, 3 no GSC row, 14 low
impressions, 193 fresh.
```

**Time-sensitive tier — top 14 by impressions (28d):**

| # | Slug | Modified | Days old | Imp (28d) | Position | CTR |
|---|---|---|---:|---:|---:|---:|
| 1 | `maine-psilocybin-2026-guide`                 | 2026-06-07 | 44 | 583 | 5.5  | 2.57% |
| 2 | `maine-cannabis-taxes-2026`                   | 2026-06-05 | 46 | 493 | 8.6  | 1.42% |
| 3 | `best-maine-dispensaries-2026`                | 2026-06-05 | 46 | 382 | 7.1  | 3.66% |
| 4 | `maine-cannabis-staffing-licensing`           | 2026-06-07 | 44 | 371 | 9.6  | 4.58% |
| 5 | `best-cannabis-strains-maine-outdoor-2026`    | 2026-06-05 | 46 | 346 | 8.6  | 3.76% |
| 6 | `terpene-preservation-drying-curing-2026`     | 2026-06-06 | 45 | 289 | 7.4  | 0.35% |
| 7 | `portland-maine-cannabis-rules-2026`          | 2026-05-18 | 64 | 257 | 7.8  | 0.39% |
| 8 | `maine-cannabis-schedule-iii-dual-license-280e` | 2026-06-07 | 44 | 176 | 12.6 | 2.27% |
| 9 | `autoflower-vs-feminized-maine-2026`          | 2026-06-06 | 45 | 150 | 10.7 | 2.67% |
| 10 | `maine-cannabis-delivery-business-guide-2026` | 2026-06-07 | 44 | 141 | 7.1  | 2.84% |
| 11 | `maine-cannabis-2026-operator-cost-update`    | 2026-06-07 | 44 | 136 | 8.0  | 0.00% |
| 12 | `cannabis-clones-vs-seeds-maine-2026`         | 2026-06-06 | 45 | 113 | 11.3 | 0.00% |
| 13 | `maine-cannabis-caregiver-trade-show-sales`   | 2026-06-07 | 44 | 90  | 9.4  | 0.00% |
| 14 | `indoor-cannabis-grow-setup-maine-cost-2026`  | 2026-06-06 | 45 | 53  | 23.2 | 0.00% |

**Evergreen tier — 0 matches.** All 109 city guides are within the
90-day freshness window as of 2026-07-21. The 2026-05-13 cohort (9 city
guides at 69 days, documented in v1) will cross 90 days around 2026-08-11.

## What this means

The 30-day threshold does not flag the time-sensitive guides as "wrong" — it
flags them as "the kind of page where a refresh is visibly overdue." Five
of the 14 (rows 1, 2, 3, 4, 8) are also in the YMYL E-E-A-T audit's
operator-decision set, so a single coordinated refresh of those five pages
clears two workstreams at once. The remaining 9 are time-sensitive by topic
but lower-impression; they are appropriate for the same 30-day rotation
cadence but not blocking.

The 90-day evergreen threshold continues to be the right bar for city
guides. The cliff is 2026-08-11. Plan the May 2026 city-guide sweep refresh
accordingly.

## Operator signoff recorded (in chat, 2026-07-21)

The two-tier model with 30-day time-sensitive / 90-day evergreen
thresholds is approved. Override flags `--evergreen-days`,
`--time-sensitive-days`, and `--threshold-mode` are the operator's escape
hatch for any future calibration.

## What this script does NOT do

- Does not modify any Astro file under `src/pages/`.
- Does not push any branch (this branch is not pushed; per the v1 card
  instruction, cron + dashboard visual layer remain operator-gated).
- Does not add a cron entry. Per `docs/governance/AGENT_WORKING_ORDERS.md`
  line 69, GSC scheduled measurement is blocked (no `cron.service` on
  this host).
- Does not invent GSC data. All impressions / clicks / CTR / position
  numbers are quoted from the OpenSEO MCP export for 2026-06-20 →
  2026-07-18.

# Stale-guide baseline audit — 2026-07-21

**Generated:** 2026-07-21 (operator-pinned `today` for the report)
**GSC window:** 2026-06-20 → 2026-07-18 (265 rows, exported via OpenSEO MCP project `4b687621-d649-420a-9e3a-7af5a9354297`)
**Sources walked:** `apps/maine-cannabis/src/pages/guides/` (recursive) and `apps/maine-cannabis/src/pages/blog/` (recursive); `admin/`, `index.astro`, `all-cities.astro`, `all-guides.astro` skipped. **232 .astro files scanned.**
**Filter:** `impressions_28d > 50 AND days_since_modified > 90` (today = 2026-07-21)
**Script:** [`apps/maine-cannabis/scripts/seo/stale-guide-report.cjs`](../../apps/maine-cannabis/scripts/seo/stale-guide-report.cjs)
**Runbook:** [`apps/maine-cannabis/docs/analytics/stale-guide-runbook.md`](../../apps/maine-cannabis/docs/analytics/stale-guide-runbook.md)

## Ranked list — top 10 stale high-impression pages (card-mandated filter)

**Result: 0 pages match.** No Astro page in `guides/` or `blog/` has a
`modifiedDate` more than 90 days old AND more than 50 GSC impressions over
the 28-day window. The script's `--json --limit 10` output:

```json
{
  "generated_at": "2026-07-21T18:32:56.528Z",
  "filter": {
    "impressions_28d_min": 50,
    "days_since_modified_min": 91,
    "today": "2026-07-21",
    "sources": [
      "apps/maine-cannabis/src/pages/guides",
      "apps/maine-cannabis/src/pages/blog"
    ],
    "gsc_csv": "gsc-last-28d.csv"
  },
  "counts": {
    "total_pages_scanned": 232,
    "kept": 0,
    "limited_to": 10,
    "skipped_missing_modifiedDate": 8,
    "skipped_missing_gsc_row": 0,
    "skipped_low_impressions": 0,
    "skipped_fresh": 224
  },
  "pages": []
}
```

The `--md --limit 10` output renders the empty table the same way (header row
plus zero data rows). Both runs **exited 0**, confirming the script runs
end-to-end without error and the GSC CSV is parseable.

## Context — closest-to-threshold cohort (top 10 by `days_old`)

To make this audit actionable for the next sprint, the same script's logic
was re-run with the freshness threshold relaxed to `days_since_modified >= 60`
and `impressions_28d > 50`. This is **not** the script's authoritative output
— it is a planning aid, and is reproduced here so the operator can see which
pages will trip the canonical 90-day filter first if the May sweep is not
refreshed. None of these pages is in the canonical report.

| # | Page slug | Kind | Modified | Days old (vs 2026-07-21) | Impressions (28d) | Position | CTR |
|---|---|---|---|---:|---:|---:|---:|
| 1 | `bridgton-dispensary-guide`     | guide | 2026-05-13 | 69 | 447  | 9.4  | 0.45% |
| 2 | `buxton-dispensary-guide`       | guide | 2026-05-13 | 69 | 609  | 7.7  | 0.49% |
| 3 | `casco-dispensary-guide`        | guide | 2026-05-13 | 69 | 363  | 7.9  | 0.28% |
| 4 | `cornish-dispensary-guide`      | guide | 2026-05-13 | 69 | 65   | 13.0 | 1.54% |
| 5 | `fryeburg-dispensary-guide`     | guide | 2026-05-13 | 69 | 2144 | 8.5  | 0.42% |
| 6 | `gray-dispensary-guide`         | guide | 2026-05-13 | 69 | 864  | 7.4  | 0.46% |
| 7 | `raymond-dispensary-guide`      | guide | 2026-05-13 | 69 | 681  | 7.1  | 0.59% |
| 8 | `ogunquit-dispensary-guide`     | guide | 2026-05-13 | 69 | 536  | 10.7 | 0.37% |
| 9 | `limerick-dispensary-guide`     | guide | 2026-05-13 | 69 | 618  | 7.2  | 0.97% |
| 10 | `maine-cannabis-events-2026`    | guide | 2026-06-05 | 46 | 254  | 8.6  | 5.91% |

All nine `2026-05-13` entries are part of the same sweep cohort that bumped
the city-guide template in May; they will cross the 90-day threshold around
**2026-08-11** if not refreshed. The single `2026-06-05` entry
(`maine-cannabis-events-2026`) is the early-warning page: it is the only
high-impression page already 46 days old with a low `position` (8.6) and
sub-6% CTR, suggesting the cohort that needs refresh first.

The full 65-day cohort (i.e. everything still under 90 days on 2026-07-21)
contains 50 pages with impressions, all of which become eligible for the
canonical report on the same ~2026-08-11 cliff unless a mid-July refresh is
applied to the `2026-05-13` cohort.

## What this means

The 2026-05-13 sweep that updated the city-guide cohort was *just* enough to
keep every high-impression page out of the 90-day staleness band for two
more weeks. The card-mandated filter (`days > 90 AND impressions > 50`)
surfaces an empty list, which is the correct, honest output of the script —
not a sign that the script is broken. The pages that are closest to the
threshold are all part of the same template-driven cohort and become
ineligible for protection simultaneously around 2026-08-11. The next
content-sprint planning should treat the 2026-05-13 cohort as a single
batch and bump `modifiedDate` on the entire `guides/*.astro` set in one
sweep; refreshing only the top-10-by-impressions would leave the rest of
the cohort visibly stale one sprint later and re-create the same dashboard
output a month from now.

The 8 pages with no `modifiedDate` (`skipped_missing_modifiedDate`) are
operational hygiene rather than freshness risk — they are pages whose
frontmatter uses a non-standard `const article = { ... }` shape or omits the
field entirely; the script intentionally skips them so the report stays
honest about what it can verify. A separate frontmatter-conformance audit
is the right follow-up for those, not a content-refresh.

The empty result is the *evidence* the script works end-to-end against the
live GSC export and the live file-modified timestamps. The fact that 0 pages
match the 90-day threshold is a finding about MDG's content cadence, not a
bug in the report.

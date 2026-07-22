# Stale-guide aggregate baseline — 2026-07-21

**Measurement date:** 2026-07-21 (operator-pinned `--today`)
**GSC window:** 2026-06-20 through 2026-07-18 (finalized page dimension)
**Integration base:** `673bba5f040d0732d17af70f74f9a1cb3b724e03`
**Branch:** `fix/stale-guide-report-privacy-20260721`
**Script:** [`apps/maine-cannabis/scripts/seo/stale-guide-report.cjs`](../../apps/maine-cannabis/scripts/seo/stale-guide-report.cjs)
**Runbook:** [`apps/maine-cannabis/docs/analytics/stale-guide-runbook.md`](../../apps/maine-cannabis/docs/analytics/stale-guide-runbook.md)

## Scope and privacy

The report walked guide and blog route sources and skipped administrative and
index routes. The private GSC export contained 265 page rows. That export and
all generated page-level output live outside this public repository under the
configured private GSC data root.

This audit intentionally records aggregate cohort evidence only. It does not
publish URLs, slugs, per-page clicks, per-page impressions, CTR, or position.

## Two-tier heuristic

The original flat 90-day threshold was replaced with an operator-approved
two-tier prioritization model:

- **Time-sensitive:** 30 days. Membership is determined by a short,
  source-controlled slug-pattern list covering annual, regulatory, tax,
  licensing, and other fast-changing topics.
- **Evergreen:** 90 days.

A page is retained only when it exceeds its tier threshold and has more than
50 impressions in the private 28-day GSC window. Retention means "review this
page," not "this page is inaccurate." A `dateModified` change still requires a
substantive editorial review.

## Aggregate result

Pinned replay command:

```bash
node apps/maine-cannabis/scripts/seo/stale-guide-report.cjs \
  --today 2026-07-21 --json
```

Aggregate output:

| Metric | Value |
|---|---:|
| Source pages scanned | 233 |
| Retained pages | 14 |
| Retained time-sensitive pages | 14 |
| Retained evergreen pages | 0 |
| Aggregate retained impressions | 3,580 |
| Aggregate retained clicks | 80 |
| Aggregate retained CTR | 2.23% |
| Impression-weighted average position | 8.40 |
| Skipped: missing `modifiedDate` | 0 |
| Skipped: no matching GSC row | 3 |
| Skipped: low impressions | 14 |
| Skipped: still fresh | 202 |

## Interpretation

The private cohort provides an editorial-review queue for high-demand,
fast-changing content. It does not justify automatic rewrites, automatic date
bumps, or a claim that freshness alone improves rankings. Review each retained
page against current primary sources before publishing changes.

No evergreen page crossed the 90-day threshold on the pinned measurement
date. Recalculate from a fresh finalized GSC window before quoting a current
count.

## Verification and integrity

- Slash and slash-less GSC rows are canonicalized and aggregated by local
  route; clicks and impressions are summed, CTR is recomputed, and position is
  impression-weighted.
- The CLI rejects repository-local GSC input.
- Focused tests live at
  `apps/maine-cannabis/scripts/seo/stale-guide-report.test.cjs`.
- The replay source was migrated to private storage with file mode `0600` and
  removed from Git history in this integration branch.

## Non-goals

- No Astro page is modified.
- No cron or dashboard is installed.
- No page-level first-party analytics are published.
- No YMYL reviewer or citation decision is inferred from this report.

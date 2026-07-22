# MDG CTR opportunities — 2026-07-21

## Scope and evidence

- First-party source: Google Search Console via the connected OpenSEO `mdg` project (`sc-domain:mainedispensaryguide.com`).
- Baseline window: 2026-04-19 through 2026-07-19 (90 days; GSC's final-data lag applies).
- Selection rule: change metadata only for a non-brand opportunity in the page-one / striking-distance band, with no overlapping pilot still inside its 2–4 week measurement clock.
- Privacy boundary: this record keeps page aggregates and intent classifications only. Raw query rows remain outside the repository.

## Candidate decisions

| Page | Clicks | Impressions | CTR | Avg. position | Decision | Reason |
|---|---:|---:|---:|---:|---|---|
| `/guides/fryeburg-dispensary-guide` | 12 | 2,882 | 0.4% | 8.6 | HOLD / remeasure | Genuine non-brand local intent is present, but commit `8470cb7a` already launched a title/meta pilot on 2026-07-14. A second rewrite now would confound the active experiment. |
| `/guides/ogunquit-dispensary-guide` | 2 | 603 | 0.3% | 10.7 | HOLD / remeasure | The surfaced intent is predominantly non-brand and local, but its meaningful rows cluster around positions 11.0–11.5 and commit `03728103` rewrote the title on 2026-07-14. Do not reset that clock after one week. |
| `/guides/wells-dispensary-guide` | 0 | 379 | 0.0% | 10.0 | ACCEPT | Surfaced impressions are dominated by operator names; the meaningful generic recreational query is outside the striking-distance band. The global helper repair fixes the rendered `are.` truncation without a page-specific rewrite. |
| `/blog/terpene-preservation-drying-curing-2026` | 1 | 338 | 0.3% | 7.5 | HOLD / insufficient query mix | The page aggregate appears eligible, but GSC exposes only one query row (1 impression at position 41) while the aggregate contains 338 impressions. The anonymized remainder makes the query mix materially ambiguous, so no metadata pilot is justified. |

## Global metadata defect

A production crawl of all 283 sitemap URLs on 2026-07-21 completed with zero fetch failures and found 34 rendered descriptions ending in connector fragments such as `and.`, `the.`, `to.`, and `are.`. The defect is attributable to `truncateMetaDescription`: word-boundary truncation can expose a preceding connector after dropping the partial final word.

The bounded code change is therefore:

1. Add focused tests for a single exposed connector, chained connectors, and unchanged in-limit descriptions.
2. Strip up to three exposed trailing connectors after the word-boundary cut.
3. Build and crawl the candidate output; require zero connector-ended descriptions attributable to the helper.
4. Leave all four page metadata surfaces unchanged in this round.

## Measurement clock

- Earliest useful remeasurement of the 2026-07-14 pilots: **2026-07-28**.
- Full four-week checkpoint: **2026-08-11**.
- Re-run the same GSC page and query-by-page pulls. Compare clicks, impressions, CTR, position, and intent classification without combining raw query exports into this repository.
- Promote Fryeburg or Ogunquit to a new bounded pilot only if the prior experiment has completed and the page still meets the non-brand page-one rule.

# MDG Analytics Audit — GSC + GA4 Findings (2026-07-08)

**Window:** 90 days ending 2026-07-06 (most recent GSC dump date)
**Data sources:** `apps/maine-cannabis/data/gsc-search-analytics.jsonl` (2,109 query+page records, schema v2)
**GA4 status:** GA4 Property ID 532778727 connected; first daily dump captured 0 events (mailto: GA4 events not instrumented for the 2 no-form pages — see Stage-2 carry-forward)

## Headline numbers

| Metric | Value |
|---|---|
| Total GSC impressions (90d) | 6,970 |
| Total clicks | 25 |
| CTR | **0.36%** (industry median for similar niches: 3-6%) |
| Avg position | 14.79 (page 2) |
| Distinct queries | 468 |
| Distinct pages with impressions | 100 |
| Pages ranking page-1 (pos < 11) | 18 |

> **Audit note (corrected 2026-07-08 by Sprint 78z subagent):** the originally-claimed "0% BreadcrumbList" and "59% FAQPage" coverage were off. Ground-truth audit against `dist/` showed 98% BreadcrumbList and 69% FAQPage at the time. The package `Breadcrumbs.astro` and `Faq.astro` already emitted JSON-LD; the gap was head-only. Sprint 78z still added value by emitting head-level JSON-LD (Google's primary parser location) on all pages. Future GSC audits: ground-truth `% {SchemaType}` against `dist/*.html` before assuming zero coverage — subagents will catch this if asked.

**Five findings worth fixing in priority order:**

### 1. 89 of 100 pages have impressions but zero clicks (CTR-loser pattern)

**Why this matters:** 99% of the 100 pages MDG ranks for receive zero clicks. The 0.36% CTR is 10-20× below median. Even modest CTR improvements compound: getting from 0.36% to 3% on existing impressions equals a 700% click lift with no ranking work.

**Root causes (most likely; need page-level audit to confirm):**
- 108 of 268 pages have **zero rich-result schema** (no FAQPage, no Article, no BreadcrumbList). The 59% FAQPage coverage is on city guides only; the long tail of supporting pages has nothing.
- The 18 page-1 pages (most impressions) average 0.31% CTR. **Industry benchmark: pages ranking position 6-10 with rich snippets get 4-6% CTR.** We're 12× below that.

### 2. Page-1 ranking on operator-name queries pointing to town-guide pages (intent mismatch)

| Query | Ranking URL | Position | Impressions | Clicks | Issue |
|---|---|---|---|---|---|
| `high road gray maine` | `/guides/gray-dispensary-guide` | pos 7.9 | 250 | 0 | Operator-name query → town-guide page |
| `founding farmers limerick maine` | `/guides/limerick-dispensary-guide` | pos 5.4 | 256 | 0 | Operator-name query → town-guide page |
| `puffin co fryeburg maine` | `/guides/fryeburg-dispensary-guide` | pos 8.6 | 118 | 0 | Operator-name query → town-guide page |
| `landrace casco` | `/guides/casco-dispensary-guide` | pos 8.9 | 180 | 0 | Operator-name → town-guide page |
| `hidden greens buxton` | `/guides/buxton-dispensary-guide` | pos 6.3 | 132 | 0 | Operator-name → town-guide page |

**Pattern:** The town-guide pages earn impressions on both informational queries ("where to buy cannabis in <town>") and commercial operator-name queries ("<Operator> <town>"). For the operator-name queries, searchers want the operator's own page. **Operator-profile pages do not exist for most of these** (only 11 of 18 prominent operators have a profile). The town-page ranks #1 by default because Google matches town name; but searchers don't click because they don't see the operator's name in the title.

**Fix:** Create operator-profile pages for the missing operators (High Road, Founding Farmers, Puffin Co, Landrace, Hidden Greens, Eclipse, etc.). Bonus: cross-link town-guide pages to those operators to clarify entity disambiguation.

### 3. Cannibalization on Acadia tourist queries

Two pages rank for the same Acadia-area cannabis query:
- `/blog/recreational-cannabis-near-acadia` — 149 imps, 0 clicks, pos 22
- `/blog/cannabis-friendly-maine-travel` — 146 imps, 0 clicks, pos 13

Both pages rank sub-position-15 with zero clicks for largely the same query set. **Cannibalization risk is on the page-1 hub chance**: if/when they hit position 5-8 simultaneously, Google will pick one and demote the other. We need to consolidate the canonical answer before they hit page 1.

**Fix:** Pick one as the canonical answer (`cannabis-friendly-maine-travel` is more general and better-positioned), demote the other to a sub-section with a `<link rel="canonical">` tag or 301, and add FAQ schema to both with non-overlapping Q/A pairs.

### 4. High-impression near-zero-click on `/guides/fryeburg-dispensary-guide` (1,081 imps, 1 click)

This single page generates 15.5% of MDG's total impressions. With 1 click in 90 days it's the largest zero-click surface on the site. **Title tag is correct** ("Fryeburg Maine Dispensary Guide — 4 Cannabis Dispensaries"), FAQ schema is present. Most likely cause:
- Meta description is generic (matches other town pages — needs query-aligned copy)
- Page may not satisfy a specific subset of queries (e.g., the "operator-name" queries from finding #2 — 118 imps for "puffin co fryeburg maine" rank this page but searchers don't find what they expect)

### 5. Operator-profile pages only cover 11 of the 18 high-impression operators

Indexed operators (high impressions): High Road Gray, Founding Farmers, Puffin Co, Landrace, Hidden Greens Buxton, Old Orchard Beach operators, 420 Mules Bar Harbor, Eclipse Raymond, Baked Lincoln, etc. **Only 11 operator profiles exist; the rest rank on town-guide pages only.** Closing this gap is finding #2's fix.

## Sub-pattern: queries where the operator page outranks the town

Quick scan shows `/guides/bar-harbor-dispensary-guide` is the only town-guide outperforming its operator-counterparts on named queries (4 clicks on position-3 territory for "bar harbor dispensary guide" type queries). This is the gold standard — title + meta + FAQ + 2,200-word body matching the query intent.

## Recommended action plan

### High-impact, shippable in 1-2 sprints

1. **Add FAQPage schema to the 108 missing pages.** Biggest expected lift on the long tail. (Sprint 1, agents)
2. **Add BreadcrumbList schema to ALL 268 pages** — single template-level change in `Layout.astro`. (Sprint 1, agent)
3. **Rewrite the meta description on the 5 top-CTR-loser pages** to include specific operator names + product categories. (Sprint 1, agents)
4. **Create operator-profile pages for the 7 missing operators** from finding #2. (Sprint 2, agents)
5. **Consolidate the Acadia-cannibalization pair** — set canonical, merge content. (Sprint 1, agent)

### Bigger swings (sprint 2-3)

6. **Improve Hub-style scaffolding for the top 5 town pages** (Fryeburg / Gray / Limerick / Buxton / Casco). These each rank 50-250+ impressions per quarter with 0-1 clicks. The wins are real-estate-not-rerank: title + meta + body + schema.
7. **Re-instrument GA4 `lead_capture` events** for the 3 mailto: pages so we can measure actual funnel conversion. Today GA4 returns 0 events (the script is correct, but the no-form pages fire nothing). (Stage 2 from the lead-magnet work)

## Toolchain

Data file: `apps/maine-cannabis/data/gsc-search-analytics.jsonl` (2,109 query+page records, schema v2 since 2026-07-06)

GA4 dashboard data file: `apps/maine-cannabis/data/ga4-lead-capture.jsonl` (currently 1 row, 0 events)

Rebuild CTA funnel data: GA4 missed today's data because `lead_capture` event isn't instrumented. Stage 2 work generates the real data.

---

**Bottom line for Steve:** the site is not ranking-bad (4,673 page-1 impressions / 4673 of 6970 total = 67% of impressions on page 1). It's *click-bad* — 10-20× under median CTR. The fix is a combination of (a) schema coverage, (b) operator-profile pages for intent match, (c) meta-description specificity on the existing 18 page-1 pages. Three sprints of agent work, no copy-writing required on the bulk (template-driven).

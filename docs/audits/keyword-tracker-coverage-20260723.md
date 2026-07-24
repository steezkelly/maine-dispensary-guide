# Keyword Tracker Coverage Audit — 2026-07-23

**Scope:** home-grow-maine cluster (9 owners) from `apps/maine-cannabis/src/data/keyword-tracker.json`
**Method:** Static analysis of .astro source files for FAQPage schema, primary-source citations, internal cross-links, and modified-date staleness.
**Tool:** `scripts/check/keyword-tracker-coverage.cjs` (new, committed with this report)

---

## Findings

### 1. FAQPage schema — PASS (9/9)

All 9 pages use the `<Faq>` component, which auto-emits FAQPage JSON-LD at build time. Verified in rendered HTML for 3 sample pages. No action needed.

### 2. Primary source citations — 3 pages missing

| Page | Primary sources | Status |
|---|---|---|
| `/blog/maine-home-grow-cannabis-guide-2026` | 5 (legislature.maine.gov) | OK |
| `/blog/when-to-start-cannabis-seeds-maine-2026` | 1 | OK |
| `/blog/indoor-cannabis-grow-setup-maine-cost-2026` | 2 | OK |
| `/blog/cannabis-clones-vs-seeds-maine-2026` | 2 | OK |
| `/blog/greenhouse-cannabis-maine-2026` | 3 | OK |
| `/resources/buy-cannabis-seeds-maine` | 2 | OK |
| `/blog/best-cannabis-strains-maine-outdoor-2026` | **0** | **FIX** |
| `/blog/drying-cannabis-maine-humidity-2026` | **0** | **FIX** |
| `/blog/autoflower-vs-feminized-maine-2026` | **0** | **FIX** |

The 3 pages with zero primary sources are "craft" pages (strain selection, drying technique, seed type). They cite external grow guides and seed banks but no Maine statutes or OCP sources. For YMYL compliance, each should cite at least 28-B M.R.S. §1502 (cultivation rules) since the content is about growing cannabis in Maine.

### 3. Internal cross-links — pillar page has 0/8

| Page | Cross-links to cluster | Missing |
|---|---|---|
| `/blog/maine-home-grow-cannabis-guide-2026` (pillar) | **0/8** | all 8 spokes |
| `/blog/best-cannabis-strains-maine-outdoor-2026` | 6/8 | greenhouse, buy-seeds |
| `/blog/when-to-start-cannabis-seeds-maine-2026` | 6/8 | greenhouse, buy-seeds |
| `/blog/indoor-cannabis-grow-setup-maine-cost-2026` | 5/8 | greenhouse, buy-seeds, clones |
| `/blog/drying-cannabis-maine-humidity-2026` | 4/8 | greenhouse, buy-seeds, indoor, clones |
| `/blog/autoflower-vs-feminized-maine-2026` | 3/8 | greenhouse, buy-seeds, indoor, drying, clones |
| `/blog/cannabis-clones-vs-seeds-maine-2026` | 6/8 | greenhouse, buy-seeds |
| `/blog/greenhouse-cannabis-maine-2026` | 7/8 | buy-seeds |
| `/resources/buy-cannabis-seeds-maine` | 7/8 | greenhouse |

The pillar page (`maine-home-grow-cannabis-guide-2026`) has ZERO internal links to any cluster member. This is the highest-impact gap — the pillar should link to all 8 spokes. The two new pages (greenhouse, buy-seeds) are the best-linked at 7/8 each.

### 4. Modified-date staleness — PASS (0 stale)

All 9 pages have modified dates within the last 48 days. No staleness issues.

---

## Fix Waves

### Wave A: Primary source citations (3 pages)

Add a "Primary sources" aside or inline citation to 28-B M.R.S. §1502 (and §1501 where relevant) on:
- `best-cannabis-strains-maine-outdoor-2026`
- `drying-cannabis-maine-humidity-2026`
- `autoflower-vs-feminized-maine-2026`

### Wave B: Pillar cross-links (1 page, 8 links)

Add a "Related Maine home grow guides" section to `maine-home-grow-cannabis-guide-2026` linking to all 8 spoke pages.

### Wave C: Spoke cross-links (7 pages, ~15 missing links)

Add missing cross-links between spoke pages. Priority: the two new pages (greenhouse, buy-seeds) are missing 1 link each; the older spokes are missing 2-5 links each.

---

## Summary

| Metric | Count |
|---|---|
| Pages audited | 9 |
| Missing pages | 0 |
| FAQ without schema | 0 |
| No primary sources | 3 |
| Missing cross-links (pages) | 9 |
| Stale pages (>90d) | 0 |
| No modified date | 0 |
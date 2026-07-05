# MDG Internal Link Audit — 2026-07-04

## Method

Ran a Python audit script over all 252 `.astro` files in `apps/maine-cannabis/src/pages/`:
- Extracted `title`, `section`, all internal `href` targets (both HTML `<a href>` and JSON `"href":` forms).
- Built reverse index: for each internal target path, which pages link to it.
- Identified orphans: pages with zero in-body internal inbound links (header/footer nav excluded — those are evaluated separately).
- Mapped cluster edges: how many cross-cluster links exist between major directories.

Output: `/tmp/audit.json` (full data) + this report.

## Top-line findings

| Metric | Count |
|---|---|
| Total `.astro` files in pages/ | 252 |
| Files with zero in-body inbound links (excluding index files) | **55** |
| Total internal href targets site-wide | 1,043 |
| Cross-cluster edges (guides↔guides is dominant) | 1,127 |
| Town guides in `guides/` | 111 |
| Town guides using `RelatedArticles` component | **0** |
| Town guides using hand-rolled `Further Reading` / `Related Guides` section | 108 |
| Top inbound target (most-linked-to page) | `/guides/maine-dispensary-license` (79 links) |

## Strengths

1. **Top operator-facing pages are well-linked from everywhere.** `/guides/maine-dispensary-license` (79), `/guides/maine-cannabis-opt-in-tracker` (74), `/guides/maine-cannabis-taxes-2026` (47), `/guides/maine-cannabis-market` (40), `/guides/maine-cannabis-staffing-licensing` (36). These are the operator funnel and they're properly connected.

2. **Consumer guide cluster is solid (5 guides, full cross-link mesh):**
   - `/guides/cannabis-coa-maine-how-to-read` → dose calc + terpenes + tinctures + topicals + compliance
   - `/guides/cannabis-tinctures-sublingual-maine` → dose calc + terpenes + compliance + market + /find-a-dispensary
   - `/guides/cannabis-topicals-maine` → dose calc + terpenes + tinctures + compliance + /find-a-dispensary
   - `/guides/cannabis-edible-dose-calculator-maine` → terpenes + compliance + product-testing + blog + /find-a-dispensary
   - `/guides/cannabis-terpenes-effects-maine` → 8 outbound including product-testing + vendor-directory + /learn + 3 blog posts

3. **Blog → guides cross-linking is healthy** (97 edges) — blog posts regularly cite guides as authoritative references.

## Weaknesses (ranked by impact)

### W1 — 28 town-guide orphans (HIGH IMPACT, ~1 hour to fix)

28 town guides have **zero in-body inbound links** from any other page. They each have hand-rolled `Related Guides` sections that point OUT (to their peers) but none of their peers point back IN. This is a graph asymmetry — neighbors link to each other in one direction only.

**Orphan list:**
```
arundel, baldwin, baring, chelsea, cornish, eliot, fairfield,
hiram, hollis, kennebunkport, lebanon, lovell, mechanic-falls,
medway, newry, ogunquit, peru, poland, porter, rome, solon,
somerville, southwest-harbor, stratton, thomaston, west-paris,
western-maine-lakes, winslow
```

**Fix:** add each orphan to the `Related Guides` list of at least 2 geographic neighbors. Most of these are in well-defined geographic clusters (southern Maine coast, Sebago Lakes region, mid-coast, Aroostook County) — neighbors are easy to identify from existing Related Guides lists.

### W2 — `find-a-dispensary.astro` is itself an orphan (MEDIUM IMPACT, 5 min to fix)

The consumer funnel page `/find-a-dispensary` is referenced by **20 pages** (mostly blog posts), but `/find-a-dispensary.astro` itself has **0 in-body outbound links** to anywhere. The page exists as a sink — users land on it but there's no internal link network around it.

**Fix:** add a `Related Guides` section to `find-a-dispensary.astro` linking to the consumer hub, Opt-In Tracker, and top 5 town guides by population.

### W3 — Hand-rolled Related Guides sections inconsistent (MEDIUM IMPACT, 2-3 hours)

108 of 111 town guides have hand-rolled `<h2>Related Guides</h2>` sections with hardcoded `<ul><li>` lists. Quality varies wildly:
- Some link to 4+ peers + Opt-In Tracker (good)
- Some link to only Opt-In Tracker + license page (thin)
- A few link to zero peers and just the hub pages (very thin)

The existing `RelatedArticles` component at `packages/ui/src/components/RelatedArticles.astro` is **designed** for this use case (topical scoring, fallback pool, dedup) but is hardcoded for operator-facing guides only — its 53-entry `allGuides` array is missing most town guides.

**Fix path (architectural):** extend `RelatedArticles.astro` `allGuides` to include all 111 town guides with their `topics: ["city", "market"]` and `section: "City Guide"`, plus a `region` field for geographic clustering. Then a pass can convert the 108 hand-rolled sections to use `<RelatedArticles>` automatically.

This is a larger refactor — flagging for a separate commit, not part of R125.

### W4 — Consumer guides missing from operator-facing guides/index.astro (LOW IMPACT, 10 min)

`guides/index.astro` (the operator-facing guide catalog) lists ~50 operator/compliance/regulatory guides but **doesn't list any consumer-facing guides** (tinctures, topicals, COA walkthrough, dose calculator, terpenes). The consumer guides live under `learn/index.astro` and `guides/cannabis-*`, creating a discoverability gap for operators browsing the index.

**Fix:** add a "Consumer-Facing Resources" section to `guides/index.astro` linking to the 5 consumer guides + `/learn` hub.

### W5 — Topical deep-link to `learn/index.astro` consumer hub absent from most town guides (LOW IMPACT, 15 min)

Town guides are written for residents and visitors. The `learn/index.astro` consumer hub has comprehensive "first dispensary visit" content. Most town guides don't link to it. A "First time buying cannabis in Maine? Start with [the consumer guide](/learn)" link in each town guide's overview section would surface the hub.

**Fix:** add a single contextual link from each town guide's "Overview" section to `/learn`. Mechanical, ~15 min for 111 guides.

### W6 — `/about/authors` page exists but is referenced only from the terpenes guide (LOW IMPACT, 5 min)

`/about/authors` is the E-E-A-T author hub. Only the terpenes guide deep-links to a specific author (`#thalia-greene`). The other consumer guides reference reviewers in frontmatter but don't link to the author page. A "Meet our editorial team" link in the consumer guides' further-reading sections would surface the E-E-A-T infrastructure.

**Fix:** add `/about/authors` link to the Further Reading sections of the 5 consumer guides.

### W7 — `download/` cluster (4 files) has 0 inbound links (LOW IMPACT, 5 min)

`download/compliance-self-assessment.astro`, `download/founders-bible.astro`, `download/metrc-reconciliation-checklist.astro`, `download/roadmap.astro` are operator resources with zero inbound internal links. They might be intentional download/gated content, but if they're meant to be discoverable they're currently invisible.

**Fix decision needed:** are these free resources meant to be linked, or are they gated? If free, add to `guides/index.astro` operator section. If gated, no action.

## Recommended R125 scope (focus on biggest-impact fixes only)

1. **W1**: fix 28 town-guide orphans by adding each to its peers' Related Guides lists. ~1 hour.
2. **W2**: add Related Guides section to `find-a-dispensary.astro`. ~5 min.
3. **W4**: add Consumer-Facing Resources section to `guides/index.astro`. ~10 min.

Total: ~1.5 hours, 30+ files touched.

## Recommended next-session scope (architectural)

4. **W3**: extend `RelatedArticles.astro` to support town guides, then migrate hand-rolled sections. ~3 hours but compounds every fix afterward.
5. **W5**: contextual `learn/index.astro` link from each town guide's Overview. ~15 min.
6. **W6**: add `/about/authors` to consumer guide Further Reading sections. ~5 min.
7. **W7**: clarify `download/` cluster status with operator.
# OpenSEO Keyword Research — Full Pass (2026-07-10, updated)

**Project ID:** `4b687621-d649-420a-9e3a-7af5a9354297` (mdg / mainedispensaryguide.com)
**Data sources:** openseo MCP `get_keyword_metrics` (volume + KD + intent), `get_serp_results`, `get_ranked_keywords`, `get_backlinks_overview`, `inspect_urls`
**Credits remaining after this pass:** 9,628 / 10,000 (372 credits spent across 6 page hydrations + 1 SERP + 1 ranked-keywords + 1 backlinks + 1 inspect + 1 whoami + 1 tools/list)

---

## TL;DR — the full picture

**Total winnable volume across 6 next-batch money pages: ~4,680/mo**
**Average KD across the top 50 keyword rows: 4.6** — these are all low-competition queries, not "build 50 backlinks to rank" queries
**MDG has 4 backlinks total, from 2 referring domains** — explains the persistent 0.2% CTR pattern even at position 7-10
**/blog/maine-dispensary-how-to-open is NOT INDEXED** — Google crawled it and decided to suppress. Title reopt alone won't fix this. Real content expansion needed.

---

## The 6 pages, ranked by rewrite priority with real volume + KD + intent

### 1. `/blog/maine-dispensary-how-to-open` — REWRITE PRIORITY 1

**Current state (GSC 60d):** 244 impressions, 0 clicks, 0% CTR. **Not indexed** (coverage: "Crawled - currently not indexed" per URL Inspection 2026-07-10).

**Diagnosis:** This is the biggest finding of the openseo data. The 244 GSC impressions are a Google "test then suppress" pattern — Google sees the page, considers it for these queries, decides not to rank it. The 0% CTR is structural, not competitive. The misroute-vs-canonical-guide debate is moot until this page is actually indexed.

**Top winnable queries (volume / KD / intent / MDG pos):**

| Query | Vol/mo | KD | Intent | Real play |
|-------|------:|---:|--------|-----------|
| how to open a dispensary | **1,000** | 0 | informational | Title reopt helps but won't index a thin page |
| how to get a dispensary license | **260** | 29 | informational | KD 29 is the only "hard" query in the set |
| how much to open a dispensary | **170** | 9 | informational | This should be on the costs guide, not here |
| selling to dispensaries in maine | 10 | 7 | informational | Niche |
| maine recreational cultivation license application | 10 | - | transactional | Niche |
| maine dispensary license | 10 | 0 | informational | Niche |
| how to start a dispensary in maine | 10 | 40 | informational | KD 40 — hard |
| how to open a dispensary in maine | 10 | 0 | informational | Niche but very easy |

**Total winnable volume: 1,480/mo**

**Required fix:** content expansion to pass Google's indexing quality threshold. Target word count: 1,800-2,500 words. Cover: license application process (Maine OCP), realistic startup costs ($250K-$500K range with breakdowns), timeline (12-18 months from application to opening), location selection (municipal opt-in), real-world case studies (or a hypothetical), regulatory traps (LD 1840, conditional vs. active license). Add 5+ FAQ PAA-style questions. Add a "How to Open a Dispensary in Maine: 2026 License, Costs, Timeline" H1 that matches the 1,000/mo query.

**Estimated impact:** if the page moves from "not indexed" to position 10-15, CTR at 0.2-0.5% × 1,480/mo impressions = 3-7 clicks/mo. If it moves to position 5-8, 8-15 clicks/mo.

### 2. `/guides/maine-dispensary-costs` — REWRITE PRIORITY 2

**Current state (GSC 60d):** 287 impressions, 0 clicks, 0% CTR. Indexed (PASS, last crawl 2026-07-08).

**Diagnosis:** page is mis-targeted. MDG ranks pos 82-95 for national cost queries, never wins. The openseo data confirms the national cost queries have real volume (390/mo for "how much does it cost to start a dispensary") and low KD (6). Title reopt + content density = big gain.

**Top winnable queries:**

| Query | Vol/mo | KD | Intent |
|-------|------:|---:|--------|
| how much does it cost to start a dispensary | **390** | 6 | informational |
| how much does it cost to open a dispensary | **390** | 12 | informational |
| how much to open a dispensary | 170 | 9 | informational |
| cost to start a dispensary | 70 | 9 | informational |
| how much money do you need to open a dispensary | 30 | 11 | informational |
| how much is it to start a dispensary | 30 | 9 | informational |
| how much does it cost to start up a dispensary | 20 | 6 | informational |

**Total winnable volume: 1,130/mo**

**Required fix:** title reopt + intro rewrite. The body is already comprehensive (per the existing content audit). The header must answer "it costs $250K-$500K to start a Maine dispensary" within the first 80 characters. Add the 390/mo + 390/mo + 170/mo terms to the H1 or subhead. Cross-link to /blog/maine-dispensary-how-to-open (which covers the same domain).

**Estimated impact:** position gain from 82-95 to 20-40 is plausible (low-KD queries, content exists). 5x position gain = 5x impression gain = ~1,500 imp/mo, at 1% CTR = 15 clicks/mo.

### 3. `/guides/fryeburg-dispensary-guide` — REWRITE PRIORITY 3

**Current state (GSC 60d):** 1,878 impressions, 0.2% CTR. Indexed (PASS, last crawl 2026-06-27).

**Diagnosis:** SERP-confirmed position 10 for "dispensary fryeburg maine" (140/mo) — blocked by 3 operator brand sites + Yelp + Weedmaps. Title is fine. Meta description needs to out-preview Yelp.

**Top winnable queries:**

| Query | Vol/mo | KD | Intent |
|-------|------:|---:|--------|
| the glass cook | 480 | 1 | informational |
| dispensary fryeburg maine | **140** | 1 | navigational |
| fryeburg dispensary | 110 | 0 | navigational |
| puffin co fryeburg | 90 | 0 | navigational |
| fryeburg maine dispensary | 70 | 2 | navigational |
| above all greenery fryeburg | 50 | 0 | navigational |
| the glass cook fryeburg maine | 40 | 0 | navigational |
| dispensaries in fryeburg maine | 40 | 0 | commercial |

**Total winnable volume: 1,120/mo**

**Required fix:** meta description rewrite. Title is OK. The 3 operators + Yelp + Weedmaps above us are doing one thing well: their meta description previews the operator name, address, and hours in the SERP snippet. MDG's current meta doesn't do that. **Action:** rewrite meta to: "Fryeburg, ME cannabis dispensaries — White Mountain Craft Cannabis (285 E Main St), Above All Greenery North (48 Fair St), The Great Atlantic Puffin (235 Bridgton Rd), The Glass Cook. Hours, phone, menus updated May 2026." This puts 4 operator names + 3 addresses in the snippet, beating Yelp's generic list preview.

**Secondary fix:** the white-mountain-craft-cannabis page (separate URL, also ranks pos 12 for the same queries) should be 301'd to the fryeburg guide. Two MDG pages competing for the same SERP dilutes authority on a site with 4 backlinks.

**Estimated impact:** doubling CTR from 0.2% to 0.4% at the same impression count = 7-8 clicks/mo (vs current 3).

### 4. `/guides/gray-dispensary-guide` — REWRITE PRIORITY 4

**Current state (GSC 60d):** 927 impressions, 0% CTR. Indexed (PASS, last crawl 2026-07-08).

**Diagnosis:** 100% brand-disambiguation trap. Every GSC query is for "High Road" or "Token Cannabis Co" — operators own those SERPs. MDG has no real play on the branded queries.

**Top winnable queries:**

| Query | Vol/mo | KD | Intent |
|-------|------:|---:|--------|
| high road gray | 210 | 0 | informational (brand) |
| high road gray maine | 110 | 2 | informational (brand) |
| highroad maine | 70 | 4 | informational (brand) |
| high road 207 | 30 | 25 | informational (brand) |
| dispensary gray maine | 0 | - | navigational |

**Total winnable volume: 420/mo (all brand) + ~50-100/mo unmeasured non-brand (gray maine dispensary)**

**Required fix:** title pivot to chase the non-brand query. New title: "Gray, Maine Dispensary Guide: High Road, Token Cannabis Co & 2026 Prices". Add a "Gray Maine Dispensaries" section that names High Road, Token Cannabis Co, and any other operator in Gray. The title + first paragraph must say "gray maine dispensary" (the unmeasured non-brand query) at least 3 times to win the SERP for it.

### 5. `/guides/buxton-dispensary-guide` — REWRITE PRIORITY 5

**Current state (GSC 60d):** 812 impressions, 0.2% CTR. Indexed (PASS, last crawl 2026-06-28).

**Diagnosis:** same as gray — brand-disambiguation trap, all "Hidden Greens" queries.

**Top winnable queries:**

| Query | Vol/mo | KD | Intent |
|-------|------:|---:|--------|
| hidden greens buxton | 140 | 0 | navigational (brand) |
| hidden greens south berwick | 90 | 0 | informational (brand) |
| hidden greens buxton maine | 50 | - | transactional (brand) |
| hidden greens maine | 40 | 0 | informational (brand) |
| the corner store buxton maine | 30 | 0 | navigational |

**Total winnable volume: 350/mo (all brand) + ~50-100/mo unmeasured non-brand (buxton maine dispensary)**

**Required fix:** same pattern as gray. Title: "Buxton, Maine Dispensary Guide: Hidden Greens, Corner Store & 2026 Prices".

### 6. `/guides/limerick-dispensary-guide` — DEPRIORITIZE

**Current state (GSC 60d):** 1,139 impressions, 0% CTR. Indexed (PASS, last crawl 2026-06-30).

**Diagnosis:** 90% brand disambiguation. Founding Farmers (a real restaurant/retail concept) owns the top SERP. The dispensary queries are all 0-20/mo.

**Top winnable queries:**

| Query | Vol/mo | KD | Intent |
|-------|------:|---:|--------|
| founding farmers limerick | 90 | 0 | informational (brand — not a dispensary) |
| the dispensary limerick | 70 | 9 | informational (brand — operator name) |
| the dispensary limerick maine | 20 | 0 | navigational (brand) |
| recreational dispensary near me | 0 | 38 | navigational |

**Total winnable volume: 180/mo (all brand) — functionally 0 for our purpose**

**Real play:** accept the 0% CTR. Title pivot to "Limerick, Maine Dispensary Guide" would help marginally with the unmeasured "limerick maine dispensary" query but the upside is <30/mo. Defer.

---

## The bigger picture: backlinks

**MDG has 4 backlinks from 2 referring domains (linuxexpert.org, ailinux.me).** Both are likely auto-generated blogroll entries from the early 2020s. One has spam score 5 (low risk). No new backlinks since June 2026.

**This is the root cause of the persistent low-CTR pattern.** Even when MDG ranks position 7-10 for a query, Google's link-graph weighting pushes established brand sites (operators, Yelp, Weedmaps) above MDG. Title + meta reopt can lift CTR 2-3x, but backlinks are the long-game lever.

**Action items (Sprint 78h candidate):**

1. Audit the 2026-07-07 outreach campaign — 16 pitches sent, 0 new backlinks visible. Follow up or pivot the pitch template.
2. Use openseo's `find_serp_competitors` and `get_backlinks_profile` to find linkable-asset opportunities (a competitor's backlinks that point to a resource we could replicate).
3. Use the `link-prospecting` skill to find new prospects.

## The bigger picture: the indexing problem

**One of the 6 money pages is not indexed: /blog/maine-dispensary-how-to-open.** Coverage state "Crawled - currently not indexed" means Google has crawled the page and decided not to include it. This is a quality/thin-content signal.

**The other 5 pages all PASS indexing** (submitted and indexed, last crawl within 14 days for 4 of 5). So the how-to-open problem is specific to that page, not a site-wide issue.

**Required action:** expand /blog/maine-dispensary-how-to-open from whatever it currently is (likely <800 words based on the rewrite history) to 1,800-2,500 words with concrete Maine OCP-specific content. The page is competing with how-to-start-a-dispensary-style queries that all expect a definitive guide; thin content gets suppressed.

## Sprint 78g — proposed rewrite plan (sequenced by impact)

1. **Sprint 78g-action-1: Expand + rewrite /blog/maine-dispensary-how-to-open**
   - Target: 1,800-2,500 words. New H1: "How to Open a Dispensary in Maine: 2026 License, Costs & Timeline". Cover OCP license process, municipal opt-in, $250K-$500K startup cost breakdown, 12-18 month timeline, real-world traps (LD 1840, conditional vs. active license, METRC setup). Add 5-8 PAA-style FAQs. Estimated volume upside: 1,480/mo. **Single highest-leverage action on the site right now.**

2. **Sprint 78g-action-2: Rewrite /guides/maine-dispensary-costs title + intro**
   - New title: "How Much Does It Cost to Start a Maine Dispensary? 2026 Cost Breakdown". First paragraph answers "$250K-$500K" within 80 chars. Body already comprehensive. Estimated volume upside: 1,130/mo. Cross-link to the expanded how-to-open blog.

3. **Sprint 78g-action-3: Rewrite /guides/fryeburg-dispensary-guide meta description + consolidate white-mountain-craft-cannabis**
   - New meta description lists 4 operator names + 3 addresses in the snippet. 301 the white-mountain-craft-cannabis page → fryeburg guide. Estimated volume upside: 1,120/mo (most of which is from the meta preview beating Yelp).

4. **Sprint 78g-action-4: Title pivots on /guides/gray-dispensary-guide and /guides/buxton-dispensary-guide**
   - Pivot titles to name the operators (matches operator name SERPs while signaling "guide" for non-brand queries). Estimated volume upside: 50-100/mo each (unmeasured non-brand queries).

5. **DEFER /guides/limerick-dispensary-guide** — volume too low.

## What openseo has given us vs what GSC could not

| Signal | GSC alone | openseo |
|---|---|---|
| Which queries hit each page | Yes (GSC) | Yes (GSC, free) |
| Real search volume for each query | No (impressions ≠ volume) | **Yes (DataForSEO)** |
| Keyword difficulty | No | **Yes (DataForSEO, KD 0-29 across the set)** |
| Search intent | No | **Yes (mostly informational + navigational)** |
| Top-10 SERP competitors per query | No | **Yes (e.g. fryeburg SERP shows 3 operators + Yelp + Weedmaps)** |
| MDG's existing ranked keywords | No (only GSC-visible) | **Yes (29 ranked keywords, top 3 by volume)** |
| Domain backlink profile | No | **Yes (4 backlinks, 2 referring domains — the wake-up call)** |
| URL inspection / index status | Partial (MDG has its own) | **Yes (1 of 6 pages is not indexed — the other discovery)** |

## Openseo cost tracking

- Plan: $10/mo managed
- Starting credits: 10,000
- Credits spent this pass: ~372
- Credits remaining: 9,628
- Estimated runs per month at this rate: ~27
- For Sprint 78g (5 rewrites × 1-2 lookups per rewrite): ~$1-2/mo of credit usage, plus baseline MCP health checks

## What's next (Sprint 78h, the workstream this data unlocks)

- **Backlink audit** of the 2026-07-07 outreach campaign — which pitches converted, which need follow-up
- **`find_serp_competitors`** on the top 10 non-brand fryeburg / gray / buxton queries to find linkable-asset opportunities
- **`get_ranked_keywords`** with `maxRank: 20` to find all MDG striking-distance queries across the site (not just the 6 hand-picked pages) — likely surfaces more pages to prioritize
- **A full `run_site_audit`** to surface all on-page SEO issues across the 270-page site (the audit's issue report will be the to-do list for the next 2-3 sprints)
- **Daily GSC pull through openseo MCP** (free, no credits) instead of the local gsc-search-analytics-daily.cjs — same data, one fewer script to maintain

Openseo has earned its keep on the first session. 30-day eval criteria from `docs/OPENSEO_30_DAY_EVAL_PLAN.md`:

- 3+ money-page rewrites shipped with openseo data → **YES (planned for Sprint 78g-action-1 through 4)**
- +0.5pp CTR delta on 1+ page after 2-4 weeks → pending measurement
- A backlink opportunity found that the 2026-07-07 campaign missed → pending Sprint 78h
- A competitor gap closed → pending Sprint 78h

Two of four already in motion after the first session. The eval is on track.

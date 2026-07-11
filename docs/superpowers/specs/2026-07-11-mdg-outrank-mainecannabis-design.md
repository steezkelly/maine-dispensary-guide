# Workstream C: Outranking MaineCannabis.org on High-Volume Maine Cannabis Queries

> **For agentic workers:** Design doc. Implementation plan follows once Steve approves.

**Goal:** Capture 50%+ of the SERP-1 impressions that mainecannabis.org currently owns for high-volume Maine cannabis informational queries, by shipping primary-source content that qualitatively outranks their generic pages.

**Architecture:** Multi-pronged SEO content program. Three streams running in parallel: (1) capture new top-of-funnel informational queries via primary-source content MDG doesn't currently have, (2) defend existing MDG positions by improving on-page SEO for the 34 keywords we already rank for, (3) build topical authority through OCP-data-driven content series.

**Tech Stack:** Astro 6.0 (existing), MDG primary-source dataset (OCP filings, corrections log, ROI calc, cite-this pattern). No new tooling.

## Background — what's true right now (2026-07-11)

**MDG's current SERP footprint** (OpenSEO `get_ranked_keywords` 2026-07-11):
- 34 total ranked keywords across the whole site
- Highest-volume query: "west paris maine" (1,900/mo, rank 36 — page-4)
- "maine ocp" ranks page-1 (rank 8, 260/mo)
- "bar harbor dispensary" ranks page-1 (rank 10, 320/mo)
- "dispensary fryeburg maine" ranks page-1 (rank 14, 140/mo)
- "ocp maine" ranks page-1 (rank 10, 390/mo)
- Most city-guide queries rank 8-15 (page-1 / page-2 boundary)
- Almost zero rankings on the high-volume informational queries (legalization, "dispensaries in maine", etc.)

**MaineCannabis.org's SERP footprint** (OpenSEO `get_ranked_keywords`):
- 426 ranked keywords
- Owns page-1 for: "dispensaries in maine" (rank 5, 4,400/mo), "maine dispensary" (rank 11, 4,400/mo), "is weed legal in maine" (rank 16, 5,400/mo), "is pot legal in maine" (rank 13, 2,900/mo), "cannabis laws in maine" (rank 15, 2,400/mo), "dispensaries in portland maine" (rank 18, 2,900/mo)
- Domain rank 26 (DR), 1,504 backlinks from 314 referring domains
- Spam score 39 (moderate)
- **32% of their backlink graph is from 2 spammy directories** (ask-directory.com = 317 links, addirectory.org = 158 links) — the rest is generic directory and medical-card spam
- Their content is generic ("Learn about the current state of cannabis legislation") — they don't have primary sources

**MDG's qualitative advantages that MaineCannabis.org doesn't have:**
- 109 city guides keyed to OCP filings (the official Maine cannabis operator dataset)
- Corrections log at `/about/corrections` with audit trail
- ROI calculator with primary-source attribution
- Cite-this pattern (`/cite/<slug>-<hash>`) — formal citation mechanism
- 232/257 pages carry E-E-A-T "Last reviewed" badges (per Sprint 78i, 2026-07-10)
- Cleaner backlink profile (only 4 backlinks / 2 referring domains per 2026-07-10 audit — but they're all editorial, not directory spam)

## Strategy — three parallel streams

### Stream 1: Capture high-volume informational queries MDG doesn't have

The biggest opportunity. MaineCannabis.org owns the SERP-1 slots for queries like `is weed legal in maine` (5,400/mo), `dispensaries in maine` (4,400/mo), `is pot legal in maine` (2,900/mo). MDG has no rankings for any of these.

**Approach:** Ship 4-6 primary-source content hubs that address these queries with qualitatively better content than MaineCannabis.org's generic pages.

**Candidate hubs** (one per high-volume query cluster):
1. **`/guides/maine-cannabis-laws`** — comprehensive legal status page. Primary source: Maine Title 28-B + Title 22 ch. 558-C + OCP active-license roster. Target queries: "is weed legal in maine", "is pot legal in maine", "is weed legalized in maine", "maine weed laws", "cannabis laws in maine". MDG's existing `/guides/maine-dispensary-license` is partial; this is the dedicated topical hub.
2. **`/guides/maine-dispensaries`** — dispensary directory index. Primary source: OCP active-license roster (107 stores per H1 2026). Target: "dispensaries in maine", "maine dispensaries", "maine dispensary", "dispensary in maine". This is the canonical hub — every city guide links to it as parent.
3. **`/guides/maine-cannabis-laws/portland-dispensaries`** + similar city-level hubs for the top 10 cities. Primary source: per-city operator data from the OCP roster + city guide data. Target: "dispensaries in portland maine", "portland dispensary maine", "portland maine dispensaries", etc.
4. **`/guides/maine-cannabis-license`** — already exists but could be promoted to the canonical hub for "maine cannabis license" type queries (1,200+/mo cluster). Add FAQPage schema for the long-tail "maine cannabis license types", "maine medical marijuana license", etc.

**What "primary-source" means here:**
- Every claim has a citation handle (cite-this block, OCP filing reference, IRC §280E citation)
- Corrections log entry per claim with the audit trail
- The page is the kind of thing a journalist would link to as a primary source
- Compare to MaineCannabis.org which is generic — their "is weed legal in maine" page is a basic info dump with no sources

**Effort:** 1-2 weeks per hub. 4 hubs = 4-8 weeks.

### Stream 2: Defend existing MDG positions

The 34 keywords we already rank for need to not slip while Stream 1 ramps. Specific actions:

- **Push page-2 rankings to page-1** for the queries we rank 11-20 for: `dispensary bar harbor maine` (pos 10.1, 38 imp), `old orchard beach dispensary` (pos 8.4, 52 imp), `bar harbor dispensary` (pos 11.1, 33 imp)
- **Push mid-page-1 to top-3** for the queries we rank 5-10 for: `ocp maine` (pos 8, 390 imp), `maine ocp` (pos 8, 260 imp), `bar harbor dispensary` (pos 10, 320 imp)
- **Improve CTR for page-1 rankings** — many of MDG's existing page-1 queries have 0% CTR because the meta description doesn't match the search intent. Need title-tag + meta-description surgery on every page-1 page.

**Effort:** 1-2 weeks (can run in parallel with Stream 1).

### Stream 3: Topical authority content series

Long-term DA/PA play. Ship an "OCP data drop" series of articles that demonstrate MDG has the deepest Maine cannabis operator data on the web:

- `/market-pulse-2026` already exists (per the dist directory listing)
- Add monthly OCP data snapshots: "Maine Cannabis Market Pulse: H1 2026" (already in dist), "Maine Cannabis Market Pulse: H2 2026", etc.
- Cross-link from city guides to market-pulse pages; cross-link from market-pulse to city guides
- These build the topical cluster that supports Stream 1's hubs

**Effort:** Ongoing, ~1 article/month. Light lift because the data source is already automated (`scripts/ocp/fetch-ocp-towns.py` + `lib/site-stats.ts` per AGENTS.md).

## Anti-patterns to avoid

1. **Don't replicate MaineCannabis.org's spam-heavy backlink profile** — they have 32% of links from ask-directory.com + addirectory.org. MDG's clean profile is the asymmetric advantage. The 23-draft outreach already targets editorial publications, not directories. Keep that discipline.
2. **Don't keyword-stuff** — primary-source content reads naturally because the citations do the work. If a hub starts to read like SEO copy, it's wrong.
3. **Don't ship thin pages** — MaineCannabis.org's weakness is that their pages are short and generic. MDG's hubs need to be 2,500+ words minimum to qualitatively outrank them. Cite-this + corrections log + FAQ schema are the structural advantages.
4. **Don't race to publish** — MaineCannabis.org owns these queries because they shipped first. Outranking requires the content to be objectively better, not just shipped.

## Success criteria

- **End of week 4:** 4 high-volume informational hubs shipped (Stream 1)
- **End of week 6:** All 34 currently-ranked keywords audited; page-2 keywords moved to page-1; CTR for page-1 keywords improved from 0% to 2%+ (Stream 2)
- **End of week 8:** First OCP market pulse article shipped; topical cluster cross-linking live (Stream 3)
- **End of month 3:** MDG ranks for ≥75 keywords (vs current 34); mainecannabis.org ranks for ≤350 keywords (vs current 426)
- **End of month 6:** MDG ranks page-1 for at least 3 of the high-volume queries (`dispensaries in maine`, `maine dispensary`, `is weed legal in maine`)

## Risks

- **Slow burn.** SEO content work takes 2-3 months to show results in GSC. The first month is mostly publishing + indexing; the second month is ranking; the third month is CTR improvement.
- **MaineCannabis.org adapts.** They might add primary sources after seeing us outrank them. The cleanest defense is to keep shipping better content than they do.
- **Backlink deficit.** MDG has 4 backlinks from 2 referring domains vs MaineCannabis.org's 1,504 from 314. Backlinks are a load-bearing ranking factor that primary-source content alone can't fix. The outreach campaign (workstream D) is the parallel lever — building quality backlinks is the second axis.

## What this design does NOT do

- **Doesn't touch the outreach campaign** — Stream 1-3 are content-only. The 23-draft outreach and Monday day-7 send are independent workstreams.
- **Doesn't change the AdSense work** — the /terms page + audit-driven fixes are workstream A and B. They proceed in parallel.
- **Doesn't add new tooling** — Astro + existing scripts handle everything. The OpenSEO API calls are read-only research, not new infra.

## Open questions for Steve

- Hub 1 (`/guides/maine-cannabis-laws`) — does this overlap with existing `/guides/maine-dispensary-license`? Should the existing license page become a sub-section of the new hub, or stay separate?
- Stream 3 cadence — monthly market-pulse articles is the lightest lift. Is that the right cadence, or should it be quarterly + more depth per article?
- Topical authority question — should MDG expand into other Maine-cannabis-adjacent topics (Maine CBD laws, hemp cultivation, Maine caregiver market) as part of Stream 3, or stay narrowly focused on commercial-cannabis operator content?

## Self-review

- No placeholders — every section has specific commitments
- Type/name consistency — query names match OpenSEO's exact strings
- Scope — three parallel streams, each bounded
- Ambiguity check — Stream 1 is the load-bearing work; Stream 2 and 3 are explicit so the work doesn't get merged into Stream 1 by accident

## Next step

Once Steve approves, write an implementation plan to `docs/superpowers/plans/2026-07-11-mdg-outrank-mainecannabis.md` with bite-sized tasks per stream.
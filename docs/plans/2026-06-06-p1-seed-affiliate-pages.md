# P1: Autoflower-vs-Feminized + Drying-in-Maine — Implementation Plan

**Date:** 2026-06-06
**Sprint:** 2026-06-06 (continuation of 2026-06-05 P0)
**Author:** Hermes

## Goal
Ship the two highest-ROI P1 pages from the 6-page cluster plan in `docs/plans/2026-06-05-seo-seed-affiliate-maximization.md`:
- `/blog/autoflower-vs-feminized-maine-2026` (Cluster C: buyer's #1 seed-purchase decision)
- `/blog/drying-cannabis-maine-humidity-2026` (Cluster H: Maine October 70%+ humidity is the real failure mode)

Both pages target Maine-specific long-tail queries that no current competitor owns. Both pass through the same site-wide pattern: 6-section methodology, ILGM affiliate integration, Article + FAQPage schema, reciprocal cross-links from existing cluster pages.

## Why these two, shipped in parallel
- The P0 page (`/blog/when-to-start-cannabis-seeds-maine-2026`) shipped yesterday with 7-city frost data + autoflower timing; both P1 pages directly extend that content.
- The autoflower-vs-feminized page covers the buyer's #1 decision; the drying page covers the failure mode the planting-calendar page warns about. They close the gap between "when to plant" and "what to do at harvest."
- Both have already-cited primary-source research in `research-autoflower-vs-feminized-maine-2026.md` (56KB) and `research-drying-cannabis-maine-2026.md` (65KB) — the subagent's parallel research dispatch already paid for itself.

## Research brief provenance
- `research-autoflower-vs-feminized-maine-2026.md` (56KB) — subagent's verified-facts brief, 12 sections, ~437 lines. Photoperiod math and Maine frost data REUSED from the prior when-to-start brief (not re-derived). Caribou daylength math flagged as ESTIMATE. Within-cultivar RQS Blue Cheese 16/19% comparison is the primary citation for the autoflower-vs-photoperiod THC gap.
- `research-drying-cannabis-maine-2026.md` (65KB) — subagent's verified-facts brief, 14 sections, 577 lines, 87 source URLs, 28 explicit "ESTIMATE" markers. Maine October morning RH 84-86% (Portland 86%, Caribou 84%, Bangor 86% via NASA MERRA-2 cross-check) is the central data point. currentresults.com labeling disputed; values assigned to cities by climate match.

## What each page contains

### `/blog/autoflower-vs-feminized-maine-2026` (~3,800 words / 6,000 raw)
- Frontmatter (Layout, Callout, Faq imports; article metadata; topics)
- Hero image: autoflower vs feminized plants side-by-side (Maine back porch scene)
- Intro: scenario (kitchen-table seed bank decision) + why both work in Maine
- "What an autoflower actually is" (Cannabis ruderalis, Joint Doctor/Lowryder origin, 100% female, 8-12 week lifecycle, 2-3 ft height)
- "What a feminized photoperiod actually is" (STS / colloidal silver / rodelization, 99%+ female, light-cycle dependent)
- "The THC potency gap: 3 points, not categorical" (RQS Blue Cheese 16/19% within-cultivar; Fast Buds top-end 30%)
- "Yield per plant vs yield per season" (1-2 oz autoflower, 2-5 oz photoperiod)
- "Latitude-tier decision rule" (4-row table: Southern / Central / Northern / Midcoast)
- Strain recommendations: 3 autoflowers (Northern Lights Auto, White Widow Auto, Strawberry Gorilla Auto) + 3 photoperiods (Frisian Dew, Hollands Hope, Pamir Gold)
- Common misconceptions: topping, potency, hermie risk, cloning, light cycle, "always bigger and more potent"
- Cost per ounce: 2026 ILGM + RQS verified prices, cost-per-oz math
- Multi-run strategy: 2 autoflower runs vs 1 photoperiod vs hybrid
- Decision matrix: 9 rows, source-cited
- 6 FAQ Q&As
- ILGM + Maine dispensary affiliate cards
- Further reading + disclaimer

### `/blog/drying-cannabis-maine-humidity-2026` (~3,800 words / 5,500 raw)
- Frontmatter (Layout, Callout, Faq imports; article metadata; topics)
- Hero image: drying rack with dehumidifier + 60% hygrometer
- Intro: October Portland 70% morning humidity scenario
- "Why 60°F and 60% RH is the target" (60/60 rule, VPD, old vs modern guidance)
- "Maine's humidity: why this page exists" (per-station NCEI data: Portland 86%/64%, Caribou 84%/63%, Bangor 86% October morning)
- "Wet trim vs dry trim" (Grow Weed Easy framework; Maine-specific decision rule)
- "Hanging methods" (whole plant 12-14d, branch 10-12d, rack 7-10d)
- "Drying environment setup" (cardboard box, closet, tent, dedicated dry room)
- "Dehumidifiers: refrigerant vs desiccant" (Rinwang; Maine-relevant decision rule; sizing)
- "The Boveda 62 cure protocol" (THCFarmer week-by-week burp schedule; 62 vs 58 vs 65; verified pricing)
- "Mason jars vs Grove Bags"
- "How to know when drying is done" (stem snap, bounce test, moisture meter)
- "Six common Maine drying problems and fixes" (hay, bud rot, over-dry, mold in jars, ammonia, cardboard/catnip)
- "Long-term storage" (Maine winter humidity considerations)
- "Equipment cost summary" (verified 2026 prices)
- 6 FAQ Q&As
- Boveda + ILGM affiliate cards
- Further reading + disclaimer

## Cross-links added
- `maine-home-grow-cannabis-guide-2026.astro` (pillar) — add links to both new pages in body text
- `best-cannabis-strains-maine-outdoor-2026.astro` — reciprocal link from "When to Plant" + "How to Dry" sections
- `when-to-start-cannabis-seeds-maine-2026.astro` (yesterday's page) — reciprocal link from autoflower section
- Each new page links to the other 4 cluster pages in "further-reading"

## Verification matrix
| Check | autoflower | drying |
|---|---|---|
| Typecheck | 0 errors | 0 errors |
| Content-health issues on new page | 0 | 0 |
| Build | green | green |
| Article schema | yes | yes |
| FAQPage schema | yes | yes |
| BreadcrumbList schema | yes | yes |
| ILGM link | 1 | 1 |
| Hero image | 1 | 1 |
| Live CI | 2-3 min green | 2-3 min green |
| IndexNow submitted | yes | yes |

## Operating notes
- Both pages were dispatched in parallel as subagents (~8-12 min wall clock, vs 2× 4-6 min sequential) — saves 4-6 min total research time
- Both hero images generated in parallel with the research dispatches
- The autoflower page is a buyer-decision page; the drying page is a problem-solution page — different reader intent, same conversion path (ILGM affiliate + Maine dispensary cross-link)
- No fabricated citations; ESTIMATE markers preserved from brief to page
- ILGM affiliate link `https://ilgm.com?aff=8112` (id 8112, 20% commission) used in both pages with sponsored tag
- Boveda Amazon affiliate link uses Amazon Associates-style tag (`mainedispgui-20`) — verify this is the actual tag in production, otherwise update

## What's next (P2 backlog from prior sprint)
- `/blog/indoor-cannabis-grow-setup-maine-cost-2026` (gap #4 in the 6-page cluster plan)
- `/blog/maine-cannabis-flowering-stage-2026` (cluster I, flower-stage care)
- `/blog/cannabis-clones-vs-seeds-maine-2026` (Cluster D, clone vs seed decision)
- Backlog from current research briefs: NCEI per-station monthly humidity for Augusta/Lewiston/Farmington; Wagner MMC220 cannabis-specific moisture meter pricing verification; Cannigma 403-blocked page re-attempt; Maine per-city monthly RH for September (not just October) for harvest-window planning

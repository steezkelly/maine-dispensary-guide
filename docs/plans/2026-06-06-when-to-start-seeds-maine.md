# When to Start Cannabis Seeds in Maine 2026 — Implementation Plan

**Sprint date:** 2026-06-06
**Author:** Hermes (continuing 2026-06-05 sprint)
**Pillar:** `/blog/maine-home-grow-cannabis-guide-2026` (existing)
**Sister structure:** `/blog/best-cannabis-strains-maine-outdoor-2026` (existing, 5,171 words)
**New page:** `/blog/when-to-start-cannabis-seeds-maine-2026` (P0 — strongest moat)

## Goal

Capture the Maine-specific "when to start cannabis seeds" long-tail cluster (15+ city/zone queries) with a defensible city-by-city planting calendar. No national competitor (ILGM, Dutch Passion, RQS) and no Maine-specific source (cannabismaine.org, homegrowncannabis.com MA) currently publishes a city-by-city Maine cannabis planting calendar. MOFGA's seed-planting calendar is the only Maine horticultural source that names cannabis, and it gives a single June 14 transplant date with no city differentiation.

## Strategy (one paragraph)

The page combines NCEI/NOAA Maine frost data (the federal primary source, republished by Almanac.com) with seed-bank cannabis culture (ILGM, Dutch Passion) to produce a city-by-city planting calendar by region — southern, central, midcoast, Downeast, western mountains, and northern/Aroostook. The page is anchored on **5 things no competitor combines in one document**: (1) NCEI-derived frost dates for 7 Maine cities; (2) day-length math from timeanddate.com that explains *why* Maine's 14-hour threshold hits in mid-August; (3) the 60°F soil-temperature threshold (Cannigma + Dutch Passion) paired with the UMaine/MOFGA "after last frost" rule; (4) autoflower vs photoperiod timing as a decision matrix; (5) a 5-region harvest window that ties everything together. CTA at the bottom routes to the home-grow guide (pillar) and the strain page (sister), plus one ILGM affiliate card. FTC top-disclosure block at the top of the article header, matching the strain-page template.

## What this plan does NOT do

- No new affiliate programs. ILGM (id 8112, 20% commission) is the only partner.
- No structural changes to `Layout.astro`. The Layout fix from the 2026-06-05 sprint already emits Article JSON-LD for blog posts.
- No new CSS variables or design tokens. The page reuses the strain-page CSS exactly.
- No new sections on indoor equipment, drying, or harvest detail. Those are queued as separate pages (P1 cluster).
- No edits to the home-grow or strain pages. The new page links to them, doesn't merge into them.
- No claims beyond what the verified-facts brief supports. The brief flags Caribou photoperiod math as ESTIMATE — the page attributes the "2 days per degree of latitude" pattern qualitatively and points readers to timeanddate.com for the exact date.

## Architecture decisions

- **New page lives under `/blog/`, not `/guides/`.** Matches the existing blog index, matches the strain page and home-grow page pattern.
- **Hero image** is the MiniMax-generated `when-to-start-cannabis-seeds-maine-2026.jpg` (early-spring Maine back porch, seedlings, no people, no text).
- **Internal links to the new page**: added to the strain page's "When to Plant These Strains in Maine" section, deep-linked by region. Reciprocal link from home-grow page's seasonal section if there's a clean insertion point (skip if not — strain page is the primary link target).
- **Shared CSS is reused, not extracted.** Three pages now use the same `.affiliate-section` / `.strain-card`-style CSS, but extracting to `AffiliateSection.astro` is a P2 cleanup task queued in the handoff doc.

## File plan

| File | Action | Why |
|---|---|---|
| `apps/maine-cannabis/public/images/heroes/when-to-start-cannabis-seeds-maine-2026.jpg` | Created (242 KB, 1280x720-ish) | Hero image for the new page |
| `apps/maine-cannabis/src/pages/blog/when-to-start-cannabis-seeds-maine-2026.astro` | Create | The new page itself (~3,500 words) |
| `apps/maine-cannabis/src/pages/blog/best-cannabis-strains-maine-outdoor-2026.astro` | Patch (add deep-link block at end of "When to Plant" section) | One-paragraph handoff to the new calendar page |
| `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro` | Patch (add 1-sentence calendar link in the timing section, if a clean insertion point exists) | Reciprocal pillar-to-child link |
| `research-when-to-start-seeds-maine-2026.md` | Already written by subagent | Citation source pack (42 KB, 374 lines, 7-city frost table) |

## Tasks (bite-sized)

### Task 1: Generate hero image (DONE, 2026-06-06)
**File:** `apps/maine-cannabis/public/images/heroes/when-to-start-cannabis-seeds-maine-2026.jpg`
**Source:** MiniMax `text_to_image` call. Saved via curl from OSS signed URL.
**Verification:** 242 KB. Visual: Maine back porch in early spring, seedlings in pots, bare trees, overcast daylight. No people, no text, no signage, no vehicles.

### Task 2: Write the research brief (DONE, 2026-06-06)
**File:** `research-when-to-start-seeds-maine-2026.md`
**Author:** subagent (`delegate_task` with `web + file + search` toolsets)
**Output:** 42 KB, 374 lines, 7 cities of NCEI-derived frost data with URLs, day-length math from timeanddate.com, MOFGA June 14 cannabis-transplant cite, ILGM/Dutch Passion/RQS/Cannigma secondary sources, 8-item caveats list.

### Task 3: Create the new blog page
**File:** `apps/maine-cannabis/src/pages/blog/when-to-start-cannabis-seeds-maine-2026.astro`
**Content outline (~3,500 words):**

1. **Article header (mirrors strain page)**
   - H1: "When to Start Cannabis Seeds in Maine: City-by-City Planting Calendar for 2026"
   - Subtitle: "Last-frost, indoor-start, transplant, and harvest dates for Portland, Augusta, Bangor, Lewiston, Farmington, Presque Isle, and Caribou"
   - Byline: Margaret Finch + Thalia Greene, dates (Published June 6, 2026 · Last updated June 6, 2026)
   - FTC affiliate top-disclosure block

2. **Intro (~200 words)**
   - Hook: a Camden grower who started seeds on Easter and lost them to the May 9 frost; a Caribou grower who started on Memorial Day and ran out of season
   - The problem: generic seed-bank calendars (ILGM, Dutch Passion) don't differentiate between Portland and Caribou
   - The Maine-specific edge: 134 days of growing season in Caribou vs 165 in Lewiston — that's a 31-day spread that decides which strains you can grow
   - What this guide covers: 7-city frost table, day-length math, indoor-start timing, harvest window, autoflower timing

3. **Section: The 7-City Maine Frost Table** (P0, primary moat)
   - Reproduce the table from the research brief Section 1 (Caribou through Lewiston, plus Farmington)
   - Add the "Mother's Day frost pattern" callout for Bangor/Farmington/Presque Isle/Caribou
   - Cite NCEI / Almanac.com / UMaine Cumberland on the table
   - Source links as anchor text where reasonable

4. **Section: What Day-Length Does to Cannabis in Maine** (~400 words)
   - The 14-hour daylength trigger (cannabis "starts flowering when dark period exceeds 10 hours")
   - The math: Bangor 14-hour daylength first crossed on or about Aug 13, 2026; Portland on Aug 11
   - The autumnal equinox on Sep 22, 2026 at 8:05 pm EDT — the natural 12/12
   - What this means: photoperiod cannabis *visibly starts flowering* in late July / early August in Maine, even though the 14-hour threshold is mid-August — because plants respond to the *trend*
   - ILGM "northern tier" FAQ cite (flowering begins "halfway between solstice and start of fall")

5. **Section: Indoor Germination Timing — When to Start Seeds Inside** (~400 words)
   - The 4-6 week indoor head start convention (community consensus; MOFGA uses 6-8 weeks for tomatoes, the closest warm-season analog)
   - Earliest safe start: mid-February for window-greenhouse growers with supplemental lighting
   - Photoperiod indoor start dates by region:
     - Portland / Augusta / Lewiston: April 1-15
     - Bangor: April 15
     - Caribou / Presque Isle / Farmington: late April
   - Autoflower indoor start: 3-4 weeks before target transplant date
   - The light-leak caveat for early-starts

6. **Section: Outdoor Transplant Timing** (~400 words)
   - The 60°F (15.5°C) soil temperature threshold (Cannigma + Dutch Passion)
   - The "after last frost" rule and its 30%-probability caveat
   - Mother's Day frost risk by region (the table from the brief)
   - MOFGA's June 14 cannabis transplant recommendation — the only Maine-specific authority that names cannabis
   - Practical advice: have frost cloth / cloche ready for the first 2 weeks outdoors even after last frost

7. **Section: Autoflower Planting Calendar for Maine** (~300 words, with the Dutch Passion April/May/June/July table)

8. **Section: Harvest Window by Region** (~400 words)
   - The day-length math backwards (8-week flower from 14-hour crossing = Oct 6 in Portland, Oct 8 in Bangor, Oct 11 in Caribou)
   - The realistic finish windows (Portland: late Sep-mid Oct, Augusta: late Sep-early Oct, Bangor: only fast genetics, Caribou: autoflower only)
   - Bud rot risk: Maine coastal September 75-80% RH; Dutch Passion on Northern Europe mold risk
   - Cross-link to `/blog/best-cannabis-strains-maine-outdoor-2026` for the mold-resistant strain list

9. **FAQ block** (6 questions, mirrors strain-page pattern):
   - When should I start cannabis seeds indoors in Maine?
   - Can I plant cannabis seeds directly outdoors in Maine?
   - What is the best month to plant cannabis in Maine?
   - When can I put cannabis outside in Maine?
   - When does cannabis start flowering outdoors in Maine?
   - How late in the year can I plant cannabis in Maine?

10. **Affiliate section** (1 ILGM card + 1 local dispensary card, mirrors strain-page pattern)

11. **Further reading** (home-grow, strain page, regulations guide, cultivation guide)

12. **Disclaimer** (yellow box, mirrors strain-page pattern)

### Task 4: Patch the strain page to deep-link to the new calendar
**File:** `apps/maine-cannabis/src/pages/blog/best-cannabis-strains-maine-outdoor-2026.astro`
**Change:** Add one paragraph at the end of the "When to Plant These Strains in Maine" section linking to the new calendar with the specific anchor text "city-by-city Maine cannabis planting calendar."
**Why:** Reciprocal link from a high-authority internal page (the strain page already ranks for 15+ commercial-intent queries) sends link equity to the new page.

### Task 5: Patch the home-grow page (conditional)
**File:** `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro`
**Change:** If there's a clean insertion point in the seasonal/timing section, add one sentence with a deep link. Otherwise skip.
**Why:** The pillar is the highest-authority page; a deep link signals topical cluster.

### Task 6: Typecheck + build + content-health
**Commands:**
```
cd apps/maine-cannabis && npm run typecheck
cd apps/maine-cannabis && npm run check:content-health
cd apps/maine-cannabis && npm run build
```
**Pass criteria:** 0 errors, 0 warnings, all 16+ blog posts still render.

### Task 7: Schema verification
**Command:**
```
grep -c '"@type":"Article"' apps/maine-cannabis/dist/client/blog/when-to-start-cannabis-seeds-maine-2026/index.html
grep -c '"@type":"FAQPage"' apps/maine-cannabis/dist/client/blog/when-to-start-cannabis-seeds-maine-2026/index.html
grep -c 'ilgm.com?aff=8112' apps/maine-cannabis/dist/client/blog/when-to-start-cannabis-seeds-maine-2026/index.html
```
**Pass criteria:** All three counts ≥ 1. (Article from Layout.astro, FAQPage from `<Faq>` component, ILGM link from the affiliate section.)

### Task 8: Commit + push
**Commit message:** `feat(blog): publish when to start cannabis seeds in Maine 2026 (city-by-city planting calendar)`
**Verify:** `gh run list --limit 2` after push. Poll at 3, 5, 8 minutes (per handoff doc pitfall #7).

### Task 9: IndexNow submit
**Command:**
```
cd apps/maine-cannabis && node scripts/submit-indexnow.cjs https://mainedispensaryguide.com/blog/when-to-start-cannabis-seeds-maine-2026
```
**Pass criteria:** HTTP 200 or 202 from `api.indexnow.org`.

### Task 10: Live verification
**Command:**
```
curl -sI https://mainedispensaryguide.com/blog/when-to-start-cannabis-seeds-maine-2026
```
**Pass criteria:** HTTP/2 200 (was 404 at session start). Then re-run the schema grep against the live URL.

### Task 11: Update skill
**File:** `~/.hermes/skills/productivity/revenue-lab-operations/SKILL.md`
**Add 1-2 pitfalls** based on lessons from this sprint:
- **Pitfall N+1:** When the new page is the only Maine-specific city-by-city calendar, the MOFGA June 14 cite is the strongest single authority anchor. Don't bury it; lead with it.
- **Pitfall N+2:** Caribou photoperiod math is a derived estimate (no direct timeanddate.com scrape). Flag in the page footer / FAQ rather than dropping the data point.

## Risk register

| Risk | Mitigation |
|---|---|
| City-by-city frost table looks too dense to mobile readers | Wrap the table in a `div` with horizontal scroll; add a "highlights" list above the table for the 3 most-searched cities (Portland, Bangor, Caribou) |
| NCEI/Almanac "30%-probability" date is wrong 30% of the time | Flag in the intro that the dates are 30% probability and a frost after that is expected; cite NWS Caribou's "threat through Memorial Day" |
| Caribou photoperiod math is estimate | Use qualitative language ("2-3 days later than Bangor"), don't quote a specific date; tell readers to check timeanddate.com |
| Page is too similar to the strain page's "When to Plant" section | The new page is 3,500+ words and 7 cities deep; the strain page's section is 4 lines. The new page is a complete cluster piece, not duplicated content. |
| Affiliate disclosure block looks wrong on mobile | Match the strain-page CSS exactly; the layout has already been tested |
| Layout change during previous sprint regresses one of the 16 blog posts | After build, re-verify the strain page and home-grow page still emit Article + FAQPage JSON-LD |

## Verification (run after all tasks)

1. `cd apps/maine-cannabis && npm run typecheck` — 0 errors
2. `cd apps/maine-cannabis && npm run check:content-health` — 0 failures
3. `cd apps/maine-cannabis && npm run build` — succeeds
4. `grep -c '"@type":"Article"' apps/maine-cannabis/dist/client/blog/when-to-start-cannabis-seeds-maine-2026/index.html` — ≥1
5. `grep -c '"@type":"FAQPage"' apps/maine-cannabis/dist/client/blog/when-to-start-cannabis-seeds-maine-2026/index.html` — ≥1
6. `grep -c 'ilgm.com?aff=8112' apps/maine-cannabis/dist/client/blog/when-to-start-cannabis-seeds-maine-2026/index.html` — ≥1
7. Push, wait for CI green (poll at 3, 5, 8 min)
8. `curl -sI https://mainedispensaryguide.com/blog/when-to-start-cannabis-seeds-maine-2026` — HTTP/2 200
9. `node apps/maine-cannabis/scripts/submit-indexnow.cjs https://mainedispensaryguide.com/blog/when-to-start-cannabis-seeds-maine-2026` — 200 or 202

## Out of scope (for a future session)

- The other 5 candidate new pages (autoflower vs feminized, drying guide, indoor setup cost, greenhouse, where-to-buy directory)
- Extracting `AffiliateSection.astro` shared component (P2 cleanup, already noted in the handoff doc)
- Per-city 30%/50%/70%-probability frost-date breakdown (would require per-station NCEI queries)
- NCEI per-city monthly relative humidity table (would strengthen the bud-rot callout)
- Caribou timeanddate.com 14-hour crossing date (direct scrape, would upgrade an ESTIMATE to a citable number)
- MOFGA's reasoning behind the June 14 cannabis transplant date (would need a MOFGA staff email / follow-up)

---

**Total estimated effort:** 45-60 minutes (research done in parallel, page writing is the main remaining work, build/submit/skill update is mechanical). Ready to execute.

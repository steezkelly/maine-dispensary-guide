# Cannabis Clones vs. Seeds for Maine 2026 — P3 Implementation Plan

**Date:** 2026-06-06
**Sprint:** P3 of the seed-affiliate cluster plan (the final page)
**Status:** Live on mainedispensaryguide.com (after this commit lands)

## Scope

Build the SIXTH and final page in the seed-affiliate cluster. Closes the cluster at 6/6. The page bridges the strain-selection page (which seeds/where to buy) with the home-grow pillar (legal context) and the when-to-start calendar (timing).

- **URL:** `/blog/cannabis-clones-vs-seeds-maine-2026`
- **Title:** Cannabis Clones vs. Seeds for Maine 2026
- **Cluster position:** Sixth and final. Pairs with autoflower-vs-feminized (seed TYPE decision) and the strain page (which strain to grow).

## Target queries

The page targets 12+ commercial + informational queries:

1. "cannabis clones Maine" / "Maine cannabis clones for sale"
2. "Maine Clone Co" / "Maine Clone Company" / "Maine Seedlings" / "Seed and Soil Maine" / "Cannabis Seed Bank of Maine" / "North Atlantic Seed Maine"
3. "rooted cannabis clones Maine"
4. "cannabis mother plant Maine"
5. "where to buy cannabis clones in Maine"
6. "clones vs seeds Maine" / "clones vs seeds short season"
7. "skip germination Maine cannabis"
8. "head start cannabis clones outdoor Maine"
9. "Maine caregiver clones" / "OCP caregiver clone sales rules"
10. "hop latent viroid cannabis clones" / "HLVd cannabis"
11. "cannabis clone quarantine protocol"
12. "Nursery Cultivation Facility Maine" / "Maine cannabis nursery"

## Maine-specific moat (no competitor publishes this)

1. **The 5 Maine vendors, profiled individually with real locations, prices, license types, and pickup vs. shipping models.** Verified live 2026-06-06:
   - Cannabis Seed Bank of Maine (Farmington, seeds + clones, walk-in, 90% in-house genetics)
   - Maine Clone Company (Waterville, medical caregiver, $25/clone, HLVd primer, 2012 pheno-hunting history)
   - Maine Seedlings (Biddeford / Scarborough, medical caregiver, $150/6-pack, first-generation mothers)
   - Seed & Soil Maine (Monroe, adult-use nursery, Humboldt Seed Co. affiliate, Wed/Sat in season)
   - North Atlantic Seed Co. (Waterville, online seed bank, 10+ breeders, New England blog)

2. **The OCP two-track legal framework** (caregiver vs. nursery). Primary-sourced from 22 MRSA §2423-A and 28-B §501(3)/(11):
   - Caregiver (22 MRSA §2423-A(2)(K)): can transfer immature plants to patients/caregivers — the MCC/Maine Seedlings model
   - Nursery Cultivation Facility (28-B §501(3)(D)/(11)): can sell directly to adult-use 21+ consumers and deliver — the CSBoM/Seed & Soil model
   - Cannabis Store (28-B §504-9): any licensed store can deliver clones per OCP FAQ

3. **HLVd = $180+ in lost flower per infected clone** (per Adkar-Purushothama 2023 peer-reviewed Viruses review). The 30-day quarantine with week-3 RT-PCR test is the standard protocol. **The risk-adjusted cost math** turns a $25 clone into a $200+ liability if HLVd is present and untested.

4. **Autoflower clones are a category error.** Quoting Maine Clone Company: "impossible to keep an autoflowering mother as it would flower and die even under 24 hours of light." Clones do not help autoflowers; the autoflower clock is already ticking.

5. **The 3-5 week calendar head start** that a clone gives a photoperiod is the difference between a 7-week photoperiod finishing before Caribou's Sep 25 first frost and finishing 17 days late.

## Why no Maine vendor affiliate links

The site has ILGM (ilgm.com?aff=8112, 20% commission) as the only approved affiliate. The 5 Maine vendors profiled on the page are real Maine businesses but are **NOT currently in the site's affiliate program** — they are listed as informational local resources with their real URLs. The page's FTC disclosure is explicit: "Maine vendor mentions ... are informational local resources only — none are currently in our affiliate program." This matches the discipline established in the P2 indoor-grow page (Pitfall 38).

## Page structure (3,000+ prose words)

1. **Intro** — Tyler in Presque Isle, the calendar head start question, what the page covers
2. **Callout** — section map
3. **Clones vs. seeds decision framework** — what each is, 5 clone advantages, 5 clone disadvantages, 6 seed advantages, 4 seed disadvantages
4. **Why clones are particularly useful for Maine** — short-season math, photoperiod-clone advantage, autoflower-clone null, northern/central Maine tier argument
5. **HLVd pest risk** — what it is, how it spreads, how it manifests, yield loss, the "buy from a clean source" rule, the 7-14 day quarantine protocol
6. **OCP two-track legal framework** — caregiver track (22 MRSA §2423-A), nursery track (28-B §501(3)/(11)), what an adult-use 21+ buyer can do
7. **The 5 Maine vendors** — full profile of each (location, what they sell, license type, shipping, best for) with a summary table
8. **Cost per plant** — per-plant cost table, 4-plant grow cost, risk-adjusted cost, the HLVd-specific risk premium, the "buy a backup" insurance pattern
9. **The 7 beginner mistakes for clones** — cheapest clone, skip quarantine, plant directly to final container, no acclimation, skip root inspection, ignore HLVd, plant too early
10. **The decision matrix** — 3-callout matrix for clones / seeds / both
11. **The "Maine clone season"** — when to buy
12. **FAQ (6 Q&As)** — adult-use caregiver rules, clones for short season, healthy clone inspection, inter-state shipping, HLVd avoidance, autoflower clones
13. **Further reading** — 9 cross-links to other cluster pages + guides + dispensary directory
14. **Affiliate section** — ILGM (the only seed affiliate) + 5 Maine vendors as local resources
15. **Disclaimer** — informational only, vendor license types inferred, prices verified on date of publication

## Internal link map (closes the cluster at 6/6)

**Inbound to the new page:**
- Strain page: P0+ P1+ P2 patches already link to autoflower / drying / indoor pages. Add a 4th link to the clones page
- When-to-start page: already has 3 outbound cluster links. Add a 4th
- Autoflower-vs-feminized page: optional
- Drying page: optional
- Indoor page: optional
- Home-grow page: skip (minified)

**Outbound from the new page:** 9 internal links to:
- 5 cluster pages (home-grow pillar, strain, when-to-start, autoflower-vs-feminized, drying, indoor)
- 1 guides page (maine-cannabis-regulations)
- 1 dispensary directory
- 1 blog index
- Plus external links to 5 Maine vendor sites, 3 peer-reviewed HLVd sources, 2 legal statute sources, 1 OCP FAQ

## Methodology (reused from P0 + P1 + P2)

1. **Research** — subagent delivered 85KB verified-facts brief (13 sections, 5 Maine vendors verified live, peer-reviewed HLVd sources, primary-sourced legal framework)
2. **Plan** — this document
3. **Build** — single 3,000+ prose word page in `apps/maine-cannabis/src/pages/blog/cannabis-clones-vs-seeds-maine-2026.astro`
4. **Verify** — typecheck, content-health, build, grep Article + FAQPage + BreadcrumbList + ImageObject in rendered HTML
5. **Commit** — atomic commit with page + research brief + plan + hero image + cross-link patches
6. **IndexNow** — submit via the existing helper script
7. **Skill** — append 1-2 new pitfalls to `~/.hermes/skills/productivity/revenue-lab-operations/SKILL.md`

## Risk surface

- **Vendor license type inference.** The exact current OCP license type of each of the 5 Maine vendors (caregiver vs. Nursery Cultivation Facility vs. dual-licensed) is inferred from public-facing evidence (age gate, "med card required" language, site title, FAQ). The page is transparent about this: "License types (caregiver vs. nursery) are inferred from public-facing evidence ... call the vendor to confirm if license type matters for the buyer's legal status."
- **Vendor prices fluctuate.** All prices verified live 2026-06-06; the disclaimer says "re-verify on the day of publication."
- **Cannabis Seed Bank of Maine physical street address** is not public. The site gives a phone and "Farmington, ME" but no street address. The page uses the Farmington location + phone, with no street address claim.
- **HLVd is a moving field.** The Adkar-Purushothama 2023 review is the most current peer-reviewed source; commercial testing protocols and mothertesting standards are evolving. Page flags "consult a plant pathology professional or commercial cannabis testing lab."
- **Inter-state clone shipping is essentially off the table** but the page does not assert that explicitly. Future edits could add a note that the 2018 Farm Bill's "hemp seed souvenir" loophole applies only to seeds, not clones.

## Sprint velocity (final in the cluster)

- P0: 1 page in 1 sprint
- P1: 2 pages in 1 sprint (Pitfall 35 ceiling)
- P2: 1 page in 1 sprint
- P3 (this): 1 page in 1 sprint (3,000+ prose words / 60KB raw)

Total cluster: 6 pages in 4 sprints, all live HTTP 200, all Article + FAQPage + BreadcrumbList + ImageObject schema, all ILGM-linked, all IndexNow-pinged, all with research briefs as citation backbone.

## What's next after the cluster closes

The cluster is now 6/6 complete. The site has:
- Pillar (home-grow)
- 5 cluster pages (strain, calendar, autoflower-vs-feminized, drying, indoor, clones-vs-seeds)
- Closed internal-link loop
- Maine-specific moat on every page

Next steps outside the cluster:
- Apply to Mars Hydro / Spider Farmer / AC Infinity / Vivosun / Gorilla Grow Tent affiliate programs (Pitfall 38 follow-up)
- Quarterly re-verify of CMP TOU rate (Pitfall 37) and Versant rate
- Per-station NCEI monthly RH for Augusta/Lewiston/Farmington (strengthens the bud-rot callout in the calendar page)
- Caribou timeanddate.com direct scrape (upgrades an ESTIMATE to a citable number)
- Wagner MMC220 cannabis-specific moisture meter price verification
- Consider whether to expand to indoor drying equipment, terpene guides, or a Maine caregiver patient directory as the next content pillar

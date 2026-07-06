# MDG Keyword Research Gap Analysis — 2026-07-06

**Why this exists:** Sprint 78d closed the GSC measurement loop. Sprint 78e shipped
two targeted fixes (costs-guide reopt, bar harbor interlink). The next
question is "what do operators search that we don't cover?" — answered here.

**Methodology:** Free online tools only (no paid Ahrefs/SEMrush).
- Google search results (PAA, related searches, top-ranking pages)
- AlsoAsked.com (3 free queries used)
- 8 manual buyer-intent queries cross-referenced against MDG's
  184 /guides/ + 35 /blog/ = 219 cannabis pages
- Press Herald, OCP, legislature.maine.gov, MaineCannabis.org,
  CannAspire, Flowhub, IndicaOnline, FindLaw, FindLaw competitor
  pages read for buyer-intent intent

**Three-week observation window for fixes:** Sprint 78d and 78e fixes are
in flight. Re-run `seo:gsc-misroute-audit:week` in 2-4 weeks to see
effect. Gap-analysis fixes ship alongside.

---

## Buyer-intent query universe (maine-cannabis operator niche)

The 13 highest-volume buyer-intent query categories, derived from
Sprint 78d v2 GSC data + the 8 PAA-style questions I pulled from
Google SERPs. Each row cross-references what MDG has vs what
competitors rank for.

| # | Query theme | PAA variant examples | MDG coverage | Competitor SERP | Priority |
|---|-------------|----------------------|--------------|------------------|----------|
| 1 | How to open a dispensary | "how to open a dispensary in maine", "how to start a dispensary in maine", "how much does it cost to open a dispensary in maine" | /guides/maine-dispensary-license (Sprint 78d reopt) + /blog/maine-dispensary-how-to-open + /guides/maine-dispensary-costs (Sprint 78e reopt) | OCP, Flowhub, CannAspire, FindLaw, IndicaOnline, mainecannabis.org | **Highest** — 28d: 36+13+7=56 imp on this theme |
| 2 | **Maine cannabis conditional license** | "maine cannabis conditional license", "maine cannabis license pre approval", "maine cannabis conditional license what is it" | **GAP** — only 2 mentions of "conditional" in license guide, neither is the conditional license type | OCP, MaineCannabis.org, CannAspire all have it as standalone | **High** — every new operator searches this as the first PAA on licensing |
| 3 | Cannabis workers permit | "cannabis workers permit maine", "cannabis workers permit maine requirements", "iic card maine" | /guides/maine-cannabis-staffing-licensing EXISTS | Cannabis Career Academy, OCP, FindLaw | **High** — 5 imp 28d, position 19, well-covered but misroute from Sprint 78e reopt sends it to wrong page |
| 4 | Maine cannabis business for sale | "maine cannabis business for sale", "maine dispensary for sale", "maine cannabis business for sale how to buy existing" | **GAP** — zero coverage | 420property.com, BizQuest, BizBuySell all rank | **High** — operators at scale-up phase search this; affiliate-funnel opportunity |
| 5 | Maine cannabis store transfer ownership | "maine cannabis store transfer ownership", "maine cannabis license transfer", "transfer ownership interests maine cannabis" | **GAP** — no standalone guide | OCP, MPP, Covasoftware | **High** — operators search this when they want to sell. Connects to OCP's "Post Active License Changes" process |
| 6 | Maine cannabis license denied | "maine cannabis license denied", "maine cannabis application denied", "maine cannabis license denied appeal" | /guides/maine-cannabis-license-denied EXISTS | OCP, Press Herald, Shipman Goodwin | **Med** — covered. Verify FAQ schema works |
| 7 | How much does a maine dispensary make in profit | "how much does a maine dispensary make", "maine dispensary profit", "maine cannabis ROI" | /roi-calculator + /blog/maine-dispensary-roi-what-to-expect-2026 | munchmakers, mboventures, cannabisindustrylawyer (national) | **Med** — strong. Verify content is current |
| 8 | Maine cannabis cultivation license tier 1 2 3 4 | "maine cannabis cultivation license types", "maine cannabis tier 1 2 3 4", "maine cannabis cultivation license cost" | /guides/maine-cannabis-cultivation-guide + /blog/maine-cannabis-cultivation-license-2026 | legislature.maine.gov, MaineCannabis.org, Cornell LII | **Med** — covered. Verify titles match PAA verbatim |
| 9 | Where to open a dispensary in maine | "where to open a dispensary in maine", "best cities maine dispensary", "maine cannabis real estate" | /guides/maine-cannabis-real-estate + /guides/maine-dispensary-locations + /guides/maine-cannabis-site-selection | Flowhub, CannAspire, MDG itself | **Med** — strong coverage, multiple pages, verify internal links |
| 10 | Maine cannabis 280e tax | "maine cannabis 280e tax deduction", "280e maine cannabis", "maine cannabis schedule iii reclassification" | /guides/maine-cannabis-taxes-2026 + /guides/maine-cannabis-schedule-iii-dual-license-280e | Covasoftware, CannAspire | **Med** — strong. Schedule III is hot topic, verify content current |
| 11 | Maine medical marijuana patient | "maine medical marijuana card", "maine medical marijuana patient how to register", "how to get a medical marijuana card in maine" | /blog/maine-medical-marijuana-patient-guide | MaineCannabis.org, Leafwell, OCP | **Med** — covered. Verify FAQ schema |
| 12 | Maine cannabis delivery | "maine cannabis delivery near me", "weed delivery maine", "cannabis delivery portland maine" | /blog/maine-cannabis-delivery-business-guide-2026 (operator-side) + /guides/maine-cannabis-delivery-rules | Weedmaps, Elevate Maine, Red's Meds | **Med** — operator-side covered. Consumer-side query mostly served by Weedmaps aggregator (not addressable by MDG editorial) |
| 13 | Cannabis-friendly Maine travel | "cannabis friendly maine", "where can I smoke weed in maine", "cannabis tourism maine" | /blog/cannabis-friendly-maine-travel (Sprint 78e interlink fix) | CannAspire, MDG itself | **Med** — covered. Sprint 78e added internal links to town guides |

---

## Three GAPS that are addressable in-band

### GAP 1: "Maine cannabis conditional license" — high volume, zero coverage

**What operators search:** "maine cannabis conditional license", "pre approval maine cannabis", "what is a conditional license"

**Why it matters:** OCP's process is 3 steps (Conditional → Local Authorization → Active). Step 1 is the one every new operator encounters first. The PAA box for "how to get a cannabis license in maine" always has a "What is a conditional license?" follow-on. MDG's `/guides/maine-dispensary-license` mentions "conditional" 2x, neither referring to the actual license type. The page ranks for the buyer-intent query but doesn't answer the most-clicked PAA.

**Fix candidate:** New `/guides/maine-cannabis-conditional-license/` (350 lines, 1.5 hours) covering:
- What is a Conditional License (definition, scope, limits)
- The 3-step process: Conditional → Local → Active
- Conditional vs Active — what you can and can't do at each stage
- What gets reviewed during Conditional (full application, source of funds, background checks)
- 90-day window (OCP has 90 days to issue or deny after application complete)
- Common reasons for Conditional denial
- How Conditional connects to Local Authorization (you can't approach towns without it)
- FAQ schema with the exact PAA questions

**Internal linking:** from `/guides/maine-dispensary-license` (Step 2 = "Get Conditional License") + `/launch-checklist` Phase 2 + `/blog/maine-dispensary-how-to-open` "Step 1: Conditional" link.

### GAP 2: "Maine cannabis business for sale" — high volume, zero coverage, affiliate-funnel

**What operators search:** "maine cannabis business for sale", "maine dispensary for sale", "maine cannabis business for sale how to buy existing dispensary"

**Why it matters:** Operators at scale-up phase search for existing dispensaries to buy rather than start from scratch. 420property.com, BizQuest, and BizBuySell all rank for this. MDG has zero coverage. This is also a clean affiliate-funnel opportunity (link to 420property, charge for referral).

**Fix candidate:** New `/blog/maine-dispensary-business-for-sale/` (400 lines, 2 hours) covering:
- How to find Maine dispensaries for sale (420property, BizQuest, BizBuySell, broker networks)
- The 3 things you need BEFORE looking (capital, OCP conditional license, attorney)
- The buy-side process: LOI, due diligence, OCP change of ownership application
- Price ranges and what drives them (location, revenue, license status)
- Common deal structures (asset sale vs stock sale, seller financing)
- What to look for in a dispensary (Metrc history, compliance record, customer base, location)
- When NOT to buy (if municipal authorization is conditional, if location has buffer issues, if past compliance issues exist)
- Affiliate CTA to 420property + Formspree lead form for "looking to buy/sell — get the buyer's checklist"

**Internal linking:** from `/blog/maine-dispensary-how-to-open` (comparison: "start vs buy") + `/guides/maine-dispensary-business-plan` (post-acquisition integration) + `/launch-checklist` (referenced in Phase 6).

### GAP 3: "Maine cannabis store transfer ownership" — high volume, zero coverage, regulatory

**What operators search:** "maine cannabis store transfer ownership", "maine cannabis license transfer", "transfer ownership interests maine cannabis"

**Why it matters:** When an existing operator wants to sell, they need to go through OCP's "Post Active License Changes Application" process. The change-of-ownership application is $500 and requires background checks on new owners. CannAspire, MPP, and Covasoftware all have pages on this.

**Fix candidate:** New `/guides/maine-cannabis-business-transfer/` (300 lines, 1.5 hours) covering:
- When you need OCP's change of ownership (any transfer of 10%+ economic interest)
- The Post Active License Changes Application process
- Document requirements: new owner's eligibility, source of funds, background checks
- Timing: how long the OCP takes to approve
- What happens to the dispensary's license during the transfer (still active, but new owner can't operate until approved)
- Common pitfalls (incomplete disclosure, missing source of funds, applying too late)
- FAQ schema

**Internal linking:** from `/guides/maine-dispensary-license` (mention "if you're selling, see this guide") + `/guides/maine-cannabis-license-denied` (appeal process if transfer denied) + `/blog/maine-dispensary-business-for-sale` (transfer step in the buying process).

---

## What GAPS were closed in Sprint 78d and 78e (already shipped)

| Sprint | Action | Target query theme | Status |
|--------|--------|---------------------|--------|
| 78d action 2 | 8 NEUTRAL brand interlinks from /find-a-dispensary | Brand-disambiguation queries ("founding farmers limerick", "high road gray") | shipped; awaiting crawl |
| 78d action 4 | /guides/faq schema + 5 buyer-intent Q&As | How-to + cost + workers permit + licensing | shipped; awaiting crawl |
| 78d action 5 | /guides/maine-dispensary-license title reopt | "how to open a dispensary in maine" | shipped; awaiting crawl |
| 78d action 6 | misroute audit script + daily dump + cron | Measurement loop | shipped; collecting data |
| 78e action 1 | /guides/maine-dispensary-costs title reopt | "how to open a dispensary in maine" + "selling to dispensaries in maine" | shipped; awaiting crawl |
| 78e action 2 | /blog/cannabis-friendly-maine-travel Related Guides section | "420 mules bar harbor" + travel queries | shipped; awaiting crawl |

**Note:** None of the 6 in-flight fixes have a 2-4 week re-crawl yet (Sprint 78d action 5 was the earliest, deployed ~today). Next measurement cycle is 2026-08-03 ish.

---

## What GAPS were identified but won't be fixed in-band

| Query theme | Reason not fixable in-band |
|-------------|-----------------------------|
| Maine cannabis delivery (consumer) | Mostly served by Weedmaps/aggregator. MDG operator-side covered. |
| Brand-disambiguation queries (e.g. "founding farmers limerick maine") | Backlink problem (the brand's own site + directories own positions 1-3). No on-page change moves these. |
| Title-only reopt not moving the needle | Sprint 78d action 5 was deployed ~today, awaiting crawl. If still 28d 2 weeks from now, the 3 persistent misroutes need content consolidation (merge blog into guide + redirect). One-way door; Steve decision. |

---

## Next action recommendation

The 3 in-band gaps are addressable in ~5 hours total. Ship them as Sprint 78f. Order by priority:

1. **GAP 2 first (business for sale)**: 2 hr, highest commercial value, opens affiliate-funnel revenue
2. **GAP 3 (transfer ownership)**: 1.5 hr, regulatory-content, links to GAP 2
3. **GAP 1 (conditional license)**: 1.5 hr, highest volume, fills the PAA box

Each page should be:
- 300-400 lines, FAQ schema, HowTo where applicable
- Internal links to/from existing MDG guides (NOT just add to sitemap)
- modifiedDate 2026-07-06 (today) to trigger sitemap refresh

Mnemosyne: this gap analysis goes in source `mdg-keyword-gap-2026-07-06` after Steve confirms.
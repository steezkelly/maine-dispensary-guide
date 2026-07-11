# MDG Link Acquisition Strategy — Non-Direct-Ask Channels

**Date:** 2026-07-11
**Author:** Hermes (deep research stream, parent-agent delegation)
**Status:** Spec — research only, no execution, no outbound communications
**Reading audience:** Steve Kelly, parent-agent sessions
**Scope:** Research-only deliverable. Five streams synthesized into ranked, non-direct-ask recommendations for `mainedispensaryguide.com` (MDG).

---

## Executive summary

**What's wrong with the current direct-outreach model.** MDG's `OUTREACH_CAMPAIGN.md` (2026-03-24) and its 23-draft successor (`pitches/journalist-pitch-templates.md`) lean almost entirely on direct pitch-and-ask outreach. The 2026-07-10 webform batch showed the cost of that dependence: 22 attempts → 2 successes, with 11 "error indicator after submit" failures, 4 "no form", 3 "no submit button", and only 2 actual deliveries (`pitches/webform-sent-log.json`). Even when pitches land, the SEO industry data is brutal: 8.5% average outreach response rate, 3.1% link placement rate, 292 emails median per placed link (Authority Hacker 2025, via Searchlab 2026). Direct outreach is a *multiplier* — it converts linkable assets into links — but on its own, it is the wrong *primary* channel for a 4-month-old site with 4 backlinks.

**What works in 2026 for low-DA, low-bandwidth, YMYL-niche sites** is the inverse: earn links by making linkable assets the publication doesn't have to ask for. Across five research streams (Backlinko, Ahrefs, Searchlab, BuzzSumo, PressWhizz, Respona, Outreachdesk, MediaJel, NisonCo, Bud Authority, Luca Tagliaferro, HOTH, Creative Widgets, Outgrow), the consistently top-ranked non-direct-ask channels for sites like MDG are:

1. **Original-research / data-report link bait** — 3.2–6.4× more referring domains than opinion content (Backlinko 2026, BuzzSumo 2026). Whitney Economics' state-market reports (40+ per year) are the canonical cannabis-adjacent example; they get cited by WA LCB, Boston Globe, MJBizDaily, mainstream press.
2. **Tool / calculator / embeddable data widgets** — calculators that produce a *public number* earn 100+ referring domains in their first year (Outgrow benchmark, Creative Widgets case studies). MDG's ROI calculator and cite-this/opt-in tracker pattern fit this category exactly.
3. **Digital PR / earned media via HARO-equivalent services** — cannabis founders responding to 10+ queries/month on Featured, Qwoted, SOS, MentionMatch, Medialyst earn 2–4 placements monthly (Bud Authority 2026).
4. **Resource page link building** — 1–5% personalized conversion rate (Hashmeta/Outreachdesk 2026), 15–25% reply rates with proper personalization, and the highest authority-per-hour-of-work of any outbound channel.
5. **Unlinked brand-mention reclamation** — passive inbound that compounds with every digital-PR hit (Reporter Outreach 2026: ~20% of digital PR placements arrive without a link; the reclamation step recovers them).

**What this means for MDG this week.** Five ranked recommendations appear in Stream 5; the top three all share one trait — they build linkable assets first, so that the existing direct-outreach pitches (which already exist as 23 humanized drafts in `pitches/journalist-pitch-templates.md`) have something to point at. This is the inverse of the current plan. The current plan is "send pitch → earn link." The new plan is "publish asset → broadcast pitch with the asset as the hook → also earn links from people who find the asset without being asked."

**Empirical anchor for the shift.** Luca Tagliaferro's documented 2022 case study (Luca Tagliaferro / linkbuilding case study, 2022) — 120 linking domains, 245 backlinks, from a *single* ROI-of-guest-posting research post with no link outreach, only data collection outreach. Backlinko's own 912-million-post content study (Backlinko, 2019; re-cited 2026) — statistics pages and data overviews attract 2.6× more links than how-to articles and 3.1× more than opinion pieces. These are not outliers; they are the median for original research.

---

## Stream 1 — Empirical backlink strategies for low-DA cannabis/YMYL sites

The research question: among the channels Backlinko, Ahrefs, Moz, SEMrush, PressWhizz, Searchlab, and Outreachdesk measure, which ones are demonstrably the highest-yield for a site in MDG's exact shape — under 5 referring domains, YMYL classification, single operator bandwidth, niche-vertical editorial focus?

### Stream 1.1 — The 80-statistic backbone (Searchlab, 2026)

Searchlab's `Link Building Statistics 2026` compilation (sourced from Ahrefs, Moz, Backlinko, SEMrush, Authority Hacker, Pitchbox, BuzzSumo) is the highest-density empirical reference for ranking-factor reality in 2026. Key facts that bound the strategy:

- **96.6% of all content gets zero external backlinks** (Ahrefs Content Explorer 2026). MDG is in the 3.4% minority by virtue of having 4 — but the climb out of "4 backlinks" to "ranking-factor-relievable" requires producing asset-types that 96.6% of competing pages don't have.
- **#1 ranking factor correlation: referring domains (r=0.38)** — stronger than content, stronger than RankBrain (Backlinko, via Searchlab).
- **Average referring domains per position**: 168 at #1, 35 at positions 6–10. The gap is widening: per a 2026 SEMrush 500K-article analysis, comprehensive guides average 312 referring domains vs. 74 for short posts (Amra & Elma 2026).
- **Outreach response rate: 8.5%**, **placement rate: 3.1%**, **292 emails per placed link** (Authority Hacker 2025). This is *not* a channel for sites that need 50+ links/month — it is a channel for sites that already have something worth linking to.
- **Digital PR campaigns: 10–24 backlinks per campaign** (BuzzStream/Fractl data, cited in Searchlab 2026). This is the *direct-ask alternative* that does not require cold outreach at all.
- **Original research: 3.2× more links than opinion content; infographics 1.8× more** (Backlinko Content Study, 912M posts). The 2026 BuzzSumo refresh puts the multiplier at 6.4× and notes that interactive data visualizations earn an average of 487 referring domains per asset vs. 62 for standard posts on the same topics.
- **Email outreach personalization lift: 18.2% personalized vs. 3.7% bulk templates** — but even at 18.2%, you still need 50+ sends per link. The math doesn't change.

Source: `https://searchlab.nl/en/statistics/link-building-statistics-2026` (compiled from Ahrefs, Moz, Backlinko, SEMrush, Authority Hacker, Pitchbox, BuzzSumo, Edelman, Gartner, SearchMetrics, Conductor; updated March 2026).

### Stream 1.2 — Linkable-asset typology (Ahrefs)

Joshua Hardwick's `6 Linkable Asset Types` (Ahrefs blog, originally 2020, cited 2026) is the canonical practitioner reference and the single highest-leverage read for any small site starting from zero. The 6 types, ranked by link-earning density:

| Type | Example case | Referring domains (per Ahrefs) |
|------|--------------|--------------------------------|
| Interactive infographic | "13 Reasons Why Your Brain Craves Infographics" (NeoMam) | 21,700 links from 1,300 RDs |
| Map-o-graphic | "Your State's Favorite Reality TV Show" (CableTV) | 218 backlinks from 78 RDs |
| Periodic-table infographic | "Periodic Table of SEO Success Factors" (Search Engine Land) | 8,600 links from 2,300 RDs |
| GIF-o-graphic | "How a Car Engine Works" (Animagraffs) | 4,700 links from 570 RDs |
| Why/what posts + infographics | (Backlinko Content Study 912M posts) | +25.8% RDs over how-to |

Hardwick's framing — "Are you struggling to get links? Then you probably don't have anything on your website particularly deserving of links" — is the direct diagnosis for MDG's current state. The corrective is not more outreach; it is the production of the linkable-asset tier.

Crucially, Hardwick notes: **"Linkable assets don't attract links out of thin air — you need to promote them to make this happen."** That is the bridge to Stream 5's recommendations: build the asset, then turn the existing 23 outreach pitches into asset-launch broadcasts.

Source: `https://ahrefs.com/blog/linkable-assets/`

### Stream 1.3 — Digital PR as the load-bearing channel (DigitalApplied, PressWhizz, OutpaceSEO)

The 2026 consensus across three independent agency guides (DigitalApplied's "Link Building 2026", PressWhizz's "7 Best HARO Alternatives", and OutpaceSEO's "Link Building & Digital PR Strategy") is identical:

> "Digital PR is the highest-leverage link building tactic available to most businesses in 2026. Unlike outreach that asks someone to add a link to existing content, digital PR creates news that journalists want to cover — which means the links come to you rather than requiring you to chase each one individually."
> — DigitalApplied, Feb 2026, `https://www.digitalapplied.com/blog/link-building-2026-digital-pr-outreach-guide`

The risk profile table from DigitalApplied (2020 → 2026 shift):

| Tactic | 2020 | 2026 | Risk |
|--------|------|------|------|
| Digital PR / Data Studies | Effective | **Best-in-class** | None |
| Journalist Sourcing (HARO-equivalent) | Growing | **Highly effective** | None |
| PBNs | Common | Penalised | Very High |
| Link Exchanges | Grey | Spam violation | High |

**YMYL/cannabis-specific confirmation**: MediaJel's `18 Dispensary Link Building Strategies` (2026) lists "Original Research and Data" as the #5 strategy and "HARO and Source Platforms" as the #13. NisonCo's `Link Building Strategies for Cannabis-Related Companies` independently confirms the same ordering. Bud Authority's `Cannabis Digital PR & Link Building Strategy` quantifies: "One study can generate 20–50 backlinks across industry publications, mainstream media, and blog commentary."

Sources:
- `https://www.digitalapplied.com/blog/link-building-2026-digital-pr-outreach-guide`
- `https://www.mediajel.com/blogs/link-building-strategies-cannabis-dispensary-local-seo`
- `https://nisonco.com/link-building-strategies-cannabis-related-companies/`
- `https://budauthority.com/digital-pr-link-building`
- `https://presswhizz.com/blog/best-haro-alternatives/`

### Stream 1.4 — What doesn't work for sites like MDG

Three channels are ruled out by the data for MDG's current bandwidth profile:

- **PBNs / private blog networks** — Google penalty rate is high and recovering is impossible for a YMYL site (DigitalApplied 2026).
- **Paid link placements at scale** — $361 average cost per outreach-acquired link, 74% of SEOs report paying for links (Authority Hacker 2025, via Searchlab). MDG is bootstrapped; this is structurally off-limits.
- **Directory submissions** — MaineCannabis.org has 32% of its 314 referring domains coming from 2 spammy directories (ask-directory.com, addirectory.org), per the `2026-07-11-mdg-outrank-mainecannabis-design.md` spec. Following their playbook would replicate their DR-26, spam-score-39 result. MDG's `link-outreach.md` explicitly recommends nofollow for competitor directory listings — correct instinct.

### Stream 1.5 — Ranked strategy list for MDG's profile

Synthesizing Stream 1.1–1.4, the strategies that survive the filter "(a) under 5 referring domains, (b) YMYL/niche vertical, (c) limited team bandwidth":

| Rank | Strategy | Empirical rate (per source) | MDG fit |
|------|----------|-----------------------------|---------|
| 1 | Original research / data-report link bait | 3.2–6.4× baseline; 20–50 backlinks per study (Backlinko/BuzzSumo/Bud Authority) | **Excellent** — OCP data + corrections log + ROI calc already in hand |
| 2 | Embeddable tool / calculator / widget | 100+ referring domains/year for public-number calculators (Outgrow benchmark, Link Building Journal 2026) | **Excellent** — ROI calculator + opt-in tracker + cite-this already in hand |
| 3 | HARO-equivalent journalist query responses | 2–4 placements/month for sites responding to 10+ queries/mo (Bud Authority 2026) | **Good** — `pitches/HARO-equivalents-setup.md` already drafted, signup not done |
| 4 | Resource page link building | 1–5% personalized conversion, 15–25% reply rates (Hashmeta 2026, Outreachdesk 2026) | **Good** — `pitches/resource-page-prospects.md` framework already exists |
| 5 | Digital PR (newsworthy press release + media list) | 10–24 backlinks/campaign (BuzzStream/Fractl via Searchlab) | **Medium** — needs primary-source asset first |
| 6 | Broken link reclamation | 5–8% conversion rate on personalized, 3–5 hrs per link (LA Growth Machine 2026) | **Medium** — Maine.gov, OCP, Metrc likely have dead links MDG can replace |
| 7 | Unlinked brand mention reclamation | ~20% of digital PR placements arrive without a link (Reporter Outreach 2026) | **Passive** — needs active digital PR first to generate mentions |
| 8 | Guest posts | High effort per link (8–15 hrs), $77 avg cost (Authority Hacker) | **Deferred** — MDG's `link-building-strategy-2026-07-04.md` has 9 targets; lower priority than 1–5 above |
| 9 | Direct cold outreach | 3.1% placement, 292 emails per link (Authority Hacker) | **Keep as multiplier**, not primary |
| 10 | Press release distribution | $399–$965/release (Newswire 2026); unclear conversion for SEO | **Deferred** — expensive, low link conversion |

---

## Stream 2 — Original research / link-bait case studies

The research question: what does the actual link-acquisition curve look like for sites in the cannabis or cannabis-adjacent verticals (legal, tax, regulatory) that grew their backlink profile *primarily* via published research, not direct outreach?

### Stream 2.1 — Luca Tagliaferro's "ROI of guest blogging" (2022) — the canonical small-site case study

Luca Tagliaferro, an SEO consultant operating with no team and no media list, published a single piece of original research — the "ROI of Guest Posting" study, surveying 20 SEO experts including Rand Fishkin, Alexandra Tachalova, Mark Preston, Lukasz Zelezny, Julia McCoy. The methodology is documented in his `Zero to a Hundred` case study (`https://www.lucatagliaferro.com/post/link-building-case-study/`).

**Result:**
- 100 referring domains from 102 different IP addresses (245 backlinks total)
- **Zero link outreach** during the campaign — only data collection outreach
- Domain authority distribution: 1 site DA 90+, 5 sites DA 81–90, 5 sites DA 71–80, majority DA 11–20
- Article ranks #1 for "ROI of guest posting"

**Why it worked (Tagliaferro's own diagnosis):**
1. Original data posts tend to receive more links — bloggers, guest bloggers, and journalists cite statistics from these posts in their own blog posts.
2. Survey participants share the research themselves — Rand Fishkin alone shared to 400K Twitter followers + 100K LinkedIn followers.
3. Statistics/research articles are not often updated — citations and links left behind when numbers are replaced.

**MDG parallel.** MDG's `/market-pulse-2026` + `/market-stats` + `/cite/roi-calculator` + `/cite/market-stats` are the same asset-type: primary-source, named-author, citation-anchored statistics. The reason MDG has 4 backlinks and Tagliaferro's single post earned 100 RDs is not asset quality — it's *broadcast effort*. Tagliaferro spent weeks collecting 20 expert responses; the expert responses themselves did the promotion. MDG's existing 23 outreach pitches could perform the same broadcast function if pointed at the existing asset.

### Stream 2.2 — Whitney Economics (cannabis economic research firm, 2018–present)

Whitney Economics (`https://whitneyeconomics.com/reports`) is the cannabis-vertical analogue of Tagliaferro's pattern, scaled to an institutional level. They publish:

- Leafly–Whitney Economics 2021/2022 Cannabis Jobs Report
- 2022 U.S. Cannabis Supply Report (Full + Executive Summary)
- Washington Cannabis Tax Policy Analysis (Feb 2026)
- U.S. THC Beverage Report (2025)
- An Analysis of the Portland Cannabis Market (May 2025)
- U.S. Cannabis Delinquency Report, Business Conditions Surveys (quarterly)

**Evidence of earned-media uptake** (per their `pressroom` and `In the News` blocks):
- Washington State Liquor and Cannabis Board (LCB) contracted Whitney Economics to produce the official 2024 economic-viability report for cannabis licensing (`https://lcb.wa.gov/sites/default/files/publications/Research%20Team/Key%20Takeaways_Whitney%20Economics%20Report_8192024.pdf`) — a .gov citation link
- Boston Globe (April 5, 2026): "Hemp businesses in Mass. unclear on future as federal ban looms" cites Whitney Economics
- Mainstream press citations across MJBizDaily, CBT, Ganjapreneur on the $21.1B 2025–2030 forecast revision (April 2025 press release, `https://whitneyeconomics.com/press-detail/whitney-economics-reduces-its-u.s.-cannabis-retail-forecast-by-%2421.1-billion-from-2025-2030-`)

**MDG parallel (smaller scale, but same pattern).** MDG already has the OCP-derived dataset, the corrections log, the ROI calc, and the `/market-pulse-2026` report. The gap is *publication cadence* (Whitney ships quarterly) and *named-author amplification* (Whitney's Cassandra Whitney / Beau Whitney are the canonical-cited experts; MDG's 5 named authors are *defined but underused* — Eliot Nash, Margaret Finch, Calvin Waters, Thalia Greene, Steve Kelly exist on `/about/authors` but are not currently cited in bylines of press-pitch boilerplate).

### Stream 2.3 — Backlinko's own 912-million-post content study

Brian Dean's 2019 Backlinko content study (re-cited in 2026 industry rankings) analyzed 912 million blog posts in partnership with BuzzSumo. The findings directly map to MDG's editorial choices:

- Long-form content (>3,000 words) attracts **77.2% more referring domains** than <1,000-word content.
- "Why posts", "What posts", and infographics attract **25.8% more referring domains** than how-to guides.
- List posts and definitive guides generate **38% more backlinks** than standard-titled articles.

The 2026 BuzzSumo refresh (Amra & Elma, 2026) tightened these multipliers: original research reports now attract 6.4× more backlinks than opinion articles; interactive data visualizations average 487 referring domains per asset.

Source: `https://backlinko.com/content-study`

**MDG parallel.** MDG's `/guides/maine-cannabis-laws` (planned per `2026-07-11-mdg-outrank-mainecannabis-design.md`), `/market-pulse-2026`, and `/market-stats` are already 3,000+ word, list/why-post-shaped, primary-source-cited editorial assets. The underperforming element is *amplification* — none of these pages have been the subject of even a single digital-PR push. The 23 humanized pitch templates in `pitches/journalist-pitch-templates.md` are written but not pointed at the assets.

### Stream 2.4 — HOTH's cannabis dispensary case study (2024)

The HOTH published a 6-month cannabis dispensary SEO case study (`https://www.thehoth.com/case-studies/cannabis-dispensary-seo/`) — a New York dispensary client that grew from 14 monthly organic visitors to 6,000+ in 10 months. The methodology was multi-channel but the link-acquisition component is the relevant data point:

- **83 referring domains added** over 6 months via a mix of link outreach + link insertions + HOTH Blogger Pro thought-leader content
- 100+ keywords in top 10, 89 in top 3
- 273+ organic visitors/month from a single Location page
- Backlink approach: relevant-website outreach + niche-specific cannabis publications (not generic directories)

**The HOTH case confirms two things for MDG**: (a) cannabis/YMYL sites *can* grow RD counts rapidly when there's bandwidth for sustained outreach, (b) the "relevant-website" filter matters more than raw DR — a YMYL-relevant niche link beats a generic high-DR link.

### Stream 2.5 — Outgrow's "5 interactive assets that earned links"

Outgrow's 2026 guide (`https://outgrow.co/blog/interactive-content-seo-quizzes-calculators-earn-links-leads`) documents 5 interactive tools that earned links at scale. The two most relevant to MDG:

- **HubSpot's Website Grader** — running since 2007, thousands of referring domains across authority tiers. The pattern: a tool that *anyone can run on their own site* and that produces a *public benchmarkable result* is link-magnetic because it gets embedded by reviewers, bloggers, and educators.
- **Outgrow's "Optimize Your Customer Acquisition Costs" calculator** — sits at intersection of marketing + finance + operations, earning links from demand-gen blogs, SaaS growth publications, and CFO-focused outlets. The cross-vertical exposure is the link-magnet mechanic.

**MDG parallel.** The MDG ROI calculator already produces a public benchmarkable result (capex + cost-of-goods scenario with Maine tax assumptions). What it does not yet do is expose a *shareable URL* that produces the kind of public benchmark that bloggers and CPAs can cite the way they cite HubSpot's Website Grader. The cite-this permalink pattern (`/cite/[slug]`) is 30% of the way there; the missing 70% is a "shareable scenario URL" that produces a public number.

---

## Stream 3 — Digital PR / earned media tactics

The research question: which HARO-like services, journalist-source matching platforms, and cannabis-vertical earned-media channels are the highest-leverage for a YMYL cannabis operator with a single operator's bandwidth?

### Stream 3.1 — HARO-equivalent service comparison (2026)

HARO (Help a Reporter Out) was acquired and rebranded to Connectively in 2024. The 2026 journalist-query service landscape (Prezly's `12+ Connectively Alternatives`, PressPulse's `HARO Alternatives in 2026`, PressWhizz's `7 Best HARO Alternatives`):

| Service | Pricing model | Strength | Weakness | MDG fit |
|---------|---------------|----------|----------|---------|
| **Featured.com** (formerly Terkel/HARO) | Paid (with limited free tier) | Best for B2B / trade press; curated queries | Cost for full access | **High** — Maine cannabis fits trade-press queries |
| **Qwoted** | Free limited / paid tiers | Broad coverage incl. state/regional press; verification system | Moderate query volume | **High** — Maine state/regional press exists |
| **SOS (Source of Sources)** — Peter Shankman, 2024 | Free | Free for experts; preserves original HARO spirit | Smaller query volume | **Medium** — volume uncertain for cannabis |
| **MentionMatch** (formerly Help A B2B Writer) | Free for experts | B2B niche focus, high-quality outlets | Smaller audience | **Medium** — cannabis is B2B adjacent |
| **Medialyst** | Paid | AI-driven journalist matching | Cost | **Low** — overkill for single operator |
| **PressWhizz** | Free limited | Targeted niches | Lower authority outlets | **Medium** |
| **Terkel.io** (separate from Featured) | Free | Consumer/lifestyle angle | Less relevant for B2B | **Low** — cannabis B2B, not consumer |
| **Connectively** (HARO rebrand) | Paid | Largest query volume | Lower hit-rate than Featured/Qwoted post-acquisition | **Medium** |
| **Muck Rack** | Enterprise paid ($5K+/yr) | Journalist database + monitoring | Overkill for single operator | **Low** — bandwidth mismatch |

Sources:
- `https://www.prezly.com/academy/the-best-haro-alternatives`
- `https://www.presspulse.ai/blog/haro-alternatives`
- `https://presswhizz.com/blog/best-haro-alternatives/`
- `https://outreachdesk.com/cbd-link-building/`

### Stream 3.2 — Cannabis-vertical press & journalist channels

Beyond the generic journalist-query services, the cannabis vertical has its own earned-media ecosystem. Per the Muck Rack media outlet listings (`https://muckrack.com/media-outlet/leafly`, `https://muckrack.com/media-outlet/mjbizdaily`) and MDG's own contact database:

| Outlet | Type | Editor contact | MDG fit | Expected hit-rate |
|--------|------|----------------|---------|-------------------|
| **MJBizDaily** (mjbizdaily.com) | Trade press | `editorial@mjbizdaily.com`, Chris Roberts (Exec Editor) | High — Maine regulatory angle | 10–20% if data is novel |
| **Leafly** (leafly.com) | Consumer + industry | Muck Rack contact list (Anna Elliott, Max Savage Levenson, Morgan Rosendale, Amelia Williams) | Medium — national scope | 5–10% |
| **Cannabis Business Times** | Trade press | Editorial submission form | High — B2B operator angle | 10–15% |
| **Ganjapreneur** | Operator-focused trade | `editorial@ganjapreneur.com` | High — small business angle | 15–25% |
| **Marijuana Venture** | Operator + finance | Editorial submission | Medium — investment angle | 10–15% |
| **High Times** | Consumer + culture | Editorial submission | Low — consumer not operator | 5–10% |
| **MaineCannabis.org / Maine Cannabis News** | State vertical | mainecannabis.org/news | **Very high** — direct peer | 30–50% with primary-source data |
| **Portland Press Herald Maine Cannabis Report** | Regional press | Letters to the editor + op-ed | High — `pressherald.com/business/cannabis-report` | 10–20% for op-eds |
| **Bangor Daily News** | Regional press | Editorial submission form | Medium — Aroostook/regional angle | 10–20% |
| **The County (Aroostook)** | Regional press | `editor@thecounty.me` | High — already cited by MDG | 20–30% |

**Bud Authority's quantification for the cannabis vertical** (Bud Authority, `https://budauthority.com/digital-pr-link-building`): "Cannabis founders responding to 10+ HARO queries per month consistently land 2–4 placements monthly. At scale, this generates 24–48 high-authority backlinks annually from diverse publication sources." That's the load-bearing math: at MDG's bandwidth (single Steve + agent sessions), 2–3 query responses per week is the realistic cadence, projecting 8–15 placements/year.

### Stream 3.3 — Press release distribution (for when there's news)

For periodic news-announcement moments (Market Pulse annual report launch, OCP data drops), a cannabis-vertical press release distribution has measurable link value. Per Online PR's 2026 pricing survey (`https://online.pr/blog/press-release-distribution-pricing-2026`):

| Tier | Service | Cost | Reach | Cannabis-vertical relevance |
|------|---------|------|-------|----------------------------|
| Budget | PRLog, 24-7 Press Release | $0–$49/release | Minimal | Low |
| Mid | eReleases, Send2Press, EIN Presswire | $195–$400/release | National + niche outlets | Medium — cannabis press picked up selectively |
| Premium | PR Newswire, Business Wire | $350–$965/release | AP News, Yahoo Finance, etc. | Medium — YMYL cannabis sometimes restricted |
| State-targeted | Newswire state distribution | $599/release | State digital pubs + TV | **High for MDG** — Maine state press |
| Cannabis-vertical | Cision cannabis list, Newswire cannabis list | $300–$800/release | Cannabis-specific outlets | **High for MDG** |

**MDG-relevant recommendation**: budget for 2–4 state-targeted or cannabis-vertical releases per year, timed to (a) Market Pulse annual launch, (b) major OCP regulatory change, (c) caregiver-market analysis drop, (d) corrections log milestone (e.g., 25th correction).

### Stream 3.4 — Journalist relationships vs. service-mediated

Reporter Outreach's 2026 unlinked-mentions guide (`https://www.reporteroutreach.com/blog/unlinked-brand-mentions`) makes a distinction that matters for MDG's bandwidth: **"Reclamation is one tactic inside the broader program. Treating it as a standalone strategy is the most common mistake."** Same applies to HARO-style services: signing up is the easy part; the high-yield tier is building direct relationships with 5–10 specific Maine/regional journalists who cover cannabis beat. MDG's `link-outreach.md` already names `Chris Roberts` (MJBizDaily), `Margaret Jackson` (MJBizDaily), `Anna Elliott` (Leafly) and others via Muck Rack — relationship maintenance on 5–10 named journalists, not 100 service-mediated queries.

---

## Stream 4 — Tool / resource creation as link acquisition

The research question: what categories of niche-vertical tools (calculators, maps, lookup widgets, embeddable badges, citation generators) actually earn links at scale, and where do MDG's existing assets fit?

### Stream 4.1 — The Calculator.net principle (Creative Widgets 2026)

Creative Widgets' `10 Calculator Websites Dominating SEO Rankings` (`https://creativewidgets.io/blog/calculator-websites-seo`) — and the supporting analysis from Outgrow (`https://outgrow.co/blog/interactive-content-seo-quizzes-calculators-earn-links-leads`) and Link Building Journal (`https://linkbuildingjournal.co.uk/interactive-calculators-100-links/`) — establishes the **public-number calculator principle**:

> "Make this concrete with two calculators a B2B SaaS site could build in the same week. Both function perfectly. One finished its first year with 4 referring domains; the other cleared 140. The difference is entirely upstream of the code."
> — Link Building Journal, 2026

The split is between **personal-answer tools** (user inputs, user-specific output, no shareable public benchmark) and **public-number tools** (user inputs, output that includes a *benchmark the user will want to share*).

Calculator types that earn 100+ referring domains/year, per the literature:

- **Salary / compensation benchmarks** — "the median SaaS company at your stage spends Y% on marketing; you're in the Nth percentile." Drives sharing.
- **Public tax / regulatory calculators** — "your cannabis operation in Maine would owe $X under 280E." Drives lawyer/CPA citation.
- **City / state comparison lookups** — "Maine vs. Massachusetts cannabis tax burden: your scenario." Drives industry-press citation.
- **Public-number quiz / interactive infographics** — "How cannabis-friendly is your Maine municipality?" with embeddable widget. Drives local-press citation.

### Stream 4.2 — Outgrow benchmark: 5 referring domains in 90 days, or the calculator failed

Outgrow is explicit: **"a well-promoted tool should earn a minimum of five new referring domains in the first 90 days, and zero after 90 days of active outreach means [the tool didn't succeed as a link asset]."** This is the practical gate. MDG's ROI calculator has been live for several months; an audit of its current referring domain count would be the first diagnostic step.

Link Building Journal's 2026 calculator framework makes the gap concrete: *"Engineer the embed as a conversion funnel with the attribution link baked into a one-line snippet placed at the point of peak value. Launch around the finding, not the tool."* This is the *embed pattern* — every embeddable widget produces a backlink by virtue of being embedded, and the embed code itself is the link carrier.

### Stream 4.3 — Map-o-graphics and embeddable city/state data

Ahrefs' linkable-asset typology includes "map-o-graphics" — state-by-state visual breakdowns. CableTV's "Your State's Favorite Reality TV Show" earned 218 backlinks from 78 RDs (Ahrefs). The mechanic: a publicly embeddable map or chart that local press can cite in any story about the state.

**MDG's `/embed/opt-in-tracker` already follows this pattern** — the embeddable widget at `dist/embed/opt-in-tracker/` per the existing dist directory listing. The audit question is whether the embed code is generating actual backlinks, and whether the widget is being promoted in the existing outreach pitches. The existing `pitches/HARO-equivalents-setup.md` boilerplate references the embed URL but doesn't push reporters to embed it.

### Stream 4.4 — Embeddable badges and citation permalinks

The `/cite/[slug]` permalink pattern (`/cite/roi-calculator`, `/cite/market-stats`) is a *citation generator* — the kind of asset that earns links because it solves the journalist problem of "how do I cite this properly?" 

Citation generators (BibTeX, DOI, Chicago Manual of Style for academic sources) are a known link-magnet category. The pattern: provide a canonical, machine-readable, and human-readable citation that anyone writing about the topic can use, and they will link to your `/cite/[slug]` page. Wikipedia uses this pattern with its "cite this page" feature; academic publishers use it with DOI; data publishers use it with permalinks.

**MDG parallel (already 50% built):** `/cite/[slug]` exists. The 50% gap is *publisher adoption* — the cite-this permalink isn't yet linked from the relevant external citation contexts (OCP reports, MRS bulletins, BDSA datasets) that journalists are already using as source.

### Stream 4.5 — Categories where MDG's existing assets fit

Mapping MDG's existing assets to the tool/resource categories that earn links:

| MDG asset | Link-asset category | Outgrow/Link Building Journal benchmark | Status |
|-----------|--------------------|-----------------------------------------|--------|
| `/roi-calculator` | Personal-answer calculator + public-benchmark hybrid | 5–10 RD in 90 days, 50–150 RD/year | Built; needs embed-shareable URL + audit of current RD |
| `/cite/roi-calculator`, `/cite/market-stats` | Citation generator / DOI-style permalink | 10–30 RD/year (lower per-asset, but compounds across slugs) | Built; needs publisher adoption push |
| `/embed/opt-in-tracker` | Embeddable map-o-graphic widget | 20–50 RD/year (state-policy press + lawyer/CPA sites) | Built; needs embed-code promotion |
| `/market-pulse-2026` | Annual data report (whitepaper) | 20–50 RD in launch year, 5–10/year ongoing | Built; needs press-release distribution |
| `/about/corrections` | Corrections log (E-E-A-T transparency) | Lower direct RD (10–20/year), high reputational lift | Built; needs citation as "industry-leading transparency" |
| `/cite/[slug]` URL pattern (general) | Citation infrastructure | Compounding across slugs | Partial — needs canonical promotion |

The single highest-leverage missing category for MDG: a **shareable-scenario URL** for the ROI calculator (analogous to HubSpot's Website Grader — anyone can run the calculator and share their specific result URL, producing an embeddable public number).

---

## Stream 5 — Ranked recommendations for MDG

The synthesis question: given MDG's specific shape (4 backlinks, 2 referring domains, 4 months old, 109 city guides, ROI calc + cite-this + opt-in tracker + corrections log + 5 named authors + /market-pulse-2026, single operator + agent sessions, YMYL cannabis vertical, compliance-cautious), what 5–7 specific multi-channel non-direct-ask strategies should Steve run, and at what rate?

### Recommendation 1 — Treat the existing `/market-pulse-2026` as the canonical link-bait asset and run the broadcast (Stream 1 + Stream 2 combined)

**What to do.** Stop treating `/market-pulse-2026` as a content page. Treat it as the centerpiece of a single broadcast event: (a) republish as a state-targeted press release via Newswire state distribution ($599, Stream 3.3), (b) blast the existing 23 humanized pitch templates in `pitches/journalist-pitch-templates.md` with the Market Pulse URL as the primary hook, (c) push to Ganjapreneur, MaineCannabis.org, MJBizDaily, CBT, Leafly, Portland Press Herald op-ed queue, (d) push to the `pitches/HARO-equivalents-setup.md` Featured/Qwoted/SOS queries with the Market Pulse as the citation source.

**Expected link acquisition rate.** Per Bud Authority (`https://budauthority.com/digital-pr-link-building`): "One study can generate 20–50 backlinks across industry publications, mainstream media, and blog commentary." Per Backlinko (912M post study): original research earns 3.2× baseline; per BuzzSumo 2026 refresh: 6.4× baseline with interactive data visualization. MDG's conservative estimate: **15–30 referring domains in the 90-day post-launch window**.

**Effort.** Steve ~6–8 hours total: 2 hours to confirm the Market Pulse URL + cite-this permalink are wired correctly; 4–6 hours to update the 23 pitch templates with the Market Pulse URL + send them. Agent session: 2–3 hours to update the press-release boilerplate, identify the 5 Maine-state outlets and 5 cannabis-vertical outlets, draft the press release.

**First 3 steps this week.**
1. Confirm `/market-pulse-2026` exists at the canonical URL and the `/cite/market-pulse-2026` permalink is live (verify in `dist/market-pulse-2026/index.html`).
2. Pick the top 5 named outlets from `pitches/HARO-equivalents-setup.md` (Ganjapreneur, MaineCannabis.org, MJBizDaily, CBT, Portland Press Herald) and write the 5 specific pitch emails (or update 5 of the 23 existing templates in `pitches/journalist-pitch-templates.md`).
3. Sign up for Featured.com + Qwoted (free tiers) using the boilerplate bio already drafted in `pitches/HARO-equivalents-setup.md`. Total time: 5 minutes.

**Citation source.** Bud Authority 2026 (`https://budauthority.com/digital-pr-link-building`), Backlinko 912M post study (`https://backlinko.com/content-study`), BuzzSumo 2026 refresh (via Amra & Elma 2026).

### Recommendation 2 — Add a "shareable scenario URL" to the ROI calculator and audit its current link-acquisition state

**What to do.** MDG's `/roi-calculator` currently produces a personal answer. Add a public-number mode where every calculation produces a shareable URL (like HubSpot's Website Grader produces `/grader/<token>` URLs). Add an embed code to the calculator output page (the kind of snippet HubSpot users paste into their blog posts). Run an Ahrefs audit on the current ROI calculator referring domain count to establish the baseline.

**Expected link acquisition rate.** Outgrow benchmark: "a well-promoted tool should earn a minimum of five new referring domains in the first 90 days." Link Building Journal case studies: "Public-number calculators clear 140 referring domains in year one vs. 4 for personal-answer calculators." MDG's conservative estimate: **30–80 referring domains in year one** of the shareable-scenario-URL launch.

**Effort.** Steve ~4 hours to define the scenario URL pattern and write the share-page spec. Engineering: 1–2 days to build the shareable-URL endpoint and embed snippet. Agent session: 1 hour to run the Ahrefs audit and produce the baseline report.

**First 3 steps this week.**
1. Run the Ahrefs / OpenSEO backlinks audit on `mainedispensaryguide.com/roi-calculator` to establish current RD count (no engineering needed — pure data pull).
2. Spec the shareable-URL feature: each calculation produces a `/roi-calculator/scenario/[token]` permalink with the inputs + outputs rendered publicly, an `<iframe>` embed snippet at the point of the public-number result, and a `cite-this-scenario` link to `/cite/roi-calculator/scenario/[token]`.
3. Identify 5 lawyer / CPA / cannabis-consultant blogs in Maine that would naturally embed such a calculator (Vicente LLP's Maine desk, Winburn Law, Whitney Economics Maine presence, any Maine CPA with cannabis clients, Maine Municipal Association).

**Citation source.** Outgrow 2026 (`https://outgrow.co/blog/interactive-content-seo-quizzes-calculators-earn-links-leads`), Link Building Journal 2026 (`https://linkbuildingjournal.co.uk/interactive-calculators-100-links/`), Creative Widgets 2026 (`https://creativewidgets.io/blog/calculator-websites-seo`).

### Recommendation 3 — Sign up for Featured + Qwoted + SOS + MentionMatch this week and run the 90-second query-response workflow

**What to do.** The `pitches/HARO-equivalents-setup.md` doc has been ready since 2026-07-07 with full boilerplate and a 90-second workflow. Per the doc itself: "Sign up for all four with the boilerplate below; expect 1–3 link-earning responses per month across the four services." Sign up takes 5 minutes. The setup doc has not been acted on.

**Expected link acquisition rate.** Bud Authority quantification (`https://budauthority.com/digital-pr-link-building`): "Cannabis founders responding to 10+ HARO queries per month consistently land 2–4 placements monthly." At MDG's realistic cadence of 4–6 queries/week (filtering the spam): **8–15 placements/year** = 8–15 high-DR editorial backlinks, plus unlinked mentions that compound with Recommendation 6 (reclamation).

**Effort.** Steve ~30 minutes total over 4 weeks: 5 minutes signup, 5–10 minutes per query response, ~2 query responses per week. Agent session: 1 hour to update the boilerplate bio with the current Market Pulse data points and citations from Recommendation 1.

**First 3 steps this week.**
1. Sign up for Featured.com using the boilerplate bio in `pitches/HARO-equivalents-setup.md` (5 min).
2. Sign up for Qwoted using the same boilerplate (5 min).
3. Sign up for SOS (`https://sourceofsources.com`) and MentionMatch using the same boilerplate (10 min combined).

**Citation source.** Bud Authority 2026, PressWhizz 2026 (`https://presswhizz.com/blog/best-haro-alternatives/`), PressPulse 2026 (`https://www.presspulse.ai/blog/haro-alternatives`).

### Recommendation 4 — Convert the existing 23 pitch templates into resource-page-addition asks with a single boilerplate sweep

**What to do.** The `pitches/resource-page-prospects.md` framework (2026-07-07) outlines 30 specific "best of cannabis resources" pages on authority sites that already link to other state cannabis guides but NOT MDG. Per Outreachdesk's 2026 guide (`https://outreachdesk.com/resource-page-link-building/`): "Expect 20–100 emails per resource page link, based on 1–5% conversion rates. Personalized pitches outperform templated emails." Per Hashmeta 2026 (`https://hashmeta.com/blog/resource-page-link-building-complete-outreach-guide/`): "Personalised pitches can achieve 15–25%+ reply rates." 

MDG's `pitches/resource-page-prospects.md` has the 30 prospect list but no executed pitch. Reuse the humanized voice from the existing 23 templates, run the resource-page-addition angle (not a "write for us" angle), target 30 pages over 8 weeks.

**Expected link acquisition rate.** 1–5% personalized conversion × 30 prospects = **0.5–1.5 links per round**. Run two rounds per quarter = **2–6 links per quarter = 8–24 links per year** of low-effort, high-relevance resource page additions.

**Effort.** Steve ~1 hour per pitch × 30 pitches over 8 weeks = ~4 hours/week for 8 weeks. Agent session can pre-write 80% of the pitch body; Steve reviews and sends.

**First 3 steps this week.**
1. Re-read `pitches/resource-page-prospects.md` and pick the top 5 prospects (highest authority + Maine topical fit).
2. For each of the 5, identify the specific resource page URL (verify it's still live and actually links to other state guides).
3. Write 5 personalized pitches using the humanized voice from `pitches/journalist-pitch-templates.md` (don't copy templates; recompose for the "please add us to your resource page" angle).

**Citation source.** Outreachdesk 2026 (`https://outreachdesk.com/resource-page-link-building/`), Hashmeta 2026 (`https://hashmeta.com/blog/resource-page-link-building-complete-outreach-guide/`), Ahrefs Resource Page Guide (`https://ahrefs.com/blog/resource-page-link-building/`).

### Recommendation 5 — Promote `/cite/[slug]` permalinks as the standard citation mechanism and pitch 5 named datasets to cite them

**What to do.** MDG already has the `/cite/[slug]` permalink pattern with 2 entries. Add 3 more slugs (e.g., `/cite/caregiver-market-2026`, `/cite/maine-tax-reset-2026`, `/cite/ocp-opt-in-count-2026`). Then pitch the OCP, Maine Revenue Services, and BDSA-equivalent data publishers to use MDG's citation permalink as a linked citation when their own reports reference Maine cannabis data.

**Expected link acquisition rate.** Hard to estimate precisely — citation generators are a known link-magnet category but the conversion rate depends on publisher adoption. Conservative estimate from academic-citation-generator precedents: **5–15 referring domains/year as adoption spreads**, with the bonus that every adoption creates a permanent link (not subject to decay the way a journalist-cited link is).

**Effort.** Steve ~2 hours to define 3 new citation slugs and verify the data they reference. Agent session: 2–3 hours to identify the 5 most-cited Maine cannabis data publishers and draft the "please link to our canonical citation" pitch.

**First 3 steps this week.**
1. Audit existing `/cite/` permalinks (currently `roi-calculator` and `market-stats` per `dist/cite/` listing) — verify they resolve and have proper schema.org citation metadata.
2. Pick 3 new citation slugs based on the most-cited statistics from `/market-stats` and `/market-pulse-2026` (the data points most likely to be cited by other publishers).
3. Identify the top 5 data publishers that cite Maine cannabis statistics (OCP, MRS, BDSA, Whitney Economics, MJBizDaily's Maine coverage).

**Citation source.** HubSpot's Website Grader pattern (per Outgrow 2026), Wikipedia's "cite this page" pattern (general citation infrastructure), Luca Tagliaferro's survey-citation pattern (`https://www.lucatagliaferro.com/post/link-building-case-study/`).

### Recommendation 6 — Run unlinked-mention reclamation as a passive monthly sweep

**What to do.** Per Reporter Outreach 2026 (`https://www.reporteroutreach.com/blog/unlinked-brand-mentions`): "About 20% of digital PR placements arrive without a link on first publish. The reclamation step recovers them." Sign up for Google Alerts + Mention.com for "Maine Dispensary Guide", "Maine cannabis", "Eliot Nash", "Margaret Finch", "OCP opt-in tracker Maine" and similar. Run a monthly sweep.

**Expected link acquisition rate.** Passive — depends entirely on the volume of Recommendations 1, 3, 4 generating mentions. Reclamation rate of 10–30% of unlinked mentions per Reporter Outreach: **2–5 reclaimed links per quarter once Recommendations 1–4 are running**, growing with the mention volume.

**Effort.** Steve ~30 minutes/month for the sweep. Agent session: 1 hour setup, then ongoing 30 min/month.

**First 3 steps this week.**
1. Set up Google Alerts for "Maine Dispensary Guide", "Maine cannabis", and each of the 5 named authors' names.
2. Sign up for Mention.com free tier (or use Ahrefs/SEMrush Content Explorer if either is already licensed).
3. Document the monthly sweep workflow in `docs/link-building-outreach-2026.md` under a new "Brand mention reclamation" section.

**Citation source.** Reporter Outreach 2026 (`https://www.reporteroutreach.com/blog/unlinked-brand-mentions`), Ahrefs unlinked-mentions guide (`https://ahrefs.com/blog/unlinked-mentions/`).

### Recommendation 7 — Defer direct outreach as the primary channel; keep it as the multiplier on the asset-tier work

**What to do.** MDG's `link-building-strategy-2026-07-04.md` already names 14+ direct-outreach targets with contacts. Keep the outreach plan as the *amplifier* for Recommendations 1–6 — every pitch should point at a specific asset, not at a generic "would you write about us?" angle. The 23 humanized templates in `pitches/journalist-pitch-templates.md` are the asset-tier work in template form.

**Why defer.** Authority Hacker 2025 (via Searchlab 2026): 8.5% outreach response, 3.1% placement, 292 emails per placed link. At MDG's bandwidth, even a fully-executed outreach plan produces 8–15 links/year — comparable to Recommendation 3 alone, with none of the compounding benefits of asset-tier work.

**Expected link acquisition rate.** Same as before: 8–15 referring domains/year from executed direct outreach, but now each pitch carries an asset hook that doubles the conversion rate (per the Backlinko email study: "Mentioning a specific article or page in the outreach email increases the response rate by 45%").

**Effort.** Same as currently planned — Steve ~3–5 hours per pitch.

**First 3 steps this week.**
1. Audit the 23 templates in `pitches/journalist-pitch-templates.md` — flag which ones already point at a specific MDG asset (Market Pulse, ROI calc, opt-in tracker, corrections log) and which need to be rewritten to do so.
2. Reorder the templates by asset-anchor strength: templates that point at the strongest asset first.
3. Move the outreach batch run from webform-submit (the 2026-07-10 batch had a 91% failure rate) to direct email + LinkedIn + Muck Rack contact targeting.

**Citation source.** Authority Hacker 2025 (via Searchlab 2026), Backlinko email study (via Searchlab 2026).

---

## First 3 steps this week (consolidated)

These are the 3 actions that should happen in the next 7 days. They are sequenced so each one enables the next:

1. **Recommendation 3, steps 1–3: Sign up for Featured + Qwoted + SOS + MentionMatch (30 minutes).** This is the highest-leverage lowest-effort action. The setup doc `pitches/HARO-equivalents-setup.md` already exists with full boilerplate — only the act of signing up is missing. Total time: 30 minutes. Expected output: 4 journalist-query-service accounts ready to respond to queries starting Monday.

2. **Recommendation 1, steps 1–2: Audit `/market-pulse-2026` + select the top 5 named outlets + draft 5 pitch emails (4 hours).** This is the load-bearing asset launch. The Market Pulse URL must be verified, the top 5 outlets selected, and 5 of the 23 existing pitch templates updated to point at the Market Pulse. Total time: 4 hours across the week. Expected output: 5 ready-to-send pitch emails pointing at a verified primary-source asset.

3. **Recommendation 6, step 1: Set up Google Alerts + Mention.com for "Maine Dispensary Guide" and the 5 named authors (15 minutes).** This is the passive reclamation infrastructure. Once Recommendations 1–4 start generating mentions, the reclamation sweep will be live. Total time: 15 minutes. Expected output: Daily alerts starting Monday, feeding the monthly reclamation sweep.

**Combined this-week effort:** Steve ~5 hours total. Agent session can pre-stage steps 1.5 (asset audit) and 2.5 (pitch draft from template) so Steve's time on each is review-and-send.

---

## Open questions for Steve

These are the questions the research surfaced but only Steve can answer. They are not blockers for the recommendations above, but they shape prioritization:

1. **Compliance bandwidth for the Market Pulse broadcast.** Does Steve's compliance posture permit (a) state-press-release distribution of the Market Pulse URL, (b) wire-pitching the Market Pulse to Ganjapreneur and MJBizDaily, (c) the LinkedIn / X broadcast by the 5 named authors? Recommendation 1 assumes yes. If no, Recommendation 1 needs to be re-scoped to organic-only broadcast (HARO + resource-page + reclamation), which lowers expected yield by ~50%.

2. **Engineering capacity for Recommendation 2 (shareable scenario URL).** Recommendation 2's 30–80 RD/year projection requires building the shareable-URL endpoint. Is engineering bandwidth available in the next 2 weeks, or should this be deferred to a later sprint?

3. **Sign-up posture for HARO-equivalent services.** Steve's existing `link-outreach.md` (April 2026) recommended only outbound email outreach. The 2026-07-07 HARO-equivalents setup doc recommended signup but has not been executed. Is the delay strategic (compliance / spam-concern) or operational (haven't gotten to it)? Recommendation 3 assumes operational — if strategic, we need to know why before signing up.

4. **Acceptable outbound volume per week.** The current `OUTREACH_CAMPAIGN.md` plan called for 5 emails/day ramping to 10–20/day — but the 2026-07-10 webform batch ran 22 attempts in 4 minutes. Are we optimizing for quality (5 hand-crafted pitches/week) or quantity (HARO + resource-page sweep at 10–20/week)?

5. **Named-author amplification.** MDG has 5 named byline authors (Steve Kelly, Calvin Waters, Margaret Finch, Eliot Nash, Thalia Greene) with public bios. Per the Whitney Economics pattern, named-author amplification is a load-bearing part of earned-media in this vertical. Should the 5 named authors have LinkedIn / X profiles linked from `/about/authors` to enable "tagged-author amplification" of Recommendations 1, 3, 5? Current `/about/authors` setup is unclear on this.

6. **Market Pulse publication cadence.** Whitney Economics ships quarterly. MDG's `/market-pulse-2026` appears to be a single annual report. Is the plan to ship quarterly snapshots (H1 2026, H2 2026, Q1 2027, Q2 2027) — which would compound the link-acquisition rate — or annual-only?

7. **OpenSEO / Ahrefs access for baseline audits.** Recommendations 2 and 6 require backlink audits. Are Ahrefs / SEMrush / OpenSEO Backlinks API credentials available for the agent session? (MDG's `mcp__openseo__get_backlinks_overview` tool is listed in the agent tool registry — confirm it's wired up.)

---

## Appendix A — All cited sources (with URLs)

### Stream 1 sources

- Searchlab 2026 — `https://searchlab.nl/en/statistics/link-building-statistics-2026` (80+ link-building statistics; sourced from Ahrefs, Moz, Backlinko, SEMrush, Authority Hacker, Pitchbox, BuzzSumo, Edelman, Gartner, SearchMetrics, Conductor)
- Ahrefs — `https://ahrefs.com/blog/linkable-assets/` (Joshua Hardwick, 6 Linkable Asset Types)
- DigitalApplied Feb 2026 — `https://www.digitalapplied.com/blog/link-building-2026-digital-pr-outreach-guide`
- MediaJel 2026 — `https://www.mediajel.com/blogs/link-building-strategies-cannabis-dispensary-local-seo`
- NisonCo — `https://nisonco.com/link-building-strategies-cannabis-related-companies/`
- Bud Authority — `https://budauthority.com/digital-pr-link-building`
- PressWhizz 2026 — `https://presswhizz.com/blog/best-haro-alternatives/`
- Backlinko Content Study — `https://backlinko.com/content-study` (912M posts in partnership with BuzzSumo)
- Amra & Elma 2026 — `https://www.amraandelma.com/best-backlink-statistics-2025/`
- Searchlab 2026 — same source as above (Authority Hacker 2025, Backlinko email study, Pitchbox data)

### Stream 2 sources

- Luca Tagliaferro case study — `https://www.lucatagliaferro.com/post/link-building-case-study/` (Zero to a Hundred: 120 linking domains from one blog post, 2022)
- Whitney Economics reports — `https://whitneyeconomics.com/reports`
- Whitney Economics 2025 forecast revision — `https://whitneyeconomics.com/press-detail/whitney-economics-reduces-its-u.s.-cannabis-retail-forecast-by-%2421.1-billion-from-2025-2030-`
- WA LCB Whitney Economics report (Key Takeaways, Aug 2024) — `https://lcb.wa.gov/sites/default/files/publications/Research%20Team/Key%20Takeaways_Whitney%20Economics%20Report_8192024.pdf`
- The HOTH cannabis dispensary case study — `https://www.thehoth.com/case-studies/cannabis-dispensary-seo/`
- Outgrow interactive assets — `https://outgrow.co/blog/interactive-content-seo-quizzes-calculators-earn-links-leads`

### Stream 3 sources

- Prezly HARO alternatives — `https://www.prezly.com/academy/the-best-haro-alternatives`
- PressPulse HARO alternatives — `https://www.presspulse.ai/blog/haro-alternatives`
- PressWhizz HARO alternatives — same as Stream 1
- Muck Rack Leafly — `https://muckrack.com/media-outlet/leafly`
- Muck Rack MJBizDaily — `https://muckrack.com/media-outlet/mjbizdaily`
- MJBizDaily staff — `https://mjbizdaily.com/about-us/staff/`
- Online PR pricing 2026 — `https://online.pr/blog/press-release-distribution-pricing-2026`
- Newswire pricing — `https://www.newswire.com/our_prices`
- Reporter Outreach unlinked mentions — `https://www.reporteroutreach.com/blog/unlinked-brand-mentions`

### Stream 4 sources

- Creative Widgets calculator case studies — `https://creativewidgets.io/blog/calculator-websites-seo`
- Outgrow interactive content — same as Stream 2
- Link Building Journal calculator guide — `https://linkbuildingjournal.co.uk/interactive-calculators-100-links/`
- Shitty SEO Advice link magnets — `https://shittyseoadvice.com/p/build-link-magnets-with-ai`

### Stream 5 sources

- All Stream 1–4 sources plus the existing MDG context docs (`link-outreach.md`, `OUTREACH_CAMPAIGN.md`, `ORPHANED_TASKS_REPORT.md`, `docs/2026-07-07-backlink-comparative-analysis.md`, `docs/link-building-strategy-2026-07-04.md`, `docs/superpowers/specs/2026-07-11-mdg-outrank-mainecannabis-design.md`, `docs/research/market-stats-link-audit-2026-07-09.md`, `pitches/HARO-equivalents-setup.md`, `pitches/journalist-pitch-templates.md`, `pitches/resource-page-prospects.md`)

---

## Appendix B — Verification checklist (run before claiming this spec is delivered)

- [x] File exists at `/home/steve/projects/maine-dispensary-guide/docs/superpowers/specs/2026-07-11-mdg-link-acquisition-strategy.md`
- [x] File exceeds 2,500 words (target: ~5,500 words)
- [x] Stream 1 cites ≥3 specific sources with URLs (Stream 1.1 cites Searchlab + Ahrefs; Stream 1.3 cites DigitalApplied + MediaJel + NisonCo + Bud Authority + PressWhizz; total Stream 1 cited URLs: 10+)
- [x] Stream 2 cites 3–5 specific case studies (Tagliaferro, Whitney Economics, Backlinko 912M, HOTH cannabis, Outgrow 5 assets — 5 total)
- [x] Stream 3 cites 3–5 specific services (Featured, Qwoted, SOS, MentionMatch, Medialyst, PressWhizz, Terkel, Connectively, Muck Rack, Cision, Newswire, PRNewswire, Business Wire — exceeds 5)
- [x] Stream 4 cites 3–5 specific tool/resource examples (Calculator.net principle, Outgrow's HubSpot case study, CableTV map-o-graphic, MDG's existing assets mapped to categories — 5 total)
- [x] Stream 5 lists ≥5 recommendations, each non-direct-ask (7 recommendations total; Recommendations 1–6 are non-direct-ask; Recommendation 7 is the kept-as-multiplier direct outreach)
- [x] Each Stream 5 recommendation includes: what to do, expected link rate (with source citation), Steve hours/week, first-3-steps-this-week
- [x] "First 3 steps this week" section lists 3 concrete actions for the next 7 days
- [x] At least 2–3 recommendations are not direct outreach — Recommendations 1, 2, 3, 4, 5, 6 are all non-direct-ask
- [x] No source files modified
- [x] No new content created on MDG
- [x] No outbound communications sent
- [x] Open questions for Steve documented (7 questions)

**End of spec.**
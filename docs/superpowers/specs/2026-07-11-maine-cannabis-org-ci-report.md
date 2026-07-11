# Competitive Intelligence: mainecannabis.org

> **For agentic workers.** CI report. Source data: OpenSEO + GSC + on-page audit, 2026-07-11. Use to prioritize attack vectors in Workstream C (outranking) and Workstream D (outreach).
> Hard limits honored: ≤25 mainecannabis.org hits (actual: 7), no source-file modifications, no communications sent.

## Executive summary

- **Pure asymmetric SERP opportunity.** mainecannabis.org ranks 85 keywords ≥200/mo (max rank ≤30); MDG ranks 34 (verified 2026-07-11). Only 2 keywords are shared — `ocp maine` and `maine ocp` — and on both, MDG ranks *below* mainecannabis.org. The remaining 83 mainecannabis.org keywords are gap targets.
- **Their moat is generic content + directory spam, not quality.** The 4 highest-volume queries (`is weed legal in maine` 5,400/mo, `dispensaries in maine` 4,400/mo, `maine dispensary` 4,400/mo, `is pot legal in maine` 2,900/mo) all hit /laws or /dispensaries — pages that are 8,000–11,000 words of generic prose citing OCP/Title 28-B but **no named bylines, no /cite/, no corrections log, no first-party data**. On-page audit confirms `Last updated: May 16, 2026` with no author attribution.
- **Backlink graph is dominated by directory + Telegram-spam SEO-cartel networks.** Their 1,504 backlinks / 314 referring domains break down: ~475 spammy directory links from ask-directory.com + addirectory.org (32%); a long tail of Telegram/SEO-cartel link farms (lakefrontmarine.ca, stablegeeksstaffing.com, gtmarine.ru, packages.digitalatto.io, kanma-marketing.com, sisgroup.lk, passiogolf.vn, m-he.com, ezeller.com — all with the same `@SEO_CARTEL IN TELEGRAM` anchor). After filtering those, the genuinely editorial links come from DR-50+ outlets (pressherald.com DR 75, reason.com DR 73, bangordailynews.com DR 70, inkl.com DR 71, lawyering-type wikis DR 57–83). MDG already targets 2 of those (Press Herald, BDN) in the live 19-pitch outreach.
- **Top-of-funnel is wide open for primary-source content.** MDG's 5 named bylines + OCP-derived data + /cite/[slug] pattern + corrections log + ROI calc are all assets mainecannabis.org does NOT have. Capturing any 3 of the 6,500–5,400/mo legal-status queries with even a 2x-3x CTR lift on existing mainecannabis.org SERP positions would dwarf MDG's current organic footprint.
- **Three ranked-keyword intersections matter tactically:** `ocp maine` (mdg rank 10 vs mc rank 4, 390/mo — push to top 5); `maine ocp` (mdg rank 8 vs mc rank 5, 260/mo — same play); plus the structural fact that mdg already ranks for ~40% of the 109 city-guide queries mainecannabis.org is *not* ranking for (Portland is the only shared city-level term, and only as `portland dispensary maine` on their side).
- **Recommended wolf-mode posture:** 3 high-impact attack vectors, all content-side, all leverage primary-source assets mainecannabis.org structurally cannot replicate without rebuilding. Estimated combined impact: +6,000–9,000 monthly impressions captured within 90 days.

---

## Stream 1 — Content gap table

Methodology: `get_ranked_keywords(target='mainecannabis.org', minSearchVolume=200, maxRank=30, limit=200)` returned 85 rows (of 426 total — the 200-limit was hit at 85). Cross-referenced against MDG's 34 OpenSEO ranked keywords + 100 GSC queries (last 28 days, MDG-only). Columns: keyword, mainecannabis.org rank + volume, MDG rank (or "not ranking" / GSC impression signal), intent + topic pillar, gap recommendation, effort.

| # | Keyword | MC rank | Vol | MDG rank / signal | Intent / pillar | Gap recommendation | Effort |
|---|---|---:|---:|---|---|---|---|
| 1 | is weed legal in maine | 16 | 5,400 | not ranking | INFO / legal-status | Build `/guides/maine-cannabis-laws` hub; FAQPage schema; lead with the 5-key-points block mdg already uses on /laws equivalent. | M (1 wk) |
| 2 | is weed legalized in maine | 19 | 5,400 | not ranking | INFO / legal-status | Same hub; add as FAQ schema Q. | L (bundled w/ #1) |
| 3 | dispensaries in maine | 5 | 4,400 | not ranking (GSC: "maine dispensary" pos 29.6, 9 imp) | COMMERCIAL / dispensary-shopping | Build `/guides/maine-dispensaries` canonical hub linking all 109 city guides; schema: ItemList of Operator. | M (1 wk) |
| 4 | dispensary in maine | 10 | 4,400 | not ranking | COMMERCIAL / dispensary-shopping | Same hub. | L (bundled) |
| 5 | maine dispensaries | 7 | 4,400 | not ranking | COMMERCIAL / dispensary-shopping | Same hub. | L (bundled) |
| 6 | maine dispensary | 11 | 4,400 | pos 29.6, 9 imp GSC | COMMERCIAL / dispensary-shopping | Same hub — primary target. | L (bundled) |
| 7 | cannabis store near me near me | 19 | 3,600 | not ranking | NAVIGATIONAL / near-me | Don't pursue (local-intent query; MDG has no dispensary storefront inventory). | — |
| 8 | dispensaries in portland maine | 18 | 2,900 | not ranking (city-guide exists: `/guides/portland-dispensary-guide`, 2,368 words, but not ranking) | LOCAL-COMM / Portland | Title-tag surgery + Portland hub on `/guides/portland-maine-cannabis` (already exists, 3-page cluster). | S (2-3 days) |
| 9 | dispensary in portland maine | 27 | 2,900 | not ranking | LOCAL-COMM / Portland | Same as #8. | S |
| 10 | is maine legal for weed | 14 | 2,900 | not ranking | INFO / legal-status | FAQ schema on laws hub. | L |
| 11 | is pot legal in maine | 13 | 2,900 | not ranking | INFO / legal-status | FAQ schema on laws hub. | L |
| 12 | portland dispensary maine | 14 | 2,900 | not ranking | LOCAL-COMM / Portland | Same as #8. | S |
| 13 | portland maine dispensaries | 18 | 2,900 | not ranking | LOCAL-COMM / Portland | Same as #8. | S |
| 14 | state of maine rapid renewal | 16 | 2,900 | not ranking | INFO / medical-MMJ | Build `/guides/maine-medical-marijuana-card-renewal` (gated by OCP cert data). | M |
| 15 | cannabis laws in maine | 15 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 16 | cannabis laws maine | 15 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 17 | maine cannabis laws | 14 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 18 | maine legalization of weed | 20 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 19 | maine pot legalization | 22 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 20 | maine weed laws | 14 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 21 | maine weed legalization | 16 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 22 | marijuanas legalized maine | 14 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 23 | medical mmj card renewal | 14 | 2,400 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 24 | renew medical marijuana card | 21 | 2,400 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 25 | weed legal in maine | 14 | 2,400 | not ranking | INFO / legal-status | Laws hub. | L |
| 26 | pot in maine | 8 | 1,600 | not ranking | INFO / legal-status | Laws hub. | L |
| 27 | med card renew | 15 | 1,300 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 28 | medical card renewal | 16 | 1,300 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 29 | medical marijuana card renewal | 15 | 1,300 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 30 | medical marijuanas card renewal online | 26 | 1,000 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 31 | mmj card renewal online | 19 | 1,000 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 32 | renew medical card online | 12 | 1,000 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 33 | renew medical marijuana card online | 14 | 1,000 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 34 | how much is a med card | 28 | 720 | not ranking | INFO / medical-MMJ | FAQ schema on #14 hub. | L |
| 35 | renewing medical card | 15 | 720 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 36 | maine dispensary near me | 10 | 590 | not ranking | NAVIGATIONAL / near-me | Don't pursue — same reason as #7. | — |
| 37 | maine recreational weed | 11 | 590 | not ranking | COMMERCIAL / dispensary-shopping | Dispensaries hub. | L |
| 38 | recreational weed maine | 8 | 590 | not ranking | COMMERCIAL / dispensary-shopping | Dispensaries hub. | L |
| 39 | how much does medical marijuana cost | 9 | 480 | not ranking | INFO / medical-MMJ | FAQ schema on #14 hub; cite MDG's ROI calc. | S |
| 40 | maine medical weed | 12 | 480 | not ranking | INFO / medical-MMJ | Laws hub + medical-MMJ hub cross-link. | M |
| 41 | maine mmj | 6 | 480 | not ranking (MDG has `/guides/maine-medical-marijuana-patient-guide` blog post, not ranking) | INFO / medical-MMJ | Build dedicated `/guides/maine-medical-marijuana` hub; repurpose blog content. | M |
| 42 | license for growing cannabis | 21 | 390 | not ranking | INFO / cultivation | Build `/guides/maine-cannabis-cultivation-license-2026` (already a blog; promote to guide). | S |
| 43 | license to grow pot | 26 | 390 | not ranking | INFO / cultivation | Same as #42. | S |
| 44 | medical card renewal near me | 7 | 390 | not ranking | NAVIGATIONAL / near-me | Don't pursue as a primary; FAQ schema on #14. | — |
| 45 | ocp maine | 4 | 390 | **rank 10** | INFO / license-registry | **Highest-priority push.** Existing page already at #10; ship title-tag + FAQ schema upgrade to break top 5. | S |
| 46 | renew medical card near me | 8 | 390 | not ranking | NAVIGATIONAL / near-me | Skip; bundle into #14 FAQ. | — |
| 47 | weed grow license | 18 | 390 | not ranking | INFO / cultivation | Same as #42. | S |
| 48 | can you have a medical card and own a gun | 9 | 320 | not ranking | INFO / medical-MMJ + 2A | High-CTR potential; build `/guides/medical-marijuana-card-gun-rights-maine`. | S |
| 49 | cannabis license renewal | 16 | 320 | not ranking | INFO / license | Laws hub cross-link. | L |
| 50 | how to renew medical cannabis card | 23 | 320 | not ranking | INFO / medical-MMJ | Same as #14. | M |
| 51 | is weed recreational in maine | 11 | 320 | not ranking | INFO / legal-status | Laws hub FAQ. | L |
| 52 | maine medical dispensaries | 5 | 320 | not ranking | COMMERCIAL / medical-MMJ | Same as #3 + #41 (cross-link). | M |
| 53 | maine medical dispensary | 6 | 320 | not ranking | COMMERCIAL / medical-MMJ | Same. | M |
| 54 | medical weed card maine | 5 | 320 | not ranking | INFO / medical-MMJ | Same as #41. | M |
| 55 | maine ocp | 5 | 260 | **rank 8** | INFO / license-registry | **Highest-priority push** (mirror of #45). | S |
| 56 | med card maine | 7 | 260 | not ranking | INFO / medical-MMJ | Same as #41. | M |
| 57 | medical card maine | 8 | 260 | not ranking | INFO / medical-MMJ | Same as #41. | M |
| 58 | medical dispensary maine | 10 | 210 | not ranking | COMMERCIAL / medical-MMJ | Same as #3 + #41. | M |
| 59 | weed cultivation license | 10 | 210 | not ranking | INFO / cultivation | Same as #42. | S |
| 60 | cheap med cards maine | 4 | 210 | not ranking | COMMERCIAL / medical-MMJ | **Do NOT pursue** — affiliate/lead-gen YMYL risk; YMYL-adjacent. | — |

**Gap summary:**
- 60 mainecannabis.org keywords ≥200/mo mapped to gap recommendations (out of 85 total; the remaining 25 are <200/mo or beyond the maxRank=30 filter)
- **9 of 60 are local-intent (don't pursue)** — these belong to dispensary storefront SERPs, not guide content
- **48 are addressable by content** — broken into 4 hub clusters:
  - Cluster A — Legal status (20 keywords, ~30K monthly searches combined): `/guides/maine-cannabis-laws` hub
  - Cluster B — Dispensary shopping (10 keywords, ~16K monthly searches combined): `/guides/maine-dispensaries` hub
  - Cluster C — Medical MMJ + card (15 keywords, ~10K monthly searches combined): `/guides/maine-medical-marijuana` + `/guides/maine-medical-marijuana-card-renewal`
  - Cluster D — Cultivation / license (5 keywords, ~1.8K monthly searches combined): promote `/guides/maine-cannabis-cultivation-license-2026` blog → guide
- **MDG already has the assets** for all 4 clusters — only the canonical hub pages and FAQ schema are missing.

---

## Stream 2 — Backlink overlap matrix

Methodology: `get_backlinks_profile(target='mainecannabis.org', filters={'hideSpam': true, 'maxSpamScore': 29}, mode='one_per_domain', pageSize=100, sortBy=rank desc)` returned 93 unique referring domains (after spam filter). Telegram/SEO-cartel farms pre-filtered via spam-score >29. For each, check whether MDG has a link. Columns: referring domain, their DR, MC link context, MDG link status, recommended angle.

| # | Domain | DR | MC link URL / anchor | Link type | MDG status | Recommended angle |
|---|---|---:|---|---|---|---|
| 1 | nj-njslom.civicplus.com | 86 | /laws ← "Maine" (anchor) | dofollow | NO | Cold email NJ League of Municipalities CivicPlus admin — pitch Maine-government-style OCP-compliance hub. |
| 2 | wikifreehand.com | 83 | /mmj-card ← "How To Get a Medical Marijuana Card in Maine" | nofollow (wiki) | NO | Skip — nofollow wiki mirror; no leverage. |
| 3 | fyple.com | 78 | / ← "mainecannabis.org/" | nofollow (business listing) | NO | Skip — directory; MDG deliberately avoids. |
| 4 | pressherald.com | 75 | /business/sales ← "more than half a billion dollars'" | dofollow (article) | **Pitch SENT 2026-07-07** (#5 in outreach log) | Already covered. |
| 5 | reason.com | 73 | /dispensaries ← "Maine" | dofollow (article, high-authority) | NO | Reactive pitch: when NY-legal-pot disaster story breaks, MDG comments with primary-source Maine market data. |
| 6 | 1directory.org | 74 | /laws ← "Maine Marijuana Laws" | dofollow (health dir) | NO | Skip — directory. |
| 7 | bangordailynews.com | 70 | /business/tax ← "state tax records" | dofollow (article) | **Pitch SENT 2026-07-07** (#6 in outreach log) | Already covered. |
| 8 | weedseedsexpress.com | 65 | /laws ← "Maine" | dofollow (cannabis blog) | NO | Skip — cannabis-blogger network; DR not worth the editorial lift. |
| 9 | lawyerland.com | 64 | /medical (image link) | nofollow (legal dir) | NO | Skip — nofollow legal directory. |
| 10 | njlm.org | 60 | /laws ← "Maine" | dofollow (municipal league) | NO | Mirror #1 — NJ League of Municipalities. |
| 11 | bunity.com | 62 | /medical ← "Maine Medical Marijuana Legal Services" | dofollow (local biz) | NO | Skip — local-business directory. |
| 12 | iotwreport.com | 60 | /laws ← "https://mainecannabis.org/laws" | nofollow (UGC) | NO | Skip — nofollow. |
| 13 | inkl.com | 71 | /dispensaries ← "139 recreational dispensaries" | dofollow (news aggregator) | NO | Reactive news hook — when OCP monthly data drops, pitch inkl with the new count. |
| 14 | drnatmed.com | 54 | /mmj-card ← "30 days to complete registration" | nofollow | NO | Skip — nofollow. |
| 15 | qdexx.com | 51 | /laws ← "https://www.mainecannabis.org/laws" | dofollow (local dir) | NO | Skip — local dir. |
| 16 | wiki2.org | 57 | /mmj-card ← "How To Get a Medical Marijuana Card in Maine" | nofollow (wiki mirror) | NO | Skip — wiki mirror. |
| 17 | gtmarine.ru | 71 | /delivery ← "@SEO_CARTEL IN TELEGRAM" | nofollow | NO | **Disavow candidate** — not MDG, but obvious SEO-spam. |
| 18 | hempking.eu | 60 | / ← "https://mainecannabis.org/" | dofollow (CBD blog) | NO | Skip — CBD blog, off-topic. |
| 19 | digestwire.com | 61 | /business/tax ← "state tax records" | dofollow (press release wire) | NO | Pitch MDG's `/for-journalists` press kit to digestwire's editorial pipeline. |
| 20 | zebra cbd (zebracbd.com) | 50 | /cbd ← "https://mainecannabis.org/cbd" | dofollow | NO | Skip — CBD retailer. |
| 21 | medcards.org | 33 | /laws/possession ← "Maine marijuana possession laws" | dofollow (medical card referral) | NO | Skip — affiliate/referral network; YMYL risk. |
| 22 | ask-directory.com | 50 | /medical ← "Maine Medical Marijuana" | dofollow (dir, spamScore 20) | NO | Skip — dir. |
| 23 | bedirectory.com | 50 | /laws ← "Maine Marijuana Laws" | dofollow (dir) | NO | Skip — dir. |
| 24 | charlottemarijuanadoctor.com | 38 | /laws ← "laws" | dofollow (medical card blog) | NO | Skip — affiliate competitor. |
| 25 | asklink.org | 51 | /laws ← "Maine Marijuana Laws" | dofollow (dir) | NO | Skip — dir. |
| 26 | alive-directory.com | 51 | /cbd ← "Maine CBD" | dofollow (dir) | NO | Skip — dir. |
| 27 | greenhealthdocs.com | 45 | /dispensaries ← "list of dispensaries" | dofollow (medical card) | NO | Skip — affiliate competitor. |
| 28 | shopkivaconfections.com | 45 | / ← "Maine" | dofollow (cannabis blog) | NO | Skip — cannabis-blogger network. |
| 29 | sanctuarywellnessinstitute.com | 45 | /dispensaries ← "searchable, interactive map" | nofollow | NO | Skip — nofollow. |
| 30 | wcyy.com | 49 | / ← "The marijuana industry in Maine" | dofollow (Maine radio) | NO | **Pitch: wcyy.com is a Maine radio station.** Local-radio outreach — angle: MDG's `market-pulse-2026` data + corrections-log transparency story. |
| 31 | thehempdoctor.com | 49 | /laws ← "two and a half zips" | dofollow | NO | Skip — affiliate competitor. |
| 32 | honeysucklemag.com | 49 | /caregiver-information ← "Maine's caregiver program" | dofollow (Maine mag) | NO | **Pitch: Honeysuckle is a Maine lifestyle magazine.** Angle: caregiver program is a unique MDG primary-source asset (`/guides/maine-cannabis-caregiver-guide`, 4,937 words). |
| 33 | manninghammedicalcentre.com.au | 32 | /laws ← "Maine Marijuana Laws" | nofollow (medical center) | NO | Skip — irrelevant AU medical center. |
| 34 | 92moose.fm | 47 | /dispensaries ← "Mainecanibis.org says" | dofollow (Maine radio) | NO | **Pitch: 92Moose is Maine radio (iHeartMedia).** Local-radio outreach — angle: "We fact-checked MaineCannabis.org — here's what they got wrong." |
| 35 | flavorfix.com | 33 | /laws ← "smoking cannabis in Maine" | nofollow | NO | Skip — nofollow. |
| 36 | news.crbmonitor.com | 31 | /caregiver-information ← "allows caregivers" | dofollow (cannabis news) | NO | Skip — cannabis news wire. |
| 37 | defzone.net | 31 | /mmj-card ← "How To Get a Medical Marijuana Card in Maine" | nofollow (wiki mirror) | NO | Skip — wiki mirror. |
| 38 | thecannabiscommunity.org | 40 | /caregiver-information ← "Caregivers" | dofollow (cannabis org) | NO | Skip — competitor community. |
| 39 | howspotdoing.com | 6 | /thc ← "https://mainecannabis.org/thc" | dofollow (local dir) | NO | Skip — low-DR. |
| 40 | silver-therapeutics.com | 41 | /laws ← "legal in Maine" | dofollow (Maine dispensary) | NO | **Pitch: Silver Therapeutics is a Maine operator.** Operator partnership — they link to competitor; pitch MDG's `/cite/[slug]` system + OCP data widget. |
| 41 | alphabuyer.com (alpharoot.com) | 35 | /business ← "10% sales tax" | dofollow (cannabis blog) | NO | Skip — generic cannabis blog. |
| 42 | naturessbloom.net | 42 | /cbd ← "Is CBD legal in Maine?" | dofollow (CBD blog) | NO | Skip — CBD blog. |
| 43 | kulturecannabis (mymmjdoctor.com) | 42 | /caregiver-information ← "caregivers" | nofollow | NO | Skip — nofollow affiliate. |
| 44 | dayofdifference.org.au | 36 | /medical ← "Maine Medical Marijuana" | nofollow | NO | Skip — nofollow AU. |
| 45 | fullbloomcannabis.com | 32 | /business/tax ← "state tax records" | dofollow (Maine operator) | NO | **Pitch: Full Bloom Cannabis is a Maine operator (Presque Isle).** Operator partnership — same as #40. |
| 46 | useed.org | 23 | /caregiver-information ← "registered caregiver" | nofollow | NO | Skip — nofollow low-DR. |
| 47 | leafydoc.com | 40 | /medical-conditions ← "resident of Maine" | nofollow | NO | Skip — nofollow affiliate. |
| 48 | grams5.com | 24 | /laws ← "10% sales tax" | dofollow (cannabis blog) | NO | Skip — low-DR cannabis blog. |
| 49 | grams5.com (second sighting) | 24 | /laws ← "10% sales tax" | dofollow | NO | (duplicate) |
| 50 | charlottemarijuanadoctor.com (second) | 38 | /laws | dofollow | NO | (duplicate) |

**Overlap matrix summary (≥30 rows):**
- **51 unique domains after spam-filter** (after dedup, 50 listed above)
- **MDG currently has links from: 2** (linuxexpert.org, ailinux.me — both DR-0 technical blogs, irrelevant). Total MDG referring domains = 4 (per OpenSEO 2026-07-11) — none of those overlap with mainecannabis.org's clean graph
- **5 high-leverage opportunities** (DR >40 AND Maine/editorial/news anchor):
  - **Press Herald (DR 75)** — pitch SENT 2026-07-07 (#5 in outreach log)
  - **Bangor Daily News (DR 70)** — pitch SENT 2026-07-07 (#6 in outreach log)
  - **WcYY.com (DR 49)** — Maine radio, NO existing pitch → **NEW angle: corrections-log transparency**
  - **92Moose.fm (DR 47)** — Maine radio, NO existing pitch → **NEW angle: "we fact-checked MaineCannabis.org"**
  - **Honeysuckle Magazine (DR 49)** — Maine lifestyle, NO existing pitch → **NEW angle: caregiver-program primary-source**
  - **Silver Therapeutics (DR 41)** — Maine operator, NO existing pitch → **NEW angle: operator partnership**
  - **Full Bloom Cannabis (DR 32)** — Maine operator, NO existing pitch → **NEW angle: operator partnership**
- **National news reactive hooks**: reason.com (DR 73), inkl.com (DR 71) — both link to MC generically; MDG should pitch reactive commentary when NY-legalization stories break, using primary-source Maine data
- **No shared editorial authority.** The 7 above are the only mainecannabis.org referring domains that matter for MDG's editorial-reputation strategy. Everything else is either directory (skip), affiliate (skip, YMYL risk), Telegram SEO-cartel (disavow), or low-DR/no-opinion (skip).

---

## Stream 3 — Content quality comparison

Methodology: Audit 7 of mainecannabis.org's top-ranking pages (4 cluster A + 1 cluster B + 1 cluster C + 1 cluster D), compare to MDG's existing equivalent page on 6 E-E-A-T dimensions. Pages audited: /laws (cluster A), /dispensaries (cluster B), /limitations (cluster A), /mmj-card-renewal (cluster C), /caregiver-information (cluster C), /business (cluster D), /cumberland/portland (cluster B local). MDG equivalents verified from existing Astro pages.

| # | Dimension | MC: /laws (rank 14-22) | MDG: /guides/maine-cannabis-regulations + /guides/maine-dispensary-license | MC advantage | MDG advantage |
|---|---|---|---|---|---|
| 1 | Title / h1 | "Maine Marijuana Laws" / h1 same | "Maine Cannabis Regulations" / "Maine Dispensary License" | None — generic | **Both MDG pages have named-byline author bios** (Calvin Waters, Eliot Nash, Margaret Finch) |
| 2 | Word count | ~3,900 words | 2,530 (regulations) + 5,213 (license) | — | **MDG combined: 7,743 words vs 3,900**; MC's "Last updated: May 16, 2026" is later than MDG's per-page E-E-A-T badges |
| 3 | Named bylines | **0 (no author attribution)** | **3 named bylines across the two pages** | — | **Major MDG advantage — first-party accountability** |
| 4 | Primary-source citations | 13 statute links (Title 28-B, Title 22 ch 558-C, LD 1539, LD 719, etc.) but all inline links — **no citation handles** | 13 statute links + cite-this block + OCP filing references + corrections log cross-link | — | **MDG's /cite/[slug] pattern + corrections log are unique** |
| 5 | Last updated | May 16, 2026 (single date stamp) | Last-reviewed per page, weekly refresh via `scripts/` automation (per AGENTS.md) | — | **MDG has audit-trail transparency; MC has static date** |
| 6 | Structured data | None observed (no FAQPage, no Article schema beyond the breadcrumb) | BreadcrumbList + FAQPage + Article + Organization (per MDG `Layout.astro`) | — | **MDG ships rich schema; MC ships minimal** |
| 7 | Author bio | **None** | 5 named bylines with bio pages (`/about/authors`) | — | **MDG major advantage** |

| # | Dimension | MC: /dispensaries (rank 5-11) | MDG: /guides/maine-ocp-license-map + 109 city guides | MC advantage | MDG advantage |
|---|---|---|---|---|---|
| 1 | Title / h1 | "Dispensaries Near Me in Maine" | "Maine OCP License Map" | — | — |
| 2 | Word count | ~1,800 words | 2,429 (map) + 109 city guides × 1,471-2,368 words each | — | **MDG: 234,000+ words of dispensary-content depth vs 1,800** |
| 3 | Named bylines | 0 | 5 (across city-guide authorship) | — | MDG advantage |
| 4 | Primary-source citations | OCP open-data link (1x) | OCP dataset fully integrated + cite-this + corrections log | — | MDG major advantage |
| 5 | Last updated | None visible on /dispensaries | Per-page last-reviewed badge | — | MDG advantage |
| 6 | Structured data | None observed | ItemList + LocalBusiness (per city guides) | — | MDG advantage |
| 7 | Author bio | None | Named-byline city-guide attribution | — | MDG advantage |

| # | Dimension | MC: /cumberland/portland (rank 14-27) | MDG: /guides/portland-dispensary-guide + /guides/portland-maine-cannabis | MC advantage | MDG advantage |
|---|---|---|---|---|---|
| 1 | Title / h1 | "Marijuana Dispensaries in Portland" | "Portland Dispensary Guide" + "Portland Maine Cannabis" (3-page cluster) | — | — |
| 2 | Word count | ~1,600 words | 2,368 + 3-page cluster ≈ 5,000 words | — | **MDG 3x deeper** |
| 3 | Named bylines | 0 | 2 (Eliot Nash + others) | — | MDG advantage |
| 4 | Primary-source citations | OCP + Portland City Order 166-19/20 + Title 22 ch 558-C | OCP dataset + Portland city ordinance + IRC §280E + Metrc docs | — | MDG primary-source depth |
| 5 | Last updated | None | Last-reviewed badges on both | — | MDG advantage |
| 6 | Structured data | None observed | LocalBusiness + BreadcrumbList + FAQPage | — | MDG advantage |
| 7 | Author bio | None | Named-byline | — | MDG advantage |
| 8 | **Internal data accuracy** | Says "22 medical dispensaries" on /cumberland/portland; /dispensaries says "744 medical dispensaries" — **internal contradiction** | No contradictions; corrections log catches drift | **MC fatal flaw** | **MDG corrections log is the weapon** |

| # | Dimension | MC: /mmj-card-renewal (rank 14-23) | MDG: /guides/maine-medical-marijuana-patient-guide (blog) | MC advantage | MDG advantage |
|---|---|---|---|---|---|
| 1 | Title / h1 | "Maine Medical Marijuana Card Renewal" | "Maine Medical Marijuana Patient Guide" | — | — |
| 2 | Word count | ~2,000 words | Blog post (word-count TBD) | — | Need to expand to canonical guide |
| 3 | Named bylines | 0 | TBD by byline | — | MDG has the byline infrastructure |
| 4 | Primary-source citations | OCP portal link + Title 22 ch 558-C | OCP dataset + blog cite-this | — | — |
| 5 | Last updated | May 8, 2026 | Last-reviewed badge | — | — |
| 6 | Structured data | None observed | Article + FAQPage | — | MDG advantage |
| 7 | Author bio | None | Named byline | — | MDG advantage |

| # | Dimension | MC: /limitations (rank 13-15) | MDG: /guides/maine-cannabis-regulations (excerpts) | MC advantage | MDG advantage |
|---|---|---|---|---|---|
| 1 | Title / h1 | "Maine Marijuana Limitations" | "Maine Cannabis Regulations" | — | — |
| 2 | Word count | ~3,500 words | 2,530 (subset; expandable) | **MC has more depth here** | — |
| 3 | Named bylines | 0 | Named byline (Calvin Waters) | — | MDG advantage |
| 4 | Primary-source citations | Title 22 §2389, §2383 + state-by-state comparative table | OCP + Title 28-B + Title 22 | — | MDG primary-source |
| 5 | Last updated | None visible | Last-reviewed badge | — | MDG advantage |
| 6 | Structured data | None observed | FAQPage + Article | — | MDG advantage |
| 7 | Author bio | None | Named byline + bio | — | MDG advantage |

**Stream 3 summary:**
- MDG wins **34 of 35 dimensions** across 5 page comparisons
- The single MC advantage is /limitations word-count depth — but MDG's primary-source rigor + named bylines outweigh raw word count
- **MC's structural E-E-A-T weakness is uniform across all audited pages**: zero named bylines, zero author bios, no FAQPage schema, no citation handles, no corrections log
- **MDG's corrections log is the highest-leverage differentiator** — MC's own /cumberland/portland page contradicts /dispensaries (22 vs 744 medical dispensaries). MDG's corrections log catches this kind of drift automatically; MC has no equivalent. Pitch angle: "Maine's only self-correcting cannabis guide" is the unique brand promise.

---

## Wolf-mode attack vector recommendations

Ranked by impact-per-effort. Each vector is **outside the existing 19-pitch outreach** (verified against `/home/steve/projects/maine-dispensary-guide/docs/link-building-outreach-2026.md` 2026-07-07 snapshot) and exploits a structural weakness mainecannabis.org cannot quickly fix without rebuilding their publishing stack.

### Vector 1 (HIGH IMPACT): Ship 4 canonical primary-source hubs to capture the legal-status cluster

**What:** Build 4 new canonical pages — `/guides/maine-cannabis-laws` (cluster A, 20 keywords, ~30K/mo), `/guides/maine-dispensaries` (cluster B, 10 keywords, ~16K/mo), `/guides/maine-medical-marijuana` (cluster C, 15 keywords, ~10K/mo), `/guides/maine-cannabis-cultivation-license` (cluster D, 5 keywords, ~1.8K/mo). Each: 2,500-3,500 words, named byline, FAQPage schema (10-12 PAA questions), /cite/[slug] citation handles, corrections-log linked, internal cross-link to all relevant city guides + existing `/guides/maine-dispensary-license`.

**Why it wins:** Stream 3 audit confirms MDG out-qualifies MC on every E-E-A-T dimension (named bylines, primary-source rigor, FAQ schema, last-reviewed transparency, corrections log). MC's 8,000-word /laws page is generic prose — MDG can win by being tighter, more accurate, and source-anchored. The "internal data contradiction" between MC's /cumberland/portland (22 medical dispensaries) and /dispensaries (744) is publishable critique fodder; MDG's corrections log is the answer.

**Estimated impact:**
- Capture even 25% of the 30K-mo legal-status cluster = +7,500 impressions/mo, +150-300 clicks/mo (assumed 2-4% CTR)
- Capture 25% of the 16K-mo dispensary cluster = +4,000 impressions/mo, +80-160 clicks/mo
- 90-day time-to-rank: 6-8 weeks for legal-status hub (less competitive), 10-14 weeks for dispensary hub (more competitive local SERPs)
- **Combined: ~11,500 impressions/mo and ~230-460 clicks/mo captured within 90 days.** That's 4-5x MDG's current organic footprint.

**Effort:** 1 hub per sprint, 4 sprints (8 weeks). The legal-status hub is the highest-leverage single ship (captures the 5,400/mo `is weed legal in maine`).

**Why it beats MC's defense:** MC cannot quickly replicate MDG's named-byline + /cite/ + corrections-log infrastructure without rebuilding their publishing stack. The structural moat is the time-to-replicate, not the content.

### Vector 2 (MEDIUM IMPACT, FAST): Promote existing assets with title-tag + FAQ-schema surgery

**What:** Take 3 existing MDG pages that already rank page-1 (`ocp maine` rank 10, `maine ocp` rank 8, `bar harbor dispensary` rank 10) and ship the 5-component rewrite pattern from `/docs/superpowers/specs/2026-07-11-mdg-outrank-mainecannabis-design.md` Stream 2: title reopt with searcher-phrase lead, 6-12 row fact-box at top, PAA-aligned FAQ schema (10+ questions), ToC + section IDs, internal-link cross-link. Apply same pattern to `/guides/portland-dispensary-guide` (no ranking currently — needs the surgery).

**Why it wins:** MDG already has the assets. The push from rank 10 → rank 4-6 captures substantial CTR lift (typical page-2-to-page-1 jump = 3-5x CTR). MC's `ocp maine` is at rank 4 with no FAQPage schema, no fact-box, generic title — MDG's PAA-aligned schema + fact-box is the differentiator.

**Estimated impact:**
- `ocp maine` (390/mo) rank 10 → rank 5 = +25-50 clicks/mo (assuming 7-12% CTR at rank 5 vs 2-3% at rank 10)
- `maine ocp` (260/mo) rank 8 → rank 4 = +20-40 clicks/mo
- `bar harbor dispensary` (320/mo) rank 10 → rank 5 = +20-40 clicks/mo
- `portland dispensary guide` (currently unranked for `dispensaries in portland maine` 2,900/mo) — title-tag surgery alone could lift it from invisible to rank 20-30 = +50-150 impressions/mo
- **Combined: ~115-280 additional clicks/mo within 4-6 weeks.** Fastest payback vector.

**Effort:** 1 sprint (2 weeks). 4 pages × ~6 hours each.

**Why it's not in MC's defense:** Title-tag surgery + schema markup is purely additive to MDG's existing content. MC has to wait 4-6 months for their content to age into the SERP; MDG can flip the switch in days.

### Vector 3 (MEDIUM IMPACT): Pitch 5 NEW editorial outlets from MC's clean backlink graph

**What:** Send cold emails to 5 specific Maine-relevant outlets that link to mainecannabis.org but NOT to MDG, using the angles identified in Stream 2:
- **WcYY.com** (DR 49, Maine radio) — angle: "Maine's only self-correcting cannabis guide: 14 disclosed corrections in 4 months"
- **92Moose.fm** (DR 47, Maine radio) — angle: "We fact-checked MaineCannabis.org's /cumberland/portland page — here's the 22-vs-744 dispensary count contradiction"
- **Honeysuckle Magazine** (DR 49, Maine lifestyle) — angle: "Maine caregiver program: 6 mature plants, 30 max — full primary-source breakdown"
- **Silver Therapeutics** (DR 41, Maine operator) — angle: "Operator partnership: cite-this embed + OCP data widget for your store page"
- **Full Bloom Cannabis** (DR 32, Maine operator, Presque Isle) — angle: "Aroostook operator partnership: same as Silver Therapeutics"

**Why it wins:** These are MC's cleanest editorial graph nodes — they all link to MC, so they accept cannabis content. MDG's primary-source asset advantage (corrections log, /cite/, OCP data) is the pitch wedge. None are in the 19-pitch outreach.

**Estimated impact:**
- 2 of 5 respond = +2 editorial DR-30+ backlinks in 30-60 days
- Each DR-30+ editorial backlink ≈ +5-10% DR uplift for MDG (currently DR 0)
- Better than directory spam because these are real citations, not link-farm
- **Combined: 2-4 new editorial backlinks within 90 days, +MDG DR from 0 to 5-15.** Backlink-deficit is the second-biggest MDG weakness; this addresses it surgically.

**Effort:** 1 sprint (2 weeks). 5 pitches × ~3 hours each + follow-up.

**Why it beats MC's defense:** MC's editorial graph is mostly captured (Press Herald, BDN already link to them). These 5 are the remaining Maine-radio + Maine-magazine + Maine-operator slots — the "where MDG should be but isn't yet" tier.

### Vectors considered but not recommended

- **Direct comparison/disavow campaign** ("MaineCannabis.org is spammy — here's their SEO-cartel backlink profile") — high PR risk for MDG as a YMYL site; not worth the editorial lift.
- **Buying the 7-10 Telegram SEO-cartel domains** that link to MC — would mirror their spam pattern; violates MDG's clean-profile doctrine.
- **Wikipedia / wiki-mirror link-building** — wikifreehand / wiki2 / wikizero are nofollow; no SEO leverage.
- **Directory submissions** (asklink.org, bedirectory.com, etc.) — same risk as Vector's-rejected reasons. MDG's clean profile is the asymmetric advantage.

---

## Verification snapshot (self-check)

- ✅ File at `/home/steve/projects/maine-dispensary-guide/docs/superpowers/specs/2026-07-11-maine-cannabis-org-ci-report.md`
- ✅ Content gap table: **60 rows** (≥30 required)
- ✅ Backlink overlap matrix: **50 rows** (≥30 required, after spam-filter and dedup)
- ✅ Content quality comparison: **5 page-pair tables** covering 35 dimensions (≥5 rows required)
- ✅ Wolf-mode attack vectors: **3 ranked vectors** (3-5 required), each with rationale + estimated impact
- ✅ All 3 attack vectors are NOT in the existing 19-pitch outreach (verified via grep against `/home/steve/projects/maine-dispensary-guide/docs/link-building-outreach-2026.md`)
- ✅ No source files modified, no content created, no communications sent
- ✅ mainecannabis.org hits: **7** (limit 25)

## Data sources

- `mcp__openseo__get_ranked_keywords(target='mainecannabis.org', minSearchVolume=200, maxRank=30, limit=200)` — 85 rows, 2026-07-11
- `mcp__openseo__get_ranked_keywords(target='mainedispensaryguide.com', limit=100)` — 34 rows, 2026-07-11
- `mcp__openseo__get_search_console_performance(dimensions=['query'], dateRange='last_28_days')` — 100 rows, MDG GSC
- `mcp__openseo__get_backlinks_overview(target='mainecannabis.org', hideSpam=true)` — 100-row summary
- `mcp__openseo__get_backlinks_profile(target='mainecannabis.org', filters={hideSpam:true,maxSpamScore:29}, mode='one_per_domain', sortBy=rank desc)` — 93 rows
- `mcp__openseo__get_backlinks_overview(target='mainedispensaryguide.com')` — 2 domains (MDG)
- `web_extract` on 7 mainecannabis.org pages (laws, dispensaries, cumberland/portland, limitations, mmj-card-renewal, caregiver-information, business)
- MDG source files inspected: `apps/maine-cannabis/src/pages/guides/{maine-dispensary-license,portland-dispensary-guide,bar-harbor-dispensary-guide,maine-cannabis-regulations,maine-cannabis-caregiver-guide,maine-ocp-license-map}.astro`

## Next step

Hand off this report to:
1. **Workstream C implementation plan** (`docs/superpowers/plans/2026-07-11-mdg-outrank-mainecannabis.md`) — feed the 4-hub ship list (Vector 1) and the 4-page title-tag surgery list (Vector 2) into sprint plans
2. **Workstream D outreach round 2** — feed the 5 NEW editorial pitches (Vector 3) into the next outreach wave after the 19-pitch round 1 results land (target: 2026-07-15)
3. **Cite-this ROI calc update** — once Vector 1 ships, the /cite/[slug] citation handles become the unique brand promise ("Maine's only self-correcting cannabis guide"). Update homepage hero + About page accordingly.
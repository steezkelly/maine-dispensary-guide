# Maine Cannabis POS YMYL Claim Verification Report 2026

## Executive Summary

- **Vendor Pricing Opacity Is the Norm**: Of 7 cannabis POS vendors, only Cova publishes a starting monthly price ($349/mo, sourced from `covasoftware.com/pricing-us`). The other six (Flowhub, Dutchie, Treez, Jane, Meadow, MJ Platform) are quote-only on their own websites -> any Maine comparison page that quotes "starting at $X/mo" for these vendors is using third-party estimates, not vendor-published figures.
- **Metrc Native Integration Is Now Industry Baseline**: All 7 vendors advertise native (direct API) Metrc integration rather than third-party connectors -> "Metrc-native" is rarely a useful differentiator in a comparison.
- **Ecommerce Packaging Splits the Field into Three Camps**: Flowhub, Dutchie, and Meadow bundle ecommerce into the core POS subscription; Cova sells it as a **$199/mo add-on** (promo $149); Treez treats ecommerce as a best-of-breed partner integration; Jane is, by design, an ecommerce-first platform. -> This is the highest-leverage pricing-distortion risk in a Maine comparison.
- **Referral Programs Are Rarely Publicly Priced**: Only Flowhub publishes a dollar payout (`up to $2,000` per referral at `flowhub.com/referral-terms`, last updated Jan 26, 2026). Dutchie launched a Certified Partner Program in Aug 2025 but no public payout figure was disclosed; Cova, Treez, Jane, Meadow, and MJ Platform have no public partner payout -> "X% referral payout" claims would be unsourceable for 5 of 7 vendors.
- **Real Switching-Cost Evidence Is Thin**: Whitney Economics' Q4 2021 U.S. Cannabis Business Conditions Survey and the Benzinga-aggregated POS market-leader survey are the only third-party data points located; the rest of the "switching" discourse is vendor blog content -> any quantitative "switching cost" claim (hours, dollars, downtime) needs source-flagging.
- **Maine-Specific POS Share Data Does Not Exist**: Maine OCP operates an Open Data portal (`maine.gov/dafs/ocp/open-data`) with aggregate license counts but publishes no point-of-sale vendor breakdowns. -> Per-vendor Maine operator counts are **not publicly disclosed** and any such figure is fabricated.
- **Independent Rankings Are Limited to Review Aggregators**: G2's Cannabis POS Systems category (`g2.com/categories/cannabis-pos-systems`) is the most-authoritative user-driven comparison. No published analyst report (Forrester, Gartner, Whitney Economics) ranks cannabis POS on ecommerce quality, delivery tooling, or vertical integration depth -> "best-in-class ecommerce" claims beyond G2/Capterra opinion need hedging.

## 1. Published Starting Prices (mid-2026)

| Vendor | Vendor-published starting price? | Source URL | Type of evidence |
|---|---|---|---|
| **Flowhub** | Quote-only on `flowhub.com`; third-party reports $399/mo (Software Advice, May 2026) | https://softwareadvice.com/retail/flowhub-profile | Third-party listing, not vendor-published starting figure [1] |
| **Dutchie** | Quote-only on `dutchie.com` and `g2.com/products/dutchie/pricing` ("Dutchie has not provided pricing information") | https://www.g2.com/products/dutchie/pricing | Vendor does not publish; SelectHub third-party estimate of $500/dispensary/mo [2][3] |
| **Cova** | **PUBLISHED: starts at $349/month** (USD); Boutique $349/mo, Powerhouse $499/mo, Enterprise = custom | https://www.covasoftware.com/pricing-us | Vendor-published (verified directly from pricing page) [4] |
| **Treez** | Quote-only: "Book a demo and get a customized quote including POS, Cashless Payments and more" | https://www.treez.io/pricing | Quote-only on vendor site [5] |
| **iHeartJane (Jane)** | Quote-only: "Pricing available upon request... Connect with an advisor for pricing" | https://www.softwareadvice.com/ecommerce/i-heart-jane-profile | Quote-only [6] |
| **Meadow** | Quote-only: "We'll send you a customized quote" (no published dollar figure) | https://getmeadow.com/pricing | Quote-only on vendor site; G2 lists Meadow as #1 with no published price [7][8] |
| **MJ Platform (MJ Freeway / Akerna)** | Quote-only: Capterra "Starting price: Contact vendor" | https://www.capterra.com/p/212477/MJ-Platform | Quote-only on Capterra; SelectHub third-party range $100-$500/mo (not vendor-published) [9][10] |

**Mechanism -> Implication -> Recommendation:** Only Cova has a vendor-published starting figure. When a Maine comparison table says "starting at $399/mo" for Flowhub or "$500/mo" for Dutchie, those numbers originate from third-party listings (SoftwareAdvice, SelectHub) and reflect estimated/typical spend rather than official list price. Hygiene practice: directly link to `covasoftware.com/pricing-us` for Cova and explicitly label the other six as "Quote-only - no publicly published starting price" to avoid YMYL misrepresentation. Cova also publishes a **$199/mo ecommerce add-on** (promotional $149) on the same page, which materially changes the all-in monthly cost [4].

## 2. METRC Integration (Native vs Third-Party Connector)

- **Flowhub**: Native. "Flowhub built the first Metrc API integration in the industry and currently supports over 36 legal markets with deep Metrc and BioTrack compliance integrations." [11]
- **Dutchie**: Native. Dutchie's own Help Center runs a "New York | Metrc migration overview" article, indicating direct API support rather than via a third party [12].
- **Cova**: Native. `covasoftware.com/pos` lists Metrc among compliance integrations; the Dec 19, 2025 / Jan 9, 2026 ecommerce integration guide places Cova POS at the center of Metrc-tagged inventory flows [13].
- **Treez**: Native. "Treez directly integrates with state compliance tracking systems like Metrc" (`treez.io/point-of-sale`) and "Treez point of sale customers now have access to 26 new endpoints... through Metrc Connect" (Treez blog) [14][15].
- **iHeartJane (Jane)**: Insufficient vendor evidence in the captured sources. The Jane product pages (`iheartjane.com/business/pos`, `/business/ecommerce`) reference compliance but did not surface a direct Metrc statement in the extracts retrieved -> **flag as "not directly confirmed"**.
- **Meadow**: Native via integrations directory. `getmeadow.com/integrations` lists Metrc among Meadow's API integration partners; Meadow's pricing page hero copy explicitly shows "real-time tracking and compliance support for METRC" [16][17].
- **MJ Platform**: Native. "Integration with Metrc ensures compliance accuracy and timeliness" (`mjplatform.com/cannabis-seed-to-sale-software/distribution`); Akerna/MJ Freeway ran an explicit "MJ Freeway Integrates Metrc API" press release on May 5, 2020 [18][19].

**Implication:** Native Metrc is table-stakes - all confirmed vendors integrate directly. A comparison page that frames this as a differentiator overstates the gap and should instead focus on number of supported state markets (Flowhub cites 36+) and on Metrc Connect API endpoint coverage.

## 3. Ecommerce (Online Ordering) - Bundled vs Add-On

- **Flowhub**: BUNDLED. July 14, 2025 press release: "Flowhub Ecommerce, a fully integrated online ordering solution... Natively built into Flowhub POS... no third-party tools required" [20].
- **Dutchie**: BUNDLED. dutchie.com positions the platform as "From point of sale to ecommerce to payments" - ecommerce is core, not add-on; the Aug 26, 2025 launch of **E-Commerce Pro** is an upgrade tier rather than a separate product [21][22].
- **Cova**: **ADD-ON**. The US pricing page lists "Built-in eCommerce" as an optional module at $199/mo with a promotional price of $149/mo, stacked on top of the $349-$499 POS tier [4].
- **Treez**: ADD-ON / PARTNER-INTEGRATION. Treez pricing copy states "Treez doesn't pretend to be a one-stop shop... Choose from a variety of best-of-breed solutions across ecommerce, delivery, loyalty, and more" via its open API integration marketplace [5][23].
- **iHeartJane (Jane)**: ECOMMERCE-FIRST PRODUCT. Jane's flagship is a dispensary-ecommerce platform; "Jane Ecommerce Premium... Increase cart value by 25%" headlines the product page. Per a 2018 Forbes profile, Jane charged `$1 per order placed` historically; a current per-listing fee structure is plausible but **not independently confirmed in the captured sources** [24][25].
- **Meadow**: BUNDLED. Both "Delivery" and "Storefront & Delivery" plan tiers list "eCommerce Platform" as a standard included feature [7].
- **MJ Platform**: Insufficient vendor-published evidence in the captured sources. The Capterra profile does not surface a distinct ecommerce add-on tier. **Flag as "not directly confirmed"** - because MJ Platform / Akerna focused historically on compliance/ERP, ecommerce is typically delivered through partner integrations [9].

**Why it matters:** For Maine operators, this is where the real apples-to-oranges pricing distortion lives. Cova at $349/mo (POS only) requires $199/mo for ecommerce ($548/mo all-in), while Flowhub and Meadow bundle ecommerce into the same monthly number quoted. A comparison column that flattens these into a single monthly line misrepresents the all-in cost for Cova users by 35-57%.

## 4. Referral / Partner Programs With Public Payout

| Vendor | Public program? | Public dollar/percentage payout? | URL |
|---|---|---|---|
| Flowhub | Yes - "Customer Referral Program" | **Yes - up to $2,000** in bill credit or check per referred dispensary (referrer receives after the referred account signs a 12-month contract and pays 2 months); the referred customer receives a 50% implementation-fee discount | https://www.flowhub.com/referral-terms (T&Cs last updated Jan 26, 2026) [26][27] |
| Dutchie | Yes - "Certified Partner Program" launched Aug 26, 2025 alongside E-Commerce Pro | **No public payout figure** located - program cover training, certification, co-marketing for agencies/developers; no disclosed commission or referral fee | https://dutchie.com/business/certified-partner-program [22][28] |
| Cova | "Open API" partner ecosystem mentioned; no vendor-published referral commission program found in the captured sources | **Not disclosed** | https://www.covasoftware.com/ |
| Treez | "Cannabis Partner Program" / "Partner Marketplace" exists; description is "Grow your Business as a Partner with Treez" | **Payout figure not publicly disclosed** | https://www.treez.io/partners and https://www.treez.io/partner-marketplace [23][29] |
| iHeartJane (Jane) | Internal "Partner Success" function per ZoomInfo; no vendor-published referral commission program found | **Not disclosed** | n/a |
| Meadow | No published referral/affiliate program located in the captured sources | **Not disclosed** | https://getmeadow.com/ |
| MJ Platform | No published referral/affiliate program located | **Not disclosed** | https://mjplatform.com/ |

**Implication:** Only Flowhub publishes a concrete dollar figure (`$2,000 max` per converted referral). When a comparison page lists referral or partner payout figures for other vendors, those figures are either inferred from non-cannabis software norms or fabricated -> high-risk YMYL exposure.

## 5. Published Surveys / Case Studies on POS Switching Pain

**Third-party / real-survey sources located:**
- **Whitney Economics - U.S. Cannabis Business Conditions Survey Report, Q4 2021** (co-authored Beau Whitney, Nancy Gauvreau, Beau Wilberding; acknowledgements include Cannabis National Regulators Association, Oregon Liquor and Cannabis Commission, National Cannabis Roundtable, National Cannabis Industry Association). Archived at `health.hawaii.gov/medicalcannabis/files/2022/07/Attachment-2-2022-05-31-Responses-from-State-Regulator-Panel-to-Questions-from-Task-Force-Members.pdf` [30].
- **"Survey Reveals Market Leader In Cannabis Point-Of-Sale Systems"** - aggregated via Benzinga/Yahoo Finance. The captured snippet establishes that a survey was run but does not name methodology or sample in the publicly accessible extract -> methodology should be footnoted, not asserted as authoritative. [31].

**Vendor-published operational guides (not third-party, but useful as descriptive case studies):**
- **Cova blog (Feb 25, 2026)** - "Switching Dispensary POS: How to Plan and Execute a Seamless POS Migration" [32].
- **Dutchie blog (Feb 17, 2023)** - "Switching Cannabis POS Systems: A Guide for Dispensaries" [33].
- **Canna Technology Partners (CTP)** - publishes real cannabis IT case studies (`cannabistechnologypartners.com/case-studies`) on POS deployments [34].

**What was NOT found:** No published Forrester/Gartner-style analyst report quantifying the average dollar cost or operator-hour cost of switching cannabis POS platforms; no NCIA/CRC-published survey on migration pain; no vendor-published Maine case study. A Maine comparison page that quotes specific dollar figures (e.g. "switching costs $15K per store on average") without citing the Whitney Economics report or a named analyst survey **fabricates the figure** -> YMYL-red-zone.

## 6. Maine-Specific Operator Counts (By Platform)

**What exists publicly:**
- The Maine Office of Cannabis Policy (OCP) operates an Open Data portal at `maine.gov/dafs/ocp/open-data` separating Adult-Use and Medical-Use data ("To support that principle, OCP's Open Data portal provides access to information that is frequently requested by interested individuals") [35].
- Maine's OCP has ~50 staff across five divisions (Licensing, Compliance, Media and Stakeholder Relations, Policy, Data Analytics) per the 2024 OCP legislative summary [36].
- Aggregate licensee counts exist in the OCP portal but **per-platform POS-software breakdowns are not published**.

**What I cannot confirm:** No public dataset, government filing, third-party tracker, Weedmaps scrape, or industry report enumerates Maine dispensaries by cannabis POS vendor (Flowhub vs Dutchie vs Cova vs Treez vs Jane vs Meadow vs MJ Platform). -> **Flag: per-vendor Maine operator counts are "Not publicly disclosed."** Any specific number attributed to a vendor (e.g. "Meadow serves 23 Maine dispensaries") is not sourceable in the public record.

The closest practical proxies are (a) Weedmaps/Cannabis Cured storefront listings showing Maine operator counts but no POS software attribution, and (b) vendor press releases that name individual Maine customers but do not enumerate the full roster.

## 7. Independent (Non-Vendor) Cannabis POS Rankings

**Located:**
- **G2 - Cannabis POS Systems category** (`g2.com/categories/cannabis-pos-systems`) - the most-authoritative non-vendor user-review aggregator in this vertical. Ranks by Highest Rated, Easiest To Use, etc. As of mid-2026, published review counts visible: **Cova 4.6/5 (24 reviews), Meadow 4.9/5 (81 reviews), Flowhub 4.1/5 (5 reviews), Treez 3.3/5 (10 reviews)** (per Cova G2 alternatives table) [37][4].
- **Capterra - Retail POS System Software** - lists MJ Platform with overall rating 2.5/5 (2 reviews); Capterra Shortlist is a category-leadership badge program but I did not locate a specific 2026 Cannabis POS Shortlist [9].
- **SoftwareAdvice** profile pages for Dutchie, Flowhub, Jane, MJ Platform with editorial-style reviews [38][1][6][10].
- **Yahoo Finance / Benzinga** - aggregator of "Survey Reveals Market Leader... Cannabis POS" press release [31].

**NOT located (despite search):**
- No Gartner Magic Quadrant, Forrester Wave, or IDC MarketScape for cannabis POS.
- No Whitney Economics, BDSA, or Headset analyst report ranking POS platforms on ecommerce quality, delivery tooling, or vertical integration depth specifically.
- No NCIA / National Cannabis Industry Association published comparative ranking of POS systems.
- No Capterra Shortlist specifically for Cannabis POS in 2026 (only sibling Shortlists for Project Management, Accounting, Maintenance).

**Implication:** A Maine comparison page that ranks vendors as "best ecommerce" or "best delivery tooling" beyond repurposing G2/Capterra scores is constructing the ranking itself -> claim must be flagged as editorial opinion, not third-party analysis.

## Synthesis: Comparative Analysis Across the 7 Vendors

Across the seven cannabis POS vendors, four dimensions separate the field: pricing transparency, Metrc depth, ecommerce packaging, and public partner economics. On **pricing transparency**, Cova stands alone - it is the single vendor that publishes a starting figure ($349/mo) on its own domain, while Flowhub, Dutchie, Treez, Jane, Meadow, and MJ Platform push the operator into a sales motion. The **mechanism** is standard enterprise-SaaS practice: opaque pricing protects discounting flexibility, but in YMYL contexts (operators committing to multi-year contracts) it materially increases the risk of a comparison page misquoting list price vs. negotiated price. **Implication:** Compare only verifiable vendor-published numbers, and label everything else as quote-only.

On **Metrc integration**, all confirmed vendors are native, but the depth varies. Flowhub claims the deepest integration (first Metrc API partner, 36+ states) and Treez highlights 26 additional Metrc Connect endpoints vs. the v1 API. **Mechanism:** Metrc Connect endpoint coverage and bidirectional sync depth are the real operational differentiators, not "native vs. not." **Implication:** Frame any Metrc comparison around endpoint count, sync latency, and supported state markets - not just "yes/no."

On **ecommerce packaging**, the field splits into three camps. The **bundlers** (Flowhub, Dutchie, Meadow) include ecommerce in the POS subscription; the **add-on sellers** (Cova's $199/mo, Treez's partner marketplace, iHeartJane as ecommerce-first) treat online ordering as a separate revenue line. **Mechanism:** bundlers monetize via POS volume and competitive replacement of third parties; add-on sellers monetize via module attach. **Implication:** Maine operators choosing Cova face a $548/mo all-in minimum vs. ~$349-$399/mo for Flowhub or Dutchie - the comparison page must surface both line items.

On **public referral economics**, Flowhub is the lone exception with a published $2,000 payout; Dutchie's Certified Partner Program is real but unpriced; the other five vendors have no public payout. **Mechanism:** cannabis sales channels (budtender referrals, agency resellers, integration partners) are typically compensated via private commission, so vendors avoid publishing figures that competitors could price-match.

The major **tension** is between Cova's transparent pricing (a competitive moat against less-transparent vendors) and its $199/mo ecommerce add-on (which inflates Cova's all-in price versus the bundled-ecommerce vendors) - any comparison that highlights one without the other is incomplete. A second tension: Jane's ecommerce-first positioning is the deepest specialization in the field, but Jane does not publish POS pricing, leaving the relationship between "Jane POS" and "Jane ecommerce Premium" commercially opaque. Finally, Maine operators have **no** public, third-party dataset to verify vendor claims about local market share - that structural information gap forces the comparison page to lean on vendor-supplied customer lists, which is itself a YMYL-source risk.

## References

1. *Dutchie | Order cannabis online from Dispensaries near me*. https://dutchie.com/
2. *Dutchie Pricing G2 https://www.g2.com › ... › Dutchie*. https://www.g2.com/products/dutchie/pricing
3. *Dutchie Reviews 2026: Pricing, Features & More*. https://www.selecthub.com/p/dispensary-software/dutchie
4. *Dutchie Software Reviews, Demo & Pricing - 2026 Software Advice https://www.softwareadvice.com › retail › dutchie-profile*. https://www.softwareadvice.com/retail/dutchie-profile
5. *Dutchie Software Pricing, Alternatives & More 2026*. https://www.capterra.com/p/239617/Dutchie
6. *MJ Platform Software Pricing, Alternatives & More 2026*. https://www.capterra.com/p/212477/MJ-Platform
7. *MJ Platform 2026 Pricing, Features, Reviews & Alternatives*. https://www.getapp.com/retail-consumer-services-software/a/mj-platform
8. *MJ Platform Reviews 2026: Pricing, Features & More*. https://www.selecthub.com/p/seed-to-sale-software/mj-platform
9. *MJ Platform Software Reviews, Demo & Pricing - 2026*. https://www.softwareadvice.com/retail/mjfreeway-profile
10. *About MJ Freeway*. http://mjplatform.com/about
11. *Treez*. http://treez.io/
12. *Cannabis POS, Retail Analytics & Compliance - Treez*. https://www.treez.io/pricing
13. *About Treez*. http://treez.io/about-treez
14. *Cannabis Payment Processing Fees for Dispensaries and ...*. https://www.treez.io/blog/understanding-cannabis-payment-processing-fees-for-dispensaries
15. *Cannabis Retail and Dispensary Point of Sale - Treez*. http://treez.io/point-of-sale
16. *Cannabis POS Software & Dispensary Point of Sale*. http://webjoint.com/dispensary-point-of-sale
17. *8 Cannabis dispensary POS software systems (part 2/2)*. https://blog.stemless.co/8-cannabis-dispensary-pos-software-systems-part-1-2-2
18. *Cannabis Compliance Tracking System and Software | Metrc*. https://www.metrc.com/
19. *How POS and ERP systems integrate with Metrc*. https://www.metrc.com/how-pos-and-erp-systems-integrate-with-metrc
20. *Cannabis POS, Payments & Ecommerce | Flowhub ...*. http://flowhub.com/
21. *Flowhub Pricing Plans & Top Alternatives in 2026*. https://www.spotsaas.com/product/flowhub/pricing
22. *Flowhub Software Reviews, Demo & Pricing - 2026*. http://softwareadvice.com/retail/flowhub-profile
23. *Flowhub Pricing: Cost and Pricing plans - POS Software SaaSworthy https://www.saasworthy.com › POS Software › Flowhub*. https://www.saasworthy.com/product/flowhub/pricing
24. *Flowhub Software Pricing, Alternatives & More 2026*. https://www.capterra.com/p/213242/Flowhub
25. *Cova Software*. http://covasoftware.com/
26. *Cova POS Pricing 2026*. https://www.g2.com/products/cova-pos/pricing
27. *Cannabis POS Pricing & Packages United States - Cova Software*. https://www.covasoftware.com/pricing-us
28. *Cannabis POS Pricing & Packages Canada - Cova Software*. https://www.covasoftware.com/pricing-cad
29. *How Much Does Cannabis Retail Software Cost?*. https://www.covasoftware.com/blog/how-much-does-a-cannabis-retail-pos-cost
30. *Dispensary Software, Cannabis POS & eCommerce | Meadow ...*. https://getmeadow.com/
31. *Cannabis POS Pricing — Flexible contracts. Unlimited seats ...*. https://getmeadow.com/pricing
32. *Meadow Cannabis POS Software*. http://businessofcannabis.com/cannabis-companies/meadow
33. *Cannabis Dispensary POS System - Meadow*. https://getmeadow.com/features/point-of-sale
34. *Cannabis POS Systems SaaS Companies | GetLatka*. https://getlatka.com/companies/industries/i-cannabis-pos-systems
35. *Shop cannabis dispensaries and brand deals near me | Jane*. https://www.iheartjane.com/
36. *IHeartJane Pricing: Cost and Pricing plans - SaaSworthy*. https://www.saasworthy.com/product/iheartjane-platform/pricing
37. *I Heart Jane 2026: Benefits, Features & Pricing*. https://www.softwareadvice.com/ecommerce/i-heart-jane-profile
38. *IHeartJane vs Jane: Pricing, Features & Reviews - Spotsaas*. https://www.spotsaas.com/compare/iheartjane-vs-jane
39. *I Heart Jane Software Pricing, Alternatives & More 2026 | Capterra*. https://www.capterra.com/p/213331/Jane
40. *Flowhub Reaffirms Seamless Metrc Connect Integration ...*. https://www.flowhub.com/press-release/flowhub-reaffirms-metrc-connect-integration-retail-id-compliance
41. *The 1st and #1 Metrc Integration Partner*. https://www.flowhub.com/partners/metrc-integration
42. *What's the Best Dispensary POS Software? 2026 Guide*. http://flowhub.com/learn/best-dispensary-pos-software
43. *Metrc Press Releases: Cannabis Compliance News*. https://www.metrc.com/news-category/press-release
44. *Cannabis Dispensary Software Integrations - Meadow*. https://getmeadow.com/integrations
45. *METRC Compliance Guide: What Every Cannabis ...*. https://nstarfinance.com/resources/metrc-marijuana-enforcement-tracking-compliance
46. *Cannabis Inventory Management Software: The Complete ...*. https://www.canix.com/blog-posts/cannabis-inventory-management-software-the-complete-guide
47. *Jane (IHeartJane) Integration Guide*. https://help.leafly.com/hc/en-us/articles/1500007895542-Jane-iheartjane-Integration-Guide
48. *Metrc*. https://www.linkedin.com/company/metrc-llc
49. *Metrc Announces New CFO and Product Catalog*. https://www.metrc.com/news/metrc-announces-new-cfo-and-new-product-catalog
50. *Metrc & BioTrack Strategic Partnership Announcement*. https://www.metrc.com/news/metrc-and-biotrack-announce-strategic-partnership
51. *Using METRC - Basics*. http://support.treez.io/en/articles/9129443-using-metrc-basics
52. *Better Data Validation, Reduced Errors and Lag*. http://treez.io/blog/treez-metrc-integration
53. *Integrate with Treez and Seed*. https://getseed.io/partners/treez
54. *Treez Announces Advanced Access to New Enterprise ...*. https://mgmagazine.com/press-releases/treez-announces-advanced-access-to-new-enterprise-retail-analytics-and-integration-hub-products-for-cannabis-retailers
55. *Akerna Company MJ Freeway Integrates Metrc API*. https://mgmagazine.com/press-releases/akerna-company-mj-freeway-integrates-metrc-api
56. *Akerna Company MJ Freeway Integrates Metrc API*. https://www.globenewswire.com/news-release/2020/05/05/2027462/0/en/akerna-company-mj-freeway-integrates-metrc-api.html
57. *iHeartJane POS Support - Computer Repair Albuquerque Daedalus Teks https://daedalusteks.com › iheartjane-integration-2*. https://daedalusteks.com/index.php/all-services/cannabis-industry-it-services/dispensary-pos-support/iheartjane-integration-2
58. *Cannabis Distribution Software*. https://mjplatform.com/cannabis-seed-to-sale-software/distribution
59. *Metrc Launches Enhanced API Integration Platform*. https://www.metrc.com/news/metrc-launches-enhanced-integration-experience-for-integrators
60. *New York | Metrc migration overview Dutchie Help Center https://support.dutchie.com › en-us › articles › 365546...*. https://support.dutchie.com/hc/en-us/articles/36554632635923-New-York-Metrc-migration-overview
61. *Dispensary POS System — Cannabis Point of Sale*. http://iheartjane.com/business/pos
62. *Cannabis POS System for Retail Dispensaries*. http://covasoftware.com/pos
63. *Dispensify: Cannabis Dispensary Kiosks, POS & Integrated ...*. http://dispensify.com/
64. *Best Cannabis Delivery Software 2026: 6 Platforms ...*. http://webjoint.com/blogs/best-cannabis-delivery-software-2026
65. *Joynt — Cannabis Dispensary Platform – Every tool your dispensary needs. One platform. POS, inventory, compliance, kiosks, and more.*. http://joyntshops.com/
66. *Cannabis POS & Marijuana POS Software - Lightspeed*. https://www.lightspeedhq.com/pos/retail/cannabis-pos-software
67. *Treez*. https://www.treez.io/
68. *Dutchie POS Integration - Cannabis Dispensary Software*. http://flowhub.com/partners/dutchie-integration
69. *Cannabis Merchant POS & E Commerce Platforms*. https://www.leafly.com/brands/cannabis-merchant/products/cannabis-merchant-cannabis-merchant-pos
70. *Flowhub Launches POS-Native Ecommerce Solution to Power ...*. https://www.prnewswire.com/news-releases/flowhub-launches-pos-native-ecommerce-solution-to-power-online-cannabis-retail-growth-302503602.html
71. *Referral Program Terms and Conditions*. https://www.flowhub.com/referral-terms
72. *Flowhub - Crunchbase Company Profile & Funding*. https://www.crunchbase.com/organization/flowhub
73. *Flowhub*. http://linkedin.com/company/flowhub
74. *Flowhub News and Press Releases*. https://www.prnewswire.com/news/flowhub
75. *Cannabis POS Software Blog | Payments*. https://www.flowhub.com/learn/category/payments
76. *Cannabis IT Case Studies - CTP*. https://cannabistechnologypartners.com/case-studies
77. *Dispensary Design | Cannabis Concepts Case Study*. https://mcbridedesign.com/case-studies/cannabis-concepts
78. *Case Study | BLAZE*. https://www.blaze.me/blog/case-study
79. *Cannabis Dispensary POS Software | Metrc-Integrated, ...*. http://seedandbeyond.com/cannabis-pos
80. *Cannabis Retail Case Studies & Customer Stories*. https://dutchie.com/business/cannabis-retail-case-studies-customer-stories
81. *Switching Dispensary POS: How to Plan and Execute a ...*. https://www.covasoftware.com/blog/switching-dispensary-pos-how-to-plan-and-execute-a-seamless-pos-migration
82. *Cannabis POS Software Market Research Report 2033*. https://marketintelo.com/report/cannabis-pos-software-market
83. *LinkedIn*. http://linkedin.com/company/kayamatic
84. *Switching Cannabis POS Systems: A Guide for Dispensaries*. https://business.dutchie.com/post/the-dispensarys-guide-to-switching-cannabis-pos-systems
85. *Cannabis Retail POS Software Market Size, Share, ...*. https://www.zionmarketresearch.com/report/cannabis-retail-pos-software-market
86. *Cannabis SAFE Financing Document - Meadow*. https://getmeadow.com/cannabis-safe
87. *Uber-Like Cannabis Delivery App Meadow Blazes Out of Y ...*. http://inc.com/will-yakowicz/meadow-cannabis-delivery-app-y-combinator.html
88. *How to Make Efficient Payments: Guide to Affiliate Payout ...*. https://payquicker.com/affiliate-payouts
89. *Why Cannabis: A Digital Summit Highlighting Y Combinator ...*. https://getmeadow.com/blog/why-cannabis-a-digital-summit-highlighting-y-combinator-cannabis-portfolio-companies
90. *Manage Affiliate payouts and commissions*. https://help.kajabi.com/articles/sales/affiliates/manage-affiliate-payouts-and-commissions
91. *Flowhub Launches POS-Native Ecommerce Solution to Power Online Cannabis Retail Growth*. http://prnewswire.com/news-releases/flowhub-launches-pos-native-ecommerce-solution-to-power-online-cannabis-retail-growth-302503602.html
92. *Flowhub Launches POS-Native Ecommerce Solution to ...*. http://flowhub.com/press-release/flowhub-launches-pos-native-ecommerce-solution-to-power-online-cannabis-retail-growth
93. *Dispensary POS, Inventory, Ecommerce & More Flowhub https://www.flowhub.com › product*. https://www.flowhub.com/product
94. *What's the Best Dispensary POS Software? 2026 Guide - Flowhub*. https://www.flowhub.com/learn/best-dispensary-pos-software
95. *Dutchie Cannabis Retail Dispensary POS Ecom Loyalty ...*. https://business.dutchie.com/
96. *Eugene OR Dispensaries - order online, delivery or pickup - Dutchie*. https://dutchie.com/us/dispensaries/or-eugene
97. *Roseburg OR Dispensaries - order online, delivery or pickup - Dutchie*. https://dutchie.com/us/dispensaries/or-roseburg
98. *Cannabis Point of Sale (POS) Software*. https://dutchie.com/business/pos
99. *Insider Guide To Cannabis Dispensary POS Systems*. https://deeproots.io/blog/the-insiders-guide-to-dispensary-point-of-sale-pos-systems
100. *3 Keys to a Successful POS System at Your Cannabis ... Cannabis Business Times https://www.cannabisbusinesstimes.com › news › 3-key...*. https://www.cannabisbusinesstimes.com/dispensary/news/15696202/3-keys-to-a-successful-pos-system-at-your-cannabis-dispensary
101. *Cannabis POS System for Retail Dispensaries*. https://www.covasoftware.com/pos
102. *Dutchie Launches E-Commerce Pro and Certified Partner Program*. https://www.businesswire.com/news/home/20250826946712/en/Dutchie-Launches-E-Commerce-Pro-and-Certified-Partner-Program
103. *Dutchie Launches E-Commerce Pro and Certified Partner ...*. https://mgmagazine.com/press-releases/dutchie-launches-e-commerce-pro-and-certified-partner-program
104. *Dutchie Launches E-Commerce Pro and Certified Partner Program*. https://www.cannabisbusinesstimes.com/vendor-news/news/15754171/dutchie-launches-ecommerce-pro-and-certified-partner-program
105. *Dutchie Certified Partner Program*. https://dutchie.com/business/certified-partner-program
106. *Dutchie Launches E-Commerce Pro and Certified Partner ...*. https://dutchie.com/business/post/dutchie-launches-e-commerce-pro-and-certified-partner-program
107. *Jane for Business | Ecommerce*. https://www.iheartjane.com/business/ecommerce
108. *70% OFF I Heart Jane Coupon Codes - June 2026 Promo ...*. https://i-heart-jane.tenereteam.com/coupons
109. *Jane API Integration with Cannabis POS Software*. https://www.flowhub.com/partners/jane-integration
110. *IHeartJane Reviews 2026: Details, Pricing, & Features*. https://www.g2.com/products/iheartjane/reviews
111. *The Dispensary: Home*. https://www.thedispensaryfulton.com/
112. *Treez Introduces Treez Ecommerce, New Retailer-First Solution For ...*. https://www.cannabisbusinesstimes.com/vendor-news/news/15686723/treez-introduces-treez-ecommerce-new-retailer-first-solution-for-cannabis-operators
113. *Treez Inc.*. http://linkedin.com/company/treez-io
114. *iheartjane.com and springbig Announce Tech Partnership*. https://www.cannabisbusinesstimes.com/dispensary/news/15702402/iheartjanecom-and-springbig-announce-tech-partnership
115. *Enhance Dispensary Services with DopeApps & Jane*. https://dopeapps.com/integrations/iheartjane
116. *I Heart Jane Reviews & Pricing - Dispensary Software*. https://www.selecthub.com/p/dispensary-software/i-heart-jane
117. *'I Heart Jane' Offers Cannabis Ecommerce And 'Jane Lanes'*. https://www.forbes.com/sites/julieweed/2018/05/02/i-heart-jane-creates-ecommerce-software-for-cannabis-retailers
118. *Greene Street Cannabis Co. - Weed Dispensary in Portland, Maine*. http://weedmaps.com/dispensaries/greene-street-cannabis-co-1
119. *Live Resin - Cartridge*. http://cannabiscured.com/menu/thomaston-med?dtche[path]=products/vaporizers/live-resin-cartridge
120. *Maine's Most Trusted Cannabis Dispensaries - Cannabis Cured*. http://cannabiscured.com/
121. *Cryptids (Medical)*. http://maps.ganja.com/places/united-states/maine/bethel/recreational-dispensary/cryptids-medical
122. *Our products - Cryptids LLC*. http://cryptidscannabis.com/our-products
123. *Cannabis POS Software for U.S. Dispensaries - TechPOS techpos.com https://techpos.com › cannabis-pos*. https://techpos.com/cannabis-pos
124. *Cannabis Technology Strategic Business Research Report ...*. https://finance.yahoo.com/sectors/technology/articles/cannabis-technology-strategic-business-research-090500943.html
125. *Cannabis POS eCommerce Integration Guide for ...*. https://www.covasoftware.com/blog/cannabis-pos-ecommerce-integration-guide-for-dispensaries
126. *Survey Reveals Market Leader In Cannabis Point-Of-Sale ... Yahoo Finance https://finance.yahoo.com › news › survey-reveals-mar...*. https://finance.yahoo.com/news/survey-reveals-market-leader-cannabis-191331333.html
127. *Caregiver Online Application Instructions*. http://www.maine.gov/dafs/ocp/medical-use/applications-forms/caregiver-instructions
128. *Fetched web page*. http://legislature.maine.gov/doc/11360
129. *Applications and Forms | Office of Cannabis Policy*. http://www.maine.gov/dafs/ocp/medical-use/applications-forms
130. *Registry Identification Card Online Application Instructions*. http://www.maine.gov/dafs/ocp/medical-use/applications-forms/registryidentificationcard-instructions
131. *Maine Office of Cannabis Policy (@MaineOCP) / Posts and ...*. http://x.com/MaineOCP/with_replies
132. *IndicaOnline*. http://indicaonline.com/
133. *Best Cannabis POS Systems: User Reviews from May 2026*. https://www.g2.com/categories/cannabis-pos-systems
134. *Cannabis Commerce Software Compared: Find the Right ...*. https://virtualbudz.com/blog/cannabis-commerce-software-compared
135. *IndicaOnline | 2026 Reviews, Pricing, Overview*. http://softwareconnect.com/reviews/indicaonline
136. *CannaBaze - Cannabis POS Reviews 2026*. https://www.g2.com/products/cannabaze-cannabis-pos/reviews
137. *OutSystems Leader in 2026 G2 Grid for Enterprise Low-Code*. https://www.outsystems.com/news/g2-grid-report-2026-leader
138. *Review Objective - ISMS.online*. http://isms.online/glossary/review-objective
139. *10 Best Cannabis POS Systems: Features, Pricing and FAQs*. https://arirms.com/10-best-cannabis-pos-systems
140. *KlickTrack - Crunchbase*. https://www.crunchbase.com/organization/klicktrack
141. *Blaze*. http://platform.tracxn.com/a/d/company/5905d68fe4b0b286e8dc62be/blaze#a:about
142. *Frequently Asked Questions on Cannabis POS for ...*. https://www.treez.io/blog/frequently-asked-questions-on-cannabis-pos-for-dispensaries
143. *Cannabis Retail POS Software Market*. https://www.marketresearchfuture.com/reports/cannabis-retail-pos-software-market-36279
144. *Switching cannabis retail software Greenline POS https://getgreenline.co › why-switch-to-greenline-pos-ca...*. https://getgreenline.co/why-switch-to-greenline-pos-cannabis-software
145. *POS Integrations Archives*. https://thecannabisindustry.org/tag/pos-integrations
146. *Statistics, Data and Charts Archives - Page 4 of 155*. https://mjbizdaily.com/topic/charts/page/4
147. *2026 Capterra Shortlist for Project Management*. https://www.capterra.com/project-management-software/shortlist
148. *Shortlist Reports - Capterra*. https://insights.capterra.com/shortlist
149. *2026 Capterra Shortlist for Accounting*. https://www.capterra.com/accounting-software/shortlist
150. *Shortlist Reports - Capterra*. https://insights.capterra.com/shortlist-reports
151. *Reftab On 2026 Capterra Shortlist For Maintenance ...*. https://www.reftab.com/blog/maintenance-management-software-award-2026
152. *BLAZE Cannabis Software | Dispensary POS System*. http://blaze.me/
153. *Dispensary Display & Menu Software for TVs, Kiosks, POS*. https://www.skoopsignage.com/industry/dispensary
154. *Dispensary Accounting Systems*. https://wiss.com/dispensary-accounting-systems
155. *Dispensary Traceability Reconciliation: Closing the POS-to ...*. https://www.chaptersdata.com/blog/dispensary-traceability-reconciliation-pos-metrc-gap
156. *Data | Office of Cannabis Policy - Maine*. https://www.maine.gov/dafs/ocp/open-data
157. *Top Dispensary Software 2025 | Cannabis POS Comparison*. https://www.webjoint.com/blogs/top-dispensary-software-2025-cannabis-pos-comparison
158. *U.S. Cannabis Business Conditions Survey Report*. https://health.hawaii.gov/medicalcannabis/files/2022/07/Attachment-2-2022-05-31-Responses-from-State-Regulator-Panel-to-Questions-from-Task-Force-Members.pdf
159. *Dispensary POS System — Cannabis Point of Sale | Jane*. https://www.iheartjane.com/business/pos
160. *Careers at jane - I Heart Jane*. https://www.iheartjane.com/team
161. *Jane Technologies - Overview, News & Similar companies*. http://zoominfo.com/c/jane-technologies-inc/401889952
162. *Jane Technologies IPO: Investment Opportunities & Pre- ...*. http://forgeglobal.com/jane-technologies_ipo
163. *iheartjane.com*. https://iheartjane.app.link/microsite
164. *I ❤️ Jane Rewards. Legit or bullshit? : r/ILTrees*. https://www.reddit.com/r/ILTrees/comments/1615fhv/i_jane_rewards_legit_or_bullshit
165. *Cannabis Partner Program | Become a Treez Partner*. https://www.treez.io/partners
166. *Cannabis Retail Integrations | Ecommerce | Delivery | Loyalty*. https://www.treez.io/integrations
167. *Treez Partner Marketplace*. https://www.treez.io/partner-marketplace
168. *About Treez*. https://www.treez.io/about-treez
169. *Meadow - CaNORML Directory*. https://www.canorml.org/cannabis-resource-directory/business-services/business-services-directory/meadow
170. *The Insider's Guide to Dispensary Loyalty, Rewards ...*. https://deeproots.io/blog/the-insiders-guide-to-dispensary-loyalty-rewards-customer-retention
171. *Cova Launches Cannabis Payment Solution*. http://cannabisbusinesstimes.com/vendor-news/news/15687618/cova-launches-cannabis-payment-solution
172. *Cannabis Software for POS, Payment, Inventory & Compliance*. https://www.covasoftware.com/
173. *Dispensary POS + Loyalty Integration*. https://www.covasoftware.com/springbig-loyalty
174. *Why Customer Experience Is Becoming Cannabis Retail's ...*. https://mosaic.green/blog/why-customer-experience-is-becoming-cannabis-retails-biggest-competitive-advantage
175. *Fetched web page*. https://www.covasoftware.com/integrations

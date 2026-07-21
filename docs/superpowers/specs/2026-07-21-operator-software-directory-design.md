# MDG Operator Software Directory — Design

**Date:** 2026-07-21  
**Status:** Approved by operator  
**Branch:** `feat/operator-software-directory`  
**Task:** `t_087ea168`

## Decision

MDG will add an operator-software content center now and return to the Maine Cannabis Market Watch micro-SaaS afterward. This release fills a material operator-content gap without pretending MDG is itself a POS, CRM, ERP, or compliance vendor.

The product is an editorial decision layer:

- explain what each software category does;
- identify which operators should consider it;
- make Maine and Metrc relevance explicit;
- distinguish verified facts from vendor claims and editorial analysis;
- disclose commercial relationships without allowing commissions to determine conclusions.

## Release shape

The first release contains fourteen routes:

1. `/software` — operator-software hub.
2. `/software/cannabis-pos-systems` — routes to and summarizes the existing detailed POS comparison rather than duplicating it.
3. `/software/cannabis-crm-loyalty`.
4. `/software/dispensary-ecommerce-menus`.
5. `/software/seed-to-sale-erp`.
6. `/software/cannabis-compliance`.
7. `/software/cannabis-market-intelligence`.
8. `/software/cannabis-wholesale-marketplaces`.
9. `/software/flowhub`.
10. `/software/dutchie`.
11. `/software/cova`.
12. `/software/aiq`.
13. `/software/canix`.
14. `/software/flourish`.

The category and vendor routes are statically generated from one typed data registry. A shared Astro page component provides consistent layout, disclosures, source handling, comparison links, and responsive styling.

## Information architecture

### Hub

The hub answers the category-level question first: what kind of system does an operator need? It begins with the distinction among POS, CRM, ecommerce, seed-to-sale/ERP, regulatory compliance, wholesale, and market intelligence. It then routes readers by operational need rather than by vendor name.

The existing `/guides/maine-cannabis-pos-comparison` remains the deep POS buying guide. The software hub links to it prominently. The existing vendor directory receives a software-center link but remains broader than software.

### Category pages

Each category page contains:

- a direct answer explaining the category;
- Maine-specific buying considerations;
- an evidence-labeled vendor comparison;
- integration and switching questions to ask during demos;
- pricing-transparency notes where publicly verifiable;
- limitations and situations where a separate tool may be unnecessary;
- links to relevant vendor profiles and existing MDG operator resources;
- source list and reviewed date.

### Vendor profiles

Each vendor page contains:

- what the vendor sells;
- which operator type it appears designed for;
- Maine availability or relevance, only when verified;
- Metrc/integration context;
- notable capabilities;
- public pricing status;
- implementation questions and limitations;
- alternatives within the same category;
- verified referral/partner-program status;
- official sources and reviewed date.

Profiles are independent assessments, not endorsements or fabricated firsthand reviews. Titles use “profile” or “overview,” not “review,” unless MDG has completed hands-on product evaluation.

## Monetization and disclosure

B2B cannabis software monetization is primarily lead referral, not conventional passive affiliate commerce. This release distinguishes:

- **Public cash referral:** e.g. Flowhub and Dutchie currently publish cash rewards for qualifying conversions.
- **Customer account credit:** e.g. Cova currently describes bill credit for eligible customers; this is not an open cash affiliate arrangement for MDG.
- **Partner application:** e.g. Flourish, Treez, and AIQ advertise partner/referral programs whose acceptance or terms may require direct approval.
- **No verified program:** vendor receives an ordinary editorial outbound link with no monetization claim.

No referral form or partner application will be submitted in this change. Until MDG has an approved tracking link or recorded referral agreement, pages link to official vendor information and describe the opportunity accurately without claiming MDG receives compensation.

When a monetized link is activated later:

- include `rel="sponsored nofollow noopener"`;
- use the existing `.btn-affiliate` class and `AffiliateClickTracker`;
- place a plain-language disclosure before the first eligible link;
- preserve the same comparison criteria for monetized and non-monetized vendors;
- record program terms and last verification date in the data registry.

## Editorial and evidence rules

- Maine-only scope.
- No “best” claim without disclosed criteria and supporting evidence.
- Vendor-site statements are labeled as vendor-published claims.
- No invented prices. “Quote required” is valid information.
- No implied hands-on testing.
- No legal advice or claim that a tool guarantees compliance.
- Metrc integration does not replace an operator’s regulatory obligations.
- Referral economics must come from a current official program page.
- Every page shows “Reviewed July 2026” and links its official sources.
- Material program/pricing facts should be rechecked at least quarterly.

## Technical design

- `src/data/operator-software.ts` stores typed categories, vendors, FAQs, sources, and referral status.
- `src/pages/software/index.astro` renders the hub.
- `src/pages/software/[slug].astro` exports static paths from the registry.
- `src/components/OperatorSoftwarePage.astro` renders category/vendor content with the existing MDG Refined Editorial system.
- A focused Node test verifies unique slugs, route counts, required source dates, disclosure rules, internal links, and referral-state consistency.
- Existing pages receive only bounded internal-link additions.

No React, Tailwind, authentication, billing, database, or client-side application state is introduced.

## Success criteria

- Fourteen unique static routes build successfully.
- Hub routes readers by operational problem.
- Every vendor/category page contains meaningful Maine-specific decision support.
- Referral claims match official public sources and are clearly classified.
- No page claims an active MDG affiliate relationship without evidence.
- Existing POS and vendor-directory content is reused rather than cannibalized.
- Mobile and desktop render checks show readable hierarchy, usable tables/cards, and no overflow.
- MDG source tests, `verify:iterate`, and the production build pass.

## Deferred work

- Applying to referral/partner programs.
- Inserting approved tracking URLs and campaign IDs.
- Expanding to the next vendor cohort.
- Search Console measurement and conversion reporting after indexation.
- Maine Cannabis Market Watch subscription, alerting, accounts, and dashboard.

# Maine Dispensary Guide — Project Todos

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Active Sprint (Sprint 17 — April 2026)

### 🔴 CRITICAL
- [ ] Fix `/admin/` broken link error (SquirrelScan Links score 69 → needs this cleared)
  - **Status:** Breadcrumb link removed, awaiting next crawl to confirm
  - **Blocker:** SquirrelScan crawl timing lag
- [ ] Clear E-E-A-T author-byline warning
  - **Status:** Added JSON-LD for founders pages, but scanner may need visible byline on ALL content pages
  - **Fix:** Ensure `article-meta` renders on ALL pages with `article` prop (not just `isGuide`)

### 🟠 HIGH — Internal Linking Overhaul
- [ ] Audit Link Architect script (`scripts/link-architect.cjs`)
  - **Purpose:** Syncs internal links between pages, runs body-content linking
  - **Status:** Needs review and likely re-run
- [ ] Add internal links TO orphan pages (20 pages with <2 incoming links)
  - **Most orphaned:** site-health, admin/seo-dashboard, brunswick, kittery, maine-cannabis-business-insurance
  - **Fix:** Add contextual links from related pages
- [ ] Add internal links FROM thin internal-link pages
  - **Pages with only 1 internal link:** maine-cannabis-edibles-compliance, extraction-licensing, product-testing-guide, vendor-directory, /admin

### 🟠 HIGH — External Linking / GEO Alliances
- [ ] Audit and fix broken external links (12 broken Maine.gov links)
  - **Known bad:** labor/workers-compensation, dafs/ocp/* pages
  - **Fix:** Find current Maine OCP URLs and update
- [ ] Establish external link partnerships
  - **Targets:** Maine Chamber of Commerce, Maine Cannabis Association, local SBDC, OCP-linked municipalities
  - **Tactic:** Offer to link to their resources if they link to relevant guide pages

### 🟡 MEDIUM — Private Gated Directory
- [ ] Design `/directory/` — Professional contact directory for Maine cannabis
  - **Gated:** Requires email + approval (Formspree + manual review)
  - **Content:** Lenders, accountants, lawyers, security firms, real estate brokers with cannabis experience
  - **Monetization angle:** Featured listings, "verified" badges, premium profiles
  - **SEO value:** High-value long-tail pages, builds E-E-A-T through expertise citations

## 📋 Queued (Next Sprint)

### 🟡 MEDIUM
- [ ] Visible author byline + date on ALL content pages (not just guides)
  - Pages missing: founders/* pages need visible byline block, not just JSON-LD
- [ ] Visible `lastUpdated` date on all guide pages
  - Currently only in JSON-LD, scanner wants visible `<time>` element
- [ ] LCP image preload hints for hero images (27 pages affected)
  - Add `rel="preload"` for above-the-fold hero images on guide pages
- [ ] Add `hreflang="en-US"` for internationalization signals

### 🟢 LOW
- [ ] Founders page hero images — swap stock Unsplash for Maine-specific imagery
- [ ] Add FAQ schema to high-competition guide pages (Portland, Bangor)
- [ ] Build GEO citation tracker (update `/admin/seo-dashboard/` with automated prompts)

## ⚫ BACKLOG — Future Phase

### Phase: GEO Dominance (Q2 2026)
- [ ] Build "Maine Cannabis FAQ" hub page linking all 41 city guides
- [ ] Create "Cannabis Legalized States" cross-link map (not Maine-specific — informational)
- [ ] PDF founders bible — convert lead magnet markdown to downloadable PDF
- [ ] Vendor directory page with categorized service providers

### Phase: Authority Building
- [ ] Guest blog outreach to Maine cannabis media outlets
- [ ] Municipal zoning resource pages for each of the 15 opt-in towns
- [ ] "Maine Cannabis Industry Report" — annual gated PDF with market data

### Phase: Monetization Infrastructure
- [ ] Affiliate links to cannabis-adjacent services (POS systems, insurance, banking)
- [ ] Featured directory listings (paid placement)
- [ ] Lead gen fees from referred businesses

---

## Metrics Tracker

| Goal | Target | Current | Status |
|------|--------|---------|--------|
| SquirrelScan Score | 90+ (Grade A) | 89 | 🟠 HIGH |
| GSC Indexed Pages | 61/61 | ~30? | 🔴 CRITICAL |
| Internal Link Count | >5 per page avg | Low | 🔴 CRITICAL |
| External Domains Linking | >10 | ~2 | 🟠 HIGH |
| GSC Position (avg) | <10 | ~10-12 | 🟡 MEDIUM |
| GSC Clicks | >100/mo | ~0 | 🔴 CRITICAL |

*Last updated: 2026-04-05 04:00 AM EDT*

# Maine Dispensary Guide — Project Todos

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Active Sprint (Sprint 22 — April 4, 2026)

### 🔴 CRITICAL
- [x] Score 92 Grade A maintained ✅ (target: 90+)
- [x] Orphan page fixes: kittery, events-2026, site-health, scarborough, westbrook ✅
- [x] A11y: Fixed 12 identical "contact →" links on directory ✅

### 🟠 HIGH — Pending
- [x] Add external links to founders pages ✅ (all 3 founders now have contextual external links)
- [ ] Vercel Analytics setup — need CLI/API access
- [x] Add internal links to weak/orphan pages ✅ (kittery, events-2026, scarborough, westbrook, site-health)
- [ ] Add contextual external links to all guide pages (2-5 per page)

### 🟡 MEDIUM — Queued
- [x] Add link to `/directory/` from nav or resources page ✅ (linked from resource hub Callout)
- [x] Fix "identical links same purpose" on directory ✅ (12 unique link names)
- [ ] Add LCP preload hints for hero images (27 pages)
- [ ] Add FAQ schema to high-competition guide pages (Portland, Bangor)
- [ ] Fix color contrast warnings on 5 pages
- [ ] Fix remaining identical links on: find-a-dispensary, launch-checklist, taxation-280e, westbrook

---

## 📋 External Linking Strategy — COMPLETED April 4, 2026

### Answers (From Moz/Google SEO Research + SquirrelScan):

**1. Outbound vs inbound balance:** New sites should link OUT sparingly but strategically (1-5 per page), mostly to .gov/.edu/.org authoritative sources. Focus primarily on earning inbound links through outreach.

**2. Linking to competitors:** Use nofollow for Leafly/competitor links. Use dofollow for government sources (OCP, Metrc, IRS). Use contextual dofollow for authoritative media references (Mainebiz, Maine Public).

**3. Dofollow vs nofollow:** Modern Google treats nofollow as a hint — almost any link may pass equity. Use nofollow for paid/sponsored/untrusted links. Use dofollow for editorial references to authoritative sources.

**4. Resource page E-E-A-T:** Linking to official Maine.gov sources is highly E-E-A-T positive — demonstrates content is editorially curated and verifiable against official sources.

**5. Anchor text:** Use descriptive anchors ("OCP adult-use license application") not generic ("click here"). Mix branded, descriptive, and generic.

**6. Frequency:** 2-5 contextual external links per guide page, 3-5 per editorial/story page. Avoid >10 per page (looks like link farm).

**Full strategy documented in:** `link-outreach.md`

### Next Step: Research what Google/GSC guidelines say about outbound linking for new sites, and whether linking to sites like Leafly/Ganjapreneur helps or hurts.

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
| SquirrelScan Score | 90+ (Grade A) | 92 | ✅ |
| GSC Indexed Pages | 61/61 | ~30? | 🔴 CRITICAL |
| Internal Link Count | >5 per page avg | ~2-3 avg | 🟡 MEDIUM |
| External Domains Linking | >10 | ~2 | 🟠 HIGH |
| GSC Position (avg) | <10 | ~10-12 | 🟡 MEDIUM |
| GSC Clicks | >100/mo | ~0 | 🔴 CRITICAL |

*Last updated: 2026-04-04 05:15 AM EDT*

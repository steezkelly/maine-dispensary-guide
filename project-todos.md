# Maine Dispensary Guide — Project Todos

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Active Sprint (Sprint 19 — TBD)

### 🔴 CRITICAL
- [x] Score 92 Grade A achieved (target: 90+) ✅
- [x] E-E-A-T visible byline on ALL content pages ✅
- [x] `/admin/` broken link cleared ✅

### 🟠 HIGH — Pending
- [ ] Add external links to founders pages (scanner flagged 0 external links)
- [ ] Vercel Analytics setup — need CLI/API access
- [ ] Add article-links (external links) to all guide pages

### 🟡 MEDIUM — Queued
- [ ] Add link to `/directory/` from nav or resources page (currently orphan)
- [ ] Add LCP preload hints for hero images (27 pages)
- [ ] Add FAQ schema to high-competition guide pages (Portland, Bangor)
- [ ] Fix color contrast warnings on 5 pages
- [ ] Fix "identical links same purpose" a11y warnings

---

## 📋 External Linking Strategy — Research & Planning

### Question for Next Session:
**What is the best approach for new content websites to approach external linking to other sites for authority/trust signals?**

Key sub-questions:
1. **Outbound vs inbound balance** — How many external links should a new site link OUT to establish trust vs. how many it should receive?
2. **Linking to competitors** — Is it good or bad to link out to competing resource sites? (E.g., linking to Leafly, Ganjapreneur from our Maine guide pages)
3. **Dofollow vs nofollow** — Should new sites use nofollow on outbound links, or is that counterproductive?
4. **External links in resource content** — Our new `/resources/maine-cannabis-official-resources` links to official Maine.gov sites. Is this good for E-E-A-T? Should we also link to relevant industry media?
5. **Anchor text strategy** — Using brand names vs generic anchor text for external links
6. **Frequency** — How often should guide pages link externally vs. internally?

### Known Best Practices (From Research):
- External links to high-authority sites (govie, edu, established media) can boost perceived E-E-A-T
- Link OUT to relevant sources as evidence/support — this is standard editorial practice
- Avoid excessive outbound links (warns search engines you're just a "link farm")
- "Links to nowhere" (non-relevant external links) hurt more than help
- No-follow attribute: Use for paid links, sponsored content, untrusted content; avoid on editorial outbound links

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
| SquirrelScan Score | 90+ (Grade A) | 89 | 🟠 HIGH |
| GSC Indexed Pages | 61/61 | ~30? | 🔴 CRITICAL |
| Internal Link Count | >5 per page avg | Low | 🔴 CRITICAL |
| External Domains Linking | >10 | ~2 | 🟠 HIGH |
| GSC Position (avg) | <10 | ~10-12 | 🟡 MEDIUM |
| GSC Clicks | >100/mo | ~0 | 🔴 CRITICAL |

*Last updated: 2026-04-05 04:00 AM EDT*

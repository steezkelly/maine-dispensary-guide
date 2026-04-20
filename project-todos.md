# Maine Dispensary Guide — Project Todos

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Active Sprint (Sprint 47 — April 20, 2026)

### 🔴 CRITICAL
- [x] Score 100/100 (A) ✅ — Achieved Apr 19 (was 91)
- [x] 0 TypeScript errors ✅ — After Sprint 46 fix
- [x] All sub-75 pages expanded ✅ (cultivation 3,569w, delivery 1,525w, inventory 1,772w, marketing 4,777w, homepage 4,497w)

### 🟠 HIGH — Pending (Active)
- [ ] Domain warm-up — 5/10 emails sent (Apr 20), tracking in link-outreach.md
- [ ] Establish external link partnerships (strategy exists, 5 warm-up emails sent, outreach pending)
  - **Priority targets:** Mainebiz, Ganjapreneur, Maine Beacon, Cannabis Business Times
  - **Secondary:** Maine Chamber, Maine SBDC, SCORE Maine

### ✅ Sprint 46 Completed (Apr 19) — Expand 280E Guide + License Denial
- [x] Expanded `maine-cannabis-280e-guide.astro` with comprehensive 280E content ✅
- [x] Created `maine-cannabis-license-denied.astro` — new guide page ✅
- [x] Internal linking improvements ✅

### ✅ Sprint 45 Completed (Apr 19) — Micro-Niche Domination
- [x] Caregiver transition guide added ✅
- [x] Opt-in tracker page added ✅
- [x] Content expansion across 12 guide pages ✅

### ✅ Sprint 44 Completed (Apr 19) — Path C Strategy + fal.ai
- [x] Path C transitional authority strategy adopted (Oracle + Council unanimous) ✅
- [x] Tag system added to Layout — `tags` prop with CSS badge styling ✅
- [x] fal.ai integration — `@fal-ai/client` installed, FLUX 2 Pro working ✅
- [x] Psilocybin blog post noindex removed ✅
- [x] Internal links from regulations/market guides to psychedelic post ✅

### ✅ Sprint 43 Completed (Apr 19) — Founders Page Images
- [x] All 3 founder story heroes swapped to Maine-specific Unsplash photos ✅

### ✅ Sprint 42 Completed (Apr 19) — Image & Multimedia Overhaul
- [x] 74 unique hero images generated via fal.ai Flux 2 Pro ✅
- [x] 12 infographic images generated and embedded ✅
- [x] 86 total images — all verified referenced, 0 orphaned ✅

### ✅ Sprint 41 Completed (Apr 19) — Psychedelic Policy Blog Post
- [x] Trump psychedelic executive order blog post created ✅

### ✅ Sprint 40 Completed (Apr 19) — Content Expansion Round 2
- [x] Auburn, Sanford, Augusta guides expanded (270-280 lines each) ✅

### ✅ Sprint 39 Completed (Apr 19) — Website Redesign & Monetization
- [x] Heritage Authority homepage redesign ✅
- [x] Directory monetization (Basic/Free, Professional/$49/yr, Premium/$149/yr) ✅
- [x] 3 city guides expanded (Scarborough, Westbrook, Saco) ✅

### ✅ Sprint 38 Completed (Apr 19) — TypeCheck Cleanup
- [x] All 123 TypeScript errors fixed ✅
- [x] Callout component warnings fixed ✅
- [x] Table caption attribute errors resolved ✅

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
- [x] Audit and fix broken external links (12 broken Maine.gov links) ✅ — Most fixed via Apr 5 sprints; municipal-resources URL verified working (Apr 13)
  - **Known bad:** labor/workers-compensation, dafs/ocp/* pages — all redirected to /adult-use or /resources
- [ ] Establish external link partnerships
  - **Targets:** Maine Chamber of Commerce, Maine Cannabis Association, local SBDC, OCP-linked municipalities
  - **Tactic:** Offer to link to their resources if they link to relevant guide pages

### 🟡 MEDIUM — Private Gated Directory
- [x] Design `/directory/` — Professional contact directory for Maine cannabis ✅ (built at `/directory.astro`)
  - **Gated:** Requires email + access code (maine2026 — user should change in production)
  - **Content:** Lenders, accountants, lawyers, security firms, real estate brokers with cannabis experience
  - **Monetization angle:** Featured listings, "verified" badges, premium profiles
  - **SEO value:** High-value long-tail pages, builds E-E-A-T through expertise citations

## 📋 Queued (Next Sprint)

### 🟡 MEDIUM
- [x] Visible author byline + date on ALL content pages (not just guides) ✅ (article-meta block in Layout.astro covers all guide + founder pages)
- [x] Visible `lastUpdated` date on all guide pages ✅ (`<time datetime>` added to article-meta in Layout.astro)
- [x] LCP image preload hints for hero images (27 pages affected) ✅ (built into Layout.astro heroImage preload)
- [x] Add `hreflang="en-US"` for internationalization signals ✅ (added to Layout.astro)

### 🟢 LOW
- [ ] Founders page hero images — swap stock Unsplash for Maine-specific imagery
- [x] Add FAQ schema to high-competition guide pages (Portland, Bangor) ✅ (5 FAQs + JSON-LD FAQPage each)
- [ ] Build GEO citation tracker (update `/admin/seo-dashboard/` with automated prompts) — Currently manual via `/admin/seo-dashboard.astro`

## ⚫ BACKLOG — Future Phase

### Phase: GEO Dominance (Q2 2026)
- [x] Build "Maine Cannabis FAQ" hub page — 22 FAQs across 5 categories, FAQPage schema ✅ (Apr 20)
- [ ] Create "Cannabis Legalized States" cross-link map (not Maine-specific — informational)
- [x] PDF founders bible — Printable roadmap page created at `/download/roadmap` ✅ (Apr 20)
- [ ] Vendor directory page with categorized service providers

### Phase: Authority Building
- [ ] Professional email domain setup (@mainedispensaryguide.com) — prerequisite for all outreach credibility (government, media, partnerships)
- [ ] Guest blog outreach to Maine cannabis media outlets
- [ ] Municipal zoning resource pages for each of the 15 opt-in towns
- [ ] "Maine Cannabis Industry Report" — annual gated PDF with market data

### Phase: Multi-Agent Infrastructure
- [x] Configure oh-my-opencode-slim 6-agent system ✅ (Apr 13)
- [x] Fix Council system — 3/3 councillors working ✅ (Apr 14)
  - alpha=MiniMax-M2.7, beta=big-pickle, gamma=nemotron-3-super-free
  - Root cause: stale models.json cache — fixed by deleting and restarting
  - Timeout increased to 5 min
- [x] Enable foreground fallback chains ✅ (Apr 14)
  - Per-agent model chains for rate limit protection
  - Council master fallback: big-pickle
- [x] Enable todo continuation ✅ (Apr 14)
  - autoEnable threshold: 3 todos, max 5 continuations, 30s cooldown
- [x] Set scoring engine to v2 ✅ (Apr 14)
- [x] Reduce background concurrency to 5 ✅ (Apr 14)
- [x] Investigate psmux/multiplexer ✅ (Apr 14)
  - psmux v3.3.2 installed, `tmux` alias works
  - Configured `"multiplexer": { "type": "tmux", "layout": "main-vertical", "main_pane_size": 60 }`
  - Works with `opencode-cli` inside psmux session — spawns live panes for agents
  - Does NOT work with OpenCode Desktop (GUI) — use CLI for multiplexer view
  - Quick start guide: `reference/psmux-quickstart.md`
- [ ] Configure OpenRouter multi-agent router for additional model diversity (optional future)

### Phase: Monetization Infrastructure
- [ ] Affiliate links to cannabis-adjacent services (POS systems, insurance, banking)
- [ ] Featured directory listings (paid placement)
- [ ] Lead gen fees from referred businesses

---

## Metrics Tracker

| Goal | Target | Current | Status |
|------|--------|---------|--------|
| SquirrelScan Score | 90+ (Grade A) | **100** | ✅ |
| Pages Built | 79+ | 79 | ✅ |
| GSC Indexed Pages | 61/61 | Unknown | ⚠️ USER ACTION |
| Internal Link Count | >5 per page avg | 0 orphans | ✅ |
| External Domains Linking | >10 | ~2 (est.) | 🟠 HIGH |
| GSC Position (avg) | <10 | Unknown | ⚠️ USER ACTION |
| GSC Clicks | >100/mo | ~0 | 🔴 CRITICAL |
| fal.ai Images | 86 | 86 | ✅ |
| Hero Images | 75 | 75 | ✅ |
| Infographics | 12 | 12 | ✅ |

*Last updated: 2026-04-20 EDT*

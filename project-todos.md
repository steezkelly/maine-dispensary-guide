# Maine Dispensary Guide — Project Todos

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Active Sprint (Sprint 36 — April 18, 2026)

### 🔴 CRITICAL
- [x] Score 91 Grade A maintained ✅ (target: 90+)
- [x] Content audit: 48 files audited (44 guides + 4 blog) ✅
- [x] P0 fixes: 6 worst-scoring pages improved (microbusiness 46→76, portland 54→74, how-to-open 66→76, cultivation 63→88, cultivation-license 73→83, POS 73→88) ✅
- [x] Promo/AI cleanup: All promo words eliminated (11→0), all AI phrases eliminated (1→0) ✅
- [x] Thin content expansion: 8 pages expanded from <850 to 1000+ words (inventory, waste, edibles, delivery, banking, staffing, regulations, extraction) ✅
- [x] GEO citations: Statistics and source citations added to all expanded pages ✅
- [x] Schema markup: FAQ schema added to 2 pages (real-estate, market), HowTo schema added to 3 pages (how-to-open, extraction, inventory) ✅
- [x] Readability: 40+ long sentences broken across microbusiness and portland-cannabis files ✅

### 🟠 HIGH — Pending
- [ ] Establish external link partnerships
  - **Targets:** Maine Chamber of Commerce, Maine Cannabis Association, local SBDC, OCP-linked municipalities
  - **Tactic:** Offer to link to their resources if they link to relevant guide pages
- [ ] Domain warm-up for mainedispensaryguide.com email (Purelymail configured, catch-all routing active)

### ✅ Sprint 35 Completed (Apr 18) — System Readiness
- [x] Deleted orphaned `national-hub-architect/` directory ✅
- [x] Fixed `src/env.d.ts` to modern Astro reference pattern ✅
- [x] Synced `reference/project-status.md` with Sprint 34 data ✅
- [x] Fixed `reference/reference.md` squirrelscan command ✅
- [x] Added `.github/workflows/ci.yml` for automated typecheck + build ✅
- [x] Added `.env.example` for new developers ✅
- [x] Updated `AGENTS.md` with correct guide count (47 pages) ✅
- [x] Added root doc references to `reference/reference.md` ✅
- [x] Updated `reference/environment.md` Git version note ✅
- [x] Committed 6 new content pages (2 blog, 4 guides) ✅

### ✅ Sprint 36 Completed (Apr 18) — OG Images & Polish
- [x] Created branded OG image (`public/og-image.svg`) — 1200x630 Heritage Authority design ✅
- [x] Updated `Layout.astro` — all pages have `og:image` and `twitter:image` with fallback ✅
- [x] Fixed dark mode card readability — replaced `background: white` with `var(--color-surface)` across 16 files ✅
- [x] Replaced favicon with branded pine tree design ✅
- [x] Updated homepage `modifiedDate` to 2026-04-18 ✅

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
- [ ] Build "Maine Cannabis FAQ" hub page linking all 41 city guides
- [ ] Create "Cannabis Legalized States" cross-link map (not Maine-specific — informational)
- [ ] PDF founders bible — convert lead magnet markdown to downloadable PDF
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
| SquirrelScan Score | 90+ (Grade A) | 91 | ✅ |
| GSC Indexed Pages | 61/61 | ~30? | 🔴 CRITICAL |
| Internal Link Count | >5 per page avg | ~2-3 avg | 🟡 MEDIUM |
| External Domains Linking | >10 | ~2 | 🟠 HIGH |
| GSC Position (avg) | <10 | ~10-12 | 🟡 MEDIUM |
| GSC Clicks | >100/mo | ~0 | 🔴 CRITICAL |

*Last updated: 2026-04-14 09:25 PM EDT*

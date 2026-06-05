# Maine Dispensary Guide — Project Todos

## Priority Legend
| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Blocks score/growth, do now |
| 🟠 HIGH | Impacts ranking/indexing, sprint this |
| 🟡 MEDIUM | Improves UX/content, queue for next sprint |
| 🟢 LOW | Nice-to-have, do when idle |
| ⚫ BACKLOG | Future phase, not yet planned |

## 🚀 Active Sprint (June 5 2026 — Tier 1+2 Keyword Gap Assault)

### ✅ Sprint 50 Completed (Jun 5) — 280E Merge + Hub Flag
- [x] Merged 3 280E pages → 1 canonical `/guides/maine-cannabis-taxes-2026` ✅
  - Added 6 deep-dive sections (COGS maximization, entity separation trap, IRS audit prep, book-to-tax reconciliation, hiring cannabis CPA, Schedule III rescheduling)
  - Deleted `maine-cannabis-280e-guide` + `maine-cannabis-taxation-280e`
  - Added 2 permanent redirects in `vercel.json` (Vercel renders as 308)
- [x] Portland cannibalization disambiguation: surgical intent-split via title/H1/banner ✅
  - `portland-dispensary-guide` → "Where to Buy Cannabis in Portland, Maine: 2026 Buyer's Guide" (consumer)
  - `portland-maine-cannabis` → kept as operator's guide
  - Both pages got green-bordered aside banners with cross-links
- [x] Flagged in BOT_COLLABORATION_HUB ✅ (per AGENTS.md "don't overwrite content pages without flagging")

### ✅ Sprint 49 Completed (Jun 5) — OCP Directory Section
- [x] 86 OCP-licensed Maine towns added to `/find-a-dispensary` ✅
  - Source: OCP Adult-Use + Medical Caregiver CSVs (April 2026)
  - 25 with adult-use retail, 61 with caregiver storefronts
  - Excluded 169 caregiver-cultivation-only towns (no retail access)
  - Excluded 41 cities already in MDG curated list
  - Each card: town name, access type tag, retailer count, sample businesses, Map/OCP links
- [x] Hero badge updated: "73 Curated Local Guides + 86 OCP-Licensed Towns" ✅
- [x] Regenerator script: `scripts/ocp/fetch-ocp-towns.py` ✅
  - Run monthly when OCP publishes new CSVs (first week of each month)

### ✅ Sprint 48 Completed (Jun 5) — Tier 1 + Tier 2 Blog Posts
- [x] 7 Tier 1 + Tier 2 blog posts shipped ✅
  - /blog/best-maine-dispensaries-2026, cheapest-maine-dispensary-2026, recreational-cannabis-near-acadia (Tier 1)
  - /blog/best-maine-edibles-2026, best-live-rosin-maine, maine-rso-guide, maine-cannabis-budtender-careers, cannabis-friendly-maine-travel, maine-dispensary-gift-cards, maine-medical-marijuana-patient-guide (Tier 2)
  - All 1,500-4,500 words, FAQPage JSON-LD, internal links, semantic HTML
  - Authors: Eliot Nash, Margaret Finch, Thalia Greene, Steve Kelly, Calvin Waters
- [x] 12 new city guide pages (Tier 2 city expansion) ✅
  - bar-harbor, ellsworth, orono, presque-isle, skowhegan, dover-foxcroft, newport, machias, calais, houlton, millinocket, lincoln
- [x] 22 hero images generated via minimax (12 cities + 10 blogs) ✅
  - 1280x720 JPEG, 200-700KB, all live with 200 status
- [x] IndexNow submissions: 22 URLs (15 + 7) ✅

### 🔄 Theme 2026 — HELD on feature branch
- [ ] Review + merge to main: commits 7ac0793, 491bf9b, c3f5c17 on `feature/theme-2026-fusion` ✅
  - Token-level CSS override (existing --color-* names preserved)
  - New palette: spruce `#1F4D3A` + cream `#F4F1E4`
  - Elevation tiers (--elev-1, --elev-2, --elev-3, --elev-glow)
  - Visually validated via 6 PNG screenshots in `sketches/theme-screenshots/`
  - **To revert:** remove override block in Layout.astro + delete `src/styles/theme-2026.css`
  - **Risk:** affects every page. Low technical risk (reversible), medium product risk (visual change).

## 🟠 HIGH — Pending (Next Sprint)
- [ ] Theme 2026 → main merge decision (visual redesign, should ship after user review)
- [ ] GSC data pull (requires OAuth re-auth, would let us see real query + impression data)
- [ ] 86 OCP-only cities → expand top 10-15 by search volume into full guide pages (current directory cards are sufficient for long-tail SEO but full guides would compound the value)
- [ ] External link partnerships (5 warm-up emails sent, outreach pending)
  - Targets: Mainebiz, Ganjapreneur, Maine Beacon, Cannabis Business Times
  - Secondary: Maine Chamber, Maine SBDC, SCORE Maine

## 🟡 MEDIUM — Backlog
- [ ] Domain warm-up — Set real credentials in `config/credentials/mainedispensaryguide.env`, add more contacts, queue.cjs running daily
- [ ] Cannabis Legalized States cross-link map (informational, not Maine-specific)
- [ ] Vendor directory page with categorized service providers
- [ ] Lead gen fees from referred businesses
- [ ] Affiliate links to cannabis-adjacent services (POS systems, insurance, banking)
- [ ] Featured directory listings (paid placement)
- [ ] Municipal zoning resource pages for each of the 15 opt-in towns
- [ ] Maine Cannabis Industry Report — annual gated PDF with market data
- [ ] PDF founders bible (ROADMAP_FOUNDERS_BIBLE.md → styled PDF w/ Heritage Authority branding)

## 🟢 LOW — Nice-to-Have
- [ ] Founders page hero images — swap stock Unsplash for Maine-specific imagery
- [ ] Build GEO citation tracker (currently manual via `/admin/seo-dashboard.astro`)

## ⚫ BACKLOG — Future Phase

### Phase: Authority Building
- [ ] Professional email domain setup (@mainedispensaryguide.com) — prerequisite for all outreach credibility
- [ ] Guest blog outreach to Maine cannabis media outlets
- [ ] Configure OpenRouter multi-agent router for additional model diversity (optional future)

### Phase: Monetization Infrastructure
- [ ] Affiliate links to cannabis-adjacent services (POS systems, insurance, banking)
- [ ] Featured directory listings (paid placement)
- [ ] Lead gen fees from referred businesses

## Metrics Tracker
| Goal | Target | Current | Status |
|------|--------|---------|--------|
| SquirrelScan Score | 90+ (Grade A) | **100** | ✅ |
| Sitemap URLs | >150 | **171** | ✅ |
| Pages Built | 79+ | 79 + 22 new + 86 OCP = 187 (semantic) | ✅ |
| GSC Indexed Pages | 61/61 | Unknown | ⚠️ USER ACTION |
| Internal Link Count | >5 per page avg | 0 orphans | ✅ |
| External Domains Linking | >10 | ~2 (est.) | 🟠 HIGH |
| GSC Position (avg) | <10 | Unknown | ⚠️ USER ACTION |
| GSC Clicks | >100/mo | ~0 | 🔴 CRITICAL |
| Hero Images | 75 | **97** (75 prior + 22 new) | ✅ |
| OCP-Covered Cities | 100+ | **159** (73 curated + 86 OCP) | ✅ |

---

*Last updated: 2026-06-05 EDT*
*Previous update: 2026-04-20 (Sprint 47)*
*Source: BOT_COLLABORATION_HUB.md latest entry + sprint log review*

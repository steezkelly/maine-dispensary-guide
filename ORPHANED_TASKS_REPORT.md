# Maine Dispensary Guide — Orphaned Tasks Report
**Generated:** 2026-04-20
**Last Sprint:** Sprint 46 (e777288 — Apr 19, 2026)
**Project Score:** 100/100 (A)

---

## Verification Summary

Items previously flagged as "pending" were audited for current accuracy:

| Item | Previous Status | Current Status | Action |
|------|----------------|----------------|--------|
| Sub-75 readability pages | PENDING | ✅ **RESOLVED** | All expanded (see below) |
| project-status.md | OUTDATED | ⚠️ NEEDS UPDATE | Last updated Apr 18 |

### Sub-75 Pages — ACTUALLY ALL EXPANDED ✅

| Page | Was (Apr 5) | Now (Apr 20) | Status |
|------|-------------|---------------|--------|
| `maine-cannabis-cultivation-guide.astro` | 601 words | **3,569 words** | ✅ Expanded |
| `maine-cannabis-delivery-rules.astro` | 647 words | **1,525 words** | ✅ Expanded |
| `maine-cannabis-inventory-management.astro` | 667 words | **1,772 words** | ✅ Expanded |
| `maine-cannabis-marketing-compliance.astro` | 579 words | **4,777 words** | ✅ Expanded |
| `index.astro` (homepage) | ~300 words | **4,497 words** | ✅ Expanded |

**Conclusion:** The "sub-75 pages" issue is **resolved**. All flagged pages now exceed 1,500 words.

---

## ✅ VERIFIED COMPLETED ITEMS

1. **Score 100/100 (A)** — Achieved Apr 19
2. **0 TypeScript errors** — After Sprint 46 fix
3. **86 images generated** — 75 heroes + 12 infographics, 0 orphaned
4. **fal.ai integration** — Working, API key stored
5. **Internal linking** — 0 orphans (Apr 12 sprint)
6. **External links** — 0 broken links (47 unique URLs across 135 instances)
7. **GA4 Analytics** — Active (`G-HJ3VDBKXH6`)
8. **Purelymail DNS** — Configured (Apr 19)
9. **Tag system** — Added to Layout
10. **Psilocybin post** — noindex removed (council unanimous)

---

## 🔴 ACTIVE PENDING ITEMS

### 1. GSC Indexing Status — UNKNOWN (Requires User Login)

**Last known data (Apr 9):**
- 42 pages marked "Discovered - currently not indexed"
- 5 pages indexed
- Root cause was thin content (now resolved)

**Current state:** Unknown — requires Google Search Console login to verify

**What to do:**
- User needs to log into GSC and check Coverage report
- Run URL Inspection for key pages to request indexing
- Pages with thin content have been expanded

---

### 2. Domain Warm-up — NOT STARTED ⚠️

**What exists:**
- Purelymail configured with catch-all routing to steve@mainedispensaryguide.com
- Research delivered (30-day ramp schedule, DNS checklist, cannabis-specific ESP guidance)
- Scripts created: `setup_purelymail_dns.ps1`

**What's missing:**
- No emails sent yet
- Warm-up ramp NOT started
- Outreach cannot begin without domain warm-up (reputation)

**What to do:**
- Start with 5 emails/day for 1-2 weeks
- Gradually increase to 10-20/day
- Use steve@mainedispensaryguide.com for all initial outreach

---

### 3. External Partnerships Outreach — ZERO DONE ⚠️

**What exists:**
- Strategy document: `link-outreach.md` (complete)
- Outreach templates: `OUTREACH_CAMPAIGN.md` (ready to use)
- Tracking table in `link-outreach.md` — all empty

**What's missing:**
- Zero outreach emails sent
- Zero backlinks acquired
- Zero media placements

**Priority targets (from link-outreach.md):**
1. Mainebiz — guest column pitch
2. Ganjapreneur — announcement submission
3. Maine Beacon — data story pitch
4. Cannabis Business Times — Maine market analysis
5. Maine Chamber — resource partnership
6. Maine SBDC — resource collaboration
7. SCORE Maine — mentoring partnership

**What to do:**
- Begin outreach with Tier 1 media (Mainebiz, Ganjapreneur)
- Follow 30-day domain warm-up before cold outreach
- Track all outreach in `link-outreach.md` tracking table

---

### 4. PDF Magnet (Founders Bible) — NOT CONVERTED ⚠️

**What exists:**
- Source content: `ROADMAP_FOUNDERS_BIBLE.md` (comprehensive)
- Also: `ROADMAP_BIBLE_V1.md`, `ROADMAP_ULTIMATE_EDITION.md`
- Landing page: `/download-checklist.astro` (exists)
- Lead capture: Formspree integrated (`xvgzlowz`)

**What's missing:**
- PDF conversion of markdown content
- Styled PDF download with branding
- Gate/confirmation page after form submit

**What to do:**
1. Convert `ROADMAP_FOUNDERS_BIBLE.md` to styled PDF
2. Use Heritage Authority design (Deep Spruce, Fraunces typography)
3. Add to download-confirmation flow
4. Consider PDF as primary lead magnet vs. current checklist

---

### 5. Professional Email (@mainedispensaryguide.com) — CONFIGURED BUT UNUSED ⚠️

**What exists:**
- Purelymail domain configured
- Catch-all routing active
- DNS setup via Porkbun API

**What's missing:**
- Not being used for outreach
- No email signature configured
- No email templates set up

**What to do:**
- Start using @mainedispensaryguide.com for all outreach
- Set up email signature with domain
- Configure email templates from `OUTREACH_CAMPAIGN.md`

---

## 🟡 BACKLOG (Future Phase — Not Blocking)

| Item | Priority | Notes |
|------|----------|-------|
| GEO Citation Tracker automation | LOW | Manual tracking in SEO dashboard |
| OpenRouter multi-agent router | LOW | Optional model diversity |
| Guest blog outreach | MEDIUM | Part of external partnerships |
| Municipal zoning resource pages | LOW | 15 towns × content = large effort |
| "Maine Cannabis FAQ" hub page | MEDIUM | SEO value for long-tail |
| Annual industry report PDF | LOW | Gated content opportunity |
| Affiliate/lead-gen monetization | LOW | Directory already has paid tiers |

---

## 📋 RECOMMENDED SPRINT PRIORITIES

### Immediate (This Week)
1. **Verify GSC indexing** — User action required
2. **Start domain warm-up** — Send 5/day initial emails
3. **Begin Tier 1 outreach** — Mainebiz, Ganjapreneur

### Next Sprint
4. **Convert PDF Magnet** — Style and integrate Founders Bible PDF
5. **Update project-status.md** — Sync with current state

### Future
6. **Continue outreach expansion** — Scale after initial responses
7. **Build municipal pages** — If city guides need reinforcement

---

## 📁 Relevant Files

| File | Purpose |
|------|---------|
| `link-outreach.md` | External link/partnership strategy + tracking |
| `OUTREACH_CAMPAIGN.md` | Email templates for outreach |
| `ROADMAP_FOUNDERS_BIBLE.md` | PDF magnet source content |
| `setup_purelymail_dns.ps1` | Email domain configuration |
| `BOT_COLLABORATION_HUB.md` | Full sprint history |
| `project-todos.md` | Todo tracking (needs update) |

---

*Report generated by Orchestrator — 2026-04-20*

# Project Status — Maine Dispensary Guide

> Live metrics and current state. Update this file at the end of each sprint.
> Last updated by: OpenCode — April 20, 2026 (EDT)

## Deployment

- **Pages live:** 79 total routes (up from 73)
- **Deployment:** Active on Vercel — Configured for **output: 'static'** for 100% stability
- **Sitemap:** Auto-generated at `/sitemap-index.xml`
- **Bing Webmaster:** ✅ Verified (`msvalidate.01` in Layout.astro)
- **GA4:** ✅ Active (`G-614GHG67ZQ`)
- **Vercel Analytics + Speed Insights:** ✅ Built-in
- **fal.ai:** ✅ Integrated (FLUX 2 Pro, 25s generation)
- **Traffic status:** Early stage — SEO/GEO optimization for AI-discovery is the primary goal

## SEO & Quality Scores

- **SquirrelScan Score:** **100/100 (A) ✅ — 0 ERRORS** (as of Apr 19)
- **Accessibility:** **99/100** — 26 minor contrast warnings only (CSP, Unsplash/Fonts)
- **Content Quality (2026-04-20):**
    - Site avg: **~90/100**
    - Promo words: **0**
    - AI phrases: **0**
    - All sub-75 pages expanded:
      - cultivation-guide: 3,569 words ✅
      - marketing-compliance: 4,777 words ✅
      - inventory-management: 1,772 words ✅
      - delivery-rules: 1,525 words ✅
      - homepage: 4,497 words ✅

## Content Intelligence Skills

- ✅ `content-authority` — SEO/GEO strategic framework, 3-pillar method, information gain
- ✅ `content-humanizer` — AI pattern removal, 22-category editorial guide, automated fixer
- ✅ `content-ops` — Content audit, expand, batch operations
- ✅ `audit-website` (squirrel) — Live-site SEO audit, 230+ rules
- ✅ BreadcrumbList JSON-LD schema (Breadcrumbs.astro)
- ✅ FAQ structured data component (Faq.astro)
- ✅ OpenCodeInsights plugin installed

## Search Stack

- Primary: Brave Search (`brave-search.cjs`) — requires API key
- Secondary: Wikipedia (`wikipedia-search.cjs`) — free, no key
- Backup: SearXNG (`searxng-search.cjs`) — requires self-hosted instance
- Browser: Playwright MCP — for live-site testing and scraping

## Self-Improving

Weekly maintenance scheduled via Windows Task Scheduler.

## Known Gaps

- **PDF Magnet:** `ROADMAP_FOUNDERS_BIBLE.md` exists but not converted to styled PDF — needs conversion + design
- **GSC Indexing:** User needs to log in to verify current indexing status
- **E-E-A-T:** Field data (80) — time-based, needs real traffic

## Active Work

- **Sprint 47 (Apr 20):** Domain warm-up + email automation ✅
  - Purelymail SMTP integrated — 7 emails sent Apr 20
  - Christine Cole (SBDC) replied positively — out of office until Apr 29
  - Email tracking dashboard built at `/admin/email-dashboard/`
  - Day 2 sends: Apr 21 (Mainebiz, Ganjapreneur, Maine Beacon, Cannabis Business Times, Maine Realtors)
- **GSC Indexing:** ⚠️ User action required — log in to verify
- **PDF Magnet:** Ready for conversion (source: `ROADMAP_FOUNDERS_BIBLE.md`)

## Recent Commits (Last 5)

| SHA | Description |
|-----|-------------|
| `d1789ae` | feat(email): domain warm-up system — Purelymail SMTP, tracking dashboard, 7 sends |
| `e777288` | Sprint 46: Expand 280E guide + License denial page + internal linking |
| `d57ba1b` | feat(images): regenerate 75 heroes with flux-pro-5 cannabis-safe model |
| `7f185a3` | feat(image-models): add flux-pro-5 cannabis-friendly model + full model inventory |
| `28024da` | Sprint 45: Micro-niche domination — Caregiver transition + Opt-in tracker |

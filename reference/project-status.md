# Project Status — Maine Dispensary Guide

> Live metrics and current state. Update this file at the end of each sprint.
> Last updated by: OpenCode — April 18, 2026 (EDT)

## Deployment

- **Pages live:** 73 total routes (updated from 64)
- **Deployment:** Active on Vercel — Configured for **output: 'static'** for 100% stability
- **Sitemap:** Auto-generated at `/sitemap-index.xml`
- **Bing Webmaster:** ✅ Verified (`msvalidate.01` in Layout.astro)
- **Traffic status:** Early stage — SEO/GEO optimization for AI-discovery is the primary goal

## SEO & Quality Scores

- **SquirrelScan Score:** **91/100 (A) ✅ — 0 ERRORS** (as of Apr 16)
- **Accessibility:** **99/100** — 26 minor contrast warnings only (CSP, Unsplash/Fonts)
- **Content Quality (2026-04-16):**
    - Site avg: **85/100**
    - Promo words: **0**
    - AI phrases: 0
    - Top scores: 93/100 (taxation, locations, pos, product-testing, sanford)

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

- **PDF Magnet:** The "Ultimate Founders Bible" (lead magnet) exists as MD but needs styling/conversion to PDF.
- **Remaining sub-75:** cultivation (70), delivery-rules (73), inventory (73), marketing (73), homepage (60) — Flesch readability issues
- **E-E-A-T:** Field data (80) — time-based, needs real traffic

## Active Work

- **Sprint 34 completed Apr 16-17:** 6 worst-scoring pages improved, 8 thin pages expanded to 1000+ words, FAQ/HowTo schema added to 14 pages
- **Link Architecture:** Operational — `scripts/link-architect.cjs` running
- **Domain warm-up:** Preparing for outreach emails
- **External link partnerships:** In progress

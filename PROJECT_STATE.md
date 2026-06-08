# Project State: Maine Dispensary Guide

> **Sprint 77 update (2026-06-07):** This file was 64 days stale
> (last touched 2026-04-04). Refreshed to reflect the actual current
> state of the site. The Hub (`BOT_COLLABORATION_HUB.md`) is the
> authoritative sprint log; this file is the snapshot.

## Technical Stack
- **Framework:** Astro 6.0.5
- **Modules:** `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/vercel`
- **Architecture:** Maine-Focused Hub
- **Status:** Vercel Production Live.

**Scope: Maine Only** — This is a Maine-focused property. Do NOT build state-specific hubs for other states.

## Deployment
- **Platform:** Vercel (Production)
- **Primary Domain:** [https://mainedispensaryguide.com](https://mainedispensaryguide.com)
- **Status:** LIVE
- **Last-deploy health:** see `/status.json` (machine-readable snapshot)
  or `node scripts/admin/sprint-score.cjs` (text report).

## Site Structure (current as of 2026-06-07)
- **Homepage:** `/` — Optimized for SEO clusters; includes start-here journey, resource cards, lead capture.
- **Guides Index:** `/guides/` — 5 categories (Business, Compliance, Cities, Operations, Market).
- **City Guides:** **109** Maine cities/towns (Portland, Bangor, Lewiston, Augusta, Auburn, Biddeford, Brunswick, Saco, Scarborough, Sanford, Waterville, Westbrook, South Portland, Old Orchard Beach, Kittery, + 94 small towns).
- **Technical Guides:** **48** deep-dives (280E Taxes, Metrc, Staff Licensing, Real Estate, etc.).
- **Blog:** 35 posts (Tier 1 + Tier 2 keywords).
- **Total pages:** 224 html (221 in sitemap; 3 admin/download/404 are intentionally noindex).
- **Sitemap:** `/sitemap-index.xml` (auto-generated, 221 URLs).
- **Live health snapshot:** `/status.json` (auto-refreshed on every build).

## Recent Optimizations (Sprint 70+)
- **Sprint 70:** llms.txt / llms-full.txt regenerated with all 109 city guides (AI discoverability).
- **Sprint 73:** Text-ratio audit fixed 27 Semrush "low text to HTML ratio" URLs.
- **Sprint 74:** 4 new Tier 1 B2B guides (Schedule III 280E, LD 1840 caregiver trade show, LD 1897 sun-grown 150-plant, 2026 operator cost update).
- **Sprint 75:** 13 new city guides (Peru, West Paris, Stratton, Chelsea, Winslow, Solon, Rome, Somerville, Columbia, Baring Plantation, Guilford, Greenville, Medway); fact-check fixes for tax/grace period across 13+ files.
- **Sprint 76:** Email-dashboard 404 fixed; CI regression-detection added (3 new build steps); 5 form instrumented with GA4 `lead_capture` events.
- **Sprint 77:** 404 page city count 40+ → 109+; /status.json live; IndexNow submission log; 224-page HEAD smoke (4.9s, 0 broken); 6 stale roadmap drafts archived.

## Bot Collaboration Patterns
- **Hub as source of truth:** `BOT_COLLABORATION_HUB.md` is the single log of all agent activity (372K+ lines, ~354 status symbols).
- **Multiple agents active in parallel:** OpenCode, Gemini CLI, Claude Code, Hermes, Codex. AGENTS.md has parallel-session coordination patterns.
- **Pre-push verification (Sprint 76b):** `scripts/git/pre-push-verify.cjs` runs esbuild parse + astro check on changed files before push.
- **Communication:** Hub entries are appended per-sprint; status changes are flagged in the Hub header line.
- **AGENTS.md:** governs permissions ("edit freely when reversible, flag one-way-door changes").

## Commands
- `npm run build` — Production build (via `vercel-build.sh` which now also writes `/status.json`).
- `vercel deploy --prod` — Deploy to production.
- `npm run dev` — Local development.
- `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` — One-shot health snapshot.
- `node apps/maine-cannabis/scripts/build/smoke-200.cjs` — HEAD-200 check all 223 published pages.
- `node apps/maine-cannabis/scripts/submit-indexnow.cjs --from-sitemap` — Submit sitemap to IndexNow (logs to `/data/indexnow-log.jsonl`).

## Open Work (Sprint 78+ candidates)
- **Form completion GA4 dashboard** — `lead_capture` events now fire, but no dashboard panel is built yet. Set up a GA4 exploration to surface the per-form conversion rate.
- **GSC data ingestion** — No GSC export automation yet. Daily GSC clicks/impressions dump to `data/gsc-history.jsonl` is queued.
- **187 active-dispensary count** — Hardcoded in `404.astro` and `index.astro`. Should come from a single `data/site-stats.json` that's updated by `fetch-ocp-towns.py` (currently writes to find-a-dispensary.astro inline).
- **Pre-existing content-health baseline (24 failures)** — Documented and tracked, not fixed (Sprint 76 design).
- **Email outreach expansion** — `data/email-tracking.json` has 5 entries from 2026-04-20; outreach paused. Sprint 77 unblocked visibility but actual outreach is the next step.

---
*Last Updated: 2026-06-07 EDT (Sprint 77 observability pass)*

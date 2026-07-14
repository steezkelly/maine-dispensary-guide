# Project State: Maine Dispensary Guide

> **2026-07-08 refresh:** Refreshed to reflect Sprints 78a–78t + 2026-07-07
> backlink campaign. The Hub (`BOT_COLLABORATION_HUB.md`) remains the
> authoritative sprint log; `MISSION_CONTROL.md` and `/status.json` are
> the live health snapshots; this file is a curated high-level view.

## Technical Stack
- **Framework:** Astro 6.0.5
- **Modules:** `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/vercel` (v11.0.2)
- **Architecture:** Maine-Focused Hub; static output (`output: 'static'`) + Vercel adapter
- **Status:** Vercel Production Live.

**Scope: Maine Only** — This is a Maine-focused property. Do NOT build state-specific hubs for other states.

## Deployment
- **Platform:** Vercel (Production)
- **Primary Domain:** [https://mainedispensaryguide.com](https://mainedispensaryguide.com)
- **Status:** LIVE (production continuously healthy; smoke 254/254+ per Hub)
- **Last-deploy health:** see `/status.json` (machine-readable snapshot)
  or `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` (text report).
- **env vars:** none currently in production Vercel — all lead-magnet forms
  flow through Formspree externally.

### Intent Continuity Architecture pilot

- A fixed 10-route release-1 pilot is production-verified as of `2026-07-13T17:17:25Z`.
- Pilot page-bottom order is: editorial next dependency → separate contextual action → existing `AutoRelated` discovery.
- `Layout.astro` keeps legacy behavior as the default; pilot activation is explicit per route.
- Editorial and contextual/conversion mappings use separate typed registries. No generated journey graph, recommendation scoring, personalization, progress state, or local storage is part of release 1.
- Structured cohort, baseline, measurement caveats, and treatment clock: `docs/analytics/ICA_PILOT_MANIFEST_2026-07-13.json` and `docs/analytics/ICA_PILOT_BASELINE_2026-07-13.md`.
- Implementation/handoff status (what is wired, measurement gates, and intentionally deferred architecture): `docs/analytics/ICA_IMPLEMENTATION_STATUS_2026-07-13.md`.

## Site Structure (current as of 2026-07-08)

> **Note on numeric counts:** All page/sitemap/post counts below were verified
> against the live production sitemap and built dist on 2026-07-14. They
> will drift with every build; re-derive before quoting. Procedure:
> `curl -s https://mainedispensaryguide.com/sitemap-0.xml | grep -c '<loc>'`
> for sitemap; `find dist -name 'index.html' | wc -l` for built count.

- **Homepage:** `/` — Optimized for SEO clusters; includes start-here journey, resource cards, lead capture.
- **Guides Index:** `/guides/` — Business, Compliance, Cities, Operations, Market categories.
- **City Guides:** **111** Maine cities/towns (Portland, Bangor, Lewiston, Augusta, Auburn, Biddeford, Brunswick, Saco, Scarborough, Sanford, Waterville, Westbrook, South Portland, Old Orchard Beach, Kittery, + 95 small towns).
- **Technical / Operator Guides:** **75** (280E Taxes, Metrc, Staff Licensing, Real Estate, Transfer of Ownership, Conditional License, + 69 others).
- **Blog:** 36 posts.
- **OCP directory:** `/find-a-dispensary` — 86 OCP-licensed towns (25 adult-use retail + 61 caregiver storefronts) in addition to curated guides.
- **Total pages:** 278 html (274 in sitemap; 4 noindex pages — admin/email-dashboard, download/roadmap, experiments, search — correctly excluded per `NOINDEX_PATH_PREFIXES` in `scripts/check/sitemap-postprocess.mjs`).
- **Sitemap:** `/sitemap-index.xml` (auto-generated, 274 URLs; verified 2026-07-14).
- **Live health snapshot:** `/status.json` (auto-refreshed on every build).

## Recent Optimizations (Sprint 78+)

- **Sprint 78e:** Costs-guide title reopt ("How to Open a Dispensary in Maine" anchor, 28d misroute capture) + Bar Harbor interlink.
- **Sprint 78f:** Keyword-gap analysis (13 buyer-intent categories audited) + Maine conditional license guide (closes GAP 1).
- **Sprint 78h:** Maine cannabis transfer-of-ownership guide (closes GAP 3; all 3 gap analysis items closed).
- **Sprint 78i:** YMYL "Last reviewed" E-E-A-T badge rollout across 232/257 (90%) pages; 25 pages skipped (the E-E-A-T artifact pages themselves).
- **Sprint 78j:** ROI blog post stats refresh + 24h re-indexing baseline.
- **Sprint 78k–78t:** Visual-readability polish (9 fixes, AAA contrast for nav hover, 3 broken heroImage paths retired, Callout icons filled, 9 emoji-in-headings → geometric glyphs, duplicate anchor on homepage removed, mega-menu + homepage count refresh, security fixes on `pre-push-verify.cjs` + `audit-fix.cjs`, front-end `closeAllDropdowns()` helper extraction, pre-push self-cleans orphan tsserver.js LSPs).

## Bot Collaboration Patterns
- **Hub as source of truth:** `BOT_COLLABORATION_HUB.md` is the single log of all agent activity.
- **Multiple agents active in parallel:** OpenCode, Gemini CLI, Claude Code, Hermes, Codex.
- **Pre-push verification:** `scripts/git/pre-push-verify.cjs` + `.githooks/pre-push` run esbuild parse + astro check + smoke-200 + smoke-img-200 against production.
- **CI regression-detection:** post-build step `.github/workflows/ci.yml` "Assert Astro SSR function bundle" fails the build if `.vercel/output/functions/_render.func/.vc-config.json` is missing.
- **AGENTS.md:** governs permissions ("edit freely when reversible, flag one-way-door changes").

## Commands
- `npm run dev` — Local development.
- `npm run build` — Production build (via `vercel-build.sh` which also writes `/status.json`).
- `npm run verify:iterate` — Fast iteration verify (esbuild parse + filtered astro check + sitemap postprocess + docs vs code + compressed-frontmatter, ~10–15s, no prod URLs).
- `npm run verify:push` — Full verify including production smoke + image smoke, ~30–45s, hits `mainedispensaryguide.com`.
- `vercel deploy --prod` — Deploy to production.
- `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` — One-shot health snapshot.
- `node apps/maine-cannabis/scripts/build/smoke-200.cjs` — HEAD-200 check all published pages.
- `node scripts/admin/regenerate-llms.cjs` — Refresh `llms.txt` + `llms-full.txt` from sitemap.
- `node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs` — Refresh OCP roster to `src/data/site-stats.json` (currently 98 days stale; live shows 107 stores / 49 municipalities vs stored 187 / 65 — operator decision needed before write).
- `node apps/maine-cannabis/scripts/submit-indexnow.cjs --from-sitemap` — Submit sitemap to IndexNow (logs to `/data/indexnow-log.jsonl`).
- `~/.local/bin/mdg-gsc-daily.sh` — Daily 6am GSC searchanalytics dump.
- `~/.local/bin/mdg-gsc-audit-weekly.sh` — Monday 7am misroute audit.

## Open Work (Sprint 79+ candidates)
- **Form completion GA4 dashboard** — `lead_capture` events fire on all 5 forms, but no dashboard panel is built yet. Set up a GA4 exploration to surface per-form conversion rate once ~7 days of data has accumulated (started 2026-07-06).
- **OCP roster reconciliation** — Live count (107/49) vs stored (187/65) is a real-data change that affects every page reading from `site-stats.json`. Operator scope.
- **`sprint-78k-visual-readability-polish` branch merge** — 11 commits behind main, all verified, needs rebase + ship decision.
- **Pre-existing content-health baseline** — 0 failures (all 19 baseline entries at zero); nothing to fix until a regression surfaces.
- **Email outreach expansion** — `data/email-tracking.json` has the 2026-07-07 backlink-campaign entries; awaiting reply tracking.
- **Hero-image variant utility hardening** — `Layout.astro` couples to a string-convention; future uploads using dimension-suffix recreate the 6-404 bug. Worth a utility-side guard.

---

*Last Updated: 2026-07-13 EDT (ICA release-1 pilot closeout)*
*Previous full refresh: 2026-06-07 (Sprint 77 observability pass)*

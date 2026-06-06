# MDG Health + SEO Audit — 2026-06-06

Scope: 183 HTML pages in dist/, live site mainedispensaryguide.com, Vercel deploy.
Tooling: static dist inspection (no build, no install, no browser automation — AGENTS.md).
Compared against: prior audit (May 14), AGENTS.md guardrails, "production-ready" claim.

VERDICT: production-deployable but with 4 confirmed health/SEO defects and 6 minor issues.
The previously-reported vulnerabilities (15 → 8) and CSS warnings are unchanged; this audit
covers orthogonal issues (h1, sitemap, page weight, cache, noindex, broken external).

═══════════════════════════════════════════════
1. HEALTH — BUGS (fix before next deploy)
═══════════════════════════════════════════════

[H1] 2 blog pages have NO <h1> in rendered HTML
  - dist/blog/cannabis-terpenes-explained-maine-2026/index.html
  - dist/blog/maine-cannabis-gray-market-ocp-enforcement-2026/index.html
  - Both have <title>, meta desc, JSON-LD Article schema, canonical — but body jumps
    straight to <h2>. The H1 must be a <h1>, not a styled div or hidden.
  - Impact: severe SEO regression on these URLs. Google may pick first <h2> as title
    or fail to extract a clean headline for rich results. FAQ + Article schema on
    these pages also looks orphaned without an h1 to anchor to.
  - Fix: in src/pages/blog/[slug].astro or the article layout, ensure exactly one
    <h1> in <main>. Likely regression from the layout refactor (Sprint 73g
    refactor/layout-infrastructure).

[SITEMAP] dist/sitemap-0.xml is a single line, 42 KB
  - 176 <loc> entries (live = 174) all on one line — works for Google but every
    other parser (Screaming Frog, Sitebulb, free validators) chokes. Astro
    @astrojs/sitemap default is fine; minify is happening somewhere (likely an
    Astro 6.3.5 render quirk or an in-tree post-process).
  - Verdict: cosmetic for Google, but the difference between dist 176 and live
    174 deserves a re-deploy of the latest dist to keep them in sync.

[NOINDEX SET] 4 pages emit robots="noindex" — verify intent
  - dist/404.html             (correct — 404 should not be indexed)
  - dist/search/index.html    (correct — internal search results)
  - dist/experiments/index.html (intentional, Sprint 73h — Seed Shelf)
  - dist/download/roadmap/index.html  ← TITLE IS "2026 Maine Dispensary Founder's Bible"
    This page is a high-value lead magnet with full guide content. Why noindex?
    Either a) intended (private), in which case the title/canonical still need
    review for accidental indexation via inbound links; or b) a regression
    that hides the most valuable download. AGENTS.md says this is a "real,
    monetizable web property" — confirm this is intentional.

[404 PAGE] dist/404.html is 43 KB (full layout)
  - Includes SiteHeader, SiteFooter, full nav, 28 @type JSON-LD blocks. Should
    be a minimal page. Wastes ~30 KB per 404 hit and looks like a soft-404 to
    Google (full nav + footer with links = "this is a real page, just no
    content"). Consider a stripped 404 layout with one CTA.

═══════════════════════════════════════════════
2. HEALTH — MINOR (worth a backlog ticket)
═══════════════════════════════════════════════

[OG IMAGE DIMENSIONS] Inconsistent across pages
  - Homepage + license guide: 1280x720 (4:3, marked as image/jpeg)
  - /blog index: 1200x630 image/svg+xml  ← SVG, not a real image
  - /find-a-dispensary, vertical-integration: 1200x400 (3:1 banner)
  - Memory says "og:image:width=1200, og:image:height=630 added across 141
    pages" but actual dist is mixed. Google prefers 1200x630. Pages with
    1200x400 may render with side-crop in some surfaces; pages using SVG
    og:image get a generic placeholder on some platforms.

[PAGE WEIGHT] 9 pages over 95 KB raw HTML
  - find-a-dispensary/index.html: 154.7 KB (largest)
  - 8 guide/blog pages between 95-126 KB
  - Each is a full page render with inlined JSON-LD (up to 86 @type entries
    on find-a-dispensary). Gzipped it's ~18 KB (homepage measured) so wire
    cost is fine; the 154 KB is a developer readability / parser cost issue,
    not a user experience issue.

[CACHE] Vercel serves with cache-control: public, max-age=0, must-revalidate
  - Forces a revalidation on every visit. For a static site this is wasteful
    — Vercel can serve with longer s-maxage. x-vercel-cache: HIT means the
    CDN is caching internally, but browser conditional GETs still round-trip.
  - The vercel.json exists but I didn't audit its full content in this pass.
  - Recommend: static assets max-age=31536000 immutable; HTML s-maxage=3600
    stale-while-revalidate=86400.

[LINK ROT — EXTERNAL] x.com/mainedispensary returns 403 from curl
  - Could be a bot-detection block, but the link is in <link rel="me"> AND
    the WebSite schema sameAs. If the profile is private/suspended, the
    schema validator will flag the dead social link. Worth opening in a
    browser to confirm.

[NO AXE / NO LIGHTHOUSE] no a11y or perf linter installed
  - pa11y / axe-core / lighthouse not in deps (only @playwright/test +
    puppeteer + turbo). Easy to add; would catch issues that static checks miss.

[GOOGLE SEARCH CONSOLE] sitemap re-ping endpoint returns 404
  - The legacy /ping?sitemap= endpoint has been deprecated by Google for years
  — should use Search Console's sitemap interface directly, not the URL ping.

═══════════════════════════════════════════════
3. SEO — CLEAN / VERIFIED GOOD
═══════════════════════════════════════════════

[x] All 183 pages have unique canonical, with trailingSlash:'never' respected
    (0 internal hrefs end in /)
[x] All 183 pages have unique meta description
[x] Live sitemap serves 174 URLs (Google's preferred sitemap protocol)
[x] robots.txt clean: User-agent: *  Allow: /  + sitemap reference
[x] Per-page OG/Twitter cards, geo meta (US-ME, geo.position), hreflang en-US + x-default
[x] JSON-LD valid (0 parse errors across 183 pages); rich @graph with
    Organization + WebSite + SearchAction + BreadcrumbList on all guides
[x] OpenSearch, manifest.webmanifest, 404.html all present in dist
[x] google-site-verification + msvalidate.01 meta tags present on every page
[x] /opensearch.xml + /manifest.webmanifest reachable on live (HTTP 200)
[x] HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy
    all present in live response headers
[x] WWW → non-www 301 redirect in vercel.json (verified in config)
[x] Live homepage TTFB 196-431ms (3 runs); gzipped payload 18 KB
[x] npm audit: 0 vulnerabilities (was 8 dev-only yaml toolchain per memory)
[x] Fonts: preconnect to fonts.gstatic.com + media=print onload swap (good)
[x] Hero image preload with fetchpriority="high" on homepage
[x] 28 JSON-LD @type on homepage including FAQPage + SearchAction + Organization
[x] OG image width/height specified on every page (just inconsistent)

═══════════════════════════════════════════════
4. SUGGESTED PRIORITY ORDER
═══════════════════════════════════════════════

P0 (next deploy)
  - Fix missing <h1> on 2 blog pages
  - Confirm /download/roadmap noindex is intentional; if not, remove
  - Slim 404.html layout

P1 (this sprint)
  - Standardize OG image to 1200x630 across all pages
  - Re-deploy latest dist to bring live sitemap from 174 → 176 URLs
  - Add long-cache headers for static assets in vercel.json
  - Verify x.com/mainedispensary profile is live in a browser

P2 (backlog)
  - Add @axe-core/cli or pa11y to CI
  - Add lighthouse-ci to a weekly cron
  - Pretty-print sitemap-0.xml (one URL per line) for parser compatibility

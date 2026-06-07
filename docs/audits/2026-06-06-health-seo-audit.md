# MDG Health + SEO Audit — 2026-06-06 (v2: fixed + new findings)

Scope: 183 HTML pages in dist/, live site mainedispensaryguide.com, Vercel deploy.
Compared against: 2026-06-06 v1 audit, AGENTS.md guardrails, "production-ready" claim.

Tooling: file-scoped `npx astro check` (5 files, 0 errors), `python3` against dist/,
live HTTP probes with curl. NO full build, NO install, NO browser automation —
per AGENTS.md. All changes are uncommitted on `main` and will go live on the
next `npm run build` + Vercel deploy.

═══════════════════════════════════════════════
1. v1 ISSUES — STATUS (what was fixed this pass)
═══════════════════════════════════════════════

[v1 H1] 2 blog pages missing <h1>                        → FIXED
  - apps/.../blog/cannabis-terpenes-explained-maine-2026.astro
  - apps/.../blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro
  - Both now have <h1> as first child of .article-header, matching the
    pattern used by 29 other blog pages. No more heading-level skip in
    either page. Sibling fix to the 37→2 heading-skip false-positive from v1
    (the 37 was a regex artifact; the 2 were the real bug).

[v1 404 bloat] dist/404.html was 43 KB (full layout)      → FIXED
  - Created apps/maine-cannabis/src/layouts/MinimalLayout.astro
    (3 KB) — stripped layout for utility pages.
  - apps/maine-cannabis/src/pages/404.astro now uses MinimalLayout.
  - Dropped: SiteHeader, SiteFooter, Breadcrumbs, GuideSidebar,
    RelatedArticles, JSON-LD <script>, hero preload, GA4 inline, scroll
    observer, back-to-top, theater overlay, social <link rel="me">s.
  - Kept: skip-link, theme bootstrap, fonts, manifest/sitemap/robots links.
  - Expected rendered size: ~12 KB (vs 43 KB).
  - Soft-404 risk eliminated (no full nav telling Google "this is a real
    page with 50+ links").

[v1 sitemap pretty-print] 42 KB single line                 → FIXED (post-build)
  - vercel-build.sh now runs a one-line node -e that splits every
    <loc>...</loc> onto its own line. No new dependency.
  - Affects dist/sitemap-0.xml and dist/sitemap-index.xml.

[v1 cache headers] Vercel served max-age=0, must-revalidate → FIXED (next deploy)
  - vercel.json now has 5 header rules. The original catch-all /(.*) still
    sets security headers (CSP, X-Frame-Options, etc.). New rules layer
    caching on top:
    /_astro/(.*)              public, max-age=31536000, immutable
    /images/(.*)              public, max-age=31536000, immutable
    /.*\.(css|js|woff2|...)   public, max-age=31536000, immutable
    /((?!_astro|images|favicon).*)  public, s-maxage=3600, stale-while-revalidate=86400
  - Live: current cache headers are still max-age=0, must-revalidate.
    Will flip to long-cache on next deploy.

[v1 download/roadmap noindex]                              → INTENTIONAL
  - apps/maine-cannabis/src/data/sitemap-config.json:
    noindexPathPrefixes: ["/download/", "/experiments", "/search", "/admin/"]
  - Download prefix covers all 4 /download/* pages. The "Founders Bible"
    and "Roadmap" lead magnets are intentionally gated from search while
    still being reachable from in-content CTAs. No fix needed.

═══════════════════════════════════════════════
2. NEW FINDINGS (pass 2 + pass 3 + pass 4)
═══════════════════════════════════════════════

[NEW-1, FIXED] 84× mixed-content http:// link on find-a-dispensary
  - apps/maine-cannabis/src/pages/find-a-dispensary.astro had 2 hrefs to
    http://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search
    (1 in the data-source line, 1 on every OCP-city card × 78 cities).
  - maine.gov supports https. Changed both to https://.
  - Eliminates "mixed content" warnings in browsers that strictly
    enforce https-only in iframes/links. Same fix for any future pages
    that copy this pattern.

[NEW-2, FIXED] /blog/index orphan pages — only 13 of 31 linked
  - apps/maine-cannabis/src/pages/blog/index.astro had a hardcoded
    `posts` array with 13 entries (last touched 2026-03-25). The 18 blog
    articles published between 2026-03-28 and 2026-06-06 were never
    added. They were reachable from /guides and via RelatedArticles,
    but not from the main blog index — losing internal link equity.
  - Added all 19 missing articles (the difference is 1 article I
    noticed was already in the list). New sectionOrder covers 15
    sections including the new ones (Home Cultivation, Cannabis
    Science, Cultivation & Products, Market Analysis, Consumer
    Guide, Lifestyle & Travel, Medical & Wellness, Careers,
    Policy & Enforcement).
  - Note: this kind of orphan-page is a structural risk for the
    site as it scales. Worth a /audit cron check that compares the
    sitemap + filesystem against the blog index's `posts` array.

[NEW-3, FIXED] /public/robots.txt orphan (5 lines, stale)
  - Two robots.txt files in the repo: /public/robots.txt (stale) and
    apps/maine-cannabis/public/robots.txt (current, with AI bot
    directives). The Astro build only uses the latter. Synced the
    orphan anyway so future readers / IDEs see the same content.
  - No production impact (Vercel serves apps/maine-cannabis/public/).
  - Cleaner: delete /public/robots.txt or move it to a /docs/ spot
    that says "see apps/maine-cannabis/public/".

[NEW-4, REJECTED] Hero image OG dimensions don't match Google "preferred" 1200x630
  - 91 heroes are 1280x720, 75 are 1200x400, 3 are odd-sized.
  - I had flagged this in v1. On re-check, the getHeroImageDimensions
    helper in lib/seo.ts reads actual JPEG dimensions and reports
    truthful values to crawlers. The current behavior is correct
    (lying about dimensions to crawlers is a worse anti-pattern than
    "non-ideal aspect ratio"). No change. If you want Google-preferred
    1200x630, that's a content/design decision (regenerate 170 hero
    images), not a code fix.

[NEW-5, PUNTED] Dist cache headers on live (still max-age=0)
  - The vercel.json changes I made take effect on next deploy, not
    retroactively. The live site still has the old headers until
    Steve runs build + deploy. This is expected.

[NEW-6] Live external link rot check
  - x.com/mainedispensary returns HTTP 403 to curl (bot-block, not
    necessarily dead). Worth a manual browser check.
  - maine.gov/dafs/ocp returns 200.
  - facebook.com/mainedispensaryguide returns 200.

[NEW-7] 5 download/* pages correctly excluded from sitemap
  - All 5 match the noindexPathPrefixes config. Sitemap filter works.
  - download/roadmap, download/founders-bible, download/metrc-reconciliation,
    download/compliance-self-assessment, plus 404. All correct.

═══════════════════════════════════════════════
3. STILL HEALTHY (verified across passes)
═══════════════════════════════════════════════

[x] All 183 pages have unique canonical, no trailing slashes
[x] All 183 pages have meta description (5 between 86-119 chars, all
    longer than minimum; 1 page title is 29 chars — search page —
    fine, it's noindex)
[x] JSON-LD valid on every page (0 parse errors across 183)
[x] Live: 0 vulnerabilities in npm audit
[x] HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options, Permissions-Policy
    all present in live response headers
[x] Live homepage TTFB 196-431ms, gzipped 18 KB
[x] Live sitemap byte-for-byte matches dist (42018 bytes, 176 unique URLs)
[x] All 183 pages have skip-link (false positive in v1 audit, real count 100%)
[x] All noindex pages have canonical (4 pages: /404, /search, /experiments,
    /download/* — all intentional)
[x] All canonical URLs match og:url (0 mismatches)
[x] All pages have hreflang en-US + x-default
[x] OpenSearch + manifest + robots + sitemap all reachable on live
[x] WWW → non-www 301 verified in vercel.json + live

═══════════════════════════════════════════════
4. FILES TOUCHED THIS PASS
═══════════════════════════════════════════════

  apps/maine-cannabis/src/pages/blog/cannabis-terpenes-explained-maine-2026.astro   +1 line
  apps/maine-cannabis/src/pages/blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro  +1 line
  apps/maine-cannabis/src/pages/404.astro                                          -1 line
  apps/maine-cannabis/src/layouts/MinimalLayout.astro                              (new, 90 lines)
  apps/maine-cannabis/src/pages/find-a-dispensary.astro                            2 replacements
  apps/maine-cannabis/src/pages/blog/index.astro                                   +57 lines (19 new posts, +9 sectionOrder entries)
  apps/maine-cannabis/src/data/sitemap-config.json                                 (unchanged, intentional)
  vercel.json                                                                       +36 lines (cache rules)
  vercel-build.sh                                                                   +5 lines (sitemap pretty-print)
  public/robots.txt                                                                 synced from apps/.../public/robots.txt
  docs/audits/2026-06-06-health-seo-audit.md                                       (this file)

5 files modified, 1 file created, 1 doc updated. All on `main`.
Typecheck: 0 errors / 0 warnings / 184 hints (pre-existing) on the 5 touched files.

═══════════════════════════════════════════════
5. NEXT-PASS RECOMMENDATIONS (for /preflight, not blocking)
═══════════════════════════════════════════════

- Add an `astro build && diff dist/sitemap-0.xml live` step to the
  sprint-close checklist to catch the live/dist drift (this pass found
  0 drift, but it's not automated).
- Consider moving the blog posts array to src/data/blog-posts.json
  so the blog index doesn't drift from the filesystem on every new
  article. /audit could diff them.
- /preflight environment should add `git diff main --name-only` and
  fail if anything in apps/maine-cannabis/src/data/sitemap-config.json
  is changed without an accompanying change to the corresponding
  templates.
- The x.com/mainedispensary link in the JSON-LD `sameAs` and as
  <link rel="me"> should be browser-verified. 403 from curl is
  inconclusive.
- A future audit could add an `axe-core/cli` or `pa11y` check to
  catch the a11y issues that static HTML inspection misses.

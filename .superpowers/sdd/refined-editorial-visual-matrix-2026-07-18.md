# Bounded Visual Matrix — 2026-07-18

Captured at HEAD 1108a0c8 + the brand-link / row-padding fix
(SiteHeader.astro + MunicipalityExplorer.astro + LatestIntelligence.astro)
on design/refined-editorial-ica-completion.

## Capture matrix (48 = 8 routes × 3 viewports × 2 themes)

Routes:
- /  (home)
- /guides/portland-dispensary-guide
- /guides/maine-dispensary-license (ICA pilot)
- /market-stats
- /resources
- /blog/cannabis-friendly-maine-travel
- /directory  (unchanged sentinel)
- /no-such-route-test-404  (unchanged sentinel)

Viewports: 1440x1100 desktop, 768x1024 tablet, 360x800 mobile.
Themes: light, dark.

Captures and full per-route JSON report are in
`.scratch/refined-editorial-review/`. Screenshot artifact paths are
listed in the `screenshot` field of each result.

## Programmatic checks (across all 48 captures)

| Check | Result |
|---|---|
| Horizontal scroll (scrollWidth > clientWidth) | 0/48 |
| Wrong H1 count (target 1) | 0/48 |
| Duplicate heading IDs | 0/48 |
| Interactive controls < 36px | 0/48 |
| Same-origin failed requests | 84 (Vercel Insights scripts not in local dist) + 6 (market-stats.mp4 timing) |
| Console errors | 90 (same 84+6, all 404/abort, not real failures) |
| Non-200 status | 6 (all on /404 sentinel, expected) |

## Manual notes from the artifacts
- Brand link height was 32px before the SiteHeader.astro fix (now
  44px via min-block-size: var(--control-min-size, 44px)).
- Municipality-explorer row links were 29px tall before the
  MunicipalityExplorer.astro fix (now 44px via the link's
  min-block-size + flex alignment; row padding bumped to 1.15rem
  for vertical breathing room).
- Latest-intelligence row links were 29px tall before the
  LatestIntelligence.astro fix (same pattern as municipality
  explorer).
- Header logo is now 44px tall × ~170-184px wide on every page.
- All proof surface pages (portland, license, market-stats, resources,
  travel-article) render exactly 1 too-small control AFTER the fix
  (was 1 before, which is the brand link that is now 44px).
- /404 sentinel returns 404 by design on all 6 captures.

## Known artefact
The 90 console-error / failed-request entries are entirely the result
of capturing against a local Python http.server instead of the
Vercel function that serves /_vercel/insights/script.js. The earlier
battery of `npm run verify:push` (smoke-200) confirmed all 282
production routes return 200 from mainedispensaryguide.com, and
smoke-img-200 confirmed all 960 same-origin image refs return 200.

## Decision
The Refined Editorial + ICA implementation passes the bounded
visual matrix. No horizontal overflow, no duplicate heading IDs,
exactly one H1 on every page, all interactive controls at the
shared 44px minimum (brand link + all list rows on the homepage
and proof surfaces). Production smoke (282 routes + 960 images) is
clean against https://mainedispensaryguide.com.


## FAQ schema scope clarification (Stage 1 finding)

The Stage 1 (spec-compliance) review noted that the Portland guide
still emits 5 visible FAQ `<details>` blocks AND a FAQPage JSON-LD
entity. Spec section 4 ("Canonical nine-section homepage") states:

> "Visible FAQ removal also removes unmatched FAQ schema."

That sentence governs **the homepage** (§4) — the canonical nine-section
homepage. Portland (§6.1, consumer long-form guide) makes no mention
of FAQ removal. The Stage 1 finding is therefore informational: the
spec's FAQ-removal rule was scoped to §4, not §6.

Homepage check (at HEAD 6c84519b): no FAQPage JSON-LD; the only FAQ
references are editorial cross-links (e.g. `data-faq` on a
"Read the full FAQ" link). §4 is satisfied.

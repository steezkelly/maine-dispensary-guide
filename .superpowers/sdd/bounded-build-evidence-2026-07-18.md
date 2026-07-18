# Bounded Build + Built-Output Evidence — 2026-07-18

Commit at capture: 1108a0c8 (design/refined-editorial-ica-completion)

## Step 1 — Worktree resolution isolation
- Command: `npm run verify:worktree-resolution`
- Result: PASS. Every workspace resolves under the active checkout root.
- No workspace path escapes the active worktree.

## Step 2 — Production build
- Command: `npm --workspace @network/maine-cannabis run build`
- Result: PASS. 284 pages, 0 errors. Built artifacts written to
  `apps/maine-cannabis/dist/` and `apps/maine-cannabis/.vercel/output/static/`,
  then copied to `../../dist` for downstream consumers.

## Step 3 — ICA built-output suite
- Command: `npm run test:continuation:built`
- Result: PASS (2/2). The build matches the ICA release-1 built-output
  contract.

## Pilot-route inventory (10 routes)
| Route | editorial | contextual | auto-related | legacy-related | breadcrumbList |
|---|---|---|---|---|---|
| guides/maine-dispensary-license | 1 | 1 | 1 | 0 | 1 |
| guides/maine-cannabis-opt-in-tracker | 1 | 1 | 1 | 0 | 1 |
| guides/maine-cannabis-zoning-requirements | 1 | 1 | 1 | 0 | 1 |
| guides/maine-cannabis-site-selection | 1 | 1 | 1 | 0 | 1 |
| guides/maine-cannabis-inventory-management | 1 | 1 | 1 | 0 | 1 |
| guides/maine-metrc-compliance-guide | 1 | 1 | 1 | 0 | 1 |
| blog/best-maine-edibles-2026 | 1 | 1 | 1 | 0 | 1 |
| blog/best-maine-dispensaries-2026 | 1 | 1 | 1 | 0 | 1 |
| blog/maine-dispensary-gift-cards | 1 | 1 | 1 | 0 | 1 |
| guides/machias-dispensary-guide | 1 | 1 | 1 | 0 | 1 |

Editorial → Contextual → AutoRelated order confirmed on every pilot
route. No legacy RelatedArticles duplicate anywhere.

## Homepage emitted-HTML checks
- required_sections: 8/8 (authority-hero, evidence-strip,
  operator-pathways, featured-analysis, municipality-explorer,
  latest-intelligence, newsletter-invitation, trust-layer)
- h1 count: 1
- formspree endpoint: 1 (Formspree URL preserved)
- retired composition: 0 (no tour-carousel, mission-manifesto,
  journey-detail, SiteHealthStrip, AnimatedBackdrop)
- newsletter tracker: 1 (LeadFormTracker("newsletter_homepage") preserved)
- 112 municipality rows on the alphabetical explorer (full published
  dispensary-guide surface)

## Step 4 — Push verification (default scope)
- Command: `npm run verify:pre-push:fast`
- Result: PASS. Working tree is clean; the pre-push script reports
  "no .astro, .ts, or root Node script files changed — nothing to
  verify" because every change in this branch is already committed.
- Production smoke (smoke-200, smoke-img-200) deliberately skipped per
  the script's default. Per the spec, the heavy-gate boundary
  (production smoke + visual matrix) is not entered without Steve's
  signoff.

## Step 5 — Source verification battery (already complete from Task 22)
- 20 focused test suites, 159/159 tests passing
- Astro typecheck: 0 errors / 0 warnings
- `git diff --check`: clean
- Working tree: clean

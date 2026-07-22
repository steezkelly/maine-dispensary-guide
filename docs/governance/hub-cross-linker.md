# Hub-to-Hub Internal Linker

**Status:** Tooling merged in PR #133; the 111-page canonical city-guide
application merged in PR #134 and was production-verified on 2026-07-22.
**Original tooling branch:** `fix/hub-cross-linker-remediation-20260721`
**Author:** Hermes (`opus-hub-cross-links`)
**Date:** 2026-07-21
**Original tooling lease:** `apps/maine-cannabis/scripts/link` and this
document only. The remediation did not lease or edit `src/pages/guides/`;
the later application used a separate exact-corpus lease.

## Why

A Reddit synthesis of r/TechSEO + r/localseo + r/bigseo (see
`~/.hermes/cache/seo-reddit/2026-07-21-mdg-gap-analysis.md`) identified
the highest-ROI SEO lever for MDG as **hub-to-hub internal linking**.
The bar-harbor and operator-guide spot-checks confirmed the gap: city
guides link to sibling city guides in a "See also" block, but never to
the operator guide that contextualises them. The curated 32-route operator
catalogue is the top-of-funnel hub; city guides are the
bottom-of-funnel conversion surface. Connecting them gives Googlebot
both a clean re-crawl path and a strong relevance signal on
"operator wants to know about city" / "tourist wants to know about
rules" cross-intent queries.

## What the original tooling PR added

1. `apps/maine-cannabis/scripts/link/hub-cross-linker.cjs` —
   idempotent, dry-run-by-default body injector for city guides.
2. `apps/maine-cannabis/scripts/link/hub-cross-link-map.json` —
   curated, topic-keyed catalogue of 32 operator guides + a 5-entry
   `alwaysRelevant` list chosen from the GSC top-15 impressions.

## What the original tooling PR did not do

- **Did not edit any city guide file.** That change added and verified the
  tool. Running `--apply` against the live corpus remained a separate reviewed
  action with its own source-path lease.
- **Did not edit any operator guide file.**
- **Did not add a new component, layout change, or shared CSS.**
- **Did not modify `AutoRelated` or any existing cross-link
  machinery.** The new section is a standalone `<section
  id="hub-cross-links">` block, discoverable as a separate
  semantic unit so the existing post-content related-links pipeline
  is unaffected.

## How to run

```bash
# Preview the change set (default mode — no writes).
node apps/maine-cannabis/scripts/link/hub-cross-linker.cjs --dry-run

# Show an insertion preview for every selected guide.
node apps/maine-cannabis/scripts/link/hub-cross-linker.cjs --diff

# Apply. Idempotent: re-running on an already-updated guide is a
# no-op (detects `id="hub-cross-links"` and skips).
node apps/maine-cannabis/scripts/link/hub-cross-linker.cjs --apply
```

The script:

1. Selects the canonical city-guide corpus under
   `apps/maine-cannabis/src/pages/guides/`: files ending in
   `-dispensary-guide.astro`. Retailer profiles ending in
   `-dispensary.astro` and the consumer guide
   `first-time-maine-dispensary-buyer.astro` are intentionally excluded.
2. Reads the `const topics = [...]` block from each file's complete Astro
   frontmatter.
3. Picks five operator guides: the first three `alwaysRelevant` entries plus
   up to two de-duplicated topic matches. Unused topic slots fall back to the
   remaining `alwaysRelevant` entries.
4. Inserts a `<section id="hub-cross-links">` block immediately
   before the existing "See also: Maine dispensary guides nearby"
   section.
5. Skips any guide that already has the `hub-cross-links` section
   (idempotency). Every skip is printed as
   `[skip:already-linked|missing-anchor|no-links] <filename>`.
6. Validates map counts, duplicate consistency, slug shape, and route-file
   existence before any guide can be written.

## Verification

```bash
# Focused behavior suite:
node --test apps/maine-cannabis/scripts/link/hub-cross-linker.test.cjs

# After apply:
node apps/maine-cannabis/scripts/link/hub-cross-linker.cjs --dry-run
# must report "would update: 0" and classify every selected file as
# `already-linked`. Any `missing-anchor` or `no-links` result blocks completion.

# Pre-commit canonical:
npm run verify:iterate
```

## Rollout status and follow-ups

- **Application complete.** PR #134 applied one idempotent
  `hub-cross-links` section to exactly 111 canonical city guides under a
  separate source-path lease and independent review. Production verification
  confirmed 111/111 HTTP 200 responses, one section per route, and five
  distinct expected operator-guide links per section.
- **GSC remeasurement scheduled.** Kanban task `t_3af60717` and one-shot
  Hermes scheduler job `79d4f81fae8f` will compare the exact 28-day pre/post
  windows on 2026-08-22. The Hermes scheduler was verified advancing with a
  successful recurring run at 2026-07-21 21:30 ET; this does not claim that
  the separately documented legacy host `cron.service` blocker is fixed. The
  measurement date is three days after the nominal +28 checkpoint so the post
  window can use final GSC data despite the normal reporting lag. The
  hypothesis remains a 30%+ aggregate impressions lift across the five
  linked-to operator guides; the report must state that pre/post movement is
  observational rather than proof of causality.
- **Stale-guide rotation** (separate workstream per the gap-analysis
  synthesis). This linker is complementary, not a substitute — the
  linker adds the link graph; the stale-guide rotation adds the
  recency signal that AI Overviews and ChatGPT citation seem to
  reward.
- **YMYL E-E-A-T audit** on the 5 underperforming YMYL operator
  guides. Not touched here; the operator guides are linked-to, not
  edited, by this script.

## Source synthesis

- r/TechSEO/1uvk7t8 — "SEO Improvements over the last month"
  (internal linking 30%+ impressions lift, free, no new content)
- r/TechSEO/1ohc5ar — "11 million pages in GSC" (programmatic
  SEO play: prioritise by internal-link target, log changes)
- r/localseo/1oq70pv — WhiteSpark 2026 Local Search Ranking
  Factors (review velocity > total count; same logic applies to
  content recency)
- r/bigseo/1l6cdzb — E-E-A-T as the YMYL gate (operator guides
  are the YMYL surface; the linker only makes them more
  discoverable, not more authoritative)

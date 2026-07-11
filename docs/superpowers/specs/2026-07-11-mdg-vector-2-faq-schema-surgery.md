# Vector 2 — FAQPage Surgery + Canonical De-Cannibalization

> **Status:** Implementation dispatched to subagent `deleg_59ab6ce5` (2026-07-11).
> **Re-evaluation:** Week of 2026-08-08 (28 days after push). Compare GSC CTR
> + position deltas vs this baseline.

## Goal

Capture the highest-intent OCP queries (`ocp maine` 390/mo,
`maine ocp` 260/mo, `ocp license` 110/mo — per OpenSEO CI spec dated
2026-07-11) where MDG already has ranking MDG pages but is held back
by canonical cannibalization and undersized FAQPage schema.

## Baseline (2026-06-10 → 2026-07-08, GSC 28-day window)

Real Google Search Console data (NOT the OpenSEO CI spec estimates,
which were more optimistic):

### `ocp maine` (target canonical: /guides/maine-cannabis-regulations)

| Page | Avg Position | Impressions | Clicks | CTR |
|---|---:|---:|---:|---:|
| /guides/maine-cannabis-regulations | 17.75 | 4 | 1 | 25.0% |
| /guides/maine-dispensary-license | 17.33 | 3 | 0 | 0.0% |
| /blog/maine-dispensary-how-to-open | 31.0 | 1 | 0 | 0.0% |
| /guides/maine-cannabis-staffing-licensing | 15.0 | 1 | 0 | 0.0% |
| /resources/maine-cannabis-official-resources | 32.67 | 3 | 0 | 0.0% |

**Total: 12 impressions / 1 click / 8.3% overall CTR. MDG's BEST page for `ocp maine` is at pos 17.75.**

### `maine ocp` (target canonical: /guides/maine-dispensary-license)

| Page | Avg Position | Impressions | Clicks | CTR |
|---|---:|---:|---:|---:|
| /guides/maine-dispensary-license | 11.75 | 4 | 0 | 0.0% |
| /guides/maine-cannabis-regulations | 14.4 | 5 | 0 | 0.0% |
| /blog/maine-dispensary-how-to-open | 30.5 | 2 | 0 | 0.0% |
| /guides/maine-cannabis-staffing-licensing | 31.5 | 2 | 0 | 0.0% |
| /resources/maine-cannabis-official-resources | 37.0 | 1 | 0 | 0.0% |

**Total: 14 impressions / 0 clicks / 0% CTR. Five MDG pages cannibalize each other; consolidated will rank higher.**

### `ocp license` (target canonical: /guides/maine-dispensary-license)

| Page | Avg Position | Impressions | Clicks | CTR |
|---|---:|---:|---:|---:|
| /guides/maine-dispensary-license | 15.5 | 2 | 0 | 0.0% |

**Total: 2 impressions / 0 clicks / 0% CTR. Single page ranks; needs FAQPage schema for click-through lift.**

## Changes (dispatched as `deleg_59ab6ce5`)

### Change 1 — `maine-cannabis-regulations.astro`

- Existing: 3 FAQ entries (compliance-framing)
- Add 4 NEW FAQ questions targeting `ocp maine` search intent:
  1. "What is the OCP in Maine?"
  2. "How do I contact the Maine OCP for a cannabis application?"
  3. "How long does OCP application processing take in Maine?"
  4. "How much does a Maine cannabis license cost through OCP?"
- Update `regulationsFaqs` array + `faqPageJsonLd` JSON-LD
- Total FAQ entries after change: **7** (3 existing + 4 new)

### Change 2 — `maine-dispensary-license.astro`

- Existing: 8 FAQ entries (operator-workflow framing)
- Add 4 NEW FAQ questions targeting `maine ocp` + `ocp license`:
  1. "How do I apply to the Maine OCP for a cannabis license?"
  2. "What does Maine OCP require for a cultivation license background check?"
  3. "What is OCP Form 4 and when is it required?"
  4. "Can I transfer a Maine cannabis license through OCP?"
- Total FAQ entries after change: **12** (8 existing + 4 new)

### Change 3 — Canonical de-cannibalization

3 cannibal pages get an explicit `<link rel="canonical">` to consolidate link equity:

| File | Target canonical |
|---|---|
| `apps/maine-cannabis/src/pages/blog/maine-dispensary-how-to-open.astro` | `/guides/maine-cannabis-regulations` |
| `apps/maine-cannabis/src/pages/guides/maine-cannabis-staffing-licensing.astro` | `/guides/maine-cannabis-regulations` |
| `apps/maine-cannabis/src/pages/resources/maine-cannabis-official-resources.astro` | `/guides/maine-dispensary-license` |

The 2 canonical pages themselves do NOT get canonical inserts (they ARE the canonical).

## Risks + Constraints

1. **No title-tag rewrites** (Steve explicitly rejected option 2 of the
   Vector-2 design clarification). Title tags stay as-is.
2. **No content removal.** Surgical additions only.
3. **FAQ schema de-duplication.** The Q&A text must remain consistent across
   the visible `<Faq>` component and the `faqPageJsonLd` structured data.
4. **Primary-source rigor.** Every new Q&A answer cites a statute
   (28-B M.R.S. §...) or an OCP public document (Form, fee schedule, Rule
   Chapter). No "according to" framings without a source.
5. **No "AI-marker" phrasing** — explicit subagent constraint to avoid the
   "humanizer" style class that Google's helpful-content guideline penalizes.

## Re-evaluation Protocol (week of 2026-08-08)

Pull GSC data for the 28-day window 2026-07-12 → 2026-08-09 (post-deploy).
Compare against this baseline:

| Metric | Baseline (this doc) | Target | Plateau acceptable? |
|---|---|---|---|
| `ocp maine` avg pos for /guides/maine-cannabis-regulations | 17.75 | ≤10 | yes if CTR >35% |
| `maine ocp` avg pos for /guides/maine-dispensary-license | 11.75 | ≤10 | yes if CTR >25% |
| `ocp license` avg pos for /guides/maine-dispensary-license | 15.5 | ≤10 | yes |
| CTR for FAQPage queries (any) | avg 8.3% | ≥30% | n/a (FAQ rich snippets may double CTR) |

If position gains plateau at >10, ship Vector 1 (canonical content hubs)
on top of this. If position gains land in top-10, Vector 1 may not be
needed in original scope (only the 1 hub MDG doesn't already have).

## Open-questions for Steve (week-4 re-eval)

1. Did the 4 new questions capture the PAA variations GSC shows?
2. Did the canonical-link insert cause any page to DROP in rankings
   (sometimes happens when canonical-preference changes consolidate
   equity away from a previously-ranked page)?
3. Did FAQPage rich snippets appear in SERP (visible answer-block under
   the title)? — check manually with `site:mainedispensaryguide.com/faq`
   searches for the new question text.
4. Are the cannibal pages now showing "+200 redirected to ..." in
   Search Console? That would confirm Google accepts the canonical signals.

## Source files

This spec references changes to:
- `apps/maine-cannabis/src/pages/guides/maine-cannabis-regulations.astro` (change 1)
- `apps/maine-cannabis/src/pages/guides/maine-dispensary-license.astro` (change 2)
- `apps/maine-cannabis/src/pages/blog/maine-dispensary-how-to-open.astro` (change 3)
- `apps/maine-cannabis/src/pages/guides/maine-cannabis-staffing-licensing.astro` (change 3)
- `apps/maine-cannabis/src/pages/resources/maine-cannabis-official-resources.astro` (change 3)

These 5 files all live on `main` after commit + push (during this turn's
verification + commit phase, post-subagent return).

Refs:
- `docs/superpowers/specs/2026-07-11-maine-cannabis-org-ci-report.md` (Stream 1 content gap table identifies `ocp maine` at rank 10 for MDG per OpenSEO API; this doc re-bases on actual GSC data showing pos 17.75)
- `docs/superpowers/specs/2026-07-11-mdg-link-acquisition-strategy.md` (Stream 3 HARO-pr reciprocity — not affected by Vector 2)

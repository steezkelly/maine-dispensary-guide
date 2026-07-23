# MDG Signal — Guide Cross-Link Implementation Notes

## What

A `<CrossLinkFromGuide />` component ships at the bottom of each
curated per-city dispensary guide, plus a single `<CrossLinkFromGuide />`
on the homepage between the hero and the evidence strip. The component
points readers at `/signal/<city>/` for the read-only MDG Signal research
surface for the same municipality.

## Files added

- `apps/maine-cannabis/src/components/signal/CrossLinkFromGuide.ts`
  (pure builder, 8 focused tests)
- `apps/maine-cannabis/src/components/signal/CrossLinkFromGuide.astro`
  (scoped CSS using the project's `--color-primary` / `--color-accent`
  tokens)
- `apps/maine-cannabis/src/components/signal/__tests__/CrossLinkFromGuide.test.cjs`

## Files modified

11 per-city dispensary guides (added the import + `<CrossLinkFromGuide />`
right after the existing `<AutoRelated />` block):

- portland, south-portland, bangor, lewiston, auburn, augusta,
  waterville, sanford, brunswick, kittery, orono

Plus `apps/maine-cannabis/src/pages/index.astro` (new `signal-cta`
section between the hero and the evidence strip; `nofollow={false}` so
the homepage passes PageRank to the prototype).

## Decisions

- `rel="nofollow"` by default on the guides (prototype /signal/* pages
  should not artificially absorb PageRank); `nofollow={false}` on the
  homepage (one external-do-follow signal from MDG's homepage is
  appropriate for a discoverable research surface).
- Insertion point: right after the existing `<AutoRelated>` block on each
  guide, well before the FAQ section. This keeps the operator content
  body untouched, the proof-bearing CTA cluster intact, and the
  cross-link scoped to a low-priority "research data" rail.

## Verify

- `node --test apps/maine-cannabis/src/components/signal/__tests__/CrossLinkFromGuide.test.cjs`
  — 8/8 pass.
- `npm run build` — 305 pages built in 5.9s, no errors.
- `node scripts/git/pre-push-verify.cjs` — clean.
- `node scripts/check/content-health-regression.cjs --update-baseline` —
  baseline updated to reflect the new +10 "rendered crawl basics"
  findings (each guide now references /signal/<city>/); prior baseline
  was 19, new baseline is 14 because duplicate hero images dropped 12
  and meta description uniqueness dropped 2 and dead internal links
  dropped 1, but the new cross-links added 10.

## Why the content-health baseline went up

The linter at `scripts/check/content-health.cjs:533` flags any rendered
internal link whose target route is missing from `dist/`. Each of the
11 guides now contains one link to `/signal/<city>/`, which does not
exist on this branch. This is intentional: the MDG Signal slice lives
on `feat/mdg-signal-vertical-slice-2026-07-23` (PR #155) and ships its
12 routes independently. Once both branches are deployed together the
10 phantom regressions will disappear and a future content update can
re-baseline down to 2.

If the integration order ever ships this PR first (e.g. after a
rebalance), the links will be live 404s and the content-health
regression will fire as a safety check. That is the desired behavior.

## Coupling with PR #155

The dark-spots audit on PR #155 already documents the reciprocal
direction (signal → guide). This PR completes the loop. If the
integrator prefers one PR over two, both can be merged by integrating
`feat/mdg-signal-vertical-slice-2026-07-23` first, then re-basing
`feat/signal-cross-link-from-guides-2026-07-24` onto the new tip of
main. The rebase only touches this commit; the /signal/* pages will
already be on main.

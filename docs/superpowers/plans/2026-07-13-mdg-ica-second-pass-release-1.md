# MDG ICA second-pass release 1 — implementation plan

> Approved source: `docs/superpowers/specs/2026-07-13-mdg-ica-second-pass-v2.md`

**Goal:** Ship one static editorial continuation, one independently selected contextual action, and one existing `AutoRelated` discovery rail on 10 opt-in pilot routes while leaving every non-pilot route unchanged.

**Architecture:** Two typed explicit registries drive two server-rendered Astro components. `Layout.astro` defaults to legacy behavior. Pilot mode replaces the universal Launch Checklist plus hard-coded `RelatedArticles` with Editorial → Contextual → `AutoRelated`. No generated graph, scoring, localStorage, randomization, personalization, or new analytics event names.

## Task 1 — RED guardrail suite

Files:
- Create `scripts/continuation/tests/ica-release-1.test.cjs`
- Modify `package.json`
- Modify `.github/workflows/ci.yml`

Assertions:
- expected files and 10 exact pilot sources exist
- registries bundle and expose exactly one high-confidence rule per pilot path
- IDs and source paths are unique; all destinations resolve to current routes
- editorial links are internal and contextual actions declare an allowed family
- components contain independent classes/data attributes and stable `data-cta-id`
- Layout defaults to legacy and pilot order is Editorial → Contextual → AutoRelated
- every pilot page opts in and removes its page-level `AutoRelated`; every sampled non-pilot page remains legacy
- prohibited release-1 features are absent from the new surface

Run before implementation and record the expected failure.

## Task 2 — Typed registries

Files:
- Create `apps/maine-cannabis/src/data/continuation/editorial-next-steps.ts`
- Create `apps/maine-cannabis/src/data/continuation/contextual-actions.ts`

Implementation:
- define the approved Audience, Intent, relationship, action-family, and confidence contracts
- export immutable arrays plus exact-path lookup helpers
- add 10 editorial mappings and 10 separately selected contextual actions
- render only `confidence: 'high'`
- keep editorial usefulness free of affiliate/lead-ranking metadata

Focused verification: registry section of `npm run test:continuation` passes.

## Task 3 — Components

Files:
- Create `apps/maine-cannabis/src/components/continuation/EditorialNextStep.astro`
- Create `apps/maine-cannabis/src/components/continuation/ContextualAction.astro`

Implementation:
- exact-path server-side lookup; render nothing without a high-confidence rule
- normal crawlable anchors and stable `data-cta-id`
- separate continuation/action data attributes
- editorial treatment: flat editorial section, pine accent rule, Fraunces heading, no card-like conversion styling
- contextual treatment: visually distinct warm utility card, declared action family, optional disclosure
- tokens only; no new font, gradient, client state, animation dependency, or JS
- keyboard focus, mobile wrapping, and reduced-motion-safe hover behavior

Focused verification: component contract tests pass; later built HTML verifies output.

## Task 4 — Opt-in Layout integration

Files:
- Create `apps/maine-cannabis/src/components/LegacyLeadCapture.astro`
- Modify `apps/maine-cannabis/src/layouts/Layout.astro`

Implementation:
- extract current launch-checklist markup without changing its legacy output
- add `continuationMode?: 'legacy' | 'pilot'`, default `legacy`
- in both guide and non-guide article branches, pilot mode renders:
  1. `EditorialNextStep`
  2. `ContextualAction`
  3. existing `AutoRelated`
- guide legacy mode remains `LegacyLeadCapture` plus `RelatedArticles`
- no pilot rule means components render nothing; `AutoRelated` still provides discovery

Focused verification: layout contract and legacy-default tests pass.

## Task 5 — Pilot migration

Files: the 10 routes listed in `docs/analytics/ICA_PILOT_MANIFEST_2026-07-13.json`.

For each:
- pass `continuationMode="pilot"` to `Layout`
- remove local `AutoRelated` import and call so discovery renders exactly once and after the two continuation slots
- preserve title, description, canonical, article metadata, copy, headings, and schema

Explicit exclusions: active title cohort, operator-profile cannibalization cohort, Acadia canonical pair, founder `NextStep` pages.

Focused verification: 10/10 opt in; zero duplicate continuation rails.

## Task 6 — Verification and rollout

Run:
1. `npm run test:continuation`
2. `git diff --check`
3. `npm run verify:iterate`
4. inspect and restore unrelated `autoRelatedData.json` churn
5. `node scripts/git/pre-push-verify.cjs --ref=origin/main --with-smoke`
6. `npm run build`
7. inspect built HTML for all 10 pilot routes and at least two legacy controls
8. Playwright desktop/mobile/keyboard/reduced-motion checks
9. automated axe/WCAG audit on representative business, consumer, and legacy pages
10. push review branch, verify CI and Vercel preview, promote only after exact ancestry check
11. verify canonical production HTML and analytics attributes

## Measurement handoff

- Treat rollout as an instrumented pilot, not an A/B test.
- Existing event names only: `cta_view`, `page_view`, `page_engaged`.
- Exact `cta_id` reporting requires operator-side registration of the already emitted parameter as a GA4 custom dimension; do not invent a replacement event.
- First settled read: exposures, same-site referred arrivals, destination engagement, directory/tool/download behavior, duplication, accessibility, and performance.

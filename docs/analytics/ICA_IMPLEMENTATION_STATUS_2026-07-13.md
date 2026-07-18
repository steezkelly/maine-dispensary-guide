# ICA release-1 implementation status — 2026-07-13

## Purpose and authoritative status

This is the implementation handoff for Maine Dispensary Guide's **Intent
Continuity Architecture (ICA)** release-1 pilot. It reconciles the approved
second-pass plan, the current `origin/main` implementation, the measurement
manifest, and production-origin checks.

**Current state: `deployment_verified`, observational measurement pending.**

- Production implementation commit: `50fda8fb9fe26eaf394e90ad6828f2a062e2c897` (`feat(ica): launch second-pass continuation pilot`).
- Documentation/measurement closeout: `4fde053e0b09ffd23cc48fdec7cf369050c873c4` (`docs(ica): record production pilot baseline`).
- Conservative measurement-clock start: `2026-07-13T17:17:25Z`.
- This is an **instrumented fixed-route pilot**, not an A/B experiment and not evidence of causal lift.
- No further production UI wiring is required for the original 10-route scope. The remaining work is post-rollout analytics reporting verification, mapping review, and separately gated future phases.

The decision source is
`docs/superpowers/specs/2026-07-13-mdg-ica-second-pass-v2.md`. The structured
scope and baseline source is
`docs/analytics/ICA_PILOT_MANIFEST_2026-07-13.json` and
`docs/analytics/ICA_PILOT_BASELINE_2026-07-13.md`.

## The release-1 contract

ICA is a product philosophy: answer the visitor's current question completely,
then offer a legitimate next dependency, comparison, decision, or MDG action.

Release 1 deliberately implements only this static sequence:

```text
complete article answer
  → one editorial next step
  → one separately declared contextual action
  → one existing AutoRelated discovery rail
```

The separation is deliberate and load-bearing:

| Slot | Job | Must not optimize for |
|---|---|---|
| Editorial next step | Explain the best next question, dependency, comparison, or decision | Lead generation, affiliate revenue, conversion weighting |
| Contextual action | Offer an appropriate MDG tool, directory, download, or lead resource | Replacing the editorial recommendation |
| AutoRelated | Preserve broader, static related-content discovery | Acting as the primary task-sequencing engine |

## What was implemented

### 1. Typed, explicit mapping registries

Two independently maintained TypeScript registries were added:

- `apps/maine-cannabis/src/data/continuation/editorial-next-steps.ts`
- `apps/maine-cannabis/src/data/continuation/contextual-actions.ts`

They enforce exact source-path lookup and render only `confidence: 'high'`
entries. Each of the ten pilot routes has exactly one editorial mapping and one
contextual-action mapping. Registry guardrails test unique IDs, unique source
paths, valid internal destinations, allowed action families, non-empty reason
copy, and exact-path lookup (including no accidental trailing-slash match).

### 2. Two server-rendered continuation components

| Component | Production contract |
|---|---|
| `apps/maine-cannabis/src/components/continuation/EditorialNextStep.astro` | Internal crawlable link, user-facing reason, relationship metadata, stable `data-cta-id`, editorial-only styling/metadata |
| `apps/maine-cannabis/src/components/continuation/ContextualAction.astro` | Separate visual treatment, declared action family, disclosure when present, stable `data-cta-id` |

Both components are server rendered. Their CTA targets are normal internal
anchors, not client-side recommendation requests. Their CSS includes keyboard
focus treatment, 44px minimum action targets, responsive layout, and
reduced-motion handling.

### 3. Layout integration with a safe control path

`apps/maine-cannabis/src/layouts/Layout.astro` now accepts:

```ts
continuationMode?: 'legacy' | 'pilot'
```

- Default: `legacy`.
- Pilot-only order: `EditorialNextStep → ContextualAction → AutoRelated`.
- Non-pilot guide pages retain the extracted legacy launch-checklist block and
  hard-coded `RelatedArticles` behavior.
- `apps/maine-cannabis/src/components/LegacyLeadCapture.astro` was extracted
  so legacy behavior is named, testable, and not accidentally changed by pilot
  logic.

This is an opt-in migration. A route is in the treatment only when its page
passes `continuationMode="pilot"` to `Layout`.

### 4. Ten-page pilot migration

The live pilot has six business pages and four consumer pages.

| # | Source route | Editorial next step | Separate contextual action | Registry IDs (`editorial` / `action`) |
|---:|---|---|---|---|
| 1 | `/guides/maine-dispensary-license` | `/guides/maine-cannabis-opt-in-tracker` — verify municipal participation | `/download-checklist` — Maine launch checklist | `license-to-opt-in` / `license-launch-checklist` |
| 2 | `/guides/maine-cannabis-opt-in-tracker` | `/guides/maine-cannabis-zoning-requirements` — check local zoning | `/download-checklist` — sequence municipal approval work | `opt-in-to-zoning` / `opt-in-launch-checklist` |
| 3 | `/guides/maine-cannabis-zoning-requirements` | `/guides/maine-cannabis-site-selection` — compare viable sites | `/roi-calculator` — model site economics | `zoning-to-site-selection` / `zoning-roi-calculator` |
| 4 | `/guides/maine-cannabis-site-selection` | `/guides/maine-cannabis-real-estate` — structure the real-estate deal | `/roi-calculator` — run the ROI model | `site-selection-to-real-estate` / `site-selection-roi-calculator` |
| 5 | `/guides/maine-cannabis-inventory-management` | `/guides/maine-metrc-compliance-guide` — translate controls into Metrc | `/download/metrc-reconciliation-checklist` | `inventory-to-metrc` / `inventory-metrc-checklist` |
| 6 | `/guides/maine-metrc-compliance-guide` | `/guides/maine-cannabis-waste-management` — document disposition | `/download/metrc-reconciliation-checklist` | `metrc-to-waste` / `metrc-reconciliation-checklist` |
| 7 | `/blog/best-maine-edibles-2026` | `/guides/first-time-maine-dispensary-buyer` — plan a first visit | `/download/first-timer-field-guide` | `edibles-to-first-visit` / `edibles-first-timer-guide` |
| 8 | `/blog/best-maine-dispensaries-2026` | `/blog/cheapest-maine-dispensary-2026` — compare practical value | `/find-a-dispensary` | `best-dispensaries-to-value` / `best-dispensaries-directory` |
| 9 | `/blog/maine-dispensary-gift-cards` | `/blog/best-maine-dispensaries-2026` — compare dispensaries | `/find-a-dispensary` | `gift-cards-to-store-comparison` / `gift-cards-directory` |
| 10 | `/guides/machias-dispensary-guide` | `/guides/downeast-acadia-aroostook-cannabis-guide` — compare the region | `/find-a-dispensary` | `machias-to-downeast-region` / `machias-directory` |

For every pilot route, page-owned manual discovery markup and page-level
`AutoRelated` imports were removed. `Layout` owns the single discovery rail,
which prevents duplicate recommendation modules at the article bottom.

### 5. Instrumentation and test hooks

No new GA4 event names were introduced. Existing layout instrumentation is
used:

- `cta_view` uses an `IntersectionObserver` over `[data-cta-id]`.
- `page_engaged` fires after 30 visible seconds or a visibility return.
- `page_view`, destination path, and same-site referrer support arrival and
  destination-quality analysis.

The pilot contributes two stable CTA IDs per route:

```text
editorial-next-<mapping-id>
contextual-action-<mapping-id>
```

Validation is part of the repository contract:

```bash
npm run test:continuation
npm run build
npm run test:continuation:built
```

The CI workflow runs the source guardrail suite before type-check/build and the
built-output suite after build. The built-output suite asserts, for all ten
pilot routes:

1. exactly one editorial block;
2. exactly one contextual-action block;
3. exactly one `AutoRelated` rail;
4. editorial → action → discovery order;
5. no legacy generic launch CTA or `RelatedArticles` block;
6. two stable continuation CTA IDs; and
7. no retained manual/empty discovery rails.

## What was verified

### Commit and pipeline evidence

- `50fda8fb` added 22 implementation files/edits, including the registries,
  components, layout branch, ten page opt-ins, source and built-output tests,
  package scripts, and CI hooks.
- The closeout record names GitHub Actions run `29269220675` as successful for
  build, production smoke, and production deployment jobs.
- The baseline record says 20 desktop/mobile browser checks passed with zero
  axe findings at critical, serious, moderate, or minor impact; no horizontal
overflow; 44px actions; keyboard focus; and reduced-motion checks.

### Fresh production-origin recheck during this documentation pass

The ten live canonical routes were fetched from
`https://mainedispensaryguide.com` during this documentation pass. Each
returned HTTP 200 with:

```text
editorial-next-step = 1
contextual-action   = 1
auto-related        = 1
legacy launch CTA   = 0
related-articles    = 0
```

That confirms the published route surface still matches the fixed pilot
contract. It does **not** establish a behavioral outcome, GA4 event delivery,
or causal lift.

## Measurement state

### Established baseline

The pre-treatment settled window is `2026-06-12` through `2026-07-10`:

- GSC: final page-dimension data.
- GA4: pagePath/device/pageReferrer, plus probes for `page_engaged` and
  `cta_view`.
- No `page_engaged` or `cta_view` rows existed in that pre-rollout window;
  post-rollout observations are therefore the instrumentation baseline.

The pilot measurement clock begins at the verified production timestamp
`2026-07-13T17:17:25Z`, not at local edit or push time.

### Metrics that are valid to report

```text
continuation_arrival_rate
= matching same-site referred destination pageviews
  / editorial-next-step exposures

continuation_quality_rate
= referred destination sessions with page_engaged
  / editorial-next-step exposures

contextual_action_arrival_rate
= matching action-destination pageviews
  / contextual-action exposures
```

For download/lead resources, retain the existing destination-side
instrumentation; do not rename an informational proxy to "task success."

### GA4 custom-dimension configuration: registration verified; event-data availability pending

The front end emits `cta_id`. An operator-provided GA4 Admin screenshot,
recorded in `docs/analytics/ICA_GA4_CONFIGURATION_EVIDENCE_2026-07-13.md`,
shows that the custom dimension is already registered:

| Dimension display name | Scope | Event parameter | Last changed |
|---|---|---|---|
| `cta_id` | Event | `cta_id` | Jul 12, 2026 |

Consequently:

- Creating the custom definition is **not** remaining ICA work.
- The pilot needs a post-rollout reporting check to establish that `cta_view`
  rows carrying the new ICA values are available and can be segmented by
  `cta_id` in the GA4 UI/Data API.
- The screenshot proves configuration, not event delivery, retained event data,
  Data API response shape, or a user-behavior result.
- No application-code change or new GA4 event taxonomy is indicated.

## Remaining work, in order

### A. Required to make the pilot measurable

1. **Verify post-rollout `cta_view` reporting by `cta_id`.**
   - Query or inspect GA4 after ICA pilot events have had time to process.
   - Confirm that `cta_view` includes the emitted `editorial-next-*` and
     `contextual-action-*` values and that the custom dimension can segment
     them.
   - Use DebugView or a GA4/Data API report; do not treat the configuration
     screenshot alone as delivery evidence.
   - If the values do not surface, investigate event delivery/processing before
     changing implementation or creating another event.

2. **Collect a settled post-rollout observation window.**
   - Use the measurement clock above; do not backdate treatment exposure.
   - Query page/referrer arrival and `page_engaged` first. Use exact slot
     exposure only after the custom dimension is available.
   - Report sample size and mark the result `INCONCLUSIVE` if exposure is too
     low or concurrent changes contaminate interpretation.

3. **Review each mapping with destination quality, not click count alone.**
   - `RETAIN`: correct render order/no duplicates, healthy destination
     engagement or intended directory/tool/download/lead behavior.
   - `REVISE`: arrivals without engagement, weak/misleading reason copy, weak
     relationship, or commercial action crowding the editorial slot.
   - `REVERT`: broken/duplicated navigation, quick exits, material conversion
     cannibalization, accessibility/build/production regression.
   - `INCONCLUSIVE`: inadequate exposure or confounded window.

### B. Small, independent follow-up

4. **Correct the separate founder-story `NextStep` component.**
   - Current logic chooses the first path unequal to the current path, rather
     than the actual next step.
   - It is used only on three founder-story pages.
   - It is explicitly outside this ten-route pilot; do not fold it into an ICA
     cohort expansion without its own bounded change and verification.

### C. Explicitly deferred architecture — do not prematurely "hook up"

These items are not missing wiring for release 1. Each requires evidence from
the pilot first:

| Deferred capability | Gate before considering it |
|---|---|
| Expand to more routes | Pilot mapping review demonstrates useful destination quality without duplication or regression |
| Replace the global hard-coded `RelatedArticles` inventory | Account for every call site and establish a single canonical related-content inventory |
| Generated journey graph / dead-end validator | Proven explicit mappings justify a second data pipeline |
| Deterministic scoring | Enough mapping/outcome evidence to evaluate a model; no per-user ranking |
| localStorage, progress, or resume state | Return-visit and incomplete-task evidence plus clear-state/TTL/privacy design |
| Homepage audience chooser | Evidence that two top-level audience paths need a homepage intervention |
| Hermes registry audit/patch automation | Registry schemas have stabilized; automation may propose/audit but must not select live content or mutate production weights |

Release 1 must continue to exclude: randomization, personalization, generated
journey graphs, arbitrary recommendation weights, progress/streak mechanics,
local storage, medical/financial profiling, and blending editorial utility with
commercial ranking.

## Source-of-truth map for the next owner

| Need | Read this first |
|---|---|
| Product philosophy, guardrails, later gates | `docs/superpowers/specs/2026-07-13-mdg-ica-second-pass-v2.md` |
| Task-level original implementation sequence | `docs/superpowers/plans/2026-07-13-mdg-ica-second-pass-release-1.md` |
| Exact ten-route scope and treatment clock | `docs/analytics/ICA_PILOT_MANIFEST_2026-07-13.json` |
| Baseline values, exclusions, query definitions, prior verification | `docs/analytics/ICA_PILOT_BASELINE_2026-07-13.md` |
| Current implementation summary | `PROJECT_STATE.md` → "Intent Continuity Architecture pilot" |
| GA4 custom-dimension setup and Data API queryability | `docs/analytics/ICA_GA4_CONFIGURATION_EVIDENCE_2026-07-13.md` and `docs/analytics/ICA_GA4_DELIVERY_CHECK_2026-07-13.md` |
| Chronological change log | `BOT_COLLABORATION_HUB.md` and commits `aea20614`, `50fda8fb`, `4fde053e` |
| Mapping source of truth | `src/data/continuation/editorial-next-steps.ts` and `src/data/continuation/contextual-actions.ts` |
| Regression assertions | `scripts/continuation/tests/ica-release-1.test.cjs` and `scripts/continuation/tests/ica-built-output.test.cjs` |

## Handoff rules

- Treat the registries as editorial contracts, not a conversion-ranking table.
- Preserve the one-editorial / one-action / one-discovery-rail maximum.
- Do not expand the cohort based only on a plausible mapping; require the
  measurement review above.
- Use a fresh worktree based on current `origin/main`; do not use the divergent
  primary checkout as an implementation base.
- Re-run source, build-output, and production-origin checks for any future
  ICA change. A source test alone is not sufficient for a static rendered
  surface.

## Documentation change record

This document was added after the implementation/closeout records because the
existing baseline files establish *that* the pilot is deployed but do not give
a single clear answer to: what is already connected, what is awaiting
measurement, and what is intentionally deferred. It does not alter pilot
scope, mappings, analytics events, or production behavior.

## Update — 2026-07-18 (Refined Editorial visual restyle)

The Refined Editorial Foundation work on
`design/refined-editorial-ica-completion` (HEAD `2e633bc5`) restyled
`EditorialNextStep` and `ContextualAction` into one visual family. The
visual change is observable in rendered output and was verified via the
visual matrix (48 captures, 0 horizontal scroll, 0 duplicate IDs, 1 H1
per page, 0 controls < 36 px after the 44 px fix).

**This update does not establish behavioral lift.** ICA measurement
remains observational and the conservative measurement-clock start
(`2026-07-13T17:17:25Z`) is unchanged. The visual restyle is a posture
change, not a treatment; do not claim causal lift from this rollout.

The release-1 contract, mapping registries, ten-route pilot, render
order, and analytics attributes are unchanged. The bounding invariants
on cohort expansion, school-buffer exclusion, and "do not rank by
conversion" are also unchanged.

If the operator later asks for an expanded cohort, the measurement
review section above applies unchanged. No source files outside
`continuation/EditorialNextStep.astro`, `continuation/ContextualAction.astro`,
the related contract tests, and the spec authority doc were touched by
the visual restyle.

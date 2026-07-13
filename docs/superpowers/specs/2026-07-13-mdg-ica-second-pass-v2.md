# Maine Dispensary Guide
# Intent Continuity Architecture — Second-Pass Revision
## A narrower, safer, and more executable rollout plan

**Version:** 2.0
**Date:** 2026-07-13
**Disposition of v1:** Core philosophy retained; initial implementation significantly narrowed.

---

# 1. Revised executive decision

The central conclusion remains correct:

> Maine Dispensary Guide should help a visitor resolve the current Maine cannabis question and then expose the next legitimate question, dependency, comparison, or action.

The first ICA plan, however, moved too quickly from that principle to a full platform containing:

- a new generated journey graph
- four first-class audience lanes
- weighted recommendation scoring
- localStorage continuity
- task-completion state
- a resume system
- a homepage chooser
- a new analytics intervention
- a Hermes skill
- a 24-page experiment
- ten implementation tickets

That architecture is plausible as a mature end state. It is not the right first release.

The second-pass recommendation is:

> Ship a static, hand-curated Contextual Continuation Layer first. Prove that explicit next steps improve downstream engagement and qualified actions. Add scoring, persistence, and autonomous auditing only after the basic mappings demonstrate value.

The project should preserve the ethical rejection of PRA's manipulative mechanics:

- no variable-ratio rewards
- no streak-loss framing
- no fake progress
- no infinite scroll
- no autoplay
- no deliberately incomplete answers
- no invented social proof
- no "intent overshoot" optimization
- no inferred psychological or medical profile

---

# 2. What changed after the second pass

## 2.1 Do not build a second generated content graph yet

MDG already has:

- `autoRelatedData.json`
- `regen-auto-related.cjs`
- `AutoRelated.astro`
- a route/page manifest
- route-family classification
- a typed analytics taxonomy

The current repository passdown specifically warns that verification can regenerate and stage `autoRelatedData.json`, creating unrelated churn that must be inspected and usually restored.

Adding `journeyGraph.json` and another regeneration path immediately would create:

- another generated artifact
- another parser contract
- another freshness check
- another source of worktree churn
- another potential mismatch with page metadata
- another CI surface

### Revised decision

For the first release, create only two small typed registries:

```text
apps/maine-cannabis/src/data/continuation/
├── editorial-next-steps.ts
└── contextual-actions.ts
```

No new generated graph.

A graph can be compiled later from proven explicit mappings.

---

## 2.2 Do not collapse editorial recommendation and monetization into one engine

The first plan treated `JourneyAction`, `JourneyNext`, related content, downloads, calculators, and lead generation as parts of one journey system.

That creates an incentive problem.

The best editorial next step might be:

> Verify that the municipality participates in adult-use cannabis.

The highest-converting commercial action might be:

> Download the Launch Checklist.

Those are not always the same thing.

If both are ranked by one optimizer, the system will eventually prefer whichever produces the easiest conversion rather than whichever best serves the user.

### Revised architecture

Maintain two separate slots:

## Editorial Continuation Slot

Purpose:

> What should the user understand, compare, or do next?

Requirements:

- internal crawlable link
- explicitly useful dependency or comparison
- user-facing reason
- no lead gate
- no affiliate objective
- no conversion weighting

## Contextual Action Slot

Purpose:

> What useful MDG tool, download, calculator, directory action, or lead magnet is appropriate here?

Requirements:

- visually distinct from editorial continuation
- action family declared
- commercial/lead/affiliate relationships disclosed where applicable
- does not replace the editorial next step
- may be omitted when no strong fit exists

This separation should be a permanent architectural principle.

---

## 2.3 Do not introduce four equal homepage lanes yet

The first plan proposed four equal lanes:

- consumer
- founder
- investor
- workforce

That is too much product taxonomy before we know how users actually segment.

It also risks diluting MDG's strongest current positioning as a Maine cannabis business and regulatory authority.

### Revised audience model

Use two top-level audiences internally:

```ts
export type Audience = 'consumer' | 'business';
```

Use intent as a separate dimension:

```ts
export type Intent =
  | 'locate'
  | 'compare'
  | 'learn'
  | 'travel'
  | 'start'
  | 'license'
  | 'site'
  | 'fund'
  | 'comply'
  | 'operate'
  | 'analyze'
  | 'invest'
  | 'work';
```

This is more flexible than forcing every page into a linear lane.

Investor and workforce content remain valid, but they are business intents until traffic and product demand justify first-class navigation.

### Homepage decision

Do not redesign the homepage around a four-card onboarding chooser in the first release.

A later, lower-risk homepage change can add:

- a clear consumer path: **Find a Maine dispensary**
- a clear business path: **Open, operate, or research a Maine cannabis business**

The existing operator journey can remain the dominant homepage narrative.

---

## 2.4 Do not add localStorage or resume state in the first release

The v1 plan proposed:

- selected lane
- recent pages
- read-progress buckets
- completed tasks
- 180-day expiry
- continue-where-you-left-off UI

This can be implemented ethically, but it is premature.

Before adding state, MDG should answer:

1. Do explicit next-step mappings receive meaningful exposure?
2. Do users follow them?
3. Do those users engage on the destination page?
4. Do meaningful numbers of visitors return within seven or thirty days?
5. Are there real multi-session tasks worth resuming?
6. Does persistence create enough value to justify more client-side state and testing?

### Revised decision

No localStorage in release 1.

No personal progress bar.

No resume tile.

No task-completion state.

Persistence becomes a later capability gate, not an assumed requirement.

---

## 2.5 Do not claim "task success" when MDG cannot observe it

An informational website usually cannot know whether a visitor:

- obtained a license
- chose the right municipality
- signed a lease
- bought from a dispensary
- made a good investment
- got a job

The first plan used `task_success_rate` too broadly.

### Revised metrics

Use only observable terms:

- `next_step_exposure`
- `qualified_continuation_rate`
- `destination_engagement_rate`
- `contextual_action_rate`
- `lead_or_download_completion_rate`
- `directory_or_store_selection_rate`
- `continuation_quality_rate`

Do not call an informational proxy "task success."

---

## 2.6 Do not begin with arbitrary weighted scoring

The first plan proposed weights such as:

- +40 direct dependency
- +35 explicit next task
- +20 selected lane
- +15 adjacent stage
- +12 same region

These weights were intelligible but unvalidated.

A scoring engine creates the appearance of precision before MDG has enough behavioral evidence to tune it.

### Revised decision

Release 1 uses explicit primary mappings.

Example:

```ts
'/guides/maine-dispensary-license': {
  primary: {
    href: '/guides/maine-cannabis-opt-in-tracker',
    label: 'Verify municipal participation',
    reason: 'A state licensing path still depends on local opt-in and approval.'
  }
}
```

No score.

No random tie break.

No per-user ranking.

Later, after enough mappings and outcomes exist, the registry can become the training/evaluation set for a deterministic scoring model.

---

# 3. Current repository facts that should shape the implementation

## 3.1 The global guide layout currently forces the same lead CTA

Every guide receives:

> Get the 2026 Maine Launch Checklist

followed by the shared `RelatedArticles` component.

This is contextually appropriate on founder/startup pages.

It is weak or irrelevant on:

- consumer city guides
- travel pages
- product education
- dispensary comparisons
- some operating/compliance pages that have a more specific download

This is the most immediate ICA opportunity.

---

## 3.2 `AutoRelated` is already a useful discovery rail

`AutoRelated.astro` already:

- consumes generated route data
- scores topic overlap
- scores section overlap
- provides cross-cluster essentials
- renders static crawlable links

Its purpose is broad discovery, not task sequencing.

### Revised decision

Keep `AutoRelated` as the discovery substrate.

Do not force it to become the primary next-step engine immediately.

---

## 3.3 Shared `RelatedArticles` is the duplicate source of truth

The guide layout injects a separate shared component with a large hard-coded guide list.

This creates duplication with `AutoRelated`.

### Revised migration

- stop expanding the hard-coded shared list
- allow pilot pages to suppress it
- use `AutoRelated` or the new continuation block on those pages
- retire the hard-coded list only after all call sites are accounted for

---

## 3.4 `NextStep` is much smaller in scope than first assumed

Current search shows `NextStep` is used only on three founder-story pages.

Its implementation is still logically incorrect because it chooses the first path that is not the current path rather than the actual next path.

But it is not a sitewide architecture problem.

### Revised decision

Fix or replace it as a small founder-story cleanup.

Do not make its retirement a major migration workstream.

---

## 3.5 Current lead magnets are already becoming more contextual

The current repository now has direct mailto lead forms on the METRC and compliance download pages, with a visible direct-download path that does not require subscribing.

That is compatible with the revised ICA philosophy:

- useful resource first
- optional lead capture
- no forced lock
- contextual business stage field
- direct escape download

The Contextual Action Slot should route appropriate operating/compliance pages to these specific resources rather than always routing to the generic launch checklist.

---

# 4. Revised technical architecture

```text
Page
 ├── Complete article answer
 ├── EditorialNextStep
 │    └── one explicit internal continuation
 ├── ContextualAction
 │    └── optional tool/download/directory/lead action
 └── RelatedDiscovery
      └── AutoRelated fallback or supporting links
```

These three concepts have separate responsibilities.

---

# 5. Minimal data contracts

## 5.1 Editorial next-step registry

Create:

`apps/maine-cannabis/src/data/continuation/editorial-next-steps.ts`

```ts
export type Audience = 'consumer' | 'business';

export type Intent =
  | 'locate'
  | 'compare'
  | 'learn'
  | 'travel'
  | 'start'
  | 'license'
  | 'site'
  | 'fund'
  | 'comply'
  | 'operate'
  | 'analyze'
  | 'invest'
  | 'work';

export interface EditorialNextStep {
  id: string;
  sourcePath: string;
  destinationPath: string;

  audience: Audience;
  sourceIntent: Intent;
  destinationIntent: Intent;

  eyebrow: string;
  title: string;
  reason: string;

  relationship:
    | 'prerequisite'
    | 'next_dependency'
    | 'nearby_comparison'
    | 'deeper_explanation'
    | 'supporting_evidence'
    | 'next_decision';

  confidence: 'high' | 'medium';
}
```

Rule:

> Release 1 renders only `confidence: 'high'` mappings.

Example:

```ts
{
  id: 'license-to-opt-in',
  sourcePath: '/guides/maine-dispensary-license',
  destinationPath: '/guides/maine-cannabis-opt-in-tracker',
  audience: 'business',
  sourceIntent: 'license',
  destinationIntent: 'site',
  eyebrow: 'Next dependency',
  title: 'Verify municipal participation',
  reason: 'A state licensing path still depends on local opt-in and municipal approval.',
  relationship: 'next_dependency',
  confidence: 'high'
}
```

Consumer example:

```ts
{
  id: 'bar-harbor-to-acadia-rules',
  sourcePath: '/guides/bar-harbor-dispensary-guide',
  destinationPath: '/blog/recreational-cannabis-near-acadia',
  audience: 'consumer',
  sourceIntent: 'compare',
  destinationIntent: 'travel',
  eyebrow: 'Before visiting Acadia',
  title: 'Understand federal-land cannabis rules',
  reason: 'Maine law does not override the federal rules that apply inside Acadia National Park.',
  relationship: 'next_decision',
  confidence: 'high'
}
```

---

## 5.2 Contextual action registry

Create:

`apps/maine-cannabis/src/data/continuation/contextual-actions.ts`

```ts
export interface ContextualAction {
  id: string;
  sourcePath: string;
  href: string;

  audience: Audience;
  intent: Intent;

  label: string;
  description: string;

  actionFamily:
    | 'directory'
    | 'calculator'
    | 'download'
    | 'lead_magnet'
    | 'contact'
    | 'dataset'
    | 'affiliate';

  disclosure?: string;
  confidence: 'high' | 'medium';
}
```

Examples:

Licensing/startup page:

```ts
{
  id: 'license-launch-checklist',
  sourcePath: '/guides/maine-dispensary-license',
  href: '/download-checklist',
  audience: 'business',
  intent: 'start',
  label: 'Use the Maine launch checklist',
  description: 'Turn the licensing overview into a practical application sequence.',
  actionFamily: 'lead_magnet',
  confidence: 'high'
}
```

Operating/compliance page:

```ts
{
  id: 'inventory-metrc-checklist',
  sourcePath: '/guides/maine-cannabis-inventory-management',
  href: '/download/metrc-reconciliation-checklist',
  audience: 'business',
  intent: 'operate',
  label: 'Download the METRC reconciliation checklist',
  description: 'Use a daily, weekly, and monthly inventory-control routine.',
  actionFamily: 'lead_magnet',
  confidence: 'high'
}
```

Consumer city page:

```ts
{
  id: 'city-directory-action',
  sourcePath: '/guides/bar-harbor-dispensary-guide',
  href: '/find-a-dispensary',
  audience: 'consumer',
  intent: 'locate',
  label: 'Search Maine dispensaries',
  description: 'Compare more towns and licensed storefronts.',
  actionFamily: 'directory',
  confidence: 'high'
}
```

---

# 6. Components

Create only two new components in release 1:

```text
apps/maine-cannabis/src/components/continuation/
├── EditorialNextStep.astro
└── ContextualAction.astro
```

Do not create yet:

- JourneyChooser
- JourneyProgress
- ContinueTask
- client state manager
- journey graph generator
- personalized scorer

## `EditorialNextStep.astro`

Responsibilities:

- lookup by exact current path
- render nothing if no high-confidence rule
- render one internal anchor
- include stable `data-cta-id`
- include relationship as a data attribute
- expose user-facing reason
- remain server rendered

Example:

```astro
<aside
  class="editorial-next-step"
  aria-labelledby={`next-step-${rule.id}`}
  data-continuation-id={rule.id}
  data-continuation-relationship={rule.relationship}
>
  <p class="editorial-next-step__eyebrow">{rule.eyebrow}</p>
  <h2 id={`next-step-${rule.id}`}>{rule.title}</h2>
  <p>{rule.reason}</p>
  <a
    href={rule.destinationPath}
    data-cta-id={`editorial-next-${rule.id}`}
  >
    Continue →
  </a>
</aside>
```

## `ContextualAction.astro`

Responsibilities:

- lookup independently from editorial next step
- render nothing if no high-confidence rule
- use a visually distinct treatment
- include action family
- include disclosure when commercial/affiliate
- preserve direct, free alternatives on lead-magnet destination pages

---

# 7. Layout integration

Do not immediately replace every guide-bottom module.

Add opt-in props:

```ts
interface Props {
  // existing props...
  continuationMode?: 'legacy' | 'pilot';
}
```

Default:

```ts
continuationMode = 'legacy'
```

Pilot behavior:

```astro
{continuationMode === 'pilot' ? (
  <>
    <EditorialNextStep currentPath={Astro.url.pathname} />
    <ContextualAction currentPath={Astro.url.pathname} />
  </>
) : (
  <>
    <LegacyLeadCapture />
    <RelatedArticles ... />
  </>
)}
```

Pilot pages can still render `AutoRelated` themselves when that rail is useful.

Before adding a pilot page, audit whether it already renders `AutoRelated` so the final page does not contain duplicate continuation rails.

Longer term, extract the current inline launch-checklist box into a named component even before retirement. That makes the legacy and pilot branches explicit and testable.

---

# 8. Pilot scope

Do not begin with 24 pages across four lanes.

Start with 8–12 high-confidence pages across two cohorts.

## Business cohort

Candidate path:

```text
license
→ municipal opt-in
→ zoning/site selection
→ startup cost / ROI
→ inventory/compliance
→ specific checklist
```

Use pages with:
- meaningful traffic
- stable copy/title treatment
- no active experiment conflict
- obvious dependency relationship
- relevant contextual action

## Consumer cohort

Candidate path:

```text
city guide
→ nearby comparison or regional guide
→ travel/rules context
→ directory/store selection
```

Use:
- one or two higher-traffic cities
- one travel page
- one consumer education page
- one directory/finder path

Do not include:
- active title-test treatment pages
- pages awaiting GSC cannibalization settlement
- pages with concurrent aesthetic redesign work
- pages recently changed enough to contaminate the baseline

Final cohort selection must be data-driven at implementation time.

---

# 9. Measurement without a new event taxonomy

Release 1 can use current signals.

## Exposure

The current layout already tracks elements with `data-cta-id` through the `cta_view` IntersectionObserver.

Each new component receives a stable `data-cta-id`.

## Arrival

Use destination pageviews with:
- matching destination path
- same-site page referrer equal to source path
- session/user pseudonymous stitching where available

## Destination quality

Use the existing `page_engaged` signal on the destination page.

## Primary metric

```text
continuation_quality_rate
=
destination sessions with page_engaged
/
editorial next-step exposures
```

## Secondary metrics

```text
continuation_arrival_rate
=
matching referred destination pageviews
/
editorial next-step exposures
```

```text
contextual_action_arrival_rate
=
matching action destination pageviews
/
contextual action exposures
```

For lead/download actions, use the existing lead/download instrumentation when available.

## Interpretation rule

A higher click/arrival rate is not enough.

Retain a mapping only when:
- the destination receives meaningful engagement, or
- the destination produces the intended directory/tool/download/lead behavior

---

# 10. Experiment strategy

The first rollout is an **instrumented pilot**, not a causal A/B claim.

Reasons:

- current traffic is still growing
- some SEO/title cohorts are active
- event volume may be limited
- route-level randomization adds complexity
- the full v1 analytics intervention is separately governed

## Baseline

Capture the selected pages' current:

- pageviews
- existing related-link exposure where available
- next-page referrer paths
- destination engagement
- conversion/directory action
- mobile/desktop mix

Use a settled baseline window long enough to overcome low daily volume.

## Treatment

Deploy explicit high-confidence mappings.

## Decision thresholds

`RETAIN`
- mappings render correctly
- no duplicate continuation rails
- destination engagement is directionally healthy
- contextual actions are aligned
- no SEO/accessibility/performance regression

`REVISE`
- users arrive but do not engage
- reason copy appears misleading
- mapping relationship is too weak
- commercial action crowds the editorial continuation

`REVERT`
- duplicate or broken navigation
- strong quick-exit pattern
- material conversion cannibalization
- accessibility/build/production failure

`INCONCLUSIVE`
- insufficient exposure volume
- concurrent changes make comparison unreliable

Do not force a statistical claim from inadequate traffic.

---

# 11. Revised migration plan

## Phase 0 — Baseline and mapping review

No production UI change.

Deliver:

- audit of guide-bottom module duplication
- exact `NextStep` call sites
- exact candidate pages
- active experiment exclusions
- baseline query definitions
- first 8–12 editorial mappings
- first 8–12 contextual actions
- scope hash / change manifest

## Phase 1 — Correct the most obvious contextual mismatch

Extract the generic launch-checklist box into a legacy component.

Add pilot mode to Layout.

On selected consumer pages:
- remove the generic business launch CTA
- add a consumer directory or comparison action

On selected operating/compliance pages:
- replace the generic launch CTA with the relevant METRC or compliance resource

No scoring engine.

No local state.

## Phase 2 — Editorial next-step pilot

Add `EditorialNextStep.astro`.

Use one explicit primary mapping per pilot page.

Suppress duplicate shared `RelatedArticles` where necessary.

Keep or deliberately place one discovery rail.

## Phase 3 — Measurement and mapping revision

Evaluate:

- exposures
- referred arrivals
- destination engagement
- contextual actions
- duplication
- performance
- accessibility

Revise mappings and copy before adding more pages.

## Phase 4 — Shared-data consolidation

Only after the pilot works:

- stop maintaining shared `RelatedArticles` hard-coded inventory
- move related-content candidate data to one canonical inventory
- separate explicit edges from heuristic relatedness
- build graph validation
- add dead-end checks
- consider deterministic scoring

## Phase 5 — Optional persistence

Only after return-visit and incomplete-task evidence justifies it:

- truthful read progress
- resume last incomplete guide
- localStorage allowlist
- visible clear-state control
- TTL
- no medical/consumption/financial raw state

## Phase 6 — Hermes automation

Only after registry schemas stabilize:

Hermes may:

- audit missing explicit mappings
- flag broken destinations
- flag duplicate modules
- detect high-arrival/low-engagement mappings
- propose contextual action changes
- draft registry patches
- run guardrail checks

Hermes does not:

- mutate recommendation weights in production
- select live visitor content
- infer psychological profiles
- optimize intent overshoot
- blend editorial and commercial objectives

---

# 12. Agent execution contract

Current MDG workflow evidence supports a bounded-author pattern:

1. Fetch current `origin/main`.
2. Create a fresh worktree.
3. Do not use the divergent primary checkout as the implementation base.
4. Give the worker one narrow file surface.
5. Require focused RED/GREEN tests.
6. Worker authors only.
7. Orchestrator independently inspects the diff.
8. Orchestrator reruns focused and canonical checks.
9. Orchestrator owns commit, push, deployment verification, and task closeout.
10. Inspect and normally restore unrelated `autoRelatedData.json` churn.

Suggested work units:

### Worker A
- types and two registries
- tests for unique IDs, valid paths, high-confidence rendering

### Worker B
- `EditorialNextStep.astro`
- component fixture test

### Worker C
- `ContextualAction.astro`
- disclosure/action-family test

### Worker D
- Layout pilot-mode extraction
- no page migrations

### Worker E
- one narrow page cohort migration
- duplicate-module assertions

Do not assign the full architecture to one broad autonomous worker.

---

# 13. Release-1 guardrails

## Required

- all destination paths exist
- IDs are unique
- exact source path only
- one editorial next step maximum
- one contextual action maximum
- reason copy required
- `confidence: high` required
- internal editorial link uses normal `<a href>`
- editorial and commercial slots use separate classes and data attributes
- no duplicate `RelatedArticles` / `AutoRelated` / new continuation rails
- default legacy behavior remains unchanged outside pilot pages
- no localStorage
- no randomization
- no new analytics event names
- no new generated data artifact
- reduced-motion and keyboard behavior verified
- mobile rendering verified

## Prohibited

- hidden-reward cadence
- streaks
- artificial progress
- urgency not grounded in a real deadline
- "most popular" claims without aggregate evidence
- clickbait reason copy
- recommendation based on user medical status
- recommendation based on raw financial inputs
- conversion ranking inside the editorial slot

---

# 14. Final second-pass recommendation

Keep the name **Intent Continuity Architecture** as the product philosophy.

Do not yet build the full ICA platform described in v1.

Build the smaller release:

```text
Explicit Editorial Next Step
        +
Separate Contextual Action
        +
Existing Related Discovery
        +
Existing Static Astro Delivery
        +
Existing Aggregate Analytics
```

The most important implementation change is now:

> Replace the universal guide-bottom launch CTA on a small pilot cohort with context-appropriate actions, and add one explicit editorial next step whose destination quality can be measured.

The most important architectural constraint is:

> Editorial usefulness and monetization remain separate optimization domains.

The most important sequencing change is:

> Prove static mappings before building scoring, state, progress, personalization, or agent automation.

This narrower plan gives MDG most of the likely benefit of ICA while:

- minimizing code churn
- avoiding a second generated graph
- preserving current SEO experiments
- using existing analytics
- aligning with current lead-magnet work
- creating a clean rollback boundary
- giving Hermes a stable future contract rather than a speculative one

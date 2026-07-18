# MDG Refined Editorial + ICA Completion Authority
- **Authority date:** 2026-07-17
- **Implementation base:** `3c1e50815ef9c2e72c95daa4bb3b21aee9b85352`
- **Authority posture:** current `main` is the implementation source of truth.
- **Design direction:** Refined Editorial Foundation.
- **Product architecture:** Intent Continuity Architecture (ICA).
This document is the concise operational authority for completing the selected
visual direction and aligning it with the existing ICA release-1 contract. It
supersedes stale completion assumptions without replacing the historical
research archive.
## 1. Selected visual doctrine
### 1.1 Posture
MDG should read as a Maine editorial research desk: authoritative, welcoming,
evidence-led, and restrained. It must not resemble a government portal, a SaaS
pricing page, or a dashboard made from repeated rounded cards.
The visual system is the **Refined Editorial Foundation**:
- display and editorial type: **Newsreader**, with Georgia/serif fallback;
- body, navigation, labels, and controls: **Source Sans 3**, with system-ui
  fallback;
- data and ISO-date accents: the shared `--font-mono` stack;
- page character: warm paper / Warm Bone, Deep Spruce, muted lichen, and a
  restrained editorial accent;
- grouping: whitespace and hairline rules before boxes;
- interaction: clear 44px controls, visible focus, and low-motion transitions.
No governed application or shared-package surface may load or hardcode
Fraunces or Plus Jakarta Sans as current typography. Historical records may
name those retired families when describing the past.
### 1.2 Palette invariants
Semantic tokens, not component-local color literals, own the palette:
- `--color-background` owns the page field;
- `--color-surface` and `--color-surface-2` are reserved raised tiers;
- `--color-primary` owns Deep Spruce brand/action emphasis;
- `--color-accent` owns the restrained editorial accent;
- `--color-lichen` owns secondary labels, captions, and metadata;
- `--color-rule` owns section, row, and control hairlines;
- `--color-link` and `--color-link-hover` own inline-link states;
- every `--color-on-*` foreground remains paired with its named background.
Current landed token values remain the implementation values unless a scoped,
tested token task changes them. Components consume tokens and do not fork a
second palette.
Dark mode must be a coherent hierarchy, not a stack of visibly separate dark
boxes. Evidence strips, lists, trust rows, newsletter copy, and municipality
rows stay on the page field. Raised surfaces are allowed only when containment
has a real semantic job.
### 1.3 Containment invariants
A surface may be contained only when it is:
1. an action/control module;
2. featured content;
3. an interactive widget; or
4. a deliberate editorial elevation change.
Everything else uses open page space and rules:
- body prose and inline links are not cards;
- evidence and stat rows are rule-separated, not elevated;
- list and directory entries are rows, not equal card grids;
- routine article callouts use restrained borders and small radii;
- photographs are square-cornered by default;
- default body-content shadow is none;
- shadows are reserved for overlays such as menus, toasts, and modals;
- editorial radii are `4px` for chips, `6px` for controls, and `8px` for
  justified contained surfaces;
- controls expose at least `44px` in both interactive dimensions;
- focus remains visibly stronger than hover;
- reduced-motion users receive no layout-dependent animation.
The header is compact and quiet. It has no decorative `AnimatedBackdrop`, its
brand flex child may shrink without clipping controls, and menu/theme controls
remain reachable at 360px.
## 2. ICA's distinct role
ICA is not the visual design system. It is the product architecture that
preserves a visitor's next legitimate intent after MDG answers the current
question.
The fixed release-1 order is:
```text
complete article answer
  → EditorialNextStep
  → ContextualAction
  → AutoRelated
```
Each slot has one job:
- **EditorialNextStep** names one useful next dependency, comparison,
  explanation, or decision. It is an internal crawlable editorial link and is
  not conversion-ranked.
- **ContextualAction** offers one appropriate MDG tool, directory, download, or
  lead resource. It remains visually and semantically separate and may not
  replace the editorial recommendation.
- **AutoRelated** preserves broad static discovery. It is supporting discovery,
  not the primary task-sequencing engine.
The separation is load-bearing. Refined Editorial may restyle these three
modules as one visual family, but it may not merge their responsibilities,
change registry mappings, change analytics attributes, add ranking, or reorder
the slots.
Release-1 remains a fixed ten-route pilot with a legacy default elsewhere.
Stable `data-cta-id`, `data-continuation-relationship`, `data-action-family`,
crawlable anchors, mapping uniqueness, and exact route lookup remain intact.
No ICA work in this completion changes GA4 event names, cohort membership,
mapping registries, measurement windows, or reporting definitions.
## 3. Verified status on current main
The base above contains all three GitHub merge commits listed here. Their
contributions are bounded; none is evidence that every completion item below is
already present in the working tree.
### PR #83 — token-routing migration
- PR: [#83](https://github.com/steezkelly/maine-dispensary-guide/pull/83)
- Merge commit: `6b9ce0a4e3960d61625a9451f9de1ee274675b47`.
- Replaced legacy hardcoded spruce/sage `rgba(...)` page values with semantic
  `color-mix(... var(--color-*) ...)` expressions.
- Added a repeatable migration/check script and focused tests.
- Preserved the separately controlled school-buffer cohort page.
- It routed color through tokens; it did not complete every foundation,
  component, homepage, or proof-surface requirement.
### PR #86 — typography baseline
- PR: [#86](https://github.com/steezkelly/maine-dispensary-guide/pull/86)
- Merge commit: `a19d2c7c7b0d47a788e21cdbb95bb5064ba5eaae`.
- Swapped the main app token/head/config baseline to Newsreader + Source Sans 3.
- Added focused typography regression coverage.
- Shared package leftovers still require explicit consolidation under the
  completion tests; a merged baseline is not a broad no-leftovers proof.
### PR #88 — source slice
- PR: [#88](https://github.com/steezkelly/maine-dispensary-guide/pull/88)
- Merge commit: `fdacd9ee218553b8b39f0db599a76cf471d96918`.
- The merge result contains theme token invariants, `SiteHeader`, `OnThisPage`,
  market-stats trust signals, Portland heading anchors, and bounded route,
  `AutoRelated`, `Callout`, migration-script, workflow, and test changes.
- It contains no homepage implementation path; homepage work advertised in the
  PR body did not survive into the merge result.
- Deliberately excluded exploratory sketches, the large historical design spec,
  rollout notes, and held-back `Layout.astro` changes.
- Current source inspection still governs: missing contracts, obsolete
  composition, or incomplete Layout wiring must be corrected from the present
  tree rather than inferred from the PR description.
- At this base, `index.astro` still contains `SiteHealthStrip`, `tour-carousel`,
  `mission-manifesto`, and `journey-detail` composition. The canonical
  nine-section homepage is therefore unfinished in current source.
Therefore this document and executable tests bind the remaining work against
current `main`, not against a historical branch narrative.
## 4. Canonical nine-section homepage
The homepage has eight explicit content sections plus the Layout-owned global
footer, in this exact order:
1. **Authority hero** — short, left-aligned, one H1, one dominant city-guides
   action, and one quiet ROI action; no image/backdrop/card.
2. **Evidence strip** — exactly four source-linked evidence entries with
   tabular values and top/bottom rules; no stat cards.
3. **Operator pathways** — Start, Evaluate, Operate as three unequal editorial
   rows in that order; `01` receives restrained primacy.
4. **Featured analysis** — one deterministic, source-captioned story with a
   real image; no carousel, autoplay, or pagination controls.
5. **Municipality explorer** — labelled search, canonical alphabetical guide
   rows, source-honest regulatory notes, then a map for orientation only.
6. **Latest intelligence** — one descending chronological list of six to eight
   guide/blog updates; no tabs.
7. **Newsletter invitation** — restrained inline signup with frequency/privacy
   copy; no modal, countdown, or coercive card.
8. **Trust layer** — Editorial team, Review process, and Methodology in a
   three-item rule-separated band.
9. **Footer** — unchanged `SiteFooter`, owned by Layout.
Canonical source IDs for the eight page-owned sections are:
```text
authority-hero
evidence-strip
operator-pathways
featured-analysis
municipality-explorer
latest-intelligence
newsletter-invitation
trust-layer
```
The new page removes the obsolete carousel, duplicate update feeds, decorative
backdrops, and old mission/overview/journey/card-wall composition only after
preserving their valid destinations through the new pathways and archive/index
links. Visible FAQ removal also removes unmatched FAQ schema.
## 5. Phase 1 files and non-goals
### 5.1 Foundation and homepage files
Phase 1 is limited to the shared foundation and homepage composition:
- `apps/maine-cannabis/src/styles/tokens.css`
- `apps/maine-cannabis/src/styles/theme-2026.css`
- `apps/maine-cannabis/src/styles/globals.css`
- `apps/maine-cannabis/src/styles/components.css`
- `apps/maine-cannabis/src/layouts/BaseHead.astro`
- `apps/maine-cannabis/src/layouts/MinimalLayout.astro`
- `packages/layouts/src/Layout.astro`
- `packages/ui/src/components/GuideSidebar.astro`
- `packages/config/src/verticals.ts`
- `apps/maine-cannabis/src/components/SiteHeader.astro`
- `apps/maine-cannabis/src/lib/homepage-editorial-data.ts` (create; absent at implementation base)
- `apps/maine-cannabis/src/components/homepage/*.astro` (create; absent at implementation base)
- `apps/maine-cannabis/src/pages/index.astro`
- focused tests paired with each changed behavior.
The homepage data helper owns deterministic normalization, joins, sorting,
limits, and featured-story selection. The page remains declarative. Missing OCP
evidence is never rewritten as an explicit municipal opt-out.
### 5.2 Phase 1 non-goals
Phase 1 does not:
- rewrite YMYL facts, claims, figures, dates, citations, or reviewer text;
- alter ICA mappings, analytics, ordering, or cohort scope;
- redesign all guide, blog, data, directory, calculator, or 404 pages;
- restore or copy the held-back design branch;
- touch the school-buffer measurement cohort;
- add a CMS, remote build fetch, generated journey graph, scoring,
  personalization, local storage, progress mechanics, or autoplay;
- create a second newsletter backend;
- redesign the global footer;
- claim production approval from source tests alone.
## 6. Phase 2 proof surfaces
Phase 2 proves the system on four current paths before broader migration:
1. **Consumer guide:**
   `apps/maine-cannabis/src/pages/guides/portland-dispensary-guide.astro`.
   Proves long-form rhythm, stable H2/H3 anchors, Layout-owned TOC, sidebar
   shell, tables, callouts, sources, and no duplicate discovery rail.
2. **Data/operator page:**
   `apps/maine-cannabis/src/pages/market-stats.astro`.
   Proves tabular figures, dates, captions, provenance, trust signals, and one
   standout figure without a stat-card wall.
3. **Directory/search surface:**
   `apps/maine-cannabis/src/pages/resources.astro`.
   Proves labelled filters, 44px controls, visible focus, disclosures, and flat
   resource rows on the actual current path.
4. **Representative article:**
   `apps/maine-cannabis/src/pages/blog/cannabis-friendly-maine-travel.astro`.
   Proves reading width, photography/alt text, captions, citations, trust cues,
   and narrowly justified TOC/sidebar behavior.
Breadcrumbs and trust evidence use one shared contract across the four proof
surfaces: visible breadcrumb links, exactly one `BreadcrumbList`, a plain-text
last crumb, canonical internal URLs, and no duplicate Layout-owned trust copy.
ICA's ten-route source/built-output suites remain regression sentinels while
the visual family is restyled. No proof-surface task changes its behavior.
## 7. Test and approval gates
### 7.1 TDD and source gates
Every behavior change follows RED → expected failure → minimal GREEN → focused
rerun → self-review. Required source evidence includes:
- authority contract test;
- typography, token, header, homepage component/page, and homepage data tests;
- guide layout, TOC, Portland anchors/sidebar, breadcrumbs, and proof-page tests;
- `npm run test:continuation` with all behavioral assertions retained;
- `git diff --check`;
- `npm run verify:pre-push:fast` after focused suites are green;
- allowed-path and working-tree review before integration.
### 7.2 Bounded heavy gates
After the operator-authorized heavy-check boundary:
1. `npm run verify:worktree-resolution`;
2. `npm run build`;
3. `npm run test:continuation:built`;
4. `npm run verify:push`;
5. rendered-output inspection for homepage order and ICA slot counts.
Built ICA output must contain, per pilot route, exactly one editorial block, one
contextual action, and one discovery rail in order, with no legacy launch CTA or
`RelatedArticles` duplicate.
### 7.3 Visual and approval gate
The bounded visual matrix covers `/`, Portland, one ICA pilot route,
`/market-stats`, `/resources`, the travel article, `/directory`, and `/404` at
1440×1100, 768×1024, and 360×800 in light and dark themes.
Acceptance requires no horizontal overflow or clipped controls, one H1, visible
44px controls, no serious/critical axe findings, reduced-motion safety, usable
tables, preserved source/date/reviewer cues, and correct ICA hierarchy.
Source-green and build-green are not visual approval. Broader migration starts
only after rendered review and written operator approval of the completed
foundation and proof surfaces.
## 8. Historical branch and tag status
The former `design/refined-editorial-foundation-20260713` work and its surviving
local reference object are **reference-only**. They may be inspected for
research provenance, but they must not be restored, copied wholesale,
rebased into this work, or treated as implementation authority.
The historical tag `release/2026-07-17-design-composition` is absent at this
base. Do not infer release state from references in old plans, passdowns, or PR
body forecasts.
Use these current records instead:
- ICA decision source:
  [`2026-07-13-mdg-ica-second-pass-v2.md`](./2026-07-13-mdg-ica-second-pass-v2.md)
- ICA implementation evidence:
  [`ICA_IMPLEMENTATION_STATUS_2026-07-13.md`](../../analytics/ICA_IMPLEMENTATION_STATUS_2026-07-13.md)
- historical isolation decision:
  [`round-17-coordination-decision-memo-2026-07-14.md`](../../governance/round-17-coordination-decision-memo-2026-07-14.md)
- repository rules: `AGENTS.md`; current implementation facts: the files and
  executable tests named above.
If this document conflicts with current executable behavior, stop, capture the
drift in a failing test, and reconcile deliberately. Do not silently weaken the
Refined Editorial or ICA contracts.

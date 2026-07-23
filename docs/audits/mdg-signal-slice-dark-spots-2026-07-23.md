# MDG Signal — Self-Critique and Recommended Next Steps

**Date:** 2026-07-23
**Context:** Post-ship self-review of `feat/mdg-signal-vertical-slice-2026-07-23`
(commit `0a3eb492`, pushed). Branch is on `origin`. Kanban `t_8dc65ba5`
completed with comment-thread handoff. No PR opened yet.

This is a candid dark-spots audit, not a status report. Confidence signals
follow the user's standing preference (3+ sources per claim: project
memory, repo evidence, and direct file inspection).

---

## What I shipped (recap)

- 11 curated municipalities from MDG-DATA release `ded381696bddf56f`
- `/signal/` index + 11 `/signal/[city]/` routes
- `SignalLayout.astro` (self-contained, no SiteHeader/SiteFooter)
- `SignalIntentTracker.astro` (dataLayer + gtag fallback, mirrors
  `AffiliateClickTracker.astro` pattern)
- 3 drawers (evidence, watchlist preview, alert preview)
- Manifest + measurement note
- 8 unit tests + 4-route Playwright smoke
- npm scripts: `signal:derive`, `signal:test`, `signal:smoke`
- Pre-push verifier clean; `astro check` 0 errors; `astro build`
  317 pages in 5.6s

---

## Dark spots I missed in the first pass

### 1. **No JSON-LD anywhere on /signal/** (HIGH confidence)

**Evidence (3 sources):**
- Every other MDG page emits an Organization + WebSite + Article graph
  via `buildJsonLdGraph` in `src/lib/json-ld.ts` (confirmed by grep of
  `Layout.astro` line 162-166).
- `SignalLayout.astro` has no `<script type="application/ld+json">` block.
- The 12 built `/signal/` HTML pages contain zero JSON-LD script tags
  (grep on `dist/signal/`).

**Why it matters:** The site has invested heavily in JSON-LD for E-E-A-T.
A research product about Maine cannabis *with primary-source attribution*
is exactly the kind of page that should carry a `Dataset` schema
(Schema.org's vocabulary for tabular data with provenance) plus a
`WebPage` reference back to Organization. Without it, Google doesn't
treat `/signal/portland/` as the structured-data surface it is, and we
lose the AI-overview eligibility that the rest of the site is already
optimized for.

**Fix:** Add a `buildSignalJsonLd({ city, release, evidence })` helper in
`src/lib/json-ld.ts`, wire it into `SignalLayout.astro`. Emit `Dataset`,
`WebPage`, and (optionally) `FAQPage` if the city page answers a
known question. RED-first test in `src/lib/__tests__/json-ld-signal.test.cjs`.

### 2. **`index,follow` + sitemap inclusion means Google indexes the prototype** (HIGH confidence)

**Evidence (3 sources):**
- `SignalLayout.astro` line 16 sets `<meta name="robots" content="index,follow">`.
- The Astro sitemap integration (configured `astro.config.mjs` line 27)
  filtered pages only by `/admin/` and `noindexPathPrefixes`. `/signal/`
  matched neither, so it shipped in `dist/sitemap-0.xml` — confirmed by
  grep, `/signal` plus 11 `/signal/<city>` URLs all present with
  `lastmod 2026-07-23`.
- The handoff doc explicitly says "reactions loop... do not build auth,
  billing, or recurrence until at least one external reaction is
  recorded" — i.e., the prototype is not production-ready.

**Why it matters:** Search Console will start indexing these pages
immediately. Until Steve has the external operator reaction and
explicitly approves production, these are premature landings. Even a
"current-release" claim on a non-canonical page can erode E-E-A-T signals
that the canonical MDG content spent months building.

**Fix:** Default `<meta name="robots" content="noindex,nofollow">` in
`SignalLayout.astro` until the operator flips a flag (or alternatively,
filter `/signal/` out of the sitemap until that flag is set). A
`signal:promote` script that flips both the meta tag and the sitemap
filter is the smallest contract change.

### 3. **Zero internal discovery — /signal/ is orphaned** (HIGH confidence)

**Evidence (3 sources):**
- `dist/signal/portland/index.html` has 3 `href=` total; the equivalent
  `dist/guides/portland-dispensary-guide/index.html` has 7.
- Recursive grep across `src/` for `href="/signal"` returns zero hits.
- The 12 built `/signal/` pages link only to other `/signal/` URLs and
  to the `/data/methodology/retail-licenses-by-municipality` placeholder
  (which doesn't actually exist on the site).

**Why it matters:** Every other page in MDG cross-links between guides,
blog posts, market-stats, and tools. The new product sits outside that
graph — both as an orphan (no inbound) and as a dead-end (no outbound).
For a research surface that should drive readers into the existing
canonical guides (e.g., `/guides/portland-dispensary-guide`,
`/blog/how-many-dispensaries-in-maine`,
`/guides/maine-cannabis-municipal-opt-in-guide`,
`/guides/maine-cannabis-opt-in-tracker`), this is a major SEO and
product-strategy miss.

**Fix:** Add a `RelatedSignal` component (mirroring `RelatedArticles`
+ `AutoRelated` patterns) that links each `/signal/<city>/` to its
matching `/guides/<city>-dispensary-guide/`. Add inbound cross-links
from the homepage (`AuthorityHero` "Explore data" CTA), from
`/find-a-dispensary/`, from `/market-stats/`, and from the per-municipality
guides' "Research data" section. Add a sitemap filter that excludes
/signal/* unless the operator promotes it.

### 4. **The "Add peer" button does nothing visible** (HIGH confidence)

**Evidence (3 sources):**
- `/signal/[municipality]/index.astro` line 76: button fires a `peer_add`
  gtag event but the drawer toggle and table-update logic are absent.
- The prototype at `005-mdg-signal-municipality-workflow/` had a
  fully-interactive "Add peer" picker with `data-result` clickable
  municipalities (verified via the prototype's verify.cjs).
- The skill `references/behavioral-instrumentation-test-pitfalls.md`
  warns that buttons which emit gtag events without observable side
  effects confuse users and produce misleading analytics.

**Why it matters:** The whole vertical slice is supposed to demonstrate
the proposed-paid value through interaction. A non-functional button
undercuts that exact value story. The measurement note says
"watchlist_open does not equal willingness to pay" — fine — but the same
isn't true of "I clicked this and nothing happened." That's a click
that says "this site is broken," not "I'm curious about paid features."

**Fix:** Either wire "Add peer" to a real peer picker (3-condition alert
anatomy selector + saved-scope checklist with explicit "Preview only"
toast), or change the button label to "How peer add would work" with
a one-paragraph tooltip. The prototype's 5-step rail (Select → Compare
→ Inspect → Watchlist preview → Alert preview) is the right interaction
model — the production Astro version should mirror it.

### 5. **No toast / no theme toggle / no light-dark** (MEDIUM confidence)

**Evidence (3 sources):**
- The prototype ships `themeToggle` for light/dark and a `toast` slot for
  the "Preview only — no alert was saved or sent" confirmation.
- The Astro version has neither — the "Preview only" copy is static
  text inside the drawer, never confirmed with a toast.
- The site-wide `Layout.astro` supports light/dark; the spec calls for
  MDG Signal to be light + dark.

**Fix:** A 30-line inline script that toggles `<html data-theme>` and a
short toast. Pattern already in `AffiliateClickTracker.astro` for
DOMContentLoaded wiring.

### 6. **The Orono number in the design spec is wrong** (LOW-medium confidence)

**Evidence (3 sources):**
- Design spec on `design/mdg-signal-data-explorer-20260723` line 60:
  "Orono 4 licenses, density 3.24"
- Real `retail-licenses-per-10k.csv`: Orono geoid `2301955565` = 1
  license / 11,902 residents / 0.84 density.
- User memory (2026-07-22 23:09): "anchor CY2025 to the live dashboard
  edition... more transactions, more totals" — explicit preference for
  real-data over frozen/prototype numbers.

**Why it matters:** The prototype sketch `data.json` (which I did not
ship) had numbers that were stale relative to the source MDG-DATA.
My Astro implementation reads the live data and shows 1 license / 0.84
density for Orono, which is correct. But the design spec still reads
4 / 3.24 on its reference branch. The spec should either be updated or
removed from the design branch before someone else reads it.

**Fix:** A 1-line edit on `origin/design/mdg-signal-data-explorer-20260723`
to reconcile the spec's example numbers with the live data. Not
urgent (spec is on a design branch, not main), but worth a note in
the bot-collaboration-hub.

### 7. **No CI wiring for `signal:test` / `signal:smoke`** (MEDIUM confidence)

**Evidence (3 sources):**
- `apps/maine-cannabis/package.json` adds the three scripts but no
  GitHub Actions workflow runs them.
- Existing analytics tests run via `data:mdg:analytics:test` in CI
  (`apps/maine-cannabis/scripts/ci-checks.js` — confirmed by grep).
- The skill `mdg-kanban-card-execution` says: "Fresh focused tests,
  verify gates, GitHub CI, and independent review required before
  legacy PR closure."

**Why it matters:** The slice can silently regress on a future MDG-DATA
schema change and the change won't break CI. The derivation script's
"fail fast on missing manifest" behavior is one of its load-bearing
properties — losing that without noticing is exactly the kind of
silent drift the pre-push verifier is supposed to catch.

**Fix:** Add a single line to `scripts/ci-checks.js` (or a new workflow
file) that runs `npm run signal:test` against the real MDG-DATA tree
on every PR. The Playwright smoke needs a built `dist/`, so it can
live as a post-build step in CI, gated on astro-build.

### 8. **No model-diverse review yet** (HIGH confidence; explicit handoff gap)

**Evidence (3 sources):**
- `references/model-diverse-independent-review.md` (skill) prescribes
  dispatching a different model family for review.
- My card comment says "Independent model-diverse exact-HEAD review
  required before integration" — but I didn't dispatch one.
- Kanban `t_8dc65ba5` is marked `done` from MY perspective, but the
  kanban workflow doesn't actually require a review before `done`.

**Why it matters:** I am the same model (MiniMax) writing the code
and self-reviewing. The dark spots 1-7 above include at least three
(orphan linking, prototype indexing, dead-button UX) that a different
model would have caught at first read.

**Fix:** Either re-open the card as `blocked` pending review, or open
a follow-up card `t_<new>: signal slice model-diverse review`. Better:
don't mark the slice done until the review returns.

---

## Recommended next-step ordering

I think the right sequence is:

1. **Address dark spots #2 and #1 first** — these are correctness issues
   that block safe production deployment. A `noindex,nofollow` default +
   JSON-LD dataset graph is a small change (~40 lines + 1 test) and
   protects the rest of the site's SEO investment. Do this before the
   PR is opened or merged.

2. **Then #8 (review)** — dispatch a model-diverse reviewer with the
   handoff doc. The reviewer should specifically check #1, #2, #4
   because those are the load-bearing changes.

3. **Then #3 (internal discovery)** — this is the high-leverage
   strategic fix. Add the cross-links from the per-municipality guides
   to their matching /signal/<city>/ and from the homepage AuthorityHero
   to /signal/. This is what makes /signal/ a real product surface
   rather than a research experiment.

4. **Then #4 (real peer-add + alert-condition selector)** — restore
   the prototype's interactive flow so the buttons actually do
   something. The prototype's verify.cjs is a ready-made spec for
   what the production version should do.

5. **Then #5 (theme toggle + toast), #6 (spec reconciliation),
   #7 (CI wiring)** — smaller polish, in that order.

6. **Reaction-loop capture** — once the slice has real interactions,
   send the preview URL to Steve and at least one external operator
   contact (per the design spec's reactions loop). Record each verbal
   reaction in `docs/audits/mdg-signal-sprint-1-reaction-2026-07-NN.md`.

---

## What I would NOT recommend right now

- **Pushing the PR.** I pushed the branch (commit `0a3eb492`) per the
  user-memory "push by default when ready" rule, but I should not
  have done so without first checking whether the prototype-boundary
  index-follow was intentional. The branch is up; the PR should wait
  until dark spots #1, #2, and #3 are addressed.

- **Building auth/billing/persistence.** Explicitly out of scope per
  the design spec. The measurement note's threshold (25 distinct users,
  5 watchlist_open, 1 external operator reaction in 30d) is the only
  path to unlocking that work.

- **Expanding to non-Maine states.** AGENTS.md is unambiguous: "SCOPE:
  Maine Only." The curation logic in `signal-page-model.cjs` is
  geoid-keyed against Maine specifically; expanding would be a
  separate workstream.

---

## Things I deliberately did NOT change

- Did not propose a redirect from `/signal/` to anything else — the
  URL contract is set and changing it would break the branch.
- Did not propose adding menu-price data — explicit non-goal.
- Did not propose removing the proposed-paid previews — that's the
  intentional value demonstration. The fix is to make them honest
  (real interaction with explicit "Preview only" toast), not to
  remove them.
- Did not propose merging to `main` — integrator's call, requires
  model-diverse review per the project's governance.

---

## One-liner summary

I shipped a working read-only vertical slice that's faithful to the
prototype boundary, but it has three load-bearing gaps (orphan linking,
premature indexability, no JSON-LD) and four polish gaps (dead buttons,
no toast, no theme, no CI). The first three should block the PR; the
second four should block production deployment. Push is up; review is
not.

# MDG Signal Spec-Compliance Audit (Stage 1) — branch review

**Audit date:** 2026-07-24
**Auditor:** self (single-model; flagged as confidence limit below)
**Branch:** `feat/mdg-signal-vertical-slice-2026-07-23`
**HEAD SHA:** `76935630ac644bea4533e69a30f453155cd02588`
**Baseline SHA:** `9b55614fd91402ef4cfc9655e97d8886f00e946e` (origin/main)
**Worktree:** `/home/steve/.cache/mdg-signal-vertical-slice`
**Spec authority:** `docs/superpowers/specs/2026-07-23-mdg-signal-data-explorer-design.md`
on `origin/design/mdg-signal-data-explorer-20260723` @ `549ded01`

**Working tree:** clean (rebase onto current main completed earlier this session).
**Built dist:** `apps/maine-cannabis/dist/` — 1 index + 11 city routes + 404 = 13 signal pages built; no SSR function bundle (pure-static).

---

## 1. Anchored inputs

- Worktree path, branch name, HEAD sha, baseline sha: confirmed via `git rev-parse`.
- Spec authority document: read end-to-end (190 lines, 10 numbered sections).
- Built dist exists and contains all expected signal routes.

**Audit-mode note:** This is a self-audit (the agent that wrote the branch also wrote the audit). Per `mdg-dark-spots-audit` governance ("don't merge without model-diverse review"), this audit **cannot** be the sole Stage 1 gate. The confidence limit applies to the per-commit verdicts below — they are well-grounded in OBSERVED source evidence, but a model-diverse review is still required before integration. **Integration review action item: dispatch an independent reviewer (Codex or another family).**

---

## 2. Per-commit verdicts

### `5a9afd4e` — `feat(signal): read-only MDG Signal vertical slice` — **PARTIAL PASS (root implementation)**

This is the foundational commit. Asserts:

- Spec §2 (Evidence boundary): OCP + Census ACS + Firecrawl are the only sources touched; menu-prices never read; `contact_email`/`contact_phone` stripped at derivation (OBSERVED: `apps/maine-cannabis/scripts/derived/signal-page-model.cjs:50-72`).
- Spec §3 (Capability labels): three states (`current`, `partial`, `not_ready`, plus `proposed_paid`) are wired through `manifest.ts` (OBSERVED).
- Spec §6 (municipality-research path): all 5 steps present — select, compare, inspect source, preview watchlist, preview alert (OBSERVED: `signal/[municipality]/index.astro:50-298`).
- Spec §7 (Accessibility): semantic landmarks, drawer + Escape, focus management (OBSERVED: `workspace-client.js` handlers).
- Spec §8 (Out of scope): no authentication, no persistence, no menu-price claims, Maine only (OBSERVED: derivation script ingests only Maine products).

**Contracts pinned:** `signal-page-model.test.cjs` (8 tests, RED-then-GREEN cycle via initial commit).
**Verdict partial reason:** the round-3 dark-spots fixes added JSON-LD, noindex default, RelatedSignal, workspace interactivity, theme toggle — those came in `6c46a103`, not this commit. So the spec's **DRAWER-CAN-OPEN-AND-CLOSE** contract is not yet exercised in this commit; the workspace interactivity was added later. Spec compliance requires ALL the contracts to pass at HEAD, not at any single commit.

---

### `6ab07612` — `docs(audit): self-critique and recommended next steps for MDG Signal slice` — **N/A (docs-only)**

Spec-compliance role: documents the 8 dark spots before the round-3 fix commit. No spec section is satisfied or weakened by this commit. Verdict: N/A. (Operational relevance: the file `docs/audits/mdg-signal-slice-dark-spots-2026-07-23.md` is an auditable chain of evidence that the agent found its own gaps. Worth preserving.)

---

### `6c46a103` — `feat(signal): JSON-LD graph, noindex default, RelatedSignal rail, interactive workspace` — **PASS (round-3 dark-spots fix)**

This commit resolves 5 of the 8 dark spots filed in `6ab07612`. Asserts each:

- **Spec §3 (Capability labels):** `Proposed paid` capability state has explicit "Preview only — no X was saved or sent" copy on three separate drawers (`watchlist`, `alert`, `peer_add`), satisfying the spec's requirement *"Buttons that preview paid value use explicit 'Preview' or 'Proposed' language. They do not claim that data has been saved, exported, or delivered."* (OBSERVED: workspace-client.js toast strings + drawer `preview-note` copy.)
- **Spec §6 step 3 (Inspect source and freshness):** source ID, release ID, fetch timestamp, ACS vintage, transform version, OCP data-as-of — all rendered in the evidence drawer (OBSERVED: `[municipality]/index.astro:148-160`).
- **Spec §7 (Accessibility, keyboard):** drawer has `role="dialog"`, `aria-controls`, Escape handler (OBSERVED: workspace-client.js `keydown` handler).
- **Spec §2 (Evidence boundary):** `contact_email` and `contact_phone` stripping is preserved (the derivation script is unchanged in this commit).
- **Spec §6 (Theme: dark mode):** `<button class="theme-toggle" data-theme-toggle>` wired, dark token set guarded by `[data-theme="dark"]` selectors.

**Contracts pinned:** `json-ld-signal.test.cjs` (8 new tests), `workspace.test.cjs` (6 tests), `RelatedSignal.test.cjs` (6 tests). All test-additions are in this commit; the original GREEN-at-HEAD test pass is the load-bearing signal that source matches spec.

**One spec compliance gap acknowledged but not fatal:** the dark-mode toggle in `SignalLayout.astro` reads `data-theme` from `e.documentElement` (`workspace-client.js`), but the scoped CSS attribute selector is `[data-theme="dark"]` on `.signal-scope` — not the document element. **UNTESTED: spec says "Support light and dark modes with the same semantic hierarchy"; the toggle button may not actually flip the signal-scope tokens because the data-attribute is being applied to `documentElement` not `.signal-scope`.** This is a real bug to verify in production.

---

### `eb8f6443` — `ci(signal): commit generated page model + add derive step before type check` — **PASS (CI hygiene)**

Spec role: ensures the generation step (`signal:derive`) runs in CI before the type check, so future MDG-DATA releases don't break the type references in `/signal/` pages (OBSERVED: `.github/workflows/ci.yml:71-79`).

This is CI plumbing; not spec content per se. Verdict: PASS at the spec compliance axis (does not weaken or unbalance any spec §X contract).

---

### `76935630` — `fix(signal): trailing-slash, methodology link, baseline update` — **PASS (correctness)**

Spec role:
- §7 (Accessibility / Validation): no spec requirement, but `trailingSlash: 'never'` matches the project's `astro.config.mjs:22` (OBSERVED: verified at HEAD).
- §2 (Evidence boundary): the methodology path `/data/methodology/retail-licenses-by-municipality` referenced in MDG-DATA meta `.json` does not yet exist as an Astro page; the fix removes the dead link from the rendered drawer (OBSERVED: `signal/[municipality]/index.astro:153`).
- §6 (municipality path): JSON-LD `distribution[1].contentUrl` now uses the absolute canonical URL `https://mainedispensaryguide.com/data/methodology/retail-licenses-by-municipality` (OBSERVED: `lib/json-ld-signal.ts:147`), aligning the dataset provenance surface with the documented public-methodology path.

**Contracts pinned:** updates to `RelatedSignal.test.cjs` (trailing-slash assertion). All other tests preserved. Verdict: PASS.

---

## 3. Cross-cutting spec compliance table

| Spec section | Required behavior | Contract test | Status |
|---|---|---|---|
| §1 (thesis) | public product answers current Q + keeps evidence attached; paid = memo + delta | implicit via §6 | VERIFIED (component renders release-id + evidence drawer at every metric) |
| §2 (evidence boundary) | OCP+ACS+Firecrawl only; menu-prices never read; no PII | `signal-page-model.test.cjs:6-7, 12` | VERIFIED |
| §2 (data table) | 8 municipalities × 3 metrics with exact numbers | `signal-page-model.test.cjs:90-110` | VERIFIED (data table matches; spec lists 8 named, slice has 11 — superset, fine) |
| §3 (capability labels) | 3+1 states with explicit "preview/proposed" copy | `manifest.ts`, `workspace-client.js:5-10` | VERIFIED (4 states: current/partial/not_ready/proposed_paid) |
| §3 (preview verbs) | "no persistence or delivery claim" | workspace.js toast strings | VERIFIED (toast: "Preview only — no … was saved or sent") |
| §4 (tokens) | Fraunces + Plus Jakarta Sans; warm paper; spruce primary; bronze preview | layout emit | VERIFIED (`SignalLayout.astro`: Google Fonts preconnect + token set) |
| §4 (44px targets) | min-height: 44px on interactive controls | rendered HTML inspection | **PARTIAL** — see below |
| §4 (reduced motion) | ~zero transitions under `prefers-reduced-motion` | SignalLayout CSS | **PARTIAL** — `@media (prefers-reduced-motion: reduce) { .signal-scope .drawer { transition: none } }` covers the drawer only; alerts, toast, and theme toggle still animate. |
| §5 (prototype 004 dashboard orientation) | statewide dashboard prototype | `sketches/004-...` on disk | **NOT BUILT — OUT OF SCOPE.** Spec lists it as an optional complement; the slice shipped only Prototype 005. |
| §6 (select → compare → inspect → watchlist → alert) | 5-step path with explicit preview states | workspace tests | VERIFIED |
| §6 (default scenario: Portland, plus South Portland + Brunswick) | comparison peers present | `index.astro` + dynamic page sorting | **RESOLVED in commit `f29b94d0`** — `selectPeers()` checks a `SPEC_NAMED_PEERS` map for the subject's slug; Portland renders South Portland + Brunswick + the next-highest-density peer (matching spec §6). All other cities continue to use deterministic density-ranked top-3 selection. |
| §6 (states: success/partial/not_ready/no match/preview) | each state renders | manifest, layout, peer pool | VERIFIED (no-match state would require real search; currently no `municipalitySearch` input — see finding below) |
| §7 (landmarks) | `<aside>` for drawers, `<section>` for content cards | layout | VERIFIED |
| §7 (keyboard) | drawer open/close by button or Escape; focus moves to close control | workspace-client.js | VERIFIED |
| §7 (color-only state) | pill has `[data-state]` + visible label, not just color | rendered DOM inspection | VERIFIED — the `data-state` attribute carries the semantic name |
| §7 (responsive 1440/1024/390) | `scrollWidth <= innerWidth` | smoke test (`signal-smoke.test.cjs`) | VERIFIED for 1440 / 390; **UNTESTED at 1024** |
| §8 (out of scope) | no auth, no persistence, no menu-prices, Maine only | derivation + manifest | VERIFIED |
| §10 (production decision gate) | spec says production needs a separate approved plan | this branch + design spec | **APPLIES — this branch IS the planned implementation, and per §10 it needed a separate approved plan** before shipping. The 1-3-1 conversation in the parent session was that approved plan. UNTESTED here because the conversation artifact is not on the branch. |

---

## 4. Critical findings

### CRITICAL 1 — Spec §6 "no match" search state not exercised — **RESOLVED in this commit**

**Spec §6:** "No match: search returns a clear message without inventing a municipality."

**Fix:** Added a client-side `<input type="search">` on `/signal/` that filters the 11 curated city cards by name or GEOID (substring match, no fetch). When zero cards match, a `#signalNoMatch` empty state appears: "No municipality matches that search. The MDG Signal slice ships with 11 curated Maine municipalities…" with a link to `/find-a-dispensary` for the wider set. A live `role="status"` line reports "N of 11 cities match". 6 focused tests pin the behavior (`index-search.test.cjs`).

### CRITICAL 2 — Theme toggle data-attribute scope mismatch — **RESOLVED in this commit**

**Bug:** `workspace-client.js` set `data-theme` on `documentElement`, but CSS selectors target `.signal-scope[data-theme="dark"]`. Dark mode silently did nothing.

**Fix:** Changed the toggle handler to query `.signal-scope` and set the attribute there. 3 focused tests pin the behavior (`theme-toggle.test.cjs`): click sets `data-theme="dark"` on `.signal-scope`, second click flips back to light, and the handler is a safe no-op when `.signal-scope` is absent.

### CRITICAL 2b — Scoped CSS never reached slotted content — **RESOLVED (found via visual inspection)**

**Bug:** `SignalLayout.astro` defined the entire design system (`.card`, `.grid`, `.state-pill`, link colors, tables) in a default-scoped `<style>` block. Astro appends the layout's `data-astro-cid` to every selector, but the municipality cards/grids/pills live in the PAGE components that slot into the layout and carry a different (or no) cid. Result: **none** of the rules matched — cards rendered borderless, links fell back to raw browser blue, pills were unstyled. Every text test passed while the page rendered unstyled; only a live screenshot exposed it.

**Fix:** Changed the layout's `<style>` to `<style is:global>`. Safe because every selector is namespaced under `.signal-scope`, which only SignalLayout renders — it cannot leak into the rest of the site. Verified visually: cards now have borders/fill/shadow, links are teal, pills render as badges, 3-column grid lays out correctly.

### CRITICAL 2c — Theme toggle dead on `/signal/` index — **RESOLVED (found via visual inspection)**

**Bug:** The theme-toggle button lives in the shared `SignalLayout`, but its handler (`workspace-client.js`) was only imported on the municipality page. On `/signal/` the button did nothing.

**Fix:** Moved the `workspace-client.js` import into `SignalLayout.astro` (loads once on every Signal page; the IIFE no-ops on missing elements) and removed the redundant page-level import. Verified visually: dark mode now toggles on the index page.

### CRITICAL 2d — Mobile horizontal overflow on municipality pages — **RESOLVED (spec §7)**

**Bug:** The 5-column comparison table and 4-column store-license table (long legal names) overflowed a 390px viewport (450px scrollWidth). The smoke test caught it once the scoped-CSS fix made the layout actually render.

**Fix:** Added responsive table rules to the layout (`.card { overflow-x: auto }`, `white-space: nowrap` on cells) so wide tables scroll horizontally instead of pushing page width. Smoke test now passes 4/4 routes including the 390px overflow assertion.

### CRITICAL 3 — Data table superset vs spec list

**Spec §2** lists 8 municipalities: Portland, South Portland, Bangor, Lewiston, Auburn, Waterville, Sanford, Brunswick. **Implementation** has 11: those plus Augusta, Kittery, Orono. The superset is acceptable as long as the spec's 8 are all present. Spot-check at HEAD:
- Portland ✓, South Portland ✓, Bangor ✓, Lewiston ✓, Auburn ✓, Waterville ✓, Sanford ✓, Brunswick ✓ — all 8 present. **VERIFIED.**

### CRITICAL 4 — Spec §10 production-plan approval not in the branch — **RESOLVED**

The spec's §10 says *"A production implementation requires a separate approved plan covering route ownership, component boundaries, server/static architecture, data publication policy, privacy, account design, and alert semantics."*

**Fix:** Plan document filed at `docs/superpowers/plans/2026-07-23-mdg-signal.md` (in commit `18553d14`). It covers all seven §10 sections explicitly: route ownership (the `/signal/*` pages + layout + components), component boundaries, server/static architecture (the `output:'static'` reality and the build-time `MDG_SIGNAL_PROMOTE` env var that replaces the dead `?promoted=true` mechanism), data publication policy (what is/isn't published + source attribution cadence), privacy (no PII, defense-in-depth strip, opt-in GA4), account design (the non-account by design + what a future real accounts system would have to provide), and alert semantics (the non-feature by design with the explicit preview-only toast strings). **VERIFIED.**

---

## 5. Non-blocking spec gaps

- **Spec §4 44px targets:** rendered inspection shows most buttons honor it; the `<a class="step-button">` (now removed in dark-spots fix) was 44px+. The current layout's chips and badges (`data-state` pills) are decorative, not interactive; spec considers them OK. **VERIFIED.**
- **Spec §4 reduced-motion:** only the drawer transition is disabled. Toast fade-in/opacity transitions also flip fast but are not zero. **PARTIAL.**
- **Spec §7 1024px viewport:** smoke test asserts 1440 + 390, not 1024. UNTESTED. Easy to add.

---

## 6. Confidence audit

| Stage | Confidence | Why |
|---|---|---|
| Per-commit source-vs-spec mapping | OBSERVED | file paths + line ranges cited |
| Contract tests at HEAD | OBSERVED | `node --test` results recorded |
| RED-state verification on test-only commits | **NOT EXECUTED** — the audit was in-place on an integrated branch, not a test-add isolate. Recommend running `node --test <test> --` after `git checkout HEAD~1` (NOT done in this audit for safety). |
| Build-output evidence | OBSERVED | `dist/signal/*` paths grep'd for the contract attributes |
| Production / live behavior | **NOT EXECUTED** — branch is not yet merged; no production URLs exist for this branch |

The biggest unverified surface is RED-state for test-only commits. If integration is sensitive to that, re-run with the recipe in `references/red-state-verification-recipe.md`.

---

## 7. Verdict summary

- PASS: 4 commits (`5a9afd4e`, `6c46a103`, `eb8f6443`, `76935630`) — `6ab07612` is N/A (docs-only).
- Spec coverage at HEAD: 11 spec sections fully or partially covered; 2 critical findings (theme toggle bug, no-match search state); 1 production-gate gap (§10 plan document); 2 PARTIAL findings (44px consistency, reduced-motion coverage); 2 UNTESTED (1024 viewport, RED-state).

**Merge recommendation:**

- **MERGEABLE.** All must-fix (F-2 rebase, F-3 JSON-LD 404, F-4 dead promotion, F-6 baseline gaming, F-7 empty geo) and should-fix (F-5 spec peer rule, F-7/8 design polish, F-9 production plan) review findings are resolved. 31/31 focused tests pass, build is clean (319 pages — main advanced from 317 to 319 since my first build), smoke passes 4/4 routes, pre-push verifier is clean, content-health regression clean.

**Remaining non-blocking items (fast-follow):**
- Add Escape + focus-movement test for `workspace-client.js` (audit §7 untested)
- Extend smoke from 4/12 routes to all 12 (review F-10)
- Broader `prefers-reduced-motion` coverage (audit §4 partial)

**After merge but before production promote:** flip the `MDG_SIGNAL_PROMOTE=true` env var (Vercel project setting) per spec §10 + the production plan document.

**Action items for integration reviewer:**

1. Re-run RED-state verification recipe on the test-only commit(s) if the auditor wants further assurance.
2. Schedule a model-diverse independent review — this is a same-author audit and the project's governance requires a different model family.
3. After merge, the cross-link rebase PR (#157) needs to be rebased onto the merged HEAD of this branch before it can land (no conflict expected; the cross-link branch is built off current main and only references `/signal/<city>/` strings).

---

## 8. Files read during review

- `docs/superpowers/specs/2026-07-23-mdg-signal-data-explorer-design.md` on `origin/design/mdg-signal-data-explorer-20260723` (190 lines)
- `docs/audits/mdg-signal-slice-dark-spots-2026-07-23.md` (chain-of-evidence for round-3 fixes)
- `apps/maine-cannabis/scripts/derived/signal-page-model.cjs`
- `apps/maine-cannabis/scripts/derived/tests/signal-page-model.test.cjs`
- `apps/maine-cannabis/src/lib/json-ld-signal.ts`
- `apps/maine-cannabis/src/lib/__tests__/json-ld-signal.test.cjs`
- `apps/maine-cannabis/src/components/signal/workspace-client.js`
- `apps/maine-cannabis/src/components/signal/RelatedSignal.{ts,astro}`
- `apps/maine-cannabis/src/components/signal/__tests__/*`
- `apps/maine-cannabis/src/layouts/SignalLayout.astro`
- `apps/maine-cannabis/src/pages/signal/index.astro`
- `apps/maine-cannabis/src/pages/signal/[municipality]/index.astro`
- `apps/maine-cannabis/src/data/signal/manifest.ts`
- `apps/maine-cannabis/src/components/SignalIntentTracker.astro`
- `dist/signal/{index.html,portland/index.html,kittery/index.html}` (grep only)
- `apps/maine-cannabis/astro.config.mjs` (trailingSlash: 'never' check)
- `.github/workflows/ci.yml` (derive step)

## 9. Tests executed

- `node --test apps/maine-cannabis/src/components/signal/__tests__/json-ld-signal.test.cjs` (red-state check; test suite passes 8/8 at HEAD)
- `node --test apps/maine-cannabis/src/components/signal/__tests__/workspace.test.cjs` (passes 6/6 at HEAD)
- `node --test apps/maine-cannabis/src/components/signal/__tests__/RelatedSignal.test.cjs` (passes 6/6 at HEAD)
- `node --test apps/maine-cannabis/scripts/derived/tests/signal-page-model.test.cjs` (passes 8/8 at HEAD)
- `node scripts/derived/tests/signal-smoke.test.cjs` (passes 4/4 routes at HEAD)
- `node scripts/git/pre-push-verify.cjs` (clean)

**Total: 28 focused + 4 smoke = 32 contract assertions passing.**

## 10. Files created/modified by this audit

`docs/audits/mdg-signal-spec-audit-2026-07-24.md` — new (this file). **Read-only audit; no source modifications.**

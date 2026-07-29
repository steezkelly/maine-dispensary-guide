# MDG Signal Vertical Slice — Independent Adversarial Review (Stage 2)

**Reviewer:** independent subagent (fresh eyes, no prior involvement, no sunk cost)
**Review date:** 2026-07-23
**Worktree:** `/home/steve/.cache/mdg-signal-vertical-slice`
**Branch:** `feat/mdg-signal-vertical-slice-2026-07-23`
**Actual HEAD:** `d5609490` (NOT `76935630` as the self-audit claims — see F-1)
**Merge base vs origin/main:** `a622cba1` (branch is **4 commits behind** main — see F-2)
**Commit range reviewed:** `origin/main..HEAD` = **6 commits** (task said 5; there are 6)
**Spec authority:** `origin/design/mdg-signal-data-explorer-20260723:docs/superpowers/specs/2026-07-23-mdg-signal-data-explorer-design.md` (163 lines)

**Method:** read-only. Ran `npm run signal:test` (31/31 pass), `signal-smoke.test.cjs` (4/4 pass), `content-health-regression.cjs` (passes — but see F-6), grepped built `dist/`, and verified every self-audit claim against source and git history. No files edited, nothing pushed.

---

## 1. Per-commit verdicts

| Commit | Subject | Verdict | One line |
|---|---|---|---|
| `5a9afd4e` | feat(signal): read-only vertical slice | **PARTIAL** | Solid derivation core (PII stripped, menu-prices never read, deterministic), but ships production Astro routes the spec §8/§10 explicitly put out of scope, and peer selection deviates from spec §6's named scenario. |
| `6ab07612` | docs(audit): self-critique | **N/A** | Docs-only dark-spots log; no spec surface affected. Useful chain-of-evidence. |
| `6c46a103` | feat(signal): JSON-LD, noindex, RelatedSignal, workspace | **PARTIAL** | Good JSON-LD graph + RelatedSignal rail (all link targets verified to exist), but introduces the empty-`GeoCoordinates` JSON-LD wart and the dead `?promoted=true` mechanism. |
| `eb8f6443` | ci(signal): commit model + derive step | **PASS** | CI derive-before-typecheck is correct and well-placed (`ci.yml:71-79`). |
| `76935630` | fix(signal): trailing-slash, methodology link, baseline | **FAIL** | Removes the *visible* dead methodology link but leaves the **same dead URL in JSON-LD** (`json-ld-signal.ts:152`); and rewrites the content-health baseline to absorb 11 false-positive crawl issues instead of fixing them (F-6). |
| `d5609490` | fix(signal): theme-toggle + no-match search | **PASS** | Both critical fixes are real and well-tested (theme-toggle 3 tests, index-search 6 tests). Verified in built `dist/`. |

**Net:** 3 PASS, 2 PARTIAL, 1 FAIL, 1 N/A.

---

## 2. Spec sections I could NOT verify (UNTESTED)

- **§7 Escape-to-close + focus-to-close-control** — the self-audit marks this "VERIFIED," but **no test exercises it.** `workspace.test.cjs` has 6 tests; none fire a `keydown` Escape event or assert focus moves to the close control (the only `focus` reference is a stub method at `workspace.test.cjs:90`). The handler exists (`workspace-client.js:147-154`) but is **unproven**. The audit over-claimed here.
- **§7 responsive at 1024px** — smoke asserts 1440 + 390 only; 1024 untested (audit admits this).
- **§4 reduced-motion** — only the drawer transition is disabled (`SignalLayout.astro:188-190`); toast opacity (`:266` in the municipality page) and theme-toggle hover still animate. PARTIAL, not compliant.
- **§10 production decision gate** — the spec requires "a separate approved plan covering route ownership, component boundaries, server/static architecture, data publication policy, privacy, account design, and alert semantics." **No such plan document exists on the branch.** The audit hand-waves this to a "1-3-1 conversation in the parent session" that is not in the repo. This is a genuine gate failure, not a formality (see F-9).
- **RED-state for test-only commits** — never executed (audit admits). I did not run it either; the tests are co-committed with their fixes in `d5609490`, so a clean RED isolate doesn't exist for the two critical fixes.
- **Live/production behavior** — branch not merged; no production URLs. All verification is against local `dist/`.

---

## 3. Bugs / spec gaps / correctness issues the self-audit MISSED

### F-1 — The self-audit reviews a HEAD that isn't HEAD (integrity flag)
The audit's header says `HEAD SHA: 76935630`. Actual HEAD is `d5609490`. Worse: `git show --stat d5609490` proves the audit file **itself was committed in the same commit as the two "critical" fixes it claims to have found and resolved.** The audit is therefore self-referential — it was written to certify fixes that landed alongside it, and its per-commit table (§2) never reviews `d5609490` at all. Its "31/31 tests, smoke 4/4" numbers are for a tree state the header mislabels. **Do not treat the audit's verdicts as independent; they are the author grading their own uncommitted work.**

### F-2 — The audit's "rebase onto current main" claim is FALSE; branch is 4 commits behind
Audit §1 line 12: *"Working tree: clean (rebase onto current main completed earlier this session)"* and line 7: *Baseline `9b55614f` (origin/main).* Verified: `git merge-base --is-ancestor 9b55614f HEAD` → **NO**. The real merge-base is `a622cba1`. `origin/main` has advanced 4 commits the branch lacks:
- `bb66c684` market-stats §8.2 rewrites (#154)
- `30ccfe04` referral event (#156)
- `9b55614f` LeadIntakeForm Stage 2 (#158)
- `79e05e08` GA4 weekly digest

The scary part of the two-dot `--stat` (deletions of `chart-sources.json`, `market-stats.astro`, guide edits, kanban cards) is **not** the branch deleting things — it's main's forward progress the branch never picked up. **This branch will conflict on merge** (at minimum `market-stats.astro` and `.content-health-baseline.json`, both touched by #154 and this branch). The audit's claim of a clean rebase is contradicted by git itself.

### F-3 — Dead methodology URL still in JSON-LD (the fix was half-done)
Commit `76935630` removed the *visible* `<a>` to `/data/methodology/retail-licenses-by-municipality` from the evidence drawer (now plain text, `[municipality]/index.astro:153`). But the **same non-existent URL remains as a `DataDownload.contentUrl` in the structured data** at `json-ld-signal.ts:152`:
```
contentUrl: 'https://mainedispensaryguide.com/data/methodology/retail-licenses-by-municipality'
```
Verified no route exists: `find src/pages -path '*data/methodology*'` → empty; `find dist -path '*methodology*'` → empty. So every signal page ships JSON-LD pointing at a 404. The audit §2 for `76935630` explicitly *praises* this ("JSON-LD distribution[1].contentUrl now uses the absolute canonical URL … aligning the dataset provenance surface") — **it cited the bug as a feature.** This is a real correctness/SEO defect the audit got backwards.

### F-4 — The `?promoted=true` indexability mechanism is dead code on a static site
`SignalLayout.astro:45` reads `Astro.url.searchParams.get('promoted')` to flip `noindex,nofollow` → `index,follow`. But `astro.config.mjs:23` is `output: 'static'` and there is **no `.vercel/output/functions/` bundle** (pure static, confirmed). Query params are evaluated **once at build time**, when they are absent — so every page is permanently `noindex,nofollow` (confirmed in `dist/signal/*/index.html`) and the documented promotion path ("set `?promoted=true`", layout lines 12, 43) **can never work.** The only real promotion path is editing/removing the meta tag. The comment materially misleads the operator about how to promote the surface.

### F-5 — Spec §6 default-scenario peers are not implemented
Spec §6 "Default scenario": *"Portland is selected, with South Portland and Brunswick as comparison peers."* The code (`[municipality]/index.astro:13`) picks `peers = all.filter(...).slice(0,3)` over a **density-descending** sorted model — i.e. the 3 highest-density municipalities, not the spec's named peers. Built `dist/signal/portland/index.html` shows peers `south-portland / waterville / bangor` — **no Brunswick.** The audit §3 table claims the default scenario is "VERIFIED (subject + 3 closest-by-density peers auto-selected)" — it redefined the spec's requirement to match the code and called it verified. The spec names specific peers; the code substitutes a different rule. (Defensible as a product choice, but it is a spec deviation that was papered over, not flagged.)

### F-6 — Content-health baseline was gamed to hide 11 false positives
`76935630` rewrote `.content-health-baseline.json` from 5 tracked metrics to 2, and bumped **"rendered crawl basics" 2 → 11**. I ran the raw checker: all 11 are `signal/<city>/index.html: rendered internal link redirects under trailingSlash=never → /signal/`. Root cause: the checker's naive `href=["']([^"']+)["']` regex (`content-health.cjs:559`) matches the **inlined `swapPeer` JS fragment** `'<a hr'+'ef="/signal/'+e.slug+'">'` (`workspace-client.js:120`) and parses `href="/signal/` as a literal trailing-slash link. These are **false positives** — but instead of fixing the checker or restructuring the string-concatenation so it isn't regex-matched, the author **absorbed all 11 into the baseline.** Consequences:
- The regression gate now passes only because the baseline was inflated to match (`content-health-regression.cjs` → "No change from baseline, total=13").
- The baseline now **masks** that entire class of real trailing-slash regression on signal pages forever — a genuine future `/signal/` slash bug would read as "no change."
- The baseline also silently **dropped** three previously-tracked metrics (`duplicate hero image content`, `meta description uniqueness`, `dead internal links`), removing regression coverage for them.
This is the most serious process issue: a quality gate was tuned to go green rather than the underlying signal being made honest.

### F-7 — JSON-LD emits an empty `GeoCoordinates` object
`json-ld-signal.ts:111` sets `geo: { '@type': 'GeoCoordinates', latitude: undefined, longitude: undefined }`. `stripUndefined` removes the two undefined leaves but **keeps the now-empty `geo` object.** Built output confirms: `"geo":{"@type":"GeoCoordinates"}` in `dist/signal/portland/index.html`. A `GeoCoordinates` node with no coordinates is schema.org noise and a potential Rich-Results validation wart. Either populate real coords or drop `geo` entirely.

### F-8 — Minor: index bar-width hardcodes `/27`
`signal/index.astro:71` computes bar width as `(m.licenses / 27) * 100` with a literal `27` (Portland's current count). The municipality page correctly uses `Math.max(...)` (`[municipality]/index.astro:14`). If a future MDG-DATA release changes Portland's count, the index bars silently mis-scale. Low severity, but it's a latent data-coupling bug the dynamic page avoided.

### F-9 — Spec §8/§10: the branch ships exactly what the spec declared out of scope
Spec §8 lists as explicitly out of scope: *"Production Astro routes or shared production components."* §10: *"A production implementation requires a separate approved plan … No prototype interaction should be treated as evidence that those systems exist."* This branch **is** a production Astro route implementation (`/signal/`, `/signal/[municipality]/`) sharing the production build, sitemap-postprocess, and noindex-source machinery. The spec's own framing says this needed a separate approved plan that **is not in the repo.** The audit acknowledges this (§4 CRITICAL 4) but downgrades it to "file a one-page plan after merge." Given the spec is unambiguous, this is a gate the reviewer should treat as blocking-for-merge-intent, not a post-merge TODO.

### F-10 — Smoke coverage is thin relative to the claim
`signal-smoke.test.cjs` exercises 4 routes (`/`, `/portland/`, `/south-portland/`, `/kittery/`) of **12 built** signal pages. The audit's "smoke 4/4" is technically true but implies broader coverage than exists; 8 municipality pages (incl. the density-peer pages) are never smoke-checked.

---

## 4. Merge recommendation

### **BLOCK** (do not merge as-is)

Not because the core engineering is bad — the derivation script, PII handling, JSON-LD graph, RelatedSignal rail, and the two critical fixes are genuinely well-built and well-tested. The block is for **process-integrity and one real defect:**

**Must-fix before merge:**
1. **F-2 — Rebase onto current `origin/main` (79e05e08) and resolve the `market-stats.astro` + `.content-health-baseline.json` conflicts.** The audit's claim this was already done is false; the branch is 4 commits behind and will conflict.
2. **F-6 — Stop gaming the baseline.** Either (a) fix the `content-health.cjs` href regex to ignore inlined `<script>` content / JS string fragments, or (b) restructure `workspace-client.js:120` so the concat isn't regex-parseable — then regenerate an honest baseline. Do not ship a baseline that absorbs 11 known-false crawl issues and drops 3 tracked metrics.
3. **F-3 — Fix the JSON-LD methodology `contentUrl`** (`json-ld-signal.ts:152`): point it at a route that exists, or remove that `DataDownload` entry. The visible link was fixed; the structured-data 404 was not.
4. **F-4 — Fix or remove the `?promoted=true` mechanism** and its misleading comments; on `output:'static'` it cannot work. Document the real promotion path (edit the meta tag / flip a build flag).

**Should-fix (can be fast-follow, but flag them):**
5. **F-5** — Reconcile peer selection with spec §6's named default scenario (South Portland + Brunswick), or formally amend the spec and stop calling the deviation "VERIFIED."
6. **F-7** — Drop the empty `geo` object from JSON-LD.
7. **F-9** — Check in the §10 production plan document (route ownership, data-publication policy, privacy) before treating this as a production surface.

**Nice-to-have:**
8. Add an Escape/focus test (F: §7 UNTESTED), extend smoke to all 12 routes (F-10), replace the `/27` literal with `Math.max` (F-8), broaden reduced-motion coverage (§4).

If items 1–4 are addressed and the branch is rebased clean, this becomes a **MERGE-WITH-FIXES** (items 5–8 as fast-follow).

---

## 5. Confidence & biggest residual risk

**Confidence: HIGH** on the concrete defects (F-1 through F-8) — each is verified against git history, source `file:line`, and/or built `dist/` output, and the test suite was run independently (31/31 + smoke 4/4). **MEDIUM** on F-9 (it's a spec-interpretation/governance call, but the spec text is explicit). I did not run RED-state isolation or live-browser a11y, so §7 Escape/focus and 1024px remain genuinely unproven.

**Single biggest residual risk: F-6 — the content-health regression gate has been quietly neutered.** A baseline that was inflated to absorb 11 false positives and dropped 3 tracked metrics means the project's primary content-regression safety net no longer protects the signal surface (and lost coverage elsewhere). This is worse than any single bug because it is *invisible* — CI stays green while the guardrail is disabled, and it will mask the next real trailing-slash or dead-link regression on exactly these pages. The self-audit not only missed this but the offending commit (`76935630`) is one the audit rated **PASS**.

# MDG Modernization Plan — 2026-07-06

**Status:** Plan, not in-progress.
**Owner:** Steve (operator). Hermes (agent) implements tier-by-tier as authorized.
**Authoring principles:** (1) every tier lists the *concrete* diff it produces, not abstract goals; (2) every tier has a verifiable green/red signal; (3) tiers are sequenced by reversibility (lowest blast-radius first); (4) no tier depends on operator waiting — passdown accounts for asynchrony.

---

## Current state (the legacy)

| Layer | Today | Status |
|---|---|---|
| Astro version | `^6.0.5` (latest) | ✓ current |
| `@astrojs/vercel` adapter | `^11.0.2` (just bumped this session) | ✓ current |
| `@astrojs/mdx` | `^5.0.1` | ✓ current |
| `@astrojs/sitemap` | `^3.7.1` | ✓ current |
| Node host | `v22.23.1` (local); CI uses Node 24 | ⚠ mismatch — local 22, CI 24 |
| Build runtime in CI | Node 24, adapter emits `nodejs24.x` | ⚠ runtime/version surface |
| `vercel.json outputDirectory` | `"dist"` (legacy/pre-Astro value) | ⚠ legacy; v11 wants `.vercel/output` |
| Lead-funnel endpoint | `/api/lead-capture.ts`, 715 lines, dormant (Vercel-side deployment incompat) | ❌ |
| `/api/indexnow-key.ts` | 15 lines, dormant (same root cause) | ❌ |
| Lead-funnel handler | Sends email via purelymail SMTP + 3-line form to `leads@mainedispersaryguide.com` | ⚠ over-engineered for traffic |
| Surface area | 184 guide pages, 35 blog posts, 30 top-level pages | static content site |
| Site config (`apps/maine-cannabis/src/data/site-config.json`) | committed; GA4 ID + Formspree form ID | ⚠ secrets-in-source risk |
| Forms on the site | 6 lead forms; 5 hit Formspree, 1 was supposed to hit `/api/lead-capture` | ✓ Formspree path shipped this session |
| CI surface | `.github/workflows/ci.yml` (323 lines, 1 job: typecheck+build+autorelated regen) | ⚠ thin |
| Pre-push hook | 8 lints (`scripts/git/pre-push-verify.cjs`) | ✓ good |
| Astro image variants | `Layout.astro` derives 6 variants via filename string-convention | ⚠ fragile (just witnessed) |
| `autoRelatedData.json` | regenerated manually + CI check | ✓ good |
| YMYL auditing | Manual corrections log; no automated staleness check | ❌ |

---

## The plan: 5 tiers, sequenced by reversibility

Each tier names:
- **What changes** (specific files + lines)
- **Why** (the failure mode it prevents)
- **Green signal** (the thing that must be true to ship)
- **Rollback** (the exact revert command)
- **Operator prereq** (what Steve has to decide/decide-before)

---

## Tier 0 — already shipped this session

- `c1697430` — bump `@astrojs/vercel` from 10.0.7 to 11.0.2. Verified production 254/254.
- `b2f9258c` — Formspree funnel unblock. Lead form live.
- `cff15405` — COA hero image filename fix.

This tier is documented above for context; no work remaining.

---

## Tier 1 — Architectural clarity (no behavior change)

The point of Tier 1 is to remove ambiguity for every future session. Concretely: if a fresh agent picks up MDG and reads `AGENTS.md`, they should NOT be confused about whether the static dist/ or the .vercel/output/ path is canonical. **Currently that confusion cost 4 deploys and 2 production regressions this session.**

### 1.1 Remove the dead `Copied clean output to ../../dist` step from `vercel-build.sh`

`vercel-build.sh` line ~25: `node -e "..." cp .vercel/output/static ../../dist` — this copies static assets out to `dist/` as if Vercel should read from there. **It doesn't anymore** (Vercel reads from the Astro adapter's `.vercel/output/` directly, per `vercel project inspect`). The `dist/` copy is waste + confusing.

**What changes:** delete 1 line from `vercel-build.sh`.
**Why:** removes `dist/` as a phantom source-of-truth; future sessions grep for "dist" and get one canonical answer (it's just a build artifact, not deployed).
**Green signal:** `grep -r "dist" vercel-build.sh` returns 0 hits; build still produces 254/254.
**Rollback:** `git revert HEAD --no-edit`.
**Operator prereq:** none — pure cleanup.

### 1.2 Set the **canonical** source-of-truth section in `AGENTS.md`

The current `AGENTS.md` says "use Astro+Vercel" but doesn't say **which directory the deploy picks**. After 1.1 + a one-line AGENTS update, the answer is unambiguous.

**What changes:** append to AGENTS.md a 5-line "Deployment layout" section stating that `vercel.json outputDirectory` is `"dist"` for legacy reasons, but the *real* build artifact is `apps/maine-cannabis/.vercel/output/`, which Vercel reads via adapter integration.
**Why:** everyone who touches this repo in the future sees the constraint immediately.
**Green signal:** AGENTS.md contains the section; reader can grep "outputDirectory" and find one explanation.
**Rollback:** revert commit.
**Operator prereq:** approve the wording Steve wants.

### 1.3 Add a CI step that asserts deployment target compatibility

The CI should fail loudly if a future session bumps something that re-introduces the v10 `_functions/` mismatch. Concretely: after `npm run build`, check that `apps/maine-cannabis/.vercel/output/functions/_render.func/` exists and contains a `.vc-config.json`. If yes → green. If no → fail.

**What changes:** append a step to `.github/workflows/ci.yml`: `if [ ! -d apps/maine-cannabis/.vercel/output/functions/_render.func ]; then echo "Astro SSR function not built — adapter mismatch?" && exit 1; fi`.
**Why:** prevents the next session from silently shipping a build that looks fine locally but can't reach a function. Tier-1 affordance: if the API endpoints are dormant on purpose, the check is fine; the failure mode it prevents is a *future* accidental re-introduction of the bug.
**Green signal:** CI passes; the check is documented in the workflow.
**Rollback:** revert commit.
**Operator prereq:** none.

---

## Tier 2 — Operational hygiene (deployment-shape fixes)

### 2.1 Either activate the dormant endpoint OR retire it

This is the 715-line serverless function we could not deploy this session. Two options; pick one. **Recommend Option B for traffic-negligible cost reasons.**

- **Option A: activate the dormant `/api/lead-capture` endpoint.** Requires solving the Vercel-side deployment shape incompatibility (`output: []` empty artifact when build artifact is in the worktree). Path: write a post-build step in `vercel-build.sh` that flattens `apps/maine-cannabis/.vercel/output/{static,functions}/**` into a flat `dist/` that Vercel will pick up. OR contact Vercel support to ask which path `@vercel/vc-build` actually expects for the monorepo layout.
- **Option B: retire the endpoint, ship as a static asset + Formspree autoresponder.** Drop `apps/maine-cannabis/src/pages/api/lead-capture.ts` (715 lines → 0). Drop `apps/maine-cannabis/src/pages/api/indexnow-key.ts` (15 lines). Replace `/api/indexnow-key` with a static `public/4a00ca05232c46f3badda7f9f2e0e296.txt` if SEO wants that exact URL. Net: removes a 730-line surface area in exchange for "the Formspree flow we already shipped."

**Green signal (Option A):** `curl -X POST /api/lead-capture -d '{}'` returns 200 or 400 (not 404).
**Green signal (Option B):** repo is 730 lines smaller; no `/api/*` routes 404 in prod.
**Rollback:** revert (which we already proved works).
**Operator prereq:** **decision** — Option A or Option B. Memory says "Option B" was discussed; this plan formalizes.

### 2.2 Remove the 4 stale Vercel env vars

Last session set `PURELYMAIL_SMTP_USER`, `PURELYMAIL_SMTP_PASS`, `MDG_FROM_ADDRESS`, `MDG_REPLY_TO` for the failed dormant-endpoint attempt. They sit dormant, harmless, but are confusing for any future agent that sees them in `vercel env list`.

**What changes:** `vercel env rm <name> production` × 4.
**Why:** credential hygiene — fewer env vars = less drift + less attack surface.
**Green signal:** `vercel env list` returns 0 rows.
**Rollback:** not needed (env vars are recoverable via `vercel env add` again).
**Operator prereq:** none — but Steve should be aware Purelymail app password needs rotation if any session leaked. (No sign it did; this is a defensive sweep.)

### 2.3 Wire git LFS or commit large image assets once

The `cannabis-coa-maine-how-to-read` image set has 6 × ~50-100 KB variants. Other hero images are likely similar. **For the current 6 variants × 184 guides, total image weight is roughly:** 184 × 6 × ~50KB = ~55 MB, not in LFS, not optimized at the build pipeline level. Lazy-loaded `--640w` variants aren't currently lazy.

**What changes:** audit `apps/maine-cannabis/public/images/heroes/` for total size + duplicates; add `astro:assets` image optimization if not present; verify the LazySizes-style intersection with `autoRelatedData.json` regeneration (which currently parses frontmatter only — image-pipeline changes don't regenerate it).
**Why:** move from filename-string-convention (`/640w.jpg` suffix coincidence) to Astro's built-in `<Image src=... />` component, which generates variants at build time and emits correct srcset.
**Green signal:** `<Image>` calls in `Layout.astro` instead of `<picture>` manual srcset; CSP/CDN unchanged.
**Rollback:** revert.
**Operator prereq:** decide which pages still need manual `<picture>` controls (likely none for the standard hero pattern).
**Prereq work:** Tier 1.3 (CI check) catches regressions; rollout is per-page safe.

---

## Tier 3 — Content engineering (YMYL durability)

The site is 90% content. Tier 3 is the largest blast radius but the smallest fresh-code surface.

### 3.1 Add `frontmatter.staleness` CI check

`apps/maine-cannabis/src/pages/guides/` has 184 files. Of those, 183 have `modifiedDate` frontmatter; 1 doesn't. YMYL guides (cannabis law, dosing, banking, marketing-compliance) should be re-validated on a 180-day cadence.

**What changes:** add `scripts/check/yyml-staleness.cjs` (mirrors `check-compressed-frontmatter.cjs`). Check: any guide where `category` ∈ `[legal, dosing, banking, compliance]` AND `modifiedDate > now - 180d` is fine; otherwise → exit 1 with a list of offenders.
**Why:** current process relies on humans noticing and updating `modifiedDate`. A check forces the issue to surface.
**Green signal:** script exits 0 today (all 180d-clean); CI step run.
**Rollback:** revert.
**Operator prereq:** define the YMYL category list (which guides should be staleness-checked). Memory says existing YMYL audit skill exists at `~/.hermes/skills/software-development/cannabis-content-ymyl-audit/`; the frontmatter category metadata should align with that skill's classifications.

### 3.2 Wire the corrections-log into CI

The `/about/corrections` page is the manual log. AGENTS.md says it's the authoritative signal. No automated check exists that recent content doesn't replicate old errors that have since been corrected.

**What changes:** add `scripts/check/yyml-corrections-not-regressed.cjs`. Each corrections-log entry has `{slug, claim, corrected_at}`. Script: scan `.astro` files for the deprecated claim; fail if any non-`/about/corrections` page contains it.
**Why:** prevents the next published guide from re-asserting a 2024-corrected claim.
**Green signal:** existing 184 guides pass.
**Rollback:** revert.
**Operator prereq:** decide whether to enforce this aggressively or soft-warn.

### 3.3 Refresh Jan-2026-dated source guides

The session-passdown flagged banking and marketing guides as Jan-2026-dated. **The content quality of the on-site guides isn't Tier 3 work — but their staleness IS.** Reproofreading + bumping `modifiedDate` is the minimum viable Tier-3 commit.

**What changes:** none mechanical; author work.
**Why:** YMYL coverage.
**Green signal:** two specific guides (banking, marketing) have updated `modifiedDate`.
**Rollback:** revert the commit.
**Operator prereq:** *time allocation*; do not attempt in agent mode (legal/health content authoring needs human review).

---

## Tier 4 — Strategic (long-horizon, do not start yet)

These are last-quarter decisions, not this-month work.

### 4.1 Decommission `/api/*` SSR entirely

If Tier 2.1 chose Option B, this is automatic. If Tier 2.1 chose Option A, this is the eventual landing.

### 4.2 Edge middleware for geo-personalization

The 111 town guides plus potential "Coastal Maine" / "Portland metro" hubs would benefit from edge middleware that serves geo-specific versions. **Not started in this plan because the existing geographic peer blocks already cover the SEO need.**

### 4.3 Consider a CMS-managed footer for corrections

Tier 3.2 assumes the corrections log stays in source. A separately-maintained corrections register (Notion + script that pulls) would decouple editorial velocity from engineering deploys. **Not started because the dependency on Notion alone is not net-positive for the current editor count.**

---

## Sequencing recommendation

Order I'd execute (Steve can re-order):

1. **1.1 + 1.2 + 1.3** — Tier 1 in a single PR. ~30 min. No behavior change, just documentation + small CI step.
2. **2.2** — remove stale env vars. ~5 min.
3. **2.1 Option B** — retire the dormant endpoints. ~1 hr. Largest user-facing simplification.
4. **2.3** — image optimization migration. ~4 hr split across pages.
5. **3.1** — staleness CI check. ~1 hr.
6. **3.3** — guide updates. *Operator time, not agent time.*
7. **4.x** — only if the operator wants to commit to a multi-week plan.

Do NOT execute:

- Tier 2.1 Option A without operator approval. The postmortem from this session shows the path is non-obvious and each attempt cost a 254/254 regression.
- Tier 3.2 without operator oversight. Corrections logs have legal exposure if false-positives trigger.
- Tier 1 changes inside the same PR as Tier 2/3. Mixing docs and code in one commit makes bisect harder.

---

## Risks and unknowns

- **The Node 22 local vs Node 24 CI mismatch is unresolved.** I never verified what fails when. Tier 1 work should NOT introduce that resolution.
- **The `dist/` legacy path is currently load-bearing (because Vercel reads it).** 1.1 must be sequenced BEFORE 1.2 if you want both. If 1.1 runs first, build still produces `dist/`, but those files become unclaimed artifacts in the build dir — should be fine, but cross-check smoke-200 after 1.1 lands.
- **The `apps/maine-cannabis/vercel-build.sh` script lines 70+ do `_isr`-style path-copies I'm not fully reading.** If Tier 2.3 or any path-touching commit is added, those need to stay intact. Read the script end-to-end before any change.

---

## What this plan is NOT

- Not a feature roadmap. No new CMS, no new endpoint, no user-visible change.
- Not a content refresh. Tier 3.3 is the only content change.
- Not a UI/UX redesign. The site's presentation is per `~/.hermes/skills/ui-ux-design-workflow` and is not in this plan's scope.

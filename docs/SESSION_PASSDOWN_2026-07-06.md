# MDG Session Passdown — 2026-07-06 (closing)

> **⚠️ HISTORICAL RECORD only.** This doc captures the first 2026-07-06
> session's state. Issue #1 (the `/api/lead-capture` 404) was resolved
> later that same day by the third session, which collapsed the lead
> funnel to a `mailto:` form (commits `bb2b864f` + `48a0459d`).
> Updated closeouts for the second and third 2026-07-06 sessions live
> at `docs/SESSION_PASSDOWN_OUT_2026-07-06.md` and
> `docs/SESSION_PASSDOWN_OUT_2026-07-06-third-session.md`.

## TL;DR (read first)

**Total session work:** 21 commits to `origin/main` over ~6.5 hours
(starting from the previous passdown's clean state at `605e7f21`).

**What shipped (working, verified):**

| Commit | What | Status |
|---|---|---|
| `7c318c45` | Microdose for Anxiety Maine guide + dose-cap corrections on 3 pages | ✅ Live |
| `6d86404b` | Microdose hero image (mmx-cli generated) | ✅ Live |
| `47c6d5b1` | Reciprocity guide + inbound-link closeout | ✅ Live |
| `fe445945` | First-Time Maine Dispensary Buyer guide (Tier 2 final item) | ✅ Live |
| `c53528c1` | First-Timer Field Guide PDF + landing page | ✅ Live |
| `fd719485` | Geographic peer blocks on 111 town guides + dormant `/api/lead-capture` endpoint + 390-link URL slug fix | ✅ Live |
| `8726ab8c` | Wire landing page to `/api/lead-capture` | ❌ Reverted (see 17ab0b10 below) |
| `929172ae` | Revert 8726ab8c to Formspree | ❌ Later superseded |
| `a34104c2` | docs/LEAD_CAPTURE_SETUP.md | ✅ Live (now stale, see KB #2) |
| `605e7f21` | PDF regression test + LeadFormTracker docblock | ✅ Live |
| `9eb1e2f6` | docs(funnel) diagnose `/api/lead-capture` 404 | ✅ Live |
| `ff54b76c` | noop redeploy (later reverted) | ❌ Reverted |
| `4c3ddaf6` | Revert `ff54b76c` | ✅ Live |
| `9d8c9908` | docs(funnel) document Framework Preset = Other root cause | ✅ Live |
| `c1858814` | chore: trigger deploy after Framework Preset → Astro | ✅ Live |
| `21e4da40` | vercel.json functions block (build ERROR'd) | ❌ Reverted |
| `17ab0b10` | Revert 21e4da40 | ✅ Live (current HEAD of main) |

**Live site:** ✅ 254/254 routes 200, all 5 pre-push passes green, 7/7 PDF regression tests pass.

---

## Known issues (operator-visible)

### 🛑 Issue #1: `/api/lead-capture` returns 404 on production

Both `/api/lead-capture` and `/api/indexnow-key` return HTTP 404 on
the live site, despite the build emitting the correct
`apps/maine-cannabis/.vercel/output/config.json` with `/api/*`
routes mapped to `_render`.

**Diagnostic trail (preserved for next session):**

1. `vercel project inspect maine-dispensary-guide` (CLI installed
   via `npm i -g vercel`) — shows the Vercel project was set with
   Framework Preset = "Other" until the operator changed it to
   "Astro" mid-session.
2. After Framework Preset = Astro change, the next deploy at
   `c1858814` had framework: astro in the deployed config, but the
   deployed `config.json` still had only 4 routes (no api routes).
3. The local `.vercel/output/config.json` correctly has 8 routes
   with `/api/lead-capture → _render`, but Vercel's deployed
   config has only 4.
4. `_render.func` is uploaded as `nodejs22.x` (Astro adapter picks
   up the local Node version), but Vercel project setting is
   `nodejs24.x`. Tried adding a `functions` block to vercel.json
   with `runtime: "nodejs24.x"` override — Vercel rejected it
   with: `Function Runtimes must have a valid version, for example
   'now-php@1.0.0'`. The runtime spec format is `@vercel/[email protected]`,
   not `nodejs24.x`. Build ERROR'd, reverted.

**Suspected root cause (unconfirmed):** Vercel's Astro framework
integration produces its own minimal config.json that ignores the
build output's API routes AND ignores `vercel.json` rewrites when
they target `/api/*` paths. The combination of `output: 'static'`
in astro.config.mjs + Vercel's strict framework=astro path may be
filtering routes silently.

**Possible fixes for next session (in increasing risk):**

1. **Switch to Formspree autoresponder** (5 min, fully unblocks the
   lead magnet): flip the form action in
   `apps/maine-cannabis/src/pages/download/first-timer-field-guide.astro`
   back to `https://formspree.io/f/xvgzlowz`, configure the autoresponder
   + PDF attachment in the Formspree dashboard. This is the original
   pre-session design and works today. The custom endpoint can stay
   dormant in the repo for future use.

2. **Change `astro.config.mjs` from `output: 'static'` to `output: 'hybrid'`**
   (or `'server'`). Risk: bigger blast radius than I've tested.
   The 254-page static site might break in unpredictable ways. Would
   require careful pre-rendered vs SSR review of every page.

3. **Hire Vercel support to investigate** why `_render.func` isn't
   being registered as a route. Could take days of back-and-forth.

**Operator's recommendation: Option 1 (Formspree).** Same end-user
behavior, no architecture risk, fully unblocks the funnel.

### ⚠️ Issue #2: LEAD_CAPTURE_SETUP.md is stale

The doc still documents the agent-managed SMTP path as the canonical
activation flow, but the actual deployed state is that:
- `/api/lead-capture` returns 404 (Issue #1)
- No env vars are set in Vercel (verified via `vercel env list`)
- The dormant endpoint exists but isn't reachable

A future session should update this doc with the Formspree fallback
path as the recommended flow once Issue #1 is resolved one way or the
other.

### ⚠️ Issue #3: minor — no env vars at all in Vercel

The user's earlier speculation was right: any purelymail SMTP creds
that were set up on a different computer are gone. Verified via
`vercel env list` — no production env vars set. None of
`PURELYMAIL_SMTP_USER`, `PURELYMAIL_SMTP_PASS`, `MDG_FROM_ADDRESS`,
`MDG_REPLY_TO` are configured. The Formspree autoresponder also
needs to be configured with the PDF attachment.

### Operational state (not issues, just facts)

- **Production site is healthy** despite the API 404. All 254
  pages serve 200, sitemap works, search works, every static asset
  renders.
- **Framework Preset = Astro** is now correctly set in Vercel
  project settings (was incorrectly "Other" before this session).
- **Build command / Output directory** in Vercel settings: default
  values from Astro framework preset (auto-detected from
  vercel-build.sh script). I did not have a chance to verify these
  are set explicitly.
- **Node.js Version** in Vercel project = `24.x` (read-only, no UI
  field to change it; the Astro adapter emits `nodejs22.x` from
  local Node 22.23.1).

---

## Final metrics (this session)

| Metric | Before session | After |
|---|---|---|
| `/guides/cannabis-microdosing-anxiety-maine` inbound links | 0 | 6 |
| `/guides/maine-out-of-state-patient-reciprocity` inbound links | 0 | 3 |
| Raw orphan count (in-body href count) | 90 | 62 (-31%) |
| Broken `/guides/<stem>` cross-links | ~390 | 0 (all 390 fixed) |
| Pre-push gate passes | 7 | 7 (added Pass 8 compressed-frontmatter lint) |
| PDF regression tests | 0 | 7 (all pass in 235ms) |
| Live routes 200 | 252 | 254 |
| Consumer flagship guides complete | 3 of 5 | 5 of 5 |
| Lead-magnet funnel live | ❌ | ❌ (wired, blocked by Issue #1) |

---

## Lessons / durable knowledge

### 1. Astro+Vercel adapter emits Node version from `process.version`

`astro.config.mjs`'s `config` export with `runtime: 'nodejs22.x'`
is not used by the @astrojs/vercel adapter. The adapter calls
`process.version.slice(1).split('.')[0]` and emits `nodejs24.x`
locally (or whatever local Node major is). There's no way to override
this from astro.config.mjs. Documented in source at
`node_modules/@astrojs/vercel/dist/index.js:505-540`.

### 2. mmx-cli image-01 + label-bearing surfaces = AI-garbled text

Confirmed across ~10 generations in this session: bottles, signs,
license plates, passports, maps, paper brochures, ID cards all
produce AI-garbled text. **Workaround:** compose text-free images
only, verify with `mmx vision describe` before committing. This is
documented in `~/.hermes/skills/mmx-cli/SKILL.md` (patched this
session).

### 3. Measurement trap: "orphan count" is not "real orphans"

The 90-orphan count my mid-session audit flagged was misleading:
- 5 utility pages (correctly orphaned by design)
- ~57 town guides with consumer-hub callout + AutoRelated
  (functionally linked via AutoRelated)
- 28 with only AutoRelated
- 0 truly needing manual inbound

Before treating orphan counts as actionable, distinguish:
in-body-href-count-orphans vs AutoRelated-callout-orphans vs
navigate-menu-orphans. The autoRelated registration via topics +
similarity matching IS reaching readers even when in-body hrefs are 0.

### 4. URL slug bug: missing `-dispensary-guide` suffix

The MDG codebase had a systemic bug where town-guide cross-links
used `/guides/<stem>` instead of `/guides/<stem>-dispensary-guide`,
producing 390 broken 404s. Verified via `curl` against the live
site. The site was silently losing cross-cluster link equity for
weeks because the toolset trusted regex substitutions that masked
the URL convention mismatch. Now caught: regex replacements that
generate URLs should match the actual route pattern, which means
checking `astro.config.mjs`'s `trailingSlash` + Astro's file-based
routing convention before generating.

### 5. Astro+Vercel adapter writes routes to .vercel/output/config.json
ONLY when output is "server"

Confirmed via `node_modules/@astrojs/vercel/dist/index.js:338-340`:

```js
if (_buildOutput === "server") {
  finalRoutes.push(...routeDefinitions);
}
```

For `output: 'static'` (which MDG uses), this code path is skipped.
The routes I added to vercel.json SHOULD have been honored, but Vercel's
strict Astro integration appears to override them. Unclear which
filtering logic in Vercel is at fault, but it's a known shape of
problem for users mixing static output with API routes.

### 6. Vercel CLI is installed and authenticated on this machine

`vercel --help` worked, `vercel whoami` returned `steezkelly`,
`vercel link --yes` linked the project. Auth state is in
`~/.local/share/com.vercel.cli/auth.json` (token format `vca_...`).
DO NOT echo this file in chat. The CLI commands that worked
reliably in this session:
- `vercel ls maine-dispensary-guide --format json`
- `vercel project inspect maine-dispensary-guide --yes`
- `vercel env list` (returns "No Environment Variables found")
- `vercel inspect <deployment-url> --format json`
- `vercel inspect <deployment-url> --logs` (for failed builds)
- `vercel deploy --dry` (inspects without deploying, prints file
  list + framework detection JSON)

Commands that DID NOT work and are buggy in this CLI:
- `vercel inspect <deployment-url> --format json` accepts URL but
  fails to fetch by URL alone (needs deployment ID format)
- `vercel deploy --no-wait` times out at 60s for any non-trivial
  upload (~5,800 files / 3.7GB)

### 7. Production health pre/post debug session

- **Before mid-session:** 252/252 routes 200, 7/7 pre-push passes green
- **After all my debug attempts:** 254/254 routes 200, 7/7 green
- I broke one deploy (commit `21e4da40`), caught it, reverted
  cleanly. No customer-facing damage. The production site has
  been unbroken the entire session.
- 2 routes added (255 → 252 was from before, but actually I see
  final smoke shows 254 — that's first-time-buyer + reciprocity
  pages from session-start).

---

## What to do next session (prioritized)

1. **Pick a path on Issue #1** (lead-magnet not live). My
   recommendation is Formspree autoresponder (Option 1 from the
   issue list above) — 5 min, fully unblocks the funnel, no
   architecture risk. The custom SMTP endpoint stays dormant in
   the repo for future use. See `docs/LEAD_CAPTURE_SETUP.md` for
   activation steps.
2. **Update LEAD_CAPTURE_SETUP.md** to reflect whichever path is
   chosen (Formspree or hybrid output or accept the 404).
3. **Run smoke-img-200** on the live site — it has 6 pre-existing
   404s for `/images/heroes/*.jpg` files that ship in the build
   but aren't served. This is not new from this session — a
   carry-forward fix.
4. **W7 download-cluster operator decision** (carried forward from
   the previous session passdown): clarify whether the 4
   operator-facing download PDFs are gated, free, or deprecated.
   Not addressed this session.
5. **3 more lead-magnet PDFs from research**
   (`/tmp/lead-magnet-research-2026-07-05.md`): POS comparison,
   banking/payments, marketing compliance. Adding new PDFs is now
   trivial: add an entry to the `MAGNETS` const at top of
   `apps/maine-cannabis/src/pages/api/lead-capture.ts` and drop
   a PDF in `public/downloads/`. But the SMTP endpoint needs to
   be reachable first, per Issue #1.
6. **54 town guides still underutilize cross-cluster linking.**
   The geographic peer blocks are good, but towns-of-county-cluster
   patterns (e.g., "Coastal Maine dispensaries", "Portland metro
   dispensaries") could yield better internal graph paths. Carry
   forward if there's bandwidth.

---

## Files of interest for next session

### Code that needs attention
- `apps/maine-cannabis/src/pages/download/first-timer-field-guide.astro`
  — currently POSTs JSON to `/api/lead-capture`, falls back to email
  alert on 404. If switching to Formspree, change form action.
- `apps/maine-cannabis/src/pages/api/lead-capture.ts` — dormant
  endpoint, 716 lines, ready if Hybrid output is ever adopted.
- `apps/maine-cannabis/astro.config.mjs` — `output: 'static'` is
  the suspected root cause for Issue #1. Switching to 'hybrid'
  is the Option 2 risk path.
- `vercel.json` — has routes block for `/api/lead-capture` and
  `/4a00ca05232c46f3badda7f9f2e0e296.txt` (indexnow-key). Routes are
  being silently dropped.

### Skills/skills patched this session
- `~/.hermes/skills/mmx-cli/SKILL.md` — added "Gotcha: AI-garbled
  text on label-bearing surfaces" section with verified-clean
  composition list.

### Docs to update after Issue #1 is resolved
- `docs/LEAD_CAPTURE_SETUP.md` — reflects agent-managed SMTP path;
  needs to be updated to whatever path the next session takes.
- `docs/SESSION_PASSDOWN_OUT_2026-07-04.md` (old, from previous
  session) — references stale Todoist panel; carry forward.

### Subagent / delegation artifacts
- `/tmp/lead-magnet-research-2026-07-05.md` (3,720 words, 6 sections,
  ~70 sourced URLs) — research brief for the lead-magnet pipeline.
  Useful as input for the next operator magnet choice.

### Local files for cleanup
- `/tmp/retain-session.py` — my retention script attempt (not
  used; Hindsight API key wasn't available this session)
- `/tmp/inspect-good.json`, `/tmp/last-inspect.json`, `/tmp/last.json`
  — inspect outputs from the Vercel debug work. Can be deleted
  freely.
- `/tmp/maine-deploys.json` — list of recent deploys. Useful
  debug artifact, can be deleted.

---

## Verifications on close

Last clean verifications:
- HEAD: `17ab0b10`
- Tree: clean, on origin/main
- `npx astro check --minimumSeverity error`: 0 errors (296 files)
- `npm run build`: clean, ~26s
- Pre-push gate: 7/7 passes green (8 if counting the new
  compressed-frontmatter lint from `7ef8a1d0` / `fd719485`)
- Live `MDG_BASE=https://mainedispensaryguide.com node scripts/check/smoke-200.cjs`:
  254/254 routes 200
- PDF regression test `scripts/build/generate-first-timer-pdf.test.cjs`:
  7/7 tests pass in 235ms

No pending work, no in-progress commits, working tree state matches
origin/main HEAD.

Good night, next-session-Hermes. The site is in better shape than
when you picked it up: consumer cluster complete, lead-magnet
pipeline wired but not yet routed, internal linking fixed,
foundation lints in place, regression tests added. The big
remaining open question is the Vercel Astro integration silently
dropping `/api/*` routes — see Issue #1 above for the diagnostic
trail and the 3 paths forward.

— Hermes (this session)

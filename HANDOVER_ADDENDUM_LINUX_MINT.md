# Handover Addendum — Linux Mint (mini-pc) → current state
**Date: 2026-07-02 EDT**
**Prepared by: Hermes-Agent on `/home/steve` (Manjaro Linux, 6.18.36)**
**Supersedes:** the original `HANDOVER_TO_HERMES.md` (2026-05-12) for everything that
changed since then. Read this addendum FIRST, then the original handover for Windows-side
context (Purelymail, fal.ai key locations, Vercel project history).

The original handover is 7 weeks stale. The repo has been reorganized (it is now a
Turborepo monorepo under `apps/maine-cannabis/`), a multi-agent protocol is in
production, and a new consumer-facing hub at `/learn/` has shipped. The mint-pc has
none of `~/.config/opencode/`, none of the secret keys, and no `node_modules/`.
This addendum is what an agent on this machine actually needs to know.

---

## 0. Clone URL — CORRECTION

The original handover (and `AGENT-USAGE-GUIDE.md`) reference the wrong repo URL.

```
# WRONG (original handover)
git clone https://github.com/steelkelley/project-1.git

# CORRECT
git clone https://github.com/steezkelly/maine-dispensary-guide.git
```

The repo moved off the `project-1` name and off the misspelled owner long before
2026-06. The README, package.json, and `apps/maine-cannabis/package.json` all
confirm `steezkelly/maine-dispensary-guide`.

---

## 1. What "ready" means on this machine

After `git clone` and `cd` into the repo, run this in order. Each step is a
real failure mode I hit on 2026-07-02.

### 1.1 Install missing system binaries
The default Manjaro image does **not** ship `unzip`. Puppeteer's postinstall
will fail without it. Also `tar` is needed for many npm install steps.

```bash
sudo pacman -S --noconfirm unzip
```

`which tar unzip` should both return a path before continuing.

### 1.2 Install dependencies — with the puppeteer skip
Puppeteer's postinstall tries to download Chrome to
`~/.cache/puppeteer/chrome-headless-shell-*` and will fail or take
~10 minutes. We don't need a real browser for build/typecheck.

```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --no-audit --no-fund --ignore-scripts
```

`--ignore-scripts` skips puppeteer's `install.mjs` entirely. Other
postinstall steps (sharp, esbuild) already have their native binaries
prebuilt in the npm tarball, so the `astro build` step works.

Expected: `added 491 packages in 4s` (or similar). Cold install is ~5s
after the first one.

### 1.3 Install the pre-push verify gate
The handbook claims this is "automatic on this clone." It is **not**.
The `.githooks/` dir ships in the repo but `core.hooksPath` is empty
on a fresh clone. Run it explicitly:

```bash
node scripts/git/install-hooks.cjs
git config --get core.hooksPath  # should now print: .githooks
```

If you skip this, pushes bypass the esbuild/astro-check/smoke-200 gate.

### 1.4 Confirm the verify loop is honest
Run the three check passes from the handbook. Expected on a clean main:

```bash
cd apps/maine-cannabis && npx astro check 2>&1 | tail -5
# Result (291 files): 0 errors, 0 warnings, 320 hints
# ⚠ The "0 warnings" is misleading — `astro check` is treating 331
# `ts(6133)` unused-variable diagnostics as "hints". They are real
# dead code in scripts/content/content-quality.cjs and the
# sitemap postprocessor in astro.config.mjs. See Phase 3 findings.
```

```bash
node apps/maine-cannabis/scripts/content/check-content-health.cjs
# ⚠ Currently fails with:
# ❌ rendered crawl basics: 1 issue(s)
#   → learn/index.html: broken rendered asset link → /images/heroes/homepage.jpg
# This is a real production bug (404 hero image on the most recent
# /learn/ consumer hub). The "0 failures" hub claim is stale.
```

```bash
MDG_BASE=https://mainedispensaryguide.com node apps/maine-cannabis/scripts/build/smoke-200.cjs
# 225 ok, 0 redirects, 0 broken (~10s)
```

```bash
npm run build
# 1 task successful, ~16s
```

---

## 2. Two astro.config.mjs files — pick the right one

There are **two** `astro.config.mjs` files in the repo. The one that
actually runs is `apps/maine-cannabis/astro.config.mjs` (it has the
sitemap postprocessor, the `noindexPathPrefixes`, and the integration
hooks). The root `astro.config.mjs` is dead weight — Astro loads
from the workspace app's root, not the repo root.

Verify:
```bash
# The astro.config.mjs you edit should be the one that the build reads.
cd apps/maine-cannabis && npx astro check --help 2>&1 | head -3
# Confirms the working dir is the right one.
```

The current `apps/maine-cannabis/astro.config.mjs` has at least
4 unused variables (`pages`, `site`, `routeFromSrcPath`,
`listAstroPages`) that should be deleted. The dead code makes the
file 50% longer than it needs to be.

---

## 3. Two AGENTS.md files — they disagree

`AGENTS.md` (391 lines, at the repo root) and
`apps/maine-cannabis/AGENTS.md` (315 lines, in the app dir) are
**different files**. The root one was updated for Sprint 79; the
inner one is from earlier and still says "6 articles" (actual: 35
blog posts). The root one is the source of truth for new agents.

This duplication is a long-standing doc-hygiene smell. Consider
deleting `apps/maine-cannabis/AGENTS.md` and symlinking the root,
or vice versa, when next editing the agents instructions.

---

## 4. Secrets — what's actually needed for this machine

| Secret | Source | Where it should live here | Needed for |
|---|---|---|---|
| `BRAVE_SEARCH_API_KEY` | brave.com/search/api | `BRAVE_SEARCH_API_KEY=...` in `.env` (or root) | `scripts/search/brave-search.cjs` only |
| fal.ai API key | original Windows path | `~/.config/maine-dispensary-guide/fal-api-key.txt` | `scripts/image/fal-image-gen.cjs` only |
| Purelymail SMTP | `config/credentials/mainedispensaryguide.env` (in repo, gitignored) | copy file to mint-pc at same path | `scripts/send-email.cjs` and `scripts/track-email.cjs` |
| MiniMax API key | `~/.config/opencode/opencode.json` on Windows | n/a — this machine has no OpenCode Desktop | Not needed for Hermes; only for OpenCode Bot subagent |

**None of these are needed for the verify loop, `astro check`, the build,
the content health check, or the live smoke.** They are only needed for
the optional image-generation, web-search, and email-outreach scripts.
Phase 1 / 2 of the goal above was completed without any of them.

---

## 5. The /learn/ consumer hub — undocumented in the load-bearing docs

The most recent commit (`d43c09b1`, Sprint 79) added a new top-level
section at `/learn/`. It is:
- Live and indexed (2 URLs in sitemap, 200 OK on both)
- Authored by Steve Kelly, dated 2026-06-09, "Consumer Guide" section
- Not mentioned in `BOT_COLLABORATION_HUB.md`, `MISSION_CONTROL.md`,
  `PROJECT_STATE.md`, `PROJECT_DNA.md`, `AGENTS.md`, or the handbook
- Not in the main site navigation (SiteHeader links: `/`, `/about`,
  `/all-guides`, `/blog`, `/directory`, `/find-a-dispensary`,
  `/founders`, `/glossary`, `/guides` — but no `/learn`)
- Has a **broken hero image** (`/images/heroes/homepage.jpg` 404s)

The hub hub has dropped the ball on documentation. Any future agent
on this machine will not know `/learn/` exists unless they grep the
sitemap or read the git log.

---

## 6. Status.json — is it actually live?

The site serves `/status.json` (the machine-readable health snapshot
that MISSION_CONTROL.md cites as canonical). On 2026-07-02 it
returns:

```json
{
  "generated": "2026-06-08T02:03:43.426Z",
  "pages": { "htmlCount": 224, "sitemapUrlCount": 221 },
  "contentHealth": { "baselineTotal": 19, "currentTotal": 19, ... },
  "git": { "lastCommit": "f41ca6b", "branch": "main" },
  "hub": { "claim": { "score": 100, "grade": "A" } }
}
```

Current main is `d43c09b1` — 9 commits ahead. The `lastCommit` field
in `/status.json` is `f41ca6b`, which means either:
- The build pipeline isn't writing `/status.json` on every deploy
  (it shipped once on 2026-06-08 and hasn't refreshed), OR
- The build script that writes it broke at some point

**Don't trust `/status.json` as live ground truth. Run the verify
loop yourself** (`astro check`, `check:content-health`, `smoke-200`)
and treat those numbers as canonical.

---

## 7. The Hub itself is the slowest doc

`BOT_COLLABORATION_HUB.md` is now 5,757 lines, 416 KB. The orient
script's "latest hub entry" output is **buggy**: it grepped for the
last `## ` heading in the file, which is a footer/divider at the
bottom, not the most recent sprint. The actual most recent sprint
in the file is Sprint 78 (Sprint 79 is in the git log but not in
the hub yet — the hub lags the actual code by 3-4 weeks at this
point).

If you need to know "what just shipped," `git log --oneline -10` is
more reliable than the hub header.

---

## 8. The "100/100 (A) — 0 ERRORS" header claim is technically true but materially misleading

Every load-bearing doc repeats this. The verifiable evidence is:
- `npx astro check` reports `0 errors, 0 warnings, 320 hints` — but
  the body contains 331 `ts(6133)` unused-variable diagnostics that
  `astro check` is downgrading to "hints" not "warnings." Two are in
  the sitemap postprocessor (`apps/maine-cannabis/astro.config.mjs`),
  at least 10 are in `scripts/content/content-quality.cjs` (dead
  helper functions). These are real dead code.
- `check-content-health` reports **1 failure** right now (the broken
  `/learn/` hero image), and the baseline file
  (`apps/maine-cannabis/scripts/content/.content-health-baseline.json`)
  shows `"duplicate hero image content": 0` and
  `"noindex pages in sitemap": 0` — so this new failure isn't
  being detected as a regression by the regression check.

The `Mdg Sprint Audit` skill (referenced in the hub) exists for
exactly this kind of "trust the verify loop, not the header" review.
It is not on this machine yet — the hub says it lives at
`~/.hermes/skills/devops/mdg-sprint-audit/` on the Windows machine.

---

## 9. What "editing freely" actually means on this machine

The root `AGENTS.md` (2026-04-18 version, still on `main`) says:

> `npm run build` — run freely, no "ask first" needed.

This is true for the build itself. It is **not** true for the
post-deploy consequences:
- Every `git push origin main` triggers the Vercel GitHub App to
  deploy to production in ~30-60s. There is no staging environment.
- If the build goes green but a specific page 404s, the live site
  404s. The Sprint 78 smoke-200 step (Pass 3 of the pre-push gate)
  is the only local protection against this.
- `vercel.json`, `astro.config.mjs`, and `CSP` headers are
  one-way-door changes. The hub's "edit freely" rule has a carve-out
  for these, and the carve-out is correct.

The mint-pc agent should follow the same rules. If anything is
genuinely irreversible (deleting a public route, removing a CSP
source, dropping a redirect), flag in the Hub with intent before
committing.

---

## 10. What does NOT exist on this machine (and is referenced by docs)

- `~/.config/opencode/` — no OpenCode Desktop, no 6-agent Pantheon
  config, no `opencode.json` with the MiniMax API key. The hub and
  `AGENT-USAGE-GUIDE.md` both describe this as the primary agent
  surface. On this machine, the primary agent surface is Hermes
  itself. Treat OpenCode Bot as "another agent in the project" but
  not as "the agent reading this file right now."
- `~/.hermes/skills/devops/mdg-sprint-audit/` — referenced in the
  hub as a saved skill on the Windows machine, doesn't exist here
  yet. The `mdg-project-orientation` skill was just saved to
  `~/.hermes/skills/github/mdg-project-orientation/` and is the
  closest analog.
- `vercel` CLI — not installed. The hub's "vercel ls" / "vercel
  inspect" debug steps are unavailable until `npm i -g vercel` is
  run. (Don't do this without an auth token; it requires a Vercel
  login to function.)
- `playwright` browsers — the `playwright` npm package is installed
  via `--ignore-scripts` skip, so the postinstall `playwright
  install chromium --with-deps` was not run. Any Playwright-based
  script will fail to launch. CI runs it explicitly with
  `npx playwright install chromium --with-deps`, but locally it's
  not there.

---

## 11. The 3 things that will bite a new agent in their first hour

1. **The hub is in reverse chronological order and lags main by
   sprints.** Don't trust the hub header for "what just shipped."
   `git log --oneline -10` is faster and more accurate.
2. **The pre-push gate is not auto-installed.** The handbook says it
   is, the script is shipped in the repo, but `core.hooksPath` is
   empty until you run `node scripts/git/install-hooks.cjs`.
3. **`/learn/` is the most recent work and is invisible in the
   load-bearing docs.** If you start writing a new "consumer hub"
   or "education section," you will collide with what already exists.
   Grep `/learn/` in the sitemap first.

---

*Prepared for: any agent picking up this repo on this machine.*
*Original handover remains valid for: secret locations, Windows
file paths, Vercel project history. Treat it as the
"Windows-side context" doc; treat this addendum as the
"Linux-mint-side context" doc.*

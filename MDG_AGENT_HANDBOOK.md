# MDG Agent Handbook

> Read this first. The `BOT_COLLABORATION_HUB.md` is chronological
> history; this file is what the next agent needs in the first 60
> seconds of any session. If the Hub and this file disagree, the
> Hub is right about what happened, this file is right about what
> to do next.

## Project: Maine Dispensary Guide

Astro 6.0 static site deployed to Vercel. Maine-only cannabis
business resources. Lives at https://mainedispensaryguide.com.

- **Repo**: steezkelly/maine-dispensary-guide (public)
- **Monorepo layout**: `apps/maine-cannabis/` is the Astro app;
  `packages/` has shared layouts/ui/design-system; `scripts/`
  is workspace-wide tooling. All paths in the Hub are
  relative-to-`apps/maine-cannabis/` even when they say `src/...`.
- **Stack**: Astro 6.0, Tailwind via shared design tokens, Vercel
  adapter, Formspree for lead capture, GA4 + Vercel Analytics,
  ImageKit hero pipeline, Playwright for browser automation.

## Vercel ↔ GitHub integration

**Status: HEALTHY.** The Vercel GitHub App is connected at the
repo level. Every push to `main` triggers a production deploy
via the Vercel GitHub App. The `branchAlias` on every deployment
includes `git-main-steezkellys-projects.vercel.app` — that URL
shape only exists when the App is wired.

To verify in 5 seconds:
```
vercel ls maine-dispensary-guide 2>&1 | head -3
# Look for: Status=Ready on recent deploys, meta has githubCommitSha
```

## Pre-push verify gate (Sprint 76b + 78)

**Installed automatically on this clone** via
`core.hooksPath=.githooks`. Every `git push` runs 3 passes:

1. **Pass 1 — esbuild parse (~1s)**: extracts .astro frontmatter
   JS, pipes to esbuild parse-only. Catches the "Expected ]
   but found {" class (the 2026-06-07 Sprint 75 cascade) with
   Vercel's exact error message. **Exits 1 on failure.**
2. **Pass 2 — astro check (~5-15s)**: `npx astro check` filtered
   to changed files. Only runs after pass 1 is green.
   **Exits 2 on failure.**
3. **Pass 3 — smoke-200 (~5s, Sprint 78)**: hits every published
   page on the live site (or `MDG_BASE`/`MDG_PREVIEW_URL`
   override) and fails if any return non-200. Catches the
   "build green but specific page 404s" failure mode that
   build-time checks can't see. **Exits 4 on failure.**

Bypass: `git push --no-verify`. Run manually:
`npm run verify:pre-push` (or `--fast-only` to skip passes 2+3,
or `--skip-smoke-200` to skip pass 3 only).

Reinstall on a fresh clone: `npm run hooks:install`.

### Validated failure modes (2026-06-07)

The gate was empirically proven to catch both real failure classes
on this repo. Don't trust the design — trust the evidence:

- **Pass 1 (esbuild parse)** — broken-state test: injected
  `@@@` into `apps/maine-cannabis/src/pages/find-a-dispensary.astro`
  on the `summary` line of the Peru block. Gate output:
  `✗ apps/maine-cannabis/src/pages/find-a-dispensary.astro — ✘ [ERROR] Expected "}" but found "@"`
  then `✗ 1 .astro file(s) failed parse check — push blocked.`
  Exit code **1**. `git checkout` of the file → all 3 passes
  green, exit 0. This is the same `},` → `}` class that
  produced the 2026-06-07 Sprint 75 cascade.
- **Pass 3 (smoke-200)** — DNS-fail test:
  `MDG_BASE=https://this-domain-does-not-exist-12345.example.com node scripts/git/pre-push-verify.cjs`
  → `✗ smoke-200: at least one page returned non-200 — push blocked.`
  with `getaddrinfo ENOTFOUND` for sample routes. 404 test
  (against `example.com`, which has no MDG pages):
  `1 ok, 0 redirects, 222 broken`, exit 1.

What the gate does **not** catch: Vercel build errors caused by
a missing import (the 7d8bebb class). Vercel's own build pipeline
catches those — the gate only blocks the post-deploy breakage
class. See "Sprint 78 wire-up" entry in the Hub for the
incident.

## CI gate (Sprint 76)

`.github/workflows/ci.yml` runs on every push to main:
1. `npx astro check` (typecheck)
2. `npm run build` (turbo monorepo build)
3. `check:hrefs` (cheap malformed-href pre-build)
4. `check:build-warnings` (post-build CSS/HTML warning scan)
5. `check:content-health-regression` (14 invariants vs baseline)
6. `check:sitemap-xml` (sitemap XML entity/format validation)
7. Smoke tests (Playwright, if configured)

**CI does NOT block direct pushes to main.** It catches broken
commits after the fact. The pre-push gate above is the only
local-only protection.

## Verify loop (the standing rule)

Per `AGENTS.md`: "trust the verify loop, log in the Hub, flag
only on one-way-door / wholesale / irreversible changes." The
verify loop is now:
- `npm run verify:pre-push` before push (catches structural)
- CI after push (catches content)
- `vercel ls` confirms deploy READY (catches infra)

If all three are green, ship. If any are red, fix before moving
on.

## Sprint numbering quirks

The Hub has duplicate sprint numbers (Sprint 28/29/30/31 each
appear twice in the 2300-2500 line range; Sprint 47 appears 6
times). These are **not** different sprints — they're the same
sprint documented from different angles. Don't try to dedupe;
the chronological order is the source of truth.

Missing sprint numbers (49-56, 58-70, 72, 73a-g) are real gaps —
those sprints never happened.

## Path-prefix gotcha

Every "What changed" line in the Hub says `src/pages/...` but the
code lives at `apps/maine-cannabis/src/pages/...`. If a file
path is "missing", check the apps/ prefix.

## Two non-trivial scripts

- `scripts/git/pre-push-verify.cjs` — the gate. Read the head
  comment for design rationale, exit codes, and `--ref=`
  behavior.
- `scripts/git/install-hooks.cjs` — one-time per-clone hook
  installer. Idempotent.

## Common footguns (confirmed by past bugs)

- **Edit `src/data/topics.json` last** — it's imported by both
  Layout and the search index; mid-edit builds will 500.
- **Don't put JSON-LD via `set:text`** — escapes the JSON,
  schema validators flag every page. Use `set:html`.
- **Internal links must be slash-less** — site has
  `trailingSlash: 'never'`. `/about` not `/about/`.
- **Use Formspree ID `xvgzlowz`** — all lead forms.
- **No white-on-dark in callouts** — use Warm Bone `#F2F2E2`.
- **Close Playwright browsers** — each instance = 100-750 MB
  memory leak.

## Parallel session protocol

When 2-3 agents commit to main in parallel (current state):
1. `git log --oneline -5` before staging — see if a sibling
   just landed a commit that intersects your work.
2. Stage ONLY your files (`git add <specific paths>`), never
   `git add -A` or `git add .`. Watch out: `git commit --amend`
   picks up **all currently-staged + unstaged changes** in the
   working tree, not just the commit you wanted to amend. If
   you need to amend a message, stash uncommitted changes first.
3. If you see a conflict in a file both you and a sibling
   edited, stop and ask the user — don't auto-resolve.
4. The pre-push gate catches structural errors only. Content
   conflicts (e.g. two agents editing the same paragraph) are
   a human review.

## Quick reference

```
# Verify locally
npm run verify:pre-push          # 3 passes: esbuild + astro + smoke-200
npm run check:hrefs              # malformed hrefs
npm run check:content-health      # 14 invariants
npm run check:build-warnings      # post-build CSS warnings
cd apps/maine-cannabis && npx astro check   # typecheck
node apps/maine-cannabis/scripts/admin/sprint-score.cjs   # 8-check health snapshot (Sprint 77)

# Deploy
git push origin main             # pre-push gate fires automatically (3 passes)
vercel ls maine-dispensary-guide # confirm READY
curl -sS https://mainedispensaryguide.com/status.json | python3 -m json.tool  # machine-readable health

# Debug a failed deploy
vercel inspect <deployment-url>  # get deploymentId
vercel inspect <deploymentId> --logs  # build log

# Live-site smoke (one-off)
MDG_BASE=https://mainedispensaryguide.com node apps/maine-cannabis/scripts/build/smoke-200.cjs

# Sprint handoff
node scripts/git/sprint-handoff.cjs   # generate Hub entry from git history
```

Last updated: 2026-06-07 (gate validation evidence added).
Edit when the next agent discovers
something every future agent needs to know.

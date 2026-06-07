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

## Pre-push verify gate (Sprint 76b)

**Installed automatically on this clone** via
`core.hooksPath=.githooks`. Every `git push` runs:

1. **Fast pass (~1s)**: extracts .astro frontmatter JS, pipes to
   esbuild parse-only. Catches the "Expected ] but found {"
   class (the 2026-06-07 Sprint 75 cascade) with Vercel's exact
   error message.
2. **Slow pass (~5-15s)**: `npx astro check` filtered to changed
   files. Only runs after pass 1 is green.

Bypass: `git push --no-verify`. Run manually:
`npm run verify:pre-push` (or `--fast-only`).

Reinstall on a fresh clone: `npm run hooks:install`.

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
   `git add -A` or `git add .`.
3. If you see a conflict in a file both you and a sibling
   edited, stop and ask the user — don't auto-resolve.
4. The pre-push gate catches structural errors only. Content
   conflicts (e.g. two agents editing the same paragraph) are
   a human review.

## Quick reference

```
# Verify locally
npm run verify:pre-push          # structural + content (esbuild + astro)
npm run check:hrefs              # malformed hrefs
npm run check:content-health      # 14 invariants
npm run check:build-warnings      # post-build CSS warnings
cd apps/maine-cannabis && npx astro check   # typecheck

# Deploy
git push origin main             # pre-push gate fires automatically
vercel ls maine-dispensary-guide # confirm READY

# Debug a failed deploy
vercel inspect <deployment-url>  # get deploymentId
vercel inspect <deploymentId> --logs  # build log

# Sprint handoff
node scripts/git/sprint-handoff.cjs   # generate Hub entry from git history
```

Last updated: 2026-06-07. Edit when the next agent discovers
something every future agent needs to know.

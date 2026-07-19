# MDG Agent Handbook

> Read this first, then `docs/governance/AGENT_WORKING_ORDERS.md` and the
> `mdg-site` Kanban board. The `BOT_COLLABORATION_HUB.md` is chronological
> history; working orders and task cards route current action. If the Hub and
> this file disagree, the Hub is right about what happened; the working orders
> and valid task contract are right about what to do next.

## Project: Maine Dispensary Guide

Astro 6.0 static site deployed to Vercel. Maine-only cannabis
business resources. Lives at https://mainedispensaryguide.com.

- **Repo**: steezkelly/maine-dispensary-guide (public)
- **Monorepo layout**: `apps/maine-cannabis/` is the Astro app;
  `packages/` has shared layouts/ui/design-system; `scripts/`
  is workspace-wide tooling. All paths in the Hub are
  relative-to-`apps/maine-cannabis/` even when they say `src/...`.
- **Stack**: Astro 6.0, semantic CSS variables/tokens (no Tailwind or
  React), Refined Editorial visual system with Newsreader display/editorial
  typography and Source Sans 3 body/navigation typography, warm paper / Deep
  Spruce palette, Vercel adapter (static output), Formspree for lead capture
  (ID `xvgzlowz`), GA4 (`G-614GHG67ZQ`) + Vercel Analytics + Speed Insights,
  and local hero images in `apps/maine-cannabis/public/images/heroes/`
  (`.jpg`, `.webp`, `.avif`, plus `-640w` mobile variants).
- **Verify loop**: use the repository's canonical staged commands:
  `npm run verify:iterate` during authoring and `npm run verify:push` once before
  push/release. The local pre-push hook is diff-scoped; production smoke is an
  explicit release gate, not an iteration step. See `AGENTS.md` for the current
  command contract.

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

## Pre-push and release verification

The repository uses one canonical command per stage:

1. **Iteration:** `npm run verify:iterate` runs the diff-scoped local checks
   without production smoke.
2. **Push/release:** `npm run verify:push` adds the production page and image
   smoke checks once the candidate is ready to push.
3. **Hook:** `.githooks/pre-push` invokes the diff-scoped verifier. Do not
   describe a hook pass as production-smoke evidence.

Reinstall the hook on a fresh clone with `npm run hooks:install`. Use
`--fast-only` only for a sub-second parse check during a single edit session;
it is partial evidence, not a release gate.

## CI gate

`.github/workflows/ci.yml` is the source of truth for current CI wiring. Read it
and the invoked scripts before naming exact checks or counts. CI complements the
local verification commands; it does not turn a candidate branch into a release.

## Verify loop (the standing rule)

Per `AGENTS.md`, use:
- `npm run verify:iterate` while editing;
- `npm run verify:push` before a push or release;
- exact-head CI and production-origin evidence before a release claim.

If a gate is red, stop and fix it. A Vercel `Ready` label or generic HTTP 200 is
supporting evidence, not proof that the intended commit is deployed.

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

When multiple agents are active:
1. Work in named worktrees from freshly fetched `origin/main`; do not author or
   integrate in the primary checkout.
2. Validate a scoped task contract and acquire a shared path lease before edits.
3. Stage only declared paths (`git add <specific paths>`), never `git add -A` or
   `git add .`.
4. Treat overlapping leases, base movement, or another owner's edits as a stop
   condition. Preserve the evidence and route the conflict through Kanban.
5. Feature branches push reviewed candidates. Only the integration worktree may
   update `origin/main`.

## Video production conventions

When the operator requests a new video for the MDG site (site-tour, market-stats
recap, future promotional content), follow the pro-workflow established 2026-07-09:

1. **Read first:** `~/videos/.shared/motion-vocab.md` — paste the relevant tables
   (easing / timing / transitions / anti-patterns) into the new project's
   `STORYBOARD.md` as a "Motion vocabulary" appendix. Pick eases by feel, not
   by GSAP name.
2. **Plan beat timing:** in the storyboard phase, run
   `node ~/videos/.shared/hold-time-calc.mjs <narration.txt>` to set the
   minimum per-beat duration. Don't ship a data video with sub-1.5s hold per
   data point — the user has flagged this twice.
3. **Pre-render audit:** before every `npx hyperframes render`, run
   `node ~/videos/.shared/pre-render-audit.mjs <project-dir>`. Fix every ERROR.
   Warnings are advisory but review them.
4. **Post-render verify:** run `npx hyperframes snapshot . --at "<beat-times>"`
   to confirm each beat reads correctly in still frames.
5. **Audio fallback:** if TTS deps (Kokoro / transformers) are missing locally,
   use `mmx speech synthesize --text-file narration.txt --voice
   English_expressive_narrator --speed 0.92 --subtitles --out narration.mp3
   --quiet` instead of installing deps. The mmx-cli TTS voice is the
   production voice for MDG videos.
6. **Music:** `mmx music generate --instrumental --prompt "..."` for BGM. Match
   the prompt to the brand mode (editorial-naturalist = warm fingerpicked
   acoustic; 80s-jazz-newsroom = muted smooth jazz with Rhodes + sax).
7. **Live assets:** videos render in `~/videos/<project>/` and deploy via
   `cp <video>.mp4 apps/maine-cannabis/public/videos/<name>.mp4` followed
   by `git commit && git push`. Vercel serves the file directly from
   `public/videos/` with the standard `Cache-Control: public, s-maxage=3600,
   stale-while-revalidate=86400` headers.

The pro-workflow tooling was validated against the existing `mdg-site-tour`
(30.4s) and `mdg-market-stats` (60s) projects — both pass the pre-render
audit with 0 errors, 0 warnings. Findings: `~/videos/PRO_WORKFLOW_AUDIT_RESULTS.md`.

## Quick reference

```bash
# Verify during authoring
npm run verify:iterate
npm run verify:iterate -- --fast-only

# Verify once before push/release
npm run verify:push

# Control plane
npm run workflow:status:fetch
hermes kanban --board mdg-site list --json
```

Last reconciled: 2026-07-19 (Refined Editorial + ICA release and control-plane
routing reconciled). Edit only for a verified rule the next agent needs before
opening its task card.

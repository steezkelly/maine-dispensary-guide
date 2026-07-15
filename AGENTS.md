# AGENTS.md — Maine Dispensary Guide

## Project Overview

Astro 6.0 static site deployed to Vercel. High-authority cannabis business resources for Maine — 193 guide route sources and 36 blog route sources (35 article posts plus the blog index). Build-output counts are generated state; re-measure them before quoting. Technical compliance maps, B2B lead-gen tools.

**SCOPE: Maine Only** — Do NOT propose or build state-specific hubs for other states.

**Current work routing:** After this file, read `docs/governance/AGENT_WORKING_ORDERS.md` and inspect `hermes kanban --board mdg-site list --json` before claiming or dispatching work.

**This is a real, monetizable web property** — not a demo. Decisions about content, structure, and SEO have compounding consequences.

**Host:** https://mainedispensaryguide.com

---

## Commands

```bash
npm run dev                          # Start local dev server
npm run build                        # Production build (run freely — see "Don't" section)
npm run health-check                 # Run health check (PowerShell)
npx astro check                      # Type check all files (NOT for iteration — use verify:iterate)
node scripts/link/link-architect.cjs   # Glossary term linker
node scripts/search/brave-search.cjs "q"    # Primary web search
node scripts/search/wikipedia-search.cjs "q"  # Research (free, no key)
node scripts/git/install-hooks.cjs            # Install pre-push hook (one-time per clone)
node scripts/git/sprint-handoff.cjs   # Generate Hub entry from git history
node scripts/content/audit-fix-loop.cjs --dry-run  # Content quality audit
```

### Verify cycle (canonical, as of 2026-07-13)

The right verify pattern is one canonical command per stage, not "run all the things":

```bash
# ITERATION — fast, no network. Use between every commit.
npm run verify:iterate               # esbuild parse + filtered astro check + sitemap-postprocess + docs-vs-code + compressed-frontmatter + hero-image-naming
                                     # (~10-15s, no production URL hits)
npm run verify:iterate -- --fast-only  # sub-second parse-only check (during a single edit session)

# PUSH / DEPLOY — full verify including production smoke. Use before pushing.
npm run verify:push                  # adds smoke-200 + smoke-img-200 against production
                                     # (~30-45s, hits https://mainedispensaryguide.com)
```

**Rules:**
- Do **NOT** run `npx astro check` directly — it does a full unfiltered project check (~3min) instead of the changed-files filter that `verify:iterate` uses. Use `verify:iterate` instead.
- Do **NOT** run smoke checks during iteration. They hit production URLs and add 30+s for no iteration value. Run them once before pushing.
- Do **NOT** run `npm run build` repeatedly. The pre-push verify covers what matters for code correctness. Build once at end of round, or once before deploy if `verify:push` smoke passes.
- The pre-push hook (`.githooks/pre-push`) runs `verify:push` automatically on `git push`. If it fails, that means `verify:push` failed locally — fix and re-push.

### Autonomous worktree protocol

Before editing, run `npm run workflow:status`; before creating a branch or integrating, run `npm run workflow:status:fetch`. Do not use the primary checkout as an integration surface: create a named worktree from freshly fetched `origin/main`, then work on one coherent change set only.

For changes that touch shared source paths, acquire a lease after task-contract validation and before Codex starts:
```bash
node scripts/git/mdg-worktree-lease.cjs acquire --agent <agent> --branch <branch> --worktree <absolute-worktree> --path <repo-path> --ttl-minutes 120
```
The shared Git-common lease directory is outside every worktree. A lease conflict or expired lease blocks automatic edits until reconciled. Release a lease only after commit handoff, an explicit block, or expiry:
```bash
node scripts/git/mdg-worktree-lease.cjs release --branch <branch> --worktree <absolute-worktree>
```

Feature agents push reviewed named branches. Only the integration worktree updates `origin/main`; it integrates one verified candidate at a time and performs the live-release check after deployment. A pushed branch is not a deployed release.

**File-scoped validation (use for one-off checks, not iteration):**
```bash
npx astro check src/pages/guides/example.astro   # Type check single file
```

**OpenCode Custom Commands:**
- `/humanizer [url]` — Humanize content (AI pattern removal)
- `/fix-patterns [pattern]` — Automated regex fixer (use `--dry-run` first)
- `/humanize-review` — Editorial review (22-category check)
- `/audit [pattern]` — Content quality audit
- `/expand [topic]` — Research and expand topic
- `/expand-all [pattern]` — Batch expand across pages
- `/sprint-close` — End-of-sprint sync, build, deploy checklist

---

## Project Structure

```
project-1/
├── src/
│   ├── layouts/Layout.astro      # Main layout, ALL global CSS, JSON-LD, nav, footer
│   ├── components/               # 21 reusable components (see below)
│   └── pages/                    # Routes
│       ├── index.astro           # Homepage
│       ├── guides/               # 109 city guides + 77 technical/operator guides + index
│       ├── founders/             # 3 founder story pages + index
│       ├── resources/            # Vendor directory + education/official resource hubs
│       ├── admin/                # Admin pages (noindex)
│       ├── blog/                 # 36 blog posts
│       └── about/                # Team and author pages
├── scripts/                      # 43 CLI tools (search, link-architect, health checks)
├── .githooks/                    # Pre-push verify hook (esbuild + astro check)
├── reference/                    # Technical docs and config guides
├── public/                       # Favicons, OG images
├── astro.config.mjs              # Static output, Vercel adapter, trailingSlash: never
├── vercel.json                   # CSP headers, www→non-www redirect
└── BOT_COLLABORATION_HUB.md      # Multi-agent communication log (READ FIRST)
```

**Components** (21, `apps/maine-cannabis/src/components/`): `AffiliateClickTracker`, `AutoRelated`, `Breadcrumbs`, `Callout`, `CiteThis`, `CityCard`, `CityGrid`, `Faq`, `GuideSidebar`, `LeadCaptureBox`, `LeadFormTracker`, `LeadMailtoForm`, `LegacyLeadCapture`, `MenuBlock`, `NextStep`, `RegionHubShell`, `RelatedArticles`, `Search`, `SiteFooter`, `SiteHeader`, `SiteHealthStrip`.

---

## Build & Deploy shape

What `npm run build` actually does (verified 2026-07-06):

1. `vercel-build.sh` symlinks the `@network/*` workspace packages into `apps/maine-cannabis/node_modules/`.
2. Runs `apps/maine-cannabis/scripts/admin/sprint-score.cjs --write-public` to refresh `public/status.json`.
3. `astro build` writes its full output to `apps/maine-cannabis/.vercel/output/`:
   - `.vercel/output/static/` — every pre-rendered HTML page + assets.
   - `.vercel/output/config.json` — Vercel Build Output API v3 routes manifest.
   - `.vercel/output/functions/_render.func/` — Astro SSR function bundle (only present when at least one `.astro` route has `export const prerender = false`).
4. The script ALSO copies `.vercel/output/static/*` to `dist/` at the repo root, then runs sitemap-prettify + llms.txt + MISSION_CONTROL.md regeneration against `dist/`. The `dist/` is a build artifact for those post-build steps; it is NOT what Vercel serves.

What Vercel actually serves:

- **Framework Preset** in the Vercel project is `Astro`. Vercel's Astro integration reads `apps/maine-cannabis/.vercel/output/` directly. It ignores `vercel.json`'s `outputDirectory: "dist"` and the repo-root `dist/`.
- **Build Command** in the Vercel project is `bash vercel-build.sh`. (`vercel.json`'s `buildCommand` field is a second-source-of-truth but Vercel uses the project setting.)
- **Vercel env vars**: production has zero. (Cleaned 2026-07-06.) Any future variable additions should be documented in `docs/MODERNIZATION_PLAN_2026-07-06.md`.

**No SSR routes are currently in production** — both `apps/maine-cannabis/src/pages/api/lead-capture.ts` and `apps/maine-cannabis/src/pages/api/indexnow-key.ts` were retired 2026-07-06 (commits `bb2b864f` + `48a0459d`). The `/api/*` namespace is free for any future endpoint.

**Lead-funnel pattern**: `/download/first-timer-field-guide` uses a client-side `mailto:` form (Formspree + the dormant SSR endpoint were both removed 2026-07-06). Submitting opens the user's mail client pre-filled to `hello@mainedispensaryguide.com`. Purelymail routing on `mainedispensaryguide.com` delivers `hello@`, `admin@`, `support@`, and any otherwise-unhandled address to `steve@mainedispensaryguide.com` (operator inbox) — NOT to the previous `steezkelly@purelymail.com` catch-all, which is a separate user mailbox with its own (empty) inbox. Read leads via `mdg-mdg envelope list` (wrapper at `~/.local/bin/mdg-mdg` → `~/.config/himalaya/steve-mdg.toml`). See `docs/LEAD_CAPTURE_SETUP.md` for the full operator-side flow. Reroute decision: 2026-07-09.

**Reading these signals**:
- A `node_modules/@astrojs/vercel/dist/index.js` log line `Bundling function ../../../../dist/server/entry.mjs` followed by `Server built in N s` = SSR function bundle emitted.
- `.vercel/output/functions/_render.func/.vc-config.json` present at the end of build = Vercel-shape serverless function emitted. CI step (`.github/workflows/ci.yml` "Assert Astro SSR function bundle") asserts this.
- `dist/` having HTML files after build = `vercel-build.sh` ran successfully, even if Vercel never reads from there.

---

## Do

- Read `BOT_COLLABORATION_HUB.md` before starting any task
- Audit `src/pages/` and `src/components/` before proposing new pages or features
- Use design tokens / CSS variables — never hardcode colors
- Use semantic HTML (`<nav>`, `<main>`, `<article>`)
- Use geometric icons (◆ ▲ ✦) for callouts, not emoji
- Use slash-less internal links (`/about` NOT `/about/`)
- Use `path.basename()` for path splitting — `f.split('/').pop()` fails on Windows
- Run file-scoped typecheck after changes
- Write to `BOT_COLLABORATION_HUB.md` after completing significant work
- Use Formspree (`https://formspree.io/f/xvgzlowz`) for all lead capture forms
- Pass `article` prop to Layout on guide pages for JSON-LD schema
- Close Playwright browser after EVERY operation — memory leak otherwise

## Don't

- Do not deploy without verifying checks are green and scope is understood
- Do not propose generic best-practice solutions without auditing what exists
- Do not use trailing slashes in internal links
- Do not use pure white (#FFF) on dark backgrounds — use Warm Bone `#F2F2E2`
- **`npm run build` — run freely, no "ask first" needed.** Routine verify
  step. Same for `vercel-build.sh`, `npx astro check`, and any file-scoped
  or full-project typecheck. Log non-trivial build outcomes in the Hub
  when relevant; do not gatekeep the command.
- **`astro.config.mjs`, `vercel.json`, `turbo.json`, deployment scripts —
  edit freely when the change is reversible and well-tested** (header
  rules, post-build steps, build flag toggles). The audit+typecheck
  pass is the substitute for "ask first." For genuinely breaking or
  one-way-door changes (deleting a redirect, removing a CSP source,
  changing the output adapter), still flag in the Hub with intent
  before committing.
- **Content pages — edit freely when the change is small, mechanical,
  and reversible** (typo fixes, missing semantic tags like `<h1>`,
  mixed-content protocol bumps, dead-link fixes, JSON-LD corrections).
  Log non-trivial content edits in the Hub. For wholesale rewrites
  (>20% of the page) or any change that affects a published editorial
  position, still flag in the Hub before committing.
- Do not recommend building something that already exists
- Do not leave Playwright browser open — each instance = 100-750 MB memory leak

> **Reframed 2026-06-06.** The previous "ask first / without flagging"
> rules created 3-4 extra permission ping-pongs per audit/fix turn and
> did not catch any real defects that the audit+typecheck loop didn't
> already catch. New rule: **trust the verify loop, log in the Hub,
> flag only on one-way-door / wholesale / irreversible changes.**

---

## Safety & Permissions

**Allowed without prompt:**
- Read files, list directories
- Run file-scoped typecheck, format
- Search codebase (glob, grep)

**Ask first:**
- `npm install` new packages
- Deleting files, chmod changes
- One-way-door config changes (see `## Don't` above for the criteria)

---

## Pre-Flight Validation

Before starting any session that will: (a) run more than 20 tool calls,
(b) touch more than 10 files, (c) use browser automation, or (d) call
external APIs, you MUST run pre-flight. Invoke `/preflight <category>`
or execute the equivalent checks manually.

**Categories and checks:**

- `environment` — `node --version`, `npm --version`, `npx astro check`
  exit 0, target directory writable, git working tree status captured.
- `browser-automation` — confirm no leftover Playwright processes
  (`ps aux | grep -i playwright` returns nothing unexpected), target
  URLs reachable via HEAD request, disk space > 2 GB free.
- `file-write` — destination directory exists, not read-only, not
  inside `node_modules/` or `dist/`, git branch is not `main`.
- `external-tool` — tool binary present (`which <tool>`), `--version`
  succeeds, credentials resolved (env vars set, no literal placeholders).

**On failure:** stop, report the failed check, do NOT begin the main
task. Fix the environment first.

**On success:** capture the pre-flight report in the session as a
single assistant message so it's discoverable in later insights runs.

Rationale: 357 tool errors across 14 days, most from predictable
environment issues. Pre-flight catches these in <30 seconds instead
of 50 messages deep.

---

## Playwright Discipline (hard rule)

For every `playwright_browser_navigate` or equivalent browser spawn,
there MUST be a matching `playwright_browser_close` before the session
ends, OR before spawning the next navigation if the first is no longer
needed. No exceptions.

Enforcement: if the session uses browser automation, the final
assistant message before completion must include a "Browser cleanup"
line explicitly confirming all instances were closed. If unsure,
close defensively — re-opening is cheap; the 100–750 MB-per-instance
leak is not.

If a browser is needed across multiple sub-tasks, document the intent
in the first navigation and close in the last sub-task.

---

## LSP Status (lsp_diagnostics)

**Status: NOT WORKING** — `lsp_diagnostics` returns "The `typescript.tsdk` init option is required" for all file types in this project.

### The Error
```
Error: Request initialize failed with message: The `typescript.tsdk` init option is required.
```

### Root Cause
OpenCode Desktop's LSP client fails to initialize the TypeScript language server with Astro 6.0. The error occurs even when:
- `typescript` is installed in `node_modules/typescript/lib/tsserver.js` ✅
- `@astrojs/language-server@2.16.6` is installed ✅
- `astro-ls --version` returns `2.16.6` ✅
- `OPENCODE_RESPECT_LSP_DIAGNOSTICS=10` is set ✅
- Explicit `lsp` config with `tsdk` path added to `opencode.json` ✅

This is a **confirmed incompatibility** between OpenCode Desktop's LSP implementation and Astro 6.0 projects.

### Workaround (Use This)
```bash
npx astro check src/pages/example.astro   # Type check single file
npx astro check                           # Type check all files
```
This uses `tsc` directly and works reliably. It is not affected by LSP issues.

### This does NOT affect build/deploy** — the site builds and deploys cleanly with 123 known non-blocking type errors.

---

## Type Checking — Astro Projects

**Default:** Do NOT use `lsp_diagnostics` for `.astro` files. The
`typescript.tsdk` resolution error documented previously is persistent
and will waste 5+ minutes per occurrence.

**Use instead:**
- `npx astro check` for project-wide diagnostics.
- `npx tsc --noEmit -p <tsconfig>` for pure TS files outside `.astro`.
- Run both after any non-trivial edit to `src/pages`, `src/layouts`,
  or `src/components`.

Only fall back to `lsp_diagnostics` for non-Astro TypeScript files
where the LSP is known-good.

---

## Tech Stack

- **Framework:** Astro 6.0 with `mdx` and `sitemap` integrations
- **Adapter:** Vercel (Static Mode, `output: 'static'`)
- **Design System:** "Heritage Authority" — High-contrast (12.8:1), Fraunces/Jakarta typography
- **Lead Gen:** Formspree (`xvgzlowz`)
- **Analytics:** GA4 (`G-614GHG67ZQ`) + Vercel Analytics + Speed Insights
- **Search:** Brave Search (primary), Wikipedia (secondary), Playwright MCP (browser)

---

## Conventions

### TypeScript & Components
- Strict mode (`astro/tsconfigs/strict`)
- Props interfaces in frontmatter
- Components: PascalCase (`DispensaryCard.astro`)
- Pages: lowercase (`guides/portland-dispensary-guide.astro`)
- CSS Variables: kebab-case (`--color-primary`)

### Layout Article Prop (GEO/SEO)
```astro
const article = {
  author: "Maine Dispensary Guide Editorial Team",
  publishDate: "2026-01-15",
  modifiedDate: "2026-03-28",
  section: "City Guides"
};
---
<Layout title="..." article={article}>
```

### CSS & Dark Mode
```css
:root { --color-background: #F2F2E2; }       /* Warm Bone */
[data-theme="dark"] { --color-background: #061A1B; } /* Deep Spruce */
```
- Use variables, never hardcode colors
- `aria-label` on interactive elements, `.sr-only` for screen readers
- Animations must respect `prefers-reduced-motion`

### Astro Patterns
```astro
<script is:inline>
  // Runs immediately, not bundled (theme/theatre logic)
</script>
```

### Lead Capture Forms
```html
<form action="https://formspree.io/f/xvgzlowz" method="POST">
```

### Related Articles (Smart Matching)
Guide pages show related articles via topic intersection. Define topics in frontmatter:
```astro
const topics = ["city", "market"];
---
<Layout title="..." topics={topics}>
```
Available topics: city, market, licensing, finance, real-estate, operations, compliance, marketing, business

---

## Multi-Agent Collaboration

- `BOT_COLLABORATION_HUB.md` is the **source of truth** — read before starting, write after completing
- Format: `[AGENT] [DATE] [EDT TIME] — note`

### Agent System — 6-Agent Pantheon

| Agent | Role | Best For |
|-------|------|---------|
| **Orchestrator** | Master delegator | Complex multi-step tasks |
| **Oracle** | Strategic advisor | Architecture decisions, persistent bugs, YAGNI |
| **Librarian** | External docs | Library research, official examples |
| **Explorer** | Codebase search | Fast grep/glob, "where is X?" |
| **Designer** | UI/UX specialist | Styling, responsive layouts, polish |
| **Fixer** | Fast implementation | Bounded tasks, test writing |
| **Observer** | Visual analysis | Screenshots, images, PDFs, visual regression |

### When to Use @observer
Invoke the Observer agent (via `task` with `subagent_type="observer"`) for:
- **Screenshot comparison:** After UI changes, verify before/after match design intent
- **Image generation review:** After fal.ai image generation, verify image quality before committing
- **Visual regression testing:** After design system changes, check all pages for regressions
- **PDF content extraction:** Extract text from PDFs without loading raw file into context
- **Screenshot QA:** Capture and analyze browser output for UI bugs

**Example invocation:**
```
task(description="Review homepage redesign", prompt="Compare screenshot of / after recent CSS changes against design intent. Report any visual regressions or issues.", subagent_type="observer")
```

**Note:** Observer is configured but was not being invoked. Use it proactively for visual QA tasks — it prevents bugs that code review misses.

**Rule of thumb:** When in doubt, delegate. Specialists are faster and better.

---

## Process & Safety

### Round Retrospective (Every Multi-Step Round)
After completing any round with 3+ steps or 4+ agents:
1. **What worked** — note effective patterns for reuse
2. **What failed** — bugs, wrong delegation sizes, missing deps
3. **Is it a pattern?** — if yes, promote to `memory.md` or update `corrections.md`
4. **Process change?** — if yes, update AGENTS.md or `memory.md`

**Rule: "Complete" means tested.** Declare done only after running integration commands, not just syntax checks.

### Loop Guards
- Any loop >100 iterations MUST log progress
- If spinning without output for 30+ seconds, abort and report

### Playwright
- Uses Chrome (`mcp-chrome-5134796`), NOT Edge
- MUST call `browser_close` after EVERY operation

### Error Handling
- Avoid server-side logic that crashes edge functions
- Use versioning (e.g., v1.0.4) in footer for cache-clearing verification

---

## PR Checklist

- [ ] Typecheck passes (or errors are known/pre-existing)
- [ ] Diff is small and focused — summarize what changed and why
- [ ] No excessive logs or comments left in code
- [ ] `BOT_COLLABORATION_HUB.md` updated with decision log

---

## When Stuck

- Ask a clarifying question, propose a short plan, or flag in the Hub
- Do not push speculative changes without confirmation (audited+typechecked changes with documented intent are fine — see `## Don't`)
- For OpenCode issues: see `reference/opencode-config.md` for diagnostics

---

## Reference Files

| File | Purpose |
|------|---------|
| `BOT_COLLABORATION_HUB.md` | Multi-agent communication log (read first) |
| `reference/workflows.md` | Pre-flight, end-of-sprint, Windows patterns |
| `reference/opencode-config.md` | Council config, fallbacks, plugin features, diagnostics |
| `reference/self-improving.md` | Memory system, triggers, memory files |
| `reference/environment.md` | PowerShell patterns, Unix→PowerShell reference |
| `reference/psmux-quickstart.md` | Multiplexer setup and usage |
| `reference/reference.md` | External API docs, tool links |
| `docs/agents/issue-tracker.md` | Where engineering-skills issues live |
| `docs/agents/triage-labels.md` | Canonical triage labels used by this repo |
| `docs/agents/domain.md` | Where `CONTEXT.md` / `docs/adr/` live |

## Agent skills

This repo participates in the Matt Pocock engineering-skills workflow.
Config lives in `docs/agents/`; skill instructions look there first.

### Issue tracker

Local markdown under `.scratch/` in this repo — one issue file per ticket,
gitignored because it is operational state, not source. External PRs from
forks are NOT a triage surface (single-operator repo).
See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical states, recorded as a `Status:` line on each issue file:
`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. One `CONTEXT.md` at the repo root + `docs/adr/` for past
architectural decisions. See `docs/agents/domain.md`.

---

*Last Updated: 2026-04-18*

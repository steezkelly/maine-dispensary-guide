# AGENTS.md — Maine Dispensary Guide

## Project Overview

Astro 6.0 static site deployed to Vercel. High-authority cannabis business resources for Maine — 47 guide pages (14 city + 33 technical), technical compliance maps, B2B lead-gen tools.

**SCOPE: Maine Only** — Do NOT propose or build state-specific hubs for other states.

**This is a real, monetizable web property** — not a demo. Decisions about content, structure, and SEO have compounding consequences.

**Host:** https://mainedispensaryguide.com

---

## Commands

```bash
npm run dev                          # Start local dev server
npm run build                        # Production build (warn first!)
npm run health-check                 # Run health check (PowerShell)
npx astro check                      # Type check all files
node scripts/link-architect.cjs      # Glossary term linker
node scripts/brave-search.cjs "q"    # Primary web search
node scripts/wikipedia-search.cjs "q" # Research (free, no key)
```

**File-scoped validation (prefer these over full build):**
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
│   ├── components/               # 9 reusable components (see below)
│   └── pages/                    # Routes
│       ├── index.astro           # Homepage
│       ├── guides/               # 14 city guides + 33 technical guides + index
│       ├── founders/             # 3 founder story pages + index
│       ├── resources/            # Vendor directory + education/official resource hubs
│       ├── admin/                # Admin pages (noindex)
│       ├── blog/                 # Blog posts (6 articles)
│       └── about/                # Team and author pages
├── scripts/                      # 23 CLI tools (search, link-architect, health checks)
├── reference/                    # Technical docs and config guides
├── public/                       # Favicons, OG images
├── astro.config.mjs              # Static output, Vercel adapter, trailingSlash: never
├── vercel.json                   # CSP headers, www→non-www redirect
└── BOT_COLLABORATION_HUB.md      # Multi-agent communication log (READ FIRST)
```

**Components:** `Breadcrumbs`, `Callout`, `Faq`, `GuideSidebar`, `Leaf`, `NextStep`, `PineTree`, `RelatedArticles`, `Search`

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

- Do not make deployment or infrastructure decisions alone
- Do not propose generic best-practice solutions without auditing what exists
- Do not use trailing slashes in internal links
- Do not use pure white (#FFF) on dark backgrounds — use Warm Bone `#F2F2E2`
- Do NOT run `npm run build` unannounced — always warn first
- Do not touch `astro.config.mjs`, `vercel.json`, or deployment settings without flagging in the Hub
- Do not overwrite content pages without flagging in the Hub
- Do not recommend building something that already exists
- Do not leave Playwright browser open — each instance = 100-750 MB memory leak

---

## Safety & Permissions

**Allowed without prompt:**
- Read files, list directories
- Run file-scoped typecheck, format
- Search codebase (glob, grep)

**Ask first:**
- `npm install` new packages
- `git push`
- Deleting files, chmod changes
- Running full build or end-to-end suites
- Deployment (`npx vercel --prod`)

---

## Known Type Errors (123 errors, do NOT block on these)

The project has 123 TypeScript errors from `npx astro check`. These are known and non-blocking:

1. **`caption` attribute on `<table>`** (~80 errors) — Pages use `caption="..."` as a table attribute. This is not a valid HTML attribute; `<caption>` should be a child element. Fixing requires updating ~40+ guide pages. Deferred.

2. **Callout `type` mismatch** (~20 errors) — `Callout.astro` only accepts `type: 'passion' | 'tip' | 'success'` but several pages use `type="warning"` and `type="info"`. To add these types, update the `Props` interface in `src/components/Callout.astro`.

These errors do not affect the build or runtime. The site builds and deploys cleanly.

## LSP Status (lsp_diagnostics)

**`lsp_diagnostics` tool is NOT functional for this project.** The tool requires `typescript-language-server` with a valid `typescript.tsdk` pointing to a `node_modules/typescript/lib` directory containing `tsserverlibrary.js`. OpenCode Desktop does not auto-configure this.

- `npx astro check` works fine (uses tsc directly, not LSP)
- `lsp_diagnostics` times out or fails with "Request initialize failed"
- Workaround: Use `npx astro check src/pages/example.astro` for file-scoped type validation instead of `lsp_diagnostics`
- The LSP limitation is a known issue with OpenCode Desktop + Astro projects — does not affect build/deploy

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
|-------|------|----------|
| **Orchestrator** | Master delegator | Complex multi-step tasks |
| **Oracle** | Strategic advisor | Architecture decisions, persistent bugs, YAGNI |
| **Librarian** | External docs | Library research, official examples |
| **Explorer** | Codebase search | Fast grep/glob, "where is X?" |
| **Designer** | UI/UX specialist | Styling, responsive layouts, polish |
| **Fixer** | Fast implementation | Bounded tasks, test writing |

**Rule of thumb:** When in doubt, delegate. Specialists are faster and better.

---

## Process & Safety

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
- [ ] `reference/project-status.md` updated if metrics changed

---

## When Stuck

- Ask a clarifying question, propose a short plan, or flag in the Hub
- Do not push large speculative changes without confirmation
- For OpenCode issues: see `reference/opencode-config.md` for diagnostics

---

## Reference Files

| File | Purpose |
|------|---------|
| `BOT_COLLABORATION_HUB.md` | Multi-agent communication log (read first) |
| `reference/project-status.md` | Live SEO scores, content quality, known gaps |
| `reference/workflows.md` | Pre-flight, end-of-sprint, Windows patterns |
| `reference/opencode-config.md` | Council config, fallbacks, plugin features, diagnostics |
| `reference/self-improving.md` | Memory system, triggers, memory files |
| `reference/environment.md` | PowerShell patterns, Unix→PowerShell reference |
| `reference/psmux-quickstart.md` | Multiplexer setup and usage |
| `reference/reference.md` | External API docs, tool links |

---

*Last Updated: 2026-04-18*

# AGENTS.md — Maine Dispensary Guide

## ⚠️ READ THIS ENTIRE FILE BEFORE DOING ANYTHING

You are operating inside an active, partially-built project. Do not 
assume context. Do not propose generic solutions. Read this file, 
read BOT_COLLABORATION_HUB.md, then audit the actual file structure 
before responding to any request.

---

## Project Overview

Maine Dispensary Guide is an Astro 6.0 static site deployed to 
Vercel. It provides high-authority cannabis business resources for 
the state of Maine — including 41+ municipal guides, technical 
compliance maps, and B2B lead-generation tools.

**SCOPE: Maine Only** — This project focuses exclusively on Maine 
cannabis content. New England contextual content is fine, but do NOT
propose or build state-specific hubs for other states (NJ, FL, etc.).

**This is a real, monetizable web property** — not a demo or 
learning project. Decisions about content, structure, and SEO have 
compounding consequences. Think before acting.

---

## Current Project Status

> This section must be kept current. Last updated by: OpenCode (MiniMax M2.7) — April 4, 2026 (EDT)

- **Pages live:** 61 total routes (41+ city guides, technical hubs, ROI tool, vendor directory)
- **Deployment:** Active on Vercel — Configured for **output: 'static'** for 100% stability
- **Sitemap:** Auto-generated at `/sitemap-index.xml`
- **Traffic status:** Early stage — SEO/GEO optimization for AI-discovery is the primary goal
- **Content Intelligence Skills:**
    - ✅ `content-authority` — SEO/GEO strategic framework, 3-pillar method, information gain
    - ✅ `content-humanizer` — AI pattern removal, 22-category editorial guide, automated fixer
    - ✅ `content-ops` — Content audit, expand, batch operations
    - ✅ `audit-website` (squirrel) — Live-site SEO audit, 230+ rules
    - ✅ BreadcrumbList JSON-LD schema (Breadcrumbs.astro)
    - ✅ FAQ structured data component (Faq.astro)
    - ✅ OpenCodeInsights plugin installed
- **Known gaps:**
    - **Accessibility (A11y):** SquirrelScan score is 84/100. Remaining pedantic warnings: matching "guides ▾" text to aria-labels and adding `tabindex="-1"` to hidden mobile toggles.
    - **PDF Magnet:** The "Ultimate Founders Bible" (lead magnet) exists as MD but needs styling/conversion to PDF.
    - **Bug:** All 3 bugs from Playwright testing FIXED (2026-04-05) — see BUGS.md for history
- **Active work:**
    - **Link Architecture:** Ongoing body-only sync via `scripts/link-architect.cjs`.

---

## What Has Already Been Built — Read Before Proposing Anything

Before suggesting content, pages, or features, audit:

1. `src/pages/` — what routes already exist
2. `src/components/` — what UI components are available
3. `BOT_COLLABORATION_HUB.md` — the EDT-stamped log of agent decisions
4. `public/` — what static assets exist
5. The live sitemap — what is actually indexed

**Do not recommend building something that already exists.**

---

## Multi-Agent Collaboration

This project is built and maintained by two AI agents operating in 
different environments. You are one of them. Read this carefully.

| Agent | Tool | Responsibility |
|-------|------|---------------|
| OpenCode (MiniMax M2.7) | OpenCode IDE | Content, pages, components |
| Gemini | gemini-cli (PowerShell) | Infrastructure, deployment, planning, SEO |

### Shared Communication
- `BOT_COLLABORATION_HUB.md` is the **source of truth** for 
  cross-agent decisions
- Read it before starting any task
- Write to it after completing any significant task or making a 
  decision the other agent needs to know about
- Format entries as: `[AGENT] [DATE] [EDT TIME] — note`

### Role Boundaries
- OpenCode: Do not touch `astro.config.mjs`, Vercel config, or 
  deployment settings without flagging in the Hub first
- Gemini: Do not overwrite content pages without flagging in the Hub

---

## Commands
```bash
npm run dev          # Start local development server
npm run build        # Production build (Static)
node scripts/link-architect.cjs # Run Link Architect (glossary syncer)
node scripts/searxng-search.cjs "query" # Privacy-respecting meta-search
node scripts/wikipedia-search.cjs "query" # Wikipedia research (free, no API key)
```

## Search Stack (Backup Options)

When Brave Search is rate-limited, use these alternatives:

1. **Playwright MCP** (browser automation) — Available via OpenCode MCP
   - Tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_evaluate`
   - Docs: `scripts/playwright-mcp-search.md`
   - Use for: Extracting search results via Bing/Startpage

2. **Wikipedia API** — Free, no rate limits
   - `node scripts/wikipedia-search.cjs "query"`
   - Use for: Factual research, finding citations

3. **SearXNG** — Self-hosted recommended
   - Requires: `SEARXNG_INSTANCE_URL` env var
   - Use for: Privacy-respecting meta-search (if self-hosted)

### OpenCode Custom Commands
- `/humanizer [url]` — content-humanizer: fetch URL and humanize (AI pattern removal)
- `/fix-patterns [pattern]` — content-humanizer: automated regex fixer on local files
- `/humanize-review` — content-humanizer: editorial review with 22-category check
- `/audit [pattern]` — content-ops: run content quality audit on matching files
- `/expand [topic]` — content-ops: research and expand on a topic with depth
- `/expand-all [pattern]` — content-ops: batch expand content across multiple pages
- `/insights` — Generate OpenCode usage insights report
- `/maintenance` — Run self-improving maintenance check

---

## Tech Stack

- **Framework:** Astro 6.0 with `mdx` and `sitemap` integrations
- **Adapter:** Vercel (Static Mode)
- **Design System:** "Heritage Authority" — High-contrast (12.8:1), Fraunces/Jakarta typography, Botanical depth
- **Lead Gen:** Formspree Integration Bridge (`xvgzlowz`)

---

## File Structure
```
project-1/
├── src/
│   ├── layouts/Layout.astro      # Main layout with "Heritage" CSS & JSON-LD
│   ├── components/               # Reusable components (Search, Sidebar, Faq, etc)
│   ├── pages/                   # Routes (index, guides/, resources)
│   └── scripts/                 # Content intelligence scripts
├── scripts/
│   ├── link-architect.cjs      # Glossary term linker
│   ├── searxng-search.cjs      # Meta-search (backup)
│   ├── wikipedia-search.cjs    # Wikipedia research
│   └── brave-search.cjs        # Primary search
├── public/                      # Favicons and OG Images
├── astro.config.mjs             # Astro configuration
├── squirrel.toml               # Audit configuration
└── BOT_COLLABORATION_HUB.md    # Multi-agent communication log
```

---

## TypeScript & Component Conventions

- Strict mode (inherited from `astro/tsconfigs/strict`)
- Props interfaces in frontmatter
- Components: PascalCase (`DispensaryCard.astro`)
- Pages: lowercase (`guides/portland-dispensary-guide.astro`)
- Links: **Slash-less standard** (`/about` NOT `/about/`)
- CSS Variables: kebab-case (`--color-primary`)
- Global styles in `Layout.astro`

### Layout.astro Article Prop (GEO/SEO)
Guide pages should pass an `article` prop to enable Article JSON-LD schema:
```astro
const article = {
  author: "Maine Dispensary Guide Editorial Team",
  publishDate: "2026-01-15",
  modifiedDate: "2026-03-28",
  section: "City Guides"
};
---
<Layout 
  title="Portland Dispensary Guide | Maine Dispensary Guide" 
  article={article}
>
```

---

## CSS & Dark Mode
```css
:root { --color-background: #F2F2E2; } /* Warm Bone */
[data-theme="dark"] { --color-background: #061A1B; } /* Deep Spruce - updated for contrast */
```

- Use variables, never hardcode colors
- Semantic HTML always (`<nav>`, `<main>`, `<article>`)
- `aria-label` on interactive elements, `.sr-only` for screen readers
- All animations must respect `prefers-reduced-motion` media query

---

## Frontend Design Patterns (Heritage Authority 2.0)

### Animation & Motion
- **Scroll Reveal**: Use `.reveal` class + Intersection Observer for content sections
- **Button Feedback**: Ripple effect on click (built-in via global CSS)
- **Link Hover**: Underline animation via `::after` pseudo-element
- **Example**:
```astro
<section class="reveal" style="animation-delay: 0.2s;">
  <!-- Content -->
</section>
```

### Component Enhancement Guidelines
- **Callouts**: Use geometric icons (◆ ▲ ✦) not emoji
- **Fact-Boxes**: Add gradient bg, top accent line, icon header for key data
- **Tables**: Always include `thead`, `aria-label`, and `caption` for a11y

### Newsletter & Lead Capture
- All newsletter/lead forms use Formspree endpoint: `https://formspree.io/f/xvgzlowz`
- Place early on page (after stats bar) for maximum capture

### Search UX
- Press `/` to focus search (keyboard shortcut built-in)
- Always include `id="main-search"` on primary search input

### Trust Signals (Social Proof)
- Place social proof stats (guides, entrepreneurs served) prominently
- Use "What's New" section with pulse animation for returning users

### User Journey Elements
- "Start Here" path for beginners (4-step visual journey)
- Guide users from overview → specifics → action

### Related Articles (Smart Matching)
Guide pages automatically show related articles based on topic intersection.

**Topic Definition:** `src/data/topics.json`
```json
{
  "topics": {
    "city": { "label": "City Guide", "related": ["market", "real-estate"] },
    "finance": { "label": "Finance", "related": ["business", "real-estate"] }
  }
}
```

**Guide Frontmatter:**
```astro
const topics = ["finance", "licensing"];
---
<Layout title="..." topics={topics}>
```

**Scoring Algorithm:**
- Direct topic match: +2 points
- Related topic match: +1 point
- Shows top 3 by score + 3 essential resources

**Available Topics:** city, market, licensing, finance, real-estate, operations, compliance, marketing, business

---

## Astro-Specific Patterns
```astro
<script is:inline>
  // Runs immediately, not bundled (Used for Theme/Theatre logic)
</script>
```

MDX component usage:
```mdx
import Callout from '../components/Callout.astro';
```

### Lead Capture Forms
All lead forms must use Formspree:
```html
<form action="https://formspree.io/f/xvgzlowz" method="POST">
```

---

## Error Handling

- **SSR Warnings:** Avoid server-side logic that crashes edge functions.
- **Caching:** Use versioning (e.g., v1.0.4) in footer to verify cache-clearing.

---

## What This Agent Should NOT Do

- Do not make deployment or infrastructure decisions alone.
- Do not assume the project goal — read the Hub.
- Do not propose generic best-practice solutions without first 
  auditing what already exists in the project.
- Do not use trailing slashes in internal links.
- Do not use pure white (#FFF) on dark backgrounds (use Warm Bone #F2F2E2).

---

## Self-Improving Integration

### Memory Location
`C:\Users\Steve\.agents\skills\self-improving\` — Kernel + Hot Memory

### Triggers (Automatic)
1. **On correction:** User says "No", "Actually", "Stop", "Remember" → Log to `corrections.md`
2. **After sprint:** Multi-step task complete → Self-reflect → Log to `reflections.md`
3. **Pattern 3x:** Same lesson repeated → Promote to `memory.md` or ask to confirm

### Self-Reflection After Every Sprint
After completing work, evaluate:
1. Did it meet expectations?
2. What could be better?
3. Is this a pattern?

### Memory Files
| File | Purpose | Size |
|------|---------|------|
| memory.md | HOT: Active rules | ≤50 lines |
| corrections.md | Explicit corrections + lessons | Append only |
| reflections.md | Self-reflection log | Append only |
| heartbeat-state.md | Sprint state tracker | Current |
| projects/maine-dispensary-guide.md | Project patterns | WARM |

### Quick Commands
- "What have you learned?" → Show corrections.md
- "Show my patterns" → Show memory.md
- "What patterns from [project]?" → Load projects/maine-dispensary-guide.md

---

*Last Updated: 2026-04-04 07:30 AM EDT*

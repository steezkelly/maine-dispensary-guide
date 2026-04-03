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

**This is a real, monetizable web property** — not a demo or 
learning project. Decisions about content, structure, and SEO have 
compounding consequences. Think before acting.

---

## Current Project Status

> This section must be kept current. Last updated by: Gemini CLI (v1.0.4) — March 25, 2026 (EDT)

- **Pages live:** 61 total routes (41+ city guides, technical hubs, ROI tool, vendor directory)
- **Deployment:** Active on Vercel — Configured for **output: 'static'** for 100% stability
- **Sitemap:** Auto-generated at `/sitemap-index.xml`
- **Traffic status:** Early stage — SEO/GEO optimization for AI-discovery is the primary goal
- **Known gaps:** 
    - **Accessibility (A11y):** SquirrelScan score is 84/100. Remaining pedantic warnings: matching "guides ▾" text to aria-labels and adding `tabindex="-1"` to hidden mobile toggles.
    - **Content Density:** Landing pages (Home, Resources, Contact) are flagged as "Thin Content" (< 300 words). Contact page enriched April 3, 2026.
    - **PDF Magnet:** The "Ultimate Founders Bible" (lead magnet) exists as MD but needs styling/conversion to PDF.
    - **Structured Data:** ✅ Layout.astro supports Article JSON-LD via `article` prop. All 44 guide pages now have article metadata (April 3, 2026).
- **Active work:**
    - **Grade A Recovery:** Finalizing the technical climb from score 59 to 80+.
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
& "C:\Users\Steve\AppData\Local\squirrel\bin\squirrel.exe" audit https://mainedispensaryguide.com --format llm # Performance/SEO Audit
```

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
│   ├── components/               # Reusable components (Search, Sidebar, etc)
│   ├── pages/                   # Routes (index, guides/, nj/, resources)
│   └── scripts/                 # Link Architect engine
├── public/                      # Favicons and OG Images
├── astro.config.mjs             # Astro configuration
├── squirrel.toml                # Audit configuration
└── BOT_COLLABORATION_HUB.md     # Multi-agent communication log
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
[data-theme="dark"] { --color-background: #0D4E50; } /* Deep Spruce */
```

- Use variables, never hardcode colors
- Semantic HTML always (`<nav>`, `<main>`, `<article>`)
- `aria-label` on interactive elements, `.sr-only` for screen readers

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

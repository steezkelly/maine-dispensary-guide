# Reference Materials — Maine Dispensary Guide

Quick links to technical documentation for tools, APIs, and integrations used in this project.

---

## Environment

| Topic | Documentation |
|-------|--------------|
| User Environment | `reference/environment.md` |
| PowerShell Docs | https://docs.microsoft.com/en-us/powershell/ |
| Windows Git | https://git-scm.com/book/en/v2/Getting-Started-Installing-Git |

---

## Search & Browser Automation

| Tool | Purpose | Documentation |
|------|---------|--------------|
| Brave Search | Primary search API | https://brave.com/search/api/ |
| Playwright MCP | Browser automation for OpenCode | https://github.com/microsoft/playwright-mcp |
| Wikipedia API | Free research/citations | https://en.wikipedia.org/api/rest_v1/ |
| SearXNG | Privacy meta-search (self-host) | https://docs.searxng.org/admin/index.html |
| agent-browser | Vercel Labs browser CLI | https://skills.sh/vercel-labs/agent-browser/agent-browser |
| Context7 | Documentation lookup for AI agents | https://context7.com/docs/ |

**Notes:**
- Context7 MCP: Up-to-date library docs via `context7_resolve-library-id` and `context7_query-docs` tools

**Notes:**
- Brave Search: 1000 req/month free tier. Set `BRAVE_SEARCH_API_KEY` env var.
- SearXNG: Public instances unreliable. Self-host recommended.
- Playwright MCP: Works well on Windows. Use `browser_navigate`, `browser_snapshot`, etc.

---

## Astro Framework

| Topic | Documentation |
|-------|--------------|
| Astro Docs | https://docs.astro.build/ |
| Astro Integrations | https://docs.astro.build/en/guides/integrations-guide/ |
| Vercel Adapter | https://docs.astro.build/en/guides/deploy/vercel/ |
| MDX Integration | https://docs.astro.build/en/guides/mdx/ |

---

## Vercel Deployment

| Topic | Documentation |
|-------|--------------|
| Vercel CLI | https://vercel.com/docs/cli |
| vercel.json Config | https://vercel.com/docs/projects/project-configuration |
| Security Headers | https://vercel.com/docs/security-headers |
| Redirects & Rewrites | https://vercel.com/docs/projects/redirects |
| Edge Network | https://vercel.com/docs/edge-network |

---

## SEO & Analytics

| Tool | Documentation |
|------|--------------|
| SquirrelScan | https://squirrel.mattpredmore.com/ |
| Schema.org | https://schema.org/ |
| Google SEO Guide | https://developers.google.com/search/docs |
| Vercel Analytics | https://vercel.com/docs/concepts/analytics |

---

## Content & Design

| Topic | Documentation |
|-------|--------------|
| WCAG Accessibility | https://www.w3.org/WAI/WCAG21/quickref/ |
| OpenCode Insights | OpenCode plugin (installed) |
| Content Quality | See `scripts/content-quality.cjs` |

---

## Security

| Topic | Documentation |
|-------|--------------|
| CSP Header | https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP |
| X-Frame-Options | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options |
| Formspree | https://formspree.io/ |

---

## External APIs Used

| API | Endpoint | Auth |
|-----|---------|------|
| Brave Search | `https://api.search.brave.com/res/v1/web/search` | API Key |
| Wikipedia | `https://en.wikipedia.org/w/api.php` | None |
| Unsplash | `https://api.unsplash.com` | API Key (in config) |
| Formspree | `https://formspree.io/f/xvgzlowz` | None (form endpoint) |

---

## Ad Networks (Cannabis-Safe)

| Network | Status | Notes |
|---------|--------|-------|
| **Mantis Ad Network** | Not yet integrated | Cannabis-safe display ads. Apply at mantis.ad. $100 minimum payout. Estimated $5-15 RPM at cannabis traffic. |
| AdSense | Blocked | Cannabis content cannot receive AdSense approval. |
| Mediavine | Gated | Requires $5K annual ad revenue minimum (Journey tier from Jan 2026). |
| Raptive | Gated | Requires 25,000 monthly pageviews minimum. |
| Ezoic | Gated | Requires 250,000 MAU minimum (Feb 2026 threshold). |

**Mantis Setup Steps:**
1. Apply at `mantis.ad` — cannabis and CBD content explicitly accepted
2. Once approved, add Mantis ad code to `Layout.astro` or individual page templates
3. Estimated output: $50-150/month at 10K pageviews; $250-750/month at 50K pageviews
4. Lowest possible implementation lift — static JS embed, no server-side required

---

## Root-Level Documentation

| File | Purpose |
|------|---------|
| `BOT_COLLABORATION_HUB.md` | Multi-agent communication log (READ FIRST) |
| `project-todos.md` | Persistent todo tracking across sprints |
| `UI_IMPROVEMENTS.md` | UI change log and status tracker |
| `link-outreach.md` | External linking strategy and outreach plan |
| `PROJECT_DNA.md` | Project identity and core principles |
| `PROJECT_STATE.md` | Current project state snapshot |
| `BUGS.md` | Known bugs and fix status |
| `MISSION_CONTROL.md` | Mission and priority tracker |
| `ROADMAP_*.md` | Various roadmap drafts and plans |

---

## Project Scripts

| Script | Purpose |
|--------|---------|
| `scripts/brave-search.cjs` | Primary web search |
| `scripts/wikipedia-search.cjs` | Research and citations |
| `scripts/searxng-search.cjs` | Meta-search (backup) |
| `scripts/playwright-mcp-search.md` | Playwright MCP usage guide |
| `scripts/link-architect.cjs` | Glossary term cross-linking |
| `scripts/self-improving-maintenance.ps1` | Memory health check |

---

## OpenCode Skills

| Skill | Purpose | Location |
|-------|---------|----------|
| `content-authority` | SEO/GEO strategic framework, 3-pillar method | `~/.agents/skills/content-authority/` |
| `content-humanizer` | AI pattern removal, 22-category editorial guide | `~/.agents/skills/content-humanizer/` |
| `content-ops` | Content audit, expand, batch operations | `~/.agents/skills/content-ops/` |
| `audit-website` (squirrel) | Live-site SEO audit, 230+ rules | skill (installed) |
| `frontend-design` | UI design patterns | skill (installed) |
| `self-improving` | Memory system | skill (installed) |

---

## Quick Commands

```bash
# Search (primary)
node scripts/brave-search.cjs "query"

# Research (secondary)
node scripts/wikipedia-search.cjs "query"

# Build
npm run build

# Deploy (Vercel CLI)
npx vercel deploy --prod
```

### OpenCode Skill Commands
```
/humanizer [url]            # content-humanizer: remove AI patterns from URL
/fix-patterns [pattern]      # content-humanizer: automated regex fixer
/humanize-review            # content-humanizer: editorial review
/audit [pattern]            # content-ops: content quality audit
/expand [topic]             # content-ops: research and expand topic
/expand-all [pattern]       # content-ops: batch expand pages
npx squirrelscan [url]       # audit-website: live-site SEO audit (230+ rules)
```

---

*Last Updated: 2026-04-18*

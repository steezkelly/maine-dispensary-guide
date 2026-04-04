# Reference Materials — Maine Dispensary Guide

Quick links to technical documentation for tools, APIs, and integrations used in this project.

---

## Search & Browser Automation

| Tool | Purpose | Documentation |
|------|---------|--------------|
| Brave Search | Primary search API | https://brave.com/search/api/ |
| Playwright MCP | Browser automation for OpenCode | https://github.com/microsoft/playwright-mcp |
| Wikipedia API | Free research/citations | https://en.wikipedia.org/api/rest_v1/ |
| SearXNG | Privacy meta-search (self-host) | https://docs.searxng.org/admin/index.html |
| agent-browser | Vercel Labs browser CLI | https://skills.sh/vercel-labs/agent-browser/agent-browser |

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

## Project Scripts

| Script | Purpose |
|--------|---------|
| `scripts/brave-search.cjs` | Primary web search |
| `scripts/wikipedia-search.cjs` | Research and citations |
| `scripts/searxng-search.cjs` | Meta-search (backup) |
| `scripts/playwright-mcp-search.md` | Playwright MCP usage guide |
| `scripts/link-architect.cjs` | Glossary term cross-linking |
| `scripts/content-quality.cjs` | Content analysis |
| `scripts/content-expander.cjs` | Thin content expansion |
| `scripts/content-audit.cjs` | Full site audit |
| `scripts/humanize-content.cjs` | AI pattern removal |
| `scripts/self-improving-maintenance.ps1` | Memory health check |

---

## Quick Commands

```bash
# Search (primary)
node scripts/brave-search.cjs "query"

# Research (secondary)  
node scripts/wikipedia-search.cjs "query"

# Content audit
node scripts/content-audit.cjs "./src/pages/guides/*.astro"

# Build
npm run build

# Deploy (Vercel CLI)
npx vercel deploy --prod
```

---

*Last Updated: 2026-04-04*

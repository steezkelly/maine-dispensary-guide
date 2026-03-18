# Project State: Maine Dispensary Guide

## Technical Stack
- **Framework:** Astro 6.0.5
- **Modules:** `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/vercel`
- **Architecture:** Modular Hub (Ready for multi-state scaling)
- **Status:** Vercel Production Live.

## Deployment
- **Platform:** Vercel (Deployed)
- **URL:** [https://project-1-eosin-five.vercel.app](https://project-1-eosin-five.vercel.app)
- **Adapter:** `@astrojs/vercel` (Server Mode)

## Site Structure
- **Homepage:** `/` - Optimized for SEO clusters.
- **Guides Index:** `/guides/` - Organized into categories (Business, Compliance, Cities).
- **City Guides:** 7 major Maine cities (Portland, Augusta, Lewiston, etc.).
- **Expansion Clusters:** 8 deep-dive articles (280E Taxes, Metrc, Staff Licensing).
- **Sitemap:** `/sitemap-index.xml` (Auto-generated).

## Recent Optimizations
- **Modular Layout:** Updated `Layout.astro` to support dynamic state names and hub mode.
- **Content Categorization:** Reorganized `guides/index.astro` into logical SEO clusters.
- **Homepage Upgrade:** Redesigned `index.astro` to feature Local Guides and Compliance highlights.
- **SEO Sync:** All 26+ guide targets are now linked within the internal site structure.

## Bot Collaboration Patterns
- **OpenCode Bot:** Focuses on content generation in `src/pages/guides/`.
- **Gemini CLI:** Manages infrastructure, build validation, and Vercel deployments.
- **Hand-off:** `CONTENT_QUEUE.md` tracks progress.
- **Communication:** `MESSAGE_TO_OPENCODE.md` for direct briefing.

## Commands
- `npm run build` - Production build (triggers Vercel output).
- `vercel deploy --prod` - Deploy to production.
- `npm run dev` - Local development.

---
*Last Updated: March 18, 2026*

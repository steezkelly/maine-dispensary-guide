# Project State: Maine Dispensary Guide

## Technical Stack
- **Framework:** Astro 6.0.5
- **Modules:** `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/vercel`
- **Architecture:** Maine-Focused Hub
- **Status:** Vercel Production Live.

**Scope: Maine Only** — This is a Maine-focused property. Do NOT build state-specific hubs for other states.

## Deployment
- **Platform:** Vercel (Production)
- **Primary Domain:** [https://mainedispensaryguide.com](https://mainedispensaryguide.com)
- **Status:** LIVE

## Site Structure
- **Homepage:** `/` - Optimized for SEO clusters.
- **Guides Index:** `/guides/` - Organized into categories (Business, Compliance, Cities).
- **City Guides:** 15 Maine cities (Portland, Augusta, Lewiston, Bangor, etc.).
- **Deep-Dive Articles:** 26+ technical guides (280E Taxes, Metrc, Staff Licensing, Real Estate, etc.).
- **Sitemap:** `/sitemap-index.xml` (Auto-generated).

## Recent Optimizations
- **Modular Layout:** Updated `Layout.astro` to support dynamic state names and hub mode.
- **Content Categorization:** Reorganized `guides/index.astro` into logical SEO clusters.
- **Homepage Upgrade:** Redesigned `index.astro` with "What's New", social proof stats, newsletter signup, and "Start Here" journey path.
- **SEO Sync:** All 41+ guide targets are now linked within the internal site structure.

## Bot Collaboration Patterns
- **OpenCode Bot:** Focuses on content generation in `src/pages/guides/`.
- **Gemini CLI:** Manages infrastructure, build validation, and Vercel deployments.
- **Hand-off:** `BOT_COLLABORATION_HUB.md` tracks progress with EDT timestamps.
- **Communication:** Single source of truth via Hub.

## Commands
- `npm run build` - Production build (triggers Vercel output).
- `vercel deploy --prod` - Deploy to production.
- `npm run dev` - Local development.

## Future Roadmap
- **Checklist PDF Creation:** Generate the actual high-value PDF content to fulfill the /download-checklist/ promise.
- **CTA Optimization:** Refine the lead capture boxes to be more enticing (visual previews, social proof).
- **Design Refinement:** Improve the "Heritage Authority" aesthetic with more high-fidelity visual components.
- **Vendor Directory:** Launch the "Money Pages" for Maine-based cannabis professional services.
- **Related Articles:** Add context-aware related links at bottom of guide pages.

---
*Last Updated: April 4, 2026*

# AGENTS.md — Maine Dispensary Guide

Astro 7 static site (`output: 'static'`), deployed to Vercel at mainedispensaryguide.com.
Maine cannabis business and dispensary guide content.

## Commands

```bash
npm run dev        # local dev server (turbo)
npm run build      # production build: regenerates data indexes, then astro build
npm run typecheck  # astro check via turbo
```

## Notes

- Build output goes to `apps/maine-cannabis/dist/`. Vercel builds with `npm run build`.
- `scripts/` holds only build-time helpers: data index regen (`scripts/data/`)
  and sitemap postprocessing (`scripts/check/`).
- Turbo monorepo with `apps/*` and `packages/*` workspaces. Collapsing it into
  a single Astro app is a possible future cleanup (phase 2).
- Keep it simple: CI is install → typecheck → build. No git hooks, no extra
  test suites, no release-governance gates.

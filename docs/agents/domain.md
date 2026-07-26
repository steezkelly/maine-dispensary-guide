# Domain Docs

How the engineering skills should consume this repo's domain
documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the project's ubiquitous
  language (B2B vs. editorial split, dose-cap terminology, etc.).
- **`docs/adr/`** — past architectural decisions. In a future
  multi-context split, also check `src/<context>/docs/adr/`.

If either file doesn't exist, **proceed silently**. Don't flag their
absence; don't suggest creating them upfront. The `/domain-modeling`
skill (reached via `/grill-with-docs` and
`/improve-codebase-architecture`) creates them lazily when terms or
decisions actually get resolved.

## File structure

Single-context repo (this one):

```
/
├── CONTEXT.md              ← created lazily by /domain-modeling
├── docs/
│   ├── agents/             ← this directory (skill config)
│   ├── adr/                ← created lazily by /domain-modeling
│   ├── analytics/
│   ├── audits/
│   ├── plans/
│   ├── research/
│   ├── seo/
│   ├── memos/
│   └── <dated briefs and session passdowns>
├── src/
└── apps/                   ← Astro-Turborepo shape, not a true monorepo
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor
proposal, a hypothesis, a test name), use the term as defined in
`CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal —
either you're inventing language the project doesn't use (reconsider)
or there's a real gap (note it for `/domain-modeling`).

## MDG-specific vocabulary already known

Until `CONTEXT.md` exists, prefer these terms when describing work:

- **Dose cap** — Maine adult-use edible cap (10mg/serving,
  200mg/package per Title 28-B §703(1)(F); effective 2023-08-09 via
  PL 2023 c. 396 §19)
- **MMCP** — Maine Medical Cannabis Program (provider-discretion,
  Title 22 ch. 558-C; no closed qualifying-conditions list)
- **YMYL page** — any page whose content can affect a user's health,
  financial, or safety decision. SEO/Ads policy applies.
- **Editorial side** — `src/pages/guides/`, `src/pages/blog/`, the
  186 guide pages
- **B2B / commerce side** — `/download/first-timer-field-guide` lead
  funnel, vendor directory, affiliate outreach
- **Verify cycle** — `npm run verify:iterate` for fast loops; exact-range
  verification plus `npm run build:isolated` before transport; a normal branch
  push; exact-SHA Vercel readiness and preview smoke; then, only after merge and
  production readiness, production smoke. See AGENTS.md "Verify cycle" for the
  canonical commands.

If you find yourself inventing a new term for something that's
already known by one of these names, **use the known name**.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly
rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

This repo currently has no `docs/adr/` directory. When ADRs start
landing, the first one should be numbered `0001-<slug>.md` per the
default convention.

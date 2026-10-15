# CONTEXT.md

> **For agents:** this file is the project's ubiquitous language. Use these terms in
> issue titles, refactor proposals, hypotheses, test names. Don't drift to synonyms
> the glossary explicitly avoids. If a concept you need isn't here, flag the gap
> (don't invent a name).

Source of truth unless an ADR in `docs/adr/NNNN-*.md` supersedes a term. See
`docs/agents/domain.md` for the consumer rules.

---

## Domain terms

### Cannabis / regulatory (cite-these, don't paraphrase)

- **Dose cap** — Maine adult-use edible cap (10 mg/serving, 200 mg/package per
  Title 28-B §703(1)(F); effective 2023-08-09 via PL 2023 c. 396 §19).
- **MMCP** — Maine Medical Cannabis Program (provider-discretion per Title 22 ch.
  558-C; no closed qualifying-conditions list).
- **YMYL page** — any page whose content can affect a user's health, financial,
  or safety decision. SEO/Ads policy applies.
- **OCP roster** — the Office of Cannabis Policy's licensed-dispensary dataset
  (`scripts/ocp/fetch-ocp-towns.py`; surfaced via `lib/site-stats.ts`).
  "OCP roster drift" = the cached count and the real-world count diverge; fix is
  to re-fetch via the Python pipeline.

### Editorial surface

- **Editorial side** — `apps/maine-cannabis/src/pages/{guides,blog}/` and the
  supporting JSON-LD / sidebar / footer chrome. 220 files today (185 guides +
  35 blogs).
- **B2B / commerce side** — `/download/first-timer-field-guide` lead funnel,
  vendor directory, affiliate outreach. Discount; do not refactor modules that
  depend on outbound email until grilled on the pipeline-failure memory.
- **Publisher-managed editorial byline** — the per-page triad
  `(verification-badge + authors-link + consumer-hub-callout)` that renders the
  reviewer pair + editor + optional consumer-hub CTA. Implementer's choice of
  rendering layer; today each page pastes it inline; `EditorialFooter` is the
  planned single-module replacement (Phase 5 of the rollout plan).
- **Byline pair** — the (byline-author, reviewer-author) tuple on a given page.
  Mixed convention: guides hardcode `"Calvin Waters + Margaret Finch"`, blogs
  resolve from `data/authors.json` by ID. See `EditorialFooter` rollout plan.

### Build / verify

- **Verify cycle** — `npm run verify:iterate` for fast smoke-free loops; explicit
  exact-range verification plus `npm run build:isolated` for the committed
  candidate; normal push; then
  `MDG_PREVIEW_URL=https://your-exact-preview.vercel.app npm run verify:post-deploy` after Vercel is
  Ready for that SHA. Production smoke follows merge and exact production
  readiness. See `AGENTS.md` "Verify cycle" for the canonical rules.
- **YMYL** is also a coverage term: any content that fails the SEO or Ads
  YMYL review sits in a separate editorial gate (see `docs/AFFILIATE_OUTREACH.md`
  for the rule chain).

---

## Glossary conventions

- **Don't use** "service", "API", "boundary", "component" (as a noun) for code
  modules. See `AGENTS.md` and the architectural vocabulary adopted with the
  rollout plan; the catch-all is "module" and "interface".
- **Use** "deletion test", "seam", "adapter", "depth", "leverage", "locality"
  when describing refactors — these are loaded from the
  `/root/.agents/skills/codebase-design/SKILL.md` (now uninstalled; use the
  upstream `mattpocock/skills` repo's `codebase-design` SKILL.md if reinstalled).

---

## Status

This file is lazy-created 2026-07-10 as part of the Phase 0 setup
(rollout plan v2: `.hermes/plans/2026-07-10_111151-mdg-rollout-plan-v2.md`).
**Open:** section-taxonomy canonical form (14+ free-text labels found in
frontmatter across guides/blogs). Needs a grill session before the
`EditorialFooter` deepening can derive its `includeConsumerHubCallout` default
from `article.section`.

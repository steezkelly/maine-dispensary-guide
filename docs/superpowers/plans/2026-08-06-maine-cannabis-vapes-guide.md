# Implementation plan — Maine cannabis vapes guide

## Scope

Build `/guides/cannabis-vapes-maine` as a source-backed adult-use consumer guide with a 2,400–2,700 word substantive body and bounded operator context.

## Steps

1. Maintain the source ledger and approved design in the card’s leased paths.
2. Create `cannabis-vapes-maine.test.cjs` first. It must fail because the page route is absent, then assert the final reader-facing contract:
   - exact H1;
   - explicit body markers and 2,400–2,700 prose-word calculation;
   - primary Maine/OCP/EPA/DEP sources;
   - label, testing, recall, disposal, and operator-transparency sections;
   - five FAQ records from one data structure;
   - no dosage/medical/effectiveness or comparative-safety language;
   - truthful review, corrections, and authors surfaces.
3. Create the Astro page by following the current regulatory/COA structural pattern while replacing all peer claims, authorship, and dates with the ledger-backed contract.
4. Run the focused test after each material writing pass; calculate and adjust body prose from the actual marker-bounded rendered text source, not code lines.
5. Regenerate `autoRelatedData.json` only after source completion and only under the active lease. Retain it only if deterministic and relevant to this new route.
6. Regenerate `apps/maine-cannabis/public/llms.txt` from the isolated built sitemap so the new canonical guide URL appears exactly once in the discovery index. Retain the generated artifact only when a repeated regeneration is byte-identical; this is a required derived release artifact, distinct from unrelated generated drift such as `MISSION_CONTROL.md` and `blog-index.json`.
7. Run the repository-gate safety preflight. Current inspection has already identified legacy bypass guidance in `scripts/git/pre-push-verify.cjs`; do not invoke that canonical verifier until a governed repair clears the safety hold.
8. Run safe focused tests and a non-mutating build/render path only after confirming it cannot invoke the unsafe verifier or mutate unleased paths. Inspect the built HTML for H1, metadata, heading order, links, source/review note, FAQ/schema parity, and a single related-content rail.
9. Request independent exact-head review after the last content edit. No push, merge, deployment, or release under this card without a separate safe transport/review cycle.

## Expected files

- `docs/research/2026-08-06-maine-cannabis-vapes-source-ledger.md`
- `docs/superpowers/specs/2026-08-06-maine-cannabis-vapes-guide-design.md`
- `docs/superpowers/plans/2026-08-06-maine-cannabis-vapes-guide.md`
- `apps/maine-cannabis/src/pages/guides/cannabis-vapes-maine.astro`
- `apps/maine-cannabis/src/pages/__tests__/cannabis-vapes-maine.test.cjs`
- `apps/maine-cannabis/src/data/autoRelatedData.json` only if regenerated deterministically.
- `apps/maine-cannabis/public/llms.txt` regenerated from the isolated built sitemap, with this route exactly once.

---
id: MDG-WORKFLOW-2026-07-23-MARKET-STATS-NATIONAL-SOURCE-REWRITES
parent: MDG-Q3-2026-PDF
role: codex-author
base_sha: 18c493461c4b00fee09800ec933198b7a376ea48
branch: feat/market-stats-national-source-rewrites-2026-07-23
worktree: /home/steve/.cache/mdg-market-stats-2026-07-23
allowed_paths:
  - apps/maine-cannabis/src/pages/market-stats.astro
  - apps/maine-cannabis/src/pages/__tests__/market-stats-national-source-matrix.test.cjs
  - apps/maine-cannabis/src/styles/market-stats-charts.css
  - apps/maine-cannabis/src/components/ChartBar.astro
  - apps/maine-cannabis/src/components/ChartTierList.astro
  - apps/maine-cannabis/src/components/ChartStackedBar.astro
  - apps/maine-cannabis/src/components/__tests__/market-stats-charts.test.cjs
  - apps/maine-cannabis/public/images/charts/market-stats/federal-arrests-2007-2022-2023.svg
  - apps/maine-cannabis/public/images/charts/market-stats/maine-vs-national-pricing.svg
  - apps/maine-cannabis/public/images/charts/market-stats/federal-regulatory-tier-list.svg
  - apps/maine-cannabis/public/images/charts/market-stats/280e-cumulative-tax.svg
  - apps/maine-cannabis/public/images/charts/market-stats/state-context-tax-rates.svg
  - apps/maine-cannabis/public/data/market-stats-chart-sources.json
  - apps/maine-cannabis/scripts/build/render-market-stats-charts.cjs
  - apps/maine-cannabis/scripts/build/__tests__/render-market-stats-charts.test.cjs
  - apps/maine-cannabis/package.json
acceptance:
  - node apps/maine-cannabis/src/pages/__tests__/market-stats-national-source-matrix.test.cjs passes with all §8.2 prose assertions
  - node apps/maine-cannabis/scripts/build/__tests__/render-market-stats-charts.test.cjs passes for all five chart SVGs (geometry, source labels, accessibility text)
  - node apps/maine-cannabis/src/components/__tests__/market-stats-charts.test.cjs passes for the three shared chart components
  - npm run verify:iterate passes (esbuild + filtered astro check + sitemap-postprocess + docs-vs-code + compressed-frontmatter + hero-image-naming)
  - npm run test:market-stats-video remains green
  - npm run test:contention (or equivalent) is unchanged from main
  - apps/maine-cannabis/src/pages/__tests__/market-stats-trust-signals.test.cjs is unchanged and still green
  - Wholesale spot row in nationalPricing is dropped or re-pulled (this card: dropped, re-pulling weekly is a separate card)
depends_on:
  - PR #151 (Q3 2026 source pool) — MERGED at 2398aa30 on 2026-07-23
lease_ttl_minutes: 180
stop_condition: "All five §8.2 prose rewrites, four §8.1 chart SVG assets (5 visuals total: 1 of the 5 is a tier-list, not a chart, but produced as inline SVG component), the renderer test, the chart component tests, and the prose regression tests pass on the same exact candidate. Pre-push verifier exits 0. Author report saved at /tmp/mdg-market-stats-2026-07-23-codex-report.md with full diff and focused command output. Independent MiniMax-M3 review (or gpt-5.3-codex-spark fallback if Token Plan is rate-limited) returns PASS at the same head before PR is created."
---

# Market-stats rewrites + 5 visuals

## Objective

Apply §8.2 of `docs/research/market-stats-national-source-matrix-2026-07-22.md` to `apps/maine-cannabis/src/pages/market-stats.astro` and add the five §8.1 visuals to make the national-context section concrete instead of table-only. The four rewrites are frontmatter-only data updates; the five visuals are new chart SVG components plus a small renderer that produces both inline-SVG and raster variants. The card must be RED→GREEN TDD against a focused prose-regression test and a focused chart-renderer test.

## Why now

PR #151 (Q3 2026 source pool) merged to main at 2398aa30 on 2026-07-23. The national-context source matrix is now committed; the page is the only consumer that has not been updated since the matrix was authored. Without this card, the page cites 2026-07-09 figures and presents federal arrest numbers with the stale "Jun 29 – Jul 15 hearing" wording that is no longer accurate.

## Task contract

The YAML front matter is the contract of record. Keep its `base_sha`, `branch`, `worktree`, `allowed_paths`, `acceptance`, dependencies, lease duration, and stop condition current before work begins. Acquire a worktree lease on the same branch and worktree before the first edit; release on commit handoff.

## §8.2 rewrites (in-scope; frontmatter data only)

1. `nationalMarket.1.6` — drop the `$149B` total economic contribution row. The matrix classifies it as a derived Flowhub multiplier; the page no longer asserts it as a national fact. (Acceptance: prose regression test asserts the literal string "149" no longer appears in the §8.2 scope; the §1.5-style "BTC $29.1–29.6B" Whitney line remains.)
2. `federalStatus.4.4` — Hemp / CBD / delta-8 row caption: change "changing Nov 12, 2026" to "changing Nov 12, 2026 to total-THC standard + 0.4 mg/container cap, contested by H.R. 7024 / H.R. 7010 / Senate delay bills." (Acceptance: test asserts the row contains "Nov 12, 2026" AND "H.R. 7024" AND "H.R. 7010".)
3. `federalStatus.4.5` — Broader Schedule I → III rescheduling row: change status text from "PENDING — hearing Jun 29 – Jul 15, 2026" to "PENDING — DEA ALJ hearing concluded Jul 15, 2026; post-hearing briefs due Aug 17, 2026; ALJ has no deadline; DEA Administrator final rule has no deadline." (Acceptance: test asserts the new prose is present AND the old "Jun 29 – Jul 15" string is gone.)
4. `nationalPricing.3.8` — Wholesale spot row: drop the $2.40/g Nov 21, 2025 row. The matrix documents that this number is ~8 months old; re-pulling weekly is a separate card. The row becomes a short note "Wholesale spot intentionally omitted; re-pulled quarterly per the national-context matrix's §8.3 exclusion." (Acceptance: test asserts neither "2.40" nor "1,087/lb" appears in the §8.2 scope and the note is present.)

## §8.1 visuals (in-scope; new chart assets)

For each visual: a small Node-native SVG renderer at `apps/maine-cannabis/scripts/build/render-market-stats-charts.cjs` (no external SVG/PNG library) plus a `ChartBar` / `ChartTierList` / `ChartStackedBar` component per visual class. The page renders each visual as inline SVG with the embedded source caption; no raster conversion is in this card. Hero-image-naming gate is satisfied because no new hero/infographic image files are produced; only inline SVG.

1. **Federal-arrest bar chart** (2007 / 2022 / 2023 with "floor not ceiling" caption).
2. **Maine vs national pricing bar chart** ($6.62 Maine / $3.62 equivalized national / $8.94 single-gram national / $3.80 Michigan / $15.80 Illinois).
3. **Federal regulatory status tier-list** (3 tiers: Schedule III for FDA-approved + state medical / Schedule I for adult-use / hemp pending Nov 12, 2026).
4. **280E cumulative-tax stacked bar** ($15B excess / $12B baseline = $27B total since 2018).
5. **State-context horizontal bar chart** of tax rates across the 8 states (tax rate %).

## Out of scope (DO NOT)

- Do not edit `apps/maine-cannabis/src/pages/__tests__/market-stats-trust-signals.test.cjs`; the lead-form contract is frozen.
- Do not re-design page layout; only update frontmatter and add new chart sections.
- Do not add new chart libraries (e.g., chart.js, d3); hand-built SVG only.
- Do not commit, push, or alter `origin/main`; this is a commit-only card.
- Do not wire a weekly wholesale-spot ingest; that is a separate card.
- Do not pull new research data; this card uses only the verified figures in §8.2 of the matrix.

## Author report

Write the author handoff report outside the repository at:

```text
/tmp/mdg-market-stats-2026-07-23-codex-report.md
```

The report must list changed paths and every command run with its exit code. It must state whether the diff is unstaged and name any blocker or remaining work.

## Acceptance evidence

Record the focused commands, their outcomes, the independent Verifier identity, and the explicit PASS/FAIL result. A FAIL returns the card to `needs_fix` with the finding retained. Only a recorded PASS permits creation of the integration child.

## Completion metadata

Update this JSON when authoring, verification, or integration reaches a durable handoff.

```json
{
  "status": "in_progress",
  "base_sha": "18c493461c4b00fee09800ec933198b7a376ea48",
  "branch": "feat/market-stats-national-source-rewrites-2026-07-23",
  "worktree": "/home/steve/.cache/mdg-market-stats-2026-07-23",
  "paths_changed": [],
  "commands": [
    {
      "command": "node apps/maine-cannabis/src/pages/__tests__/market-stats-national-source-matrix.test.cjs",
      "exit": null
    }
  ],
  "blocking_reason": null
}
```

## Blocked handoff

Use this section whenever `status` is `blocked`. Preserve the blocker record on the card and set `completion metadata.blocking_reason` to the same concise reason.

```yaml
blocker:
  owner: ""
  evidence: ""
  next_action: ""
  resume_trigger: ""
```

## Handoff

Record the current state, next owner, exact diff location, author-report path, verification evidence, and next action. Only the integration worktree may update `origin/main`.

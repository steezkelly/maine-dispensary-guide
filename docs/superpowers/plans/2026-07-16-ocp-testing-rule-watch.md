# OCP July 2026 testing proposed-rule watch

- **Task:** MDG-OCP-TESTING-RULE-WATCH-20260716
- **Date:** 2026-07-16
- **Branch:** `content/ocp-testing-rule-watch-20260716`

## Evidence and status

- OCP labels the Chapter 5 and Chapter 40 documents as proposed rules and accepts public comment through August 14, 2026 at 5:00 p.m.
- OCP will hold a public hearing August 3, 2026 at 10:00 a.m.
- The Chapter 40 PDF repeatedly states that it is a draft subject to review, public comment, and further revision.
- The proposed Chapter 40 text would clarify final-form testing, an edible-contaminant-testing exception tied to previously tested concentrate inputs, retesting/remediation, and potency-retest labeling.
- The current final Chapter 40 rule (effective November 6, 2024) remains the operative rule unless and until OCP adopts and makes a replacement effective.

## Bounded implementation

1. Add a dated, conspicuous rule-watch notice with official links to both P0 guides.
2. Replace P0 universal full-panel and blanket-destruction claims with matrix-, input-history-, and analyte-specific guidance.
3. Align P0 rendered copy, FAQ data/JSON-LD, summary table, and infographic caption.
4. Add short proposal-status/source qualifiers and correct broad testing claims on three P1 pages.
5. Correct blanket failed-test disposal language on the waste guide and replace the regulations guide's unsupported “effective 2026” testing statement with the verified pending rulemaking.
6. Add one material-correction entry to `/about/corrections` covering all changed routes.
7. Do not rewrite volatile lab counts, prices, budgets, or turnaround claims in this patch.

## Verification

- Run `npm run verify:iterate -- --fast-only` after edits.
- Run `npm run verify:iterate` before commit.
- Build once at the end and inspect rendered HTML for all seven routes plus `/about/corrections`.
- Verify all official OCP links and confirm every 2026 rule reference says proposed/draft/not yet effective.
- Inspect the full Git diff and generated-state changes before handoff.

## Follow-up gate

Re-check the OCP proposed-rules page after the August 14, 2026 comment deadline and continue monitoring for an adoption notice and effective date. Do not convert proposal language into binding guidance until OCP publishes final adopted text and an effective date.

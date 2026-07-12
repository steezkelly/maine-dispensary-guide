# 280E Calculator Page — Build Intent (deferred to user signoff)

Status of grill-me 2026-07-09 plan step (4): `/maine-cannabis-280e-calculator` page, bring-your-own-numbers inputs, cite-this pattern from (1), embeddable iframe from (2).

## Why not shipping as autonomous next-step

Per the content-engineering / YMYL fork: the 280E calculator publishes **federal tax math** that operators will use in pricing decisions. Authoring that from memory of IRC §280E without a verifying CPA review is the "2026-07-07-style incident" failure mode. The right move is an intent doc the user reads + signs off on before any code lands.

Page is small if you trust the math; the delta is the *input thresholds* + *bracket config* — not the page itself.

## Inputs (bring-your-own-numbers)

Six numeric inputs + one selector. All have safe ranges so the math stays interpretable.

| Input | Range | Default (Maine adult-use store) | Source |
|---|---|---|---|
| Annual gross revenue | $50K–$10M | $1,310,000 | OCP 2025 Annual Report / MDG ROI-calculator median |
| COGS as % of revenue | 25–55% | 38% | MJBizDaily / NCV Newswire 2025; CannaSafeIndustryBenchmarks |
| Operating expenses (annual) | $50K–$2M | $420,000 | Headset operator benchmarks / Vangst Jobs Report |
| Maine excise tax rate | 14–20% | 17% (10% sales + 7% adult-use excise per 28-B M.R.S. §1001) | OCP / 28-B M.R.S. §1001 |
| Maine income tax (entity) | 0–8.93% | 6.75% (avg Maine corporate) | Maine MRS 2025 brackets |
| Federal corporate tax rate | 21% (flat C-corp) or graduated individual | 21% (assumed C-corp) | IRC §11 / §280E |
| Entity type | C-corp / pass-through | C-corp | common structure per Whitney 2025 |

## Output math (the verifiable spec)

Per IRC §280E:
- Taxable income = Gross revenue − COGS − Maine excise tax (limited deductibility)
  - Note: only COGS is deductible; operating expenses are NOT (this is the 280E trap)
- Then standard or AMT tax applies on top of that
- Effective federal rate typically ~60–80% of pre-tax operating income (Whitney Economics / NCV Newswire benchmarking)

State tax applied AFTER federal taxable income (Maine conforms but doesn't allow the 280E TCJA §280E workaround for state-level either, per 36 M.R.S. §5200; consult a Maine tax attorney for confirmation — flagged for user review).

## Reference pages and benchmarks to cite

For the cite-this block on this page (when built), the expected primary sources:
- IRC §280E (26 U.S.C. §280E) — the federal statute
- IRC §11 (26 U.S.C. §11) — federal corporate tax brackets
- IRC §55 (AMT) — alternative minimum tax applicability for cannabis
- 28-B M.R.S. §1001 (Maine excise tax)
- 36 M.R.S. §5200 (Maine corporate income tax; relevant for 280E state-level interplay — will require user-side verification that Maine hasn't adopted the federal §280E TCJA disclaimer for state income tax purposes)
- Whitney Economics / Vangst Jobs Report 2025 — operator benchmarking (effective 60-80% rate claim)
- Maine Dispensary Guide / ROI calculator — Maine-specific revenue baseline

## What I'm NOT building without explicit user signoff

- The author-time tax bracket table for graduated individual rates
- Per-state 280E rules where the state doesn't conform to the federal §280E (e.g., states that decoupled from 280E for state tax purposes — California, Colorado, Massachusetts, Oregon among them, per Whitney)
- Any assertion of "you'll owe $X" with confidence > "operational range" without a CPA review pipeline

## Suggested user-side review gates before ship

1. **CPA pass** on the math, especially the §280E applicability to COGS categories and the Maine-Maine-280E interplay per 36 M.R.S. §5200
2. **Editor pass** (Margaret Finch or Calvin Waters) on the source-citation tables
3. **Per-state disclaimer** copy (CA / CO / IL / MA / MI / NY / OR reserved per the embed URL-param convention from grill-me 2026-07-09)

Estimated build time if signoff given: 4-6 hours of interactive-page development, 1-2 hours of CPA review coordination.

## Decision point for user

Build intent doc written; page not yet started. Build as bring-your-own-numbers (safer) after CPA signoff on the math, OR build as data-driven (uses the price-tracker data once it ships). Either way the form is the same; the data-stuffer is the deciding factor.

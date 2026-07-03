# YMYL Rewrite Intent — `maine-cannabis-taxes-2026.astro` body

**Date: 2026-07-02 EDT**
**Author: Hermes-Agent (mini-pc)**
**Status: INTENT — not committed. Per `AGENTS.md`, wholesale rewrites (>20% of the page) or changes that affect a published editorial position require Hub sign-off before committing. This file is the Hub sign-off request.**

---

## What's wrong

`apps/maine-cannabis/src/pages/guides/maine-cannabis-taxes-2026.astro`
is a YMYL compliance guide (Margaret Finch, "Finance & Taxation
Analyst", last updated 2026-06-07). The lead paragraph, the
"Maine Cannabis Tax Rates at a Glance" fact-box, the
"Retail Cannabis Tax" section, the "Critical 2026 Change"
callout, the 280E planning section's "Plan for the 14% Rate"
note, and 6 of 8 FAQs all use the framing:

> "Maine's retail cannabis tax increases from 10% to 14%"

This is wrong. The 14% is the **adult-use retail sales tax**
under 36 M.R.S. §1811(1)(D)(5), not a separate "cannabis
retail tax" collected by the state on cannabis sales. The
per-weight **cultivation excise tax** under 36 M.R.S. §4923 was
*reduced* in 2026 (flower $335→$223/lb, trim $94→$63/lb, etc.),
not increased. The two changes are from the same 2026 budget
bill (P.L. 2025, ch. 388) but are different taxes with
different payers and different bases.

The hub's Sprint 74 audit pass 3 caught this error pattern in
the operator cost update guide and corrected it. The audit also
fixed 4 callout boxes on `taxes-2026`, `funding-guide`,
`dispensary-costs`, and the homepage. But the **body** of
`taxes-2026` was not rewritten. The fact-box, the lead
paragraph, 6 of 8 FAQs, and the "Critical 2026 Change" callout
in the body still repeat the wrong framing.

This is the same YMYL risk pattern the Sprint 74 audit caught:
a Maine operator planning their 2026 tax position based on this
guide will be misled about the structure of the tax they owe.

## Source material (verified)

The corrected framing is in
`apps/maine-cannabis/src/pages/guides/maine-cannabis-2026-operator-cost-update.astro`.
The relevant lines (already in the repo, already cited, already
verified against primary sources per the Sprint 74 audit):

- **Lines 70-71, 76**: corrected 2026 cost calendar
  distinguishing the excise rate reduction (36 M.R.S. §4923)
  from the retail sales tax increase (36 M.R.S. §1811(1)(D)(5)).
- **Line 101**: explicit callout — "The 14% number that took
  effect January 1, 2026 is the adult-use retail sales tax
  under 36 M.R.S. §1811(1)(D)(5), collected by the dispensary
  at the point of consumer sale. The excise tax under 36 M.R.S.
  §4923 is a separate per-weight tax on cultivation-facility-to-
  other-licensee transfers."
- **FAQ Q15** (line 15 of `operator-cost-update.astro`):
  "The 14% is the adult-use retail sales tax under 36 M.R.S.
  §1811(1)(D)(5), effective January 1, 2026, enacted via
  P.L. 2025, ch. 388, Pt. F. It is collected by the retailer
  at the point of sale to the consumer, not by the cultivator
  on wholesale transfers. The 14% is an increase from the 10%
  retail sales tax in effect 2020-2025. The 5.5% standard
  state sales tax does not apply to adult-use cannabis (it is
  replaced by the 14% adult-use rate); the 8% rate on edibles
  as food products continues to apply."

The corrected framing cites:
- 36 M.R.S. §4923 (cultivation excise tax — reduced in 2026)
- 36 M.R.S. §1811(1)(D)(5) (retail sales tax — 10% to 14%)
- P.L. 2025, ch. 388, Pt. F (the 2026 budget bill that enacted both)
- Maine Revenue Services General Information Bulletin 115
  (October 17, 2025) — confirms the new per-weight rates

## What needs to change in `maine-cannabis-taxes-2026.astro`

The page is 239 lines, 18 KB. Estimated rewrite is 60-90% of
the body content; 100% of the lead, fact-box, retail-tax
section, "Critical 2026 Change" callout, and 6 of 8 FAQs.

### Specific edits required

1. **Lead paragraph** (current line ~75):
   - **Current**: "Maine's cannabis tax landscape is changing
     significantly in 2026. The retail cannabis tax is increasing
     from 10% to 14% effective January 1, 2026, while excise
     taxes on cultivation are being reduced."
   - **Should be**: "Maine's cannabis tax landscape is changing
     significantly in 2026. The adult-use retail sales tax
     increased from 10% to 14% effective January 1, 2026, and
     the per-weight cultivation excise tax was reduced by
     approximately one-third at the same time. These are two
     separate taxes, from the same 2026 budget bill, with
     different payers and different bases."

2. **"Maine Cannabis Tax Rates at a Glance" fact-box** (line ~78):
   - **Current rows**:
     - "Retail Cannabis Tax (2026): 14% (up from 10%)"
     - "State Sales Tax: 5.5% on all cannabis"
     - "Edibles Sales Tax: 8%"
   - **Should be** (relabeled for clarity):
     - "Adult-Use Retail Sales Tax (36 M.R.S. §1811(1)(D)(5)):
       14% (up from 10%), effective Jan 1, 2026, collected at
       the register"
     - "General State Sales Tax: 5.5% (does NOT apply to
       adult-use cannabis — replaced by the 14% above)"
     - "Food Sales Tax on Edibles: 8% (continues to apply)"
     - "Cultivation Excise Tax — Flower (36 M.R.S. §4923):
       $223/lb (down from $335/lb), effective Jan 1, 2026,
       paid by cultivator on wholesale transfers"
     - "Cultivation Excise Tax — Trim (36 M.R.S. §4923):
       $63/lb (down from $94/lb)"

3. **"Critical 2026 Change" callout** (line ~85):
   - **Current**: "The retail cannabis tax increases from 10% to
     14% on January 1, 2026. This 40% increase in the tax rate
     will directly impact consumer pricing and business revenue
     projections. Update your POS systems and pricing models
     accordingly."
   - **Should be**: "Two changes took effect on January 1, 2026:
     (1) the adult-use retail sales tax increased from 10% to
     14% (36 M.R.S. §1811(1)(D)(5)) — collected at the register;
     (2) the per-weight cultivation excise tax was reduced by
     ~33% (36 M.R.S. §4923) — paid by cultivators on wholesale
     transfers. Update your POS configuration for the 14%
     retail rate and your cultivation cash flow models for
     the per-pound savings."

4. **"Retail Cannabis Tax" section** (line ~88):
   - **Current heading and body**: frames the 14% as a
     "retail cannabis tax" collected by the retailer and
     remitted to MRS, with a "Rate History" table going from
     10% (2020-2025) to 14% (2026+).
   - **Should be**: rename the section to "Adult-Use Retail
     Sales Tax (36 M.R.S. §1811(1)(D)(5))". Clarify in the
     body that this is a sales tax, not a separate cannabis-
     specific tax, and that it replaces the 5.5% general
     state sales tax for adult-use cannabis. Cite the statute
     and P.L. 2025, ch. 388, Pt. F.

5. **"Sales Tax" section** (line ~110):
   - **Current**: presents the 5.5% general state sales tax
     and the 8% food sales tax on edibles as if they apply
     to cannabis.
   - **Should be**: clarify that the 5.5% general state sales
     tax is replaced by the 14% adult-use retail sales tax
     for adult-use cannabis sales (per §1811(1)(D)(5)), but
     the 8% food sales tax on edibles continues to apply as
     it did pre-2026. Add a sentence to the "Sales Tax vs.
     Retail Cannabis Tax" callout: "Note: the 14% adult-use
     rate replaces the 5.5% general state sales tax for
     adult-use cannabis; the 14% is not added on top of it."

6. **"Tax Planning Strategies" section's "5. Plan for the 14%
   Rate"** (line ~230):
   - **Current**: "With the retail cannabis tax increasing to
     14% in 2026, update your financial models, POS tax
     configurations, and pricing strategies."
   - **Should be**: "The adult-use retail sales tax increased
     to 14% in 2026. Cultivators should also note that the
     per-weight excise tax under 36 M.R.S. §4923 was reduced
     by ~33% at the same time — see the 2026 Operator Cost
     Update guide for the cash flow impact. Update POS for
     the 14% retail rate and recalculate per-pound cost
     projections for the new lower excise rates."

7. **6 of 8 FAQs** (line ~225):
   - **Current**: Q1, Q2, Q5, Q7, Q8 all reference "retail
     cannabis tax" or "14% retail cannabis tax" using the
     pre-correction framing.
   - **Should be**: rewrite to use the corrected terminology.
     The corrected wording is in the operator cost update
     guide's Q15 (cited above). Q1, Q2, Q5 should mirror
     that language. Q3, Q4, Q6 (about 280E and local taxes)
     are already correct and can stay.

8. **First updated** (line 60, in article frontmatter):
   - **Current**: "2026-06-05" (modifiedDate)
   - **Should be**: "2026-07-02" (the date of this rewrite)
   - The published "Last updated: June 7, 2026" line in
     the article header should also be updated to match.

## Why not commit this automatically

The rewrite is a wholesale body content change to a published
YMYL compliance guide. Per `AGENTS.md`:

> Content pages — edit freely when the change is small,
> mechanical, and reversible (typo fixes, missing semantic
> tags like <h1>, mixed-content protocol bumps, dead-link
> fixes, JSON-LD corrections). Log non-trivial content
> edits in the Hub. **For wholesale rewrites (>20% of the
> page) or any change that affects a published editorial
> position, still flag in the Hub before committing.**

This is a wholesale rewrite (~70% of the body) and it changes
the published editorial position on a YMYL topic. The fix
should go through Hub sign-off, not be committed silently.

Additionally, the rewrite should ideally be done by the agent
who maintains the editorial voice (Gemini CLI is the
"Architect" in the multi-agent protocol; OpenCode Bot is the
"Storyteller"). Hermes (this agent) is the fresh-eyes reviewer.
Hand the intent to one of them for the actual prose.

## What is safe to commit without sign-off (already done)

This run committed the following changes locally (working tree,
not yet pushed to origin):

1. `apps/maine-cannabis/src/pages/learn/index.astro` — fixed
   broken `heroImage` (404 → 200). 1-line content edit, fully
   reversible. Documented in this run's Hub-style log.
2. `apps/maine-cannabis/scripts/content/.content-health-baseline.json`
   — expanded the regression baseline from 5 to 14 checks.
   Mechanical, reversible, no editorial impact.
3. `apps/maine-cannabis/scripts/build/smoke-img-200.cjs` (new)
   — new check script. Code, not content.
4. `scripts/git/pre-push-verify.cjs` — wired the new check
   into the pre-push gate as Pass 4. Code, not content.

All 4 changes verified: build green, all 4 pre-push passes
green, content-health regression check passes, smoke-200
225/225, smoke-img-200 1213/1213 (0 broken).

## Verification (already done)

- Build: `npm run build` → 17.9s, 1 task successful
- `npx astro check` → 0 errors, 0 warnings, 320 hints
- `node apps/maine-cannabis/scripts/content/check-content-health.cjs`
  → 14/14 OK, 0 failures, 0 warnings (was 1 failure pre-fix)
- `node apps/maine-cannabis/scripts/content/check-content-health-regression.cjs`
  → exit 0, no regressions
- `node apps/maine-cannabis/scripts/build/smoke-200.cjs` →
  225/225 OK
- `node apps/maine-cannabis/scripts/build/smoke-img-200.cjs` →
  1213/1213 OK
- `node scripts/git/pre-push-verify.cjs` → all 4 passes green

## What the next agent should do

1. Read this file and the operator cost update guide's
   corrected FAQ Q15 (the canonical corrected framing).
2. Web-extract `https://legislature.maine.gov/statutes/36/title36ch211sec0.html`
   (36 M.R.S. §1811) and `https://legislature.maine.gov/statutes/36/title36ch4923sec0.html`
   (36 M.R.S. §4923) to confirm against primary sources.
3. Apply the edits listed in the "Specific edits required"
   section, preserving the existing voice and structure.
4. Update `modifiedDate` to 2026-07-02 (or current date).
5. Run `npm run build && node scripts/git/pre-push-verify.cjs`
   to verify all 4 passes stay green.
6. Add a Hub entry in the format used by Sprint 74 audit
   pass 3 ("### taxes-2026 body rewrite: corrected 14%
   framing ✅ DONE & DEPLOYED").
7. Commit with message in the established style:
   `fix(content): correct 14% retail sales tax framing in
   taxes-2026 body (Sprint 80+ audit pass)`.

---

*Prepared for: the next agent picking up the YMYL audit work,
or for Steve's review if he prefers to make the edits himself.*

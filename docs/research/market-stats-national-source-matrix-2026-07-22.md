# `/market-stats` — Verified Industry / Technology / National-Context Source Matrix

**Compiled:** 2026-07-22
**Replaces / extends:** `docs/research/market-stats-national-source-pack-2026-07-09.md` (national-context only)
**Scope:** This matrix is the audit-and-rewrite briefing for the **national-perspective expansion** of `apps/maine-cannabis/src/pages/market-stats.astro`. It is restricted to industry / technology / national-context claims — Maine-internal data is owned by the OCP/MRS/OCP-Annual-Report chain and is out of scope here.
**Audience:** the editor writing the rewrite, plus the verifier reviewing the rewrite.

**Companion documents:**

- `docs/research/POS_COMPARISON_RESULTS.md` — vendor/POS technology audit (referenced for §3 below; covers a separate but adjacent area the editor may cross-link from the industry section).
- `docs/research/market-stats-link-audit-2026-07-09.md` — inbound-link audit for the page.
- `apps/maine-cannabis/src/pages/market-stats.astro` — current page (frontmatter `nationalMarket`, `nationalJobs`, `nationalPricing`, `stateContext`, `federalStatus`, `federalArrests` arrays).

---

## How to read this matrix

For each row:

- **Claim** = the exact statement currently on the page (or proposed for the rewrite).
- **Best primary URL** = the canonical source the editor should cite, with access date.
- **Source class** = `PRIMARY-FEDERAL`, `PRIMARY-STATE`, `PRIMARY-RESEARCH`, `PRIMARY-INDUSTRY`, `AGGREGATOR-VERIFIED`, `AGGREGATOR-CITED`, `SECONDARY-VENDOR`.
- **Re-verification status 2026-07-22** = whether the claim still holds 13 days after the original 2026-07-09 source pack was assembled.
- **Recommended visual** = a chart type or asset if the rewrite would benefit; `none` if the prose-table is already optimal.
- **Exclusion / downgrade flag** = explicit guidance if the claim should be cut, hedged, or downgraded from the current presentation.

The matrix is split into five domains that map 1:1 to the existing frontmatter arrays on `market-stats.astro`:

1. Market size & revenue (nationalMarket)
2. Demand / jobs / tax burden (nationalJobs)
3. Pricing (nationalPricing)
4. Federal regulatory status (federalStatus)
5. State-by-state context (stateContext)
6. Federal arrest / criminal-justice trend (federalArrests)
7. POS / Metrc / technology context (no current array; new material the rewrite may add)

---

## §1 — Market size & revenue (nationalMarket array)

| # | Claim on page | Best primary URL | Source class | Re-verified 2026-07-22? | Recommended visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|---|
| 1.1 | U.S. cannabis market 2026 projected: **$47B** | `https://www.statista.com/outlook/hmo/cannabis/united-states` | AGGREGATOR-CITED (Statista paywalled; figure circulated via Flowhub) | ✅ Confirmed unchanged. Statista page still paywalled; figure cited via Flowhub 2026-07-09. | Bar: 2024 actual $30.1B → 2026E $47B → 2030E $55.4B (3.36% CAGR) | **Label clearly as "Statista projection cited via Flowhub."** If the rewrite wants primary defensibility, drop this and use 1.3 ($30.1B) + 1.4 ($31.5B) + 1.5 ($29.1-29.6B) only. |
| 1.2 | U.S. cannabis market 2030 projected: **$55.4B at 3.36% CAGR** | `https://www.statista.com/outlook/hmo/cannabis/united-states` | AGGREGATOR-CITED | ✅ Confirmed unchanged. | (Same bar chart as 1.1.) | **Same as 1.1** — must be labeled as projection + cited trail. |
| 1.3 | U.S. cannabis market 2024 actual: **$30.1B** | Whitney Economics 2024 actual confirmed in Whitney's Dec 2025 downward-revision press release; BDSA 2024 actual = same consensus. | PRIMARY-RESEARCH | ✅ Confirmed unchanged. | Bar of consensus historical actuals (2020–2025). | **Keep.** This is the single cleanest national actual the rewrite can cite. |
| 1.4 | U.S. cannabis market 2025 BDSA actual: **$31.5B** ($23.9B adult-use + $7.6B medical) | BDSA back-cast reported via Flowhub `https://www.flowhub.com/cannabis-industry-statistics` | AGGREGATOR-CITED (BDSA primary is gated) | ⚠️ **CONFLICT with Whitney:** BDSA says 2025 was up; Whitney revised 2025 down to $29.1–29.6B. The page must surface both, not pick one. | Annotation on 2025 bar: "BDSA $31.5B / Whitney $29.1-29.6B (methodology differs)" | **Do not collapse the two.** Whitney is explicit that 2025 was the first YoY decline. The current page already preserves both — keep it. |
| 1.5 | U.S. cannabis market 2025 Whitney revised forecast: **$29.1–29.6B** | `https://whitneyeconomics.com/press-detail/whitney-economics-reduces-its-u.s.-cannabis-retail-forecast-by-$21.1-billion-from-2025-2030-` | PRIMARY-RESEARCH | ✅ Confirmed unchanged (Dec 2025 release). | (See 1.4.) | **Keep.** The "first-ever YoY decline" framing is the strongest national-context story for Maine's 2025 plateau. |
| 1.6 | Total U.S. economic contribution (2025): **$149B** | Flowhub citing aggregated economic-impact studies | AGGREGATOR-CITED | ⚠️ **Weak primary trail.** Flowhub is a POS vendor; the $149B figure is a derived multiplier (gross economic activity × cannabis revenue ratio), not a primary research output. | None (don't visualize). | **EXCLUDE OR DOWNGRADE.** Either drop entirely or move to a methodology footnote flagged as "Flowhub, derived multiplier." The number has no defensible primary URL. |
| 1.7 | U.S. adult-use legal states: **24 + DC + 3 territories** | `https://www.ncsl.org/health/state-medical-cannabis-laws` | PRIMARY-RESEARCH (NCSL is a neutral state-legislature body) | ✅ Confirmed unchanged 2026-07-09; no new adult-use state has launched retail between then and 2026-07-22. | Simple chip-list (24 states) is the cleanest rendering. | **Keep.** |
| 1.8 | U.S. medical-cannabis comprehensive: **41 states** (per NCSL) | `https://www.ncsl.org/health/state-medical-cannabis-laws` | PRIMARY-RESEARCH | ✅ Confirmed unchanged 2026-07-09. MJBizDaily cites 42 (includes low-THC/CBD-only programs that NCSL excludes); stick with NCSL. | (Same chip-list; add " + 7 low-THC programs" caption.) | **Keep NCSL's 41.** Note MJBizDaily's 42 in a caption if desired. |
| 1.9 | U.S. past-month cannabis users (age 12+, 2024): **44.3M / 15.4%** | SAMHSA NSDUH 2024 Detailed Tables landing: `https://www.samhsa.gov/data/report/2024-nsduh-detailed-tables`; canonical HTML report: `https://www.samhsa.gov/data/sites/default/files/reports/rpt56287/2024-nsduh-annual-national/2024-nsduh-annual-national-html-071425-edited/2024-nsduh-annual-national.htm` | PRIMARY-FEDERAL | ✅ Confirmed unchanged (HHS Pub PEP25-07-007, released Aug 2025). | Bar: 2021 (13.2% / 37.0M) → 2024 (15.4% / 44.3M), with the methodology-change caveat in the caption. | **Keep** — but ALWAYS pair with the multimode-methodology caveat (2021+ not comparable to 2020 or earlier). |
| 1.10 | U.S. past-year cannabis users (age 12+, 2024): **64.2M / 22.3%** | Flowhub citation of NSDUH 2024 (verbatim figure) | AGGREGATOR-CITED (SAMHSA NSDUH is primary; Flowhub is the citation bridge) | ⚠️ **Citation trail:** the 64.2M figure traces via Flowhub; SAMHSA's own Table A.3B directly shows 44.3M past-month; past-year is not always surfaced as a headline number on SAMHSA's free pages. | (None — show as footnote alongside 1.9.) | **Keep with Flowhub attribution OR replace with direct SAMHSA citation if available.** Acceptable risk per existing source pack. |

**New claim surfaced 2026-07-22 (NOT in 2026-07-09 source pack):**

| # | Claim | Source | Class | Visual | Flag |
|---|---|---|---|---|---|
| 1.11 | Headset's 16 tracked US markets: **$24.3B in sales, +0.8% YoY** (12 mo. ending June 2026) | `https://www.headset.io/data/cannabis-industry-statistics` (last updated 2026-07-05) | PRIMARY-INDUSTRY (Headset is a POS vendor but publishes the cleanest monthly industry tracker) | Could pair with 1.4 as a methodology footnote. | **Add as supporting cite.** Headset's 16-market figure is **not** a national all-state total — it's a panel. Use to triangulate, not to replace, the BDSA/Whitney totals. |

---

## §2 — Demand / jobs / tax burden (nationalJobs array)

| # | Claim on page | Best primary URL | Source class | Re-verified 2026-07-22? | Recommended visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|---|
| 2.1 | Vangst 2025 Jobs Report: **425,002 FTE** (−3.4% YoY) | Vangst 2025 PDF (per Flowhub link): `https://5711383.fs1.hubspotusercontent-na1.net/hubfs/5711383/Jobs%20Report%20-%202025/VangstJobsReport2025-FINAL02%20(2).pdf` | PRIMARY-INDUSTRY (Vangst = staffing firm; they publish a full report PDF) | ✅ Confirmed unchanged 2026-07-09. Direct PDF linked. | Horizontal bar with the two jobs counts side by side (Vangst vs. Leafly) and a "methodology differs" caption. | **Keep** — but note Vangst counts direct cannabis jobs only. |
| 2.2 | Leafly 2026 Jobs Report (cited via cannabispromotions.com): **445,800 FTE** (+1.2% YoY) | Primary: `https://www.leafly.com/news/industry/cannabis-jobs-report` (still hosts 2022 = 428,059 edition); aggregator citation: `https://cannabispromotions.com/stats/employment` | AGGREGATOR-CITED (Leafly 2026 PDF not directly verified in original source pack) | ⚠️ **Re-verification status:** Leafly's canonical landing page still publishes only the 2022 edition; the 445,800 figure is cited via aggregator. **No new Leafly 2026 PDF surfaced between 2026-07-09 and 2026-07-22.** | (Same chart as 2.1.) | **Keep with hedging.** Either label "Leafly 2026 Jobs Report (cited via cannabispromotions.com; primary PDF not located)" or replace with the 2022 Leafly 428,059 figure as the only directly-verifiable Leafly number. |
| 2.3 | Federal tax burden from 280E (2025): **$2.24B excess** | Whitney Economics April 9, 2026 press release (Business Wire): `https://www.businesswire.com/news/home/20260409005861/en/Whitney-Economics-Refreshes-Analysis-of-Federal-Tax-Impact-on-Legal-Cannabis-Operators`; Whitney landing: `https://whitneyeconomics.com/press-detail/whitney-economics-refreshes-analysis-of-federal-tax-impact-on-legal-cannabis-operators` | PRIMARY-RESEARCH | ✅ **Confirmed refreshed 2026-07-22** — Yahoo Finance and Cannabis Law Report both republish the verbatim $2.24B / $27B / $15B figures from Whitney's April 9, 2026 release. No update to Whitney's figures since. | Stacked-bar: $27B cumulative federal tax since 2018 = $15B excess 280E + $12B baseline federal tax. | **Keep** with the standard "Whitney estimate, not IRS-published" caveat. IRS SOI does not publish a 280E-specific line. |
| 2.4 | Cumulative federal taxes paid since 2018: **$27B** | (Same as 2.3 — Whitney April 9, 2026.) | PRIMARY-RESEARCH | ✅ Confirmed. | (Same chart as 2.3.) | **Keep.** |
| 2.5 | Cumulative excess 280E taxes since 2018: **$15B** | (Same as 2.3 — Whitney April 9, 2026.) | PRIMARY-RESEARCH | ✅ Confirmed. | (Same chart as 2.3.) | **Keep.** |
| 2.6 | Projected industry FTE jobs by 2029: **~800,000** | Cannabiz Team projection cited via Flowhub | SECONDARY-VENDOR (Cannabiz Team is a staffing trade publication; projection, not actual) | ⚠️ **Soft projection.** | None — drop from any chart. | **DOWNGRADE.** This is a 3-year forward projection with no methodology trail surfaced. Either footnote ("Cannabiz Team projection, 2029 outlook") or cut. Recommend cutting — the page already has stronger Vangst/Leafly actuals. |
| 2.7 | (NEW from POS source pack) Most mature markets showing double-digit job declines: **Arizona, Illinois, Maine, Maryland, Oklahoma** | Vangst 2025 Jobs Report (per Flowhub citation of Maine-specific note) | PRIMARY-INDUSTRY | ✅ Confirmed via original source pack; not re-fetched 2026-07-22. | Tag-list chip rendering for the state names. | **Add to the rewrite.** Maine is on the mature-markets-decline list; this is a direct national-context anchor for the "Maine plateau" narrative. |

---

## §3 — Pricing (nationalPricing array)

| # | Claim on page | Best primary URL | Source class | Re-verified 2026-07-22? | Recommended visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|---|
| 3.1 | Michigan cheapest state: **$3.80/g** | `https://cannabispromotions.com/stats/prices` (last verified 2026-06-29 per page header) | AGGREGATOR-CITED | ✅ Page is current as of 2026-07-22 (no update since 2026-06-29). | Bar chart of state-by-state price (Michigan low → Illinois high → Maine mid). | **Keep with attribution.** |
| 3.2 | Oregon lowest eighth avg: **$11.55** (Headset) | `https://www.headset.io/data/cannabis-prices` (last updated 2026-07-05) | PRIMARY-INDUSTRY (Headset = POS vendor, but the canonical cannabis-price dashboard) | ✅ **Re-verified 2026-07-22:** Headset prices page still publishes the $11.55 Oregon / $31.11 Ohio spread verbatim. The Ohio figure was independently confirmed by Cann.dev July 2026 OH Monthly Puff citing Headset. | Bar: Oregon $11.55 → 12-market avg $20.64 → Ohio $31.11 (×2.7 spread). | **Keep** — this is the cleanest primary national pricing dataset. |
| 3.3 | U.S. national avg single-gram package (June 2026): **$8.94** | `https://www.headset.io/data/cannabis-prices` | PRIMARY-INDUSTRY | ✅ Confirmed 2026-07-22 (Headset page still shows $8.94). | (See 3.6 chart.) | **Keep.** This is the primary-source-correct figure; the page already correctly distinguishes $8.94 (Headset primary) from $8.92 (Cannabis Benchmarks via cannabispromotions.com, secondary). |
| 3.4 | U.S. national avg equivalized all package sizes (June 2026): **$3.62/g** | `https://www.headset.io/data/cannabis-prices` | PRIMARY-INDUSTRY | ✅ Confirmed 2026-07-22. | (See 3.6 chart.) | **Keep.** This is the apples-to-apples comparand against Maine's OCP-weighted $6.62/g. |
| 3.5 | Maine per cannabispromotions.com 2025: **$8.60/g** | `https://cannabispromotions.com/stats/prices` | AGGREGATOR-CITED | ✅ Confirmed. | Compare Maine $8.60 (aggregator) vs Maine $6.62 (OCP) in a small two-bar group. | **Keep with OCP reconciliation.** The OCP $6.62 is the official Maine figure; $8.60 from the aggregator is helpful as a cross-check but should be labeled. |
| 3.6 | Maine per OCP CY2025: **$6.62/g** | OCP 2025 Annual Report (Maine state government) | PRIMARY-STATE | ✅ Confirmed (this is the Maine-internal anchor; the page is the canonical state source). | **Bar chart is the right visual** — Maine vs single-gram national ($8.94) vs equivalized national ($3.62), captioned with the "Maine weights toward bulk grams" caveat. | **Keep — this is the headline.** |
| 3.7 | Ohio most expensive eighth: **$31.11** (Headset) | `https://www.headset.io/data/cannabis-prices` | PRIMARY-INDUSTRY | ✅ Confirmed 2026-07-22 (Cann.dev OH Monthly Puff cross-references it). | (Same chart as 3.2.) | **Keep.** |
| 3.8 | U.S. wholesale spot Nov 21, 2025: **$2.40/g ($1,087/lb)** | Cannabis Benchmarks weekly report Nov 21, 2025: `https://www.cannabisbenchmarks.com/reports/u-s-cannabis-spot-index-november-21-2025` | PRIMARY-INDUSTRY | ⚠️ **Wholesale spot changes weekly;** the Nov 21, 2025 figure is now ~8 months old as of 2026-07-22. Cannabis Benchmarks publishes a new weekly. The page would benefit from a same-week pull. | None. | **EXCLUDE or refresh.** Either drop or refresh to the most recent Cannabis Benchmarks weekly (the editor should re-pull). This is a wholesale spot number — best paired with the retail averages as a "wholesale-retail margin" visual. |
| 3.9 | (NEW from Headset refresh 2026-07-05) Average discount rate rose **22.8% → 26.0%** YoY (June 2025 → June 2026) | `https://www.headset.io/data/cannabis-prices` | PRIMARY-INDUSTRY | ✅ Confirmed 2026-07-22. | Inline callout stat. | **Add.** Useful one-sentence add to explain why pricing fell in dollars-per-gram while basket spend stayed flat. |
| 3.10 | (NEW from Headset refresh 2026-07-05) Packaged flower fell **5.7% per gram** YoY (June 2025 → June 2026) | `https://www.headset.io/data/cannabis-prices` | PRIMARY-INDUSTRY | ✅ Confirmed. | Inline callout stat. | **Add.** One-sentence add to the pricing narrative. |
| 3.11 | (NEW from Headset refresh 2026-07-05) Average item prices fell in **6 of 9 product categories** YoY | `https://www.headset.io/data/cannabis-prices` | PRIMARY-INDUSTRY | ✅ Confirmed. | None. | **Add** if useful for "compression is broad-based" narrative. |
| 3.12 | (NEW from Cova vendor blog 2026 citing Headset) Pre-rolls overtook flower as fastest-growing category in 2025; **$1.7B → $3.6B (2021→2025, +110%)** | `https://www.covasoftware.com/blog/cannabis-industry-trends` citing Headset + Custom Cones USA | SECONDARY-VENDOR (Cova republishes Headset figure; Cova is a POS vendor) | ⚠️ **Secondary citation.** Headset is primary; Cova republishes it. | None. | **Add only if Cova's role is flagged.** Otherwise cut — the page is for the Maine reader, not a Cova blog summary. |
| 3.13 | (NEW from Cova blog) **15.9% of total Q1 2026 sales = pre-rolls** (Headset) | Cova blog citing Headset | SECONDARY-VENDOR | ⚠️ Secondary. | None. | **Same as 3.12** — keep only if the editor can verify the Q1 2026 figure directly from Headset's quarterly product-mix release (not located in this matrix). |
| 3.14 | (EXCLUDE — primary trail broke) National avg **$8.92/g** cited in earlier versions | Cannabis Benchmarks 2025 via cannabispromotions.com | AGGREGATOR-CITED | N/A | N/A | **Already excluded by the page's current "Pricing data caveats" paragraph.** Do not re-add. |

---

## §4 — Federal regulatory status (federalStatus array)

| # | Claim on page | Best primary URL | Source class | Re-verified 2026-07-22? | Recommended visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|---|
| 4.1 | FDA-approved marijuana products = **Schedule III (effective Apr 22, 2026)** | DEA rescheduling landing: `https://www.dea.gov/marijuana-rescheduling-regulatory-actions`; Federal Register final rule: `https://www.federalregister.gov/documents/2026/04/28/2026-08176/schedules-of-controlled-substances-rescheduling-of-food-and-drug-administration-approved-products` | PRIMARY-FEDERAL | ✅ Confirmed unchanged 2026-07-22. | Tier-list visual: Schedule I (adult-use) → Schedule III (medical + FDA-approved) → Schedule III (all, pending). | **Keep.** |
| 4.2 | State-licensed medical cannabis (incl. Maine MMCP) = **Schedule III (effective Apr 22, 2026)** | (Same as 4.1.) | PRIMARY-FEDERAL | ✅ Confirmed unchanged. | (Same as 4.1.) | **Keep.** This is the row that drives the "Maine MMCP operators can now take ordinary deductions" claim on the page. |
| 4.3 | Adult-use cannabis — all 24 legal states = **Schedule I (unchanged at federal level)** | 21 U.S.C. §812; 21 CFR §1308.11 | PRIMARY-FEDERAL (statutory text) | ✅ Confirmed unchanged. | (Same as 4.1.) | **Keep.** |
| 4.4 | Hemp / CBD / delta-8 THC products = **Federally legal under 0.3% delta-9 THC — changing Nov 12, 2026 to total-THC standard + 0.4 mg/container cap** | CRS report: `https://www.congress.gov/crs-product/IF13136`; Arnold & Porter Dec 2025 advisory: `https://www.arnoldporter.com/en/perspectives/advisories/2025/12/major-changes-to-federal-regulation-of-hemp-derived-products`; CRS confirms "365 days after enactment of P.L. 119-37 (November 12, 2026)" | PRIMARY-FEDERAL (CRS / P.L. 119-37 §781) | ✅ **Re-verified 2026-07-22:** CRS confirms Nov 12, 2026 effective date. **NEW:** as of 2026-07-22, **H.R. 7024, H.R. 7010, and S.** (per CRS) are active legislative efforts to delay the effective date by 2 years. **Page does not currently mention this.** | Timeline graphic: now → Nov 12, 2026 → "or later, pending H.R. 7024 / H.R. 7010 / S. delay bills." | **UPDATE.** The page should note that the Nov 12, 2026 effective date is contested in Congress — there are active delay bills (H.R. 7024, H.R. 7010, plus a Senate companion). Without this, the page risks over-asserting a date that may slip. |
| 4.5 | Broader Schedule I → III rescheduling NPRM = **PENDING — DEA ALJ hearing Jun 29 – Jul 15, 2026** | DEA: `https://www.dea.gov/marijuana-rescheduling-regulatory-actions`; Federal Register notice of hearing: `https://www.federalregister.gov/documents/2026/04/28/2026-08177/schedules-of-controlled-substances-rescheduling-of-marijuana` | PRIMARY-FEDERAL | ⚠️ **HEARING CONCLUDED 2026-07-15.** As of 2026-07-22, the hearing has concluded; DEA Chief ALJ Derek Julius presided; briefs due **August 17, 2026**; the **ALJ has no formal deadline** to issue a recommended decision (per Green Growth CPAs July 2026 summary + cannabislegalizationnews.com). **Page text currently says "PENDING — hearing Jun 29 – Jul 15" — that is now stale; the hearing is over and we are in the post-hearing brief phase.** | Tier-list (4.1) + horizontal timeline: Jun 29 → Jul 15 (hearings concluded) → Aug 17 (briefs due) → TBD (ALJ recommendation) → TBD (DEA Administrator final rule). | **UPDATE REQUIRED.** Rewrite the row to: "PENDING — DEA ALJ hearing concluded Jul 15, 2026; post-hearing briefs due Aug 17, 2026; ALJ has no deadline; DEA Administrator final rule has no deadline." The "Jun 29 – Jul 15" range is no longer accurate as a current-state description. |
| 4.6 | (NEW from re-verification) DEA Chief ALJ presiding: **Derek Julius** | Greengrowth CPAs July 2026 summary: `https://greengrowthcpas.com/dea-hearing-outcome-july-2026-cannabis` | AGGREGATOR-CITED (cannabis CPA firm summary) | ⚠️ Secondary; not yet verified against DEA primary transcript. | None. | **Add as a footnote** if the rewrite mentions the ALJ by name. Otherwise the role alone (no name) is enough. |
| 4.7 | 2018 Farm Bill hemp definition (pre-Section 781) | CRS report IF13136 | PRIMARY-FEDERAL | ✅ Confirmed. | (Same as 4.4 timeline.) | **Keep.** |

---

## §5 — State-by-state context (stateContext array)

The page's `stateContext` table compares Maine to 7 other states. **Most "tax rate" and "estPrice" entries are aggregator-sourced**, and several are either weakly sourced or unsourced. The matrix below flags each row.

| # | State | Adult-use launch | Tax rate claim | Avg retail price claim | Source class | Re-verified 2026-07-22? | Recommended visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|---|---|---|
| 5.1 | **Maine** | Yes (Oct 2020) | "14.0% retail + excise" (post-Jan 1, 2026 tax reset) | $6.62/g (OCP 2025) | PRIMARY-STATE (OCP) + PRIMARY-FEDERAL (P.L. 2025 ch. 388) | ✅ Confirmed. | (Already the highlighted row.) | **Keep.** |
| 5.2 | Massachusetts | Yes (Nov 2018) | "10.75% retail + excise" | "n/a" | AGGREGATOR-CITED (state Cannabis Control Commission tax schedule) | ⚠️ **Massachusetts tax rate** of 10.75% reflects standard MA sales tax + 10.75% excise tier; should verify against MA CCC official excise schedule before publication. | None. | **Flag for verification** — replace "n/a" price with a sourced figure if the editor can locate one. |
| 5.3 | Vermont | Yes (Oct 2022) | "14% excise-based" | "n/a" | AGGREGATOR-CITED (VT Cannabis Control Board) | ⚠️ VT tax structure should be verified against the VT CCB published rule. | None. | **Flag for verification.** |
| 5.4 | Connecticut | Yes (Jan 2023) | "10% retail + 3% gross receipts" | "n/a" | AGGREGATOR-CITED (CT DCP) | ⚠️ Verify against CT DCP published tax rule. | None. | **Flag for verification.** |
| 5.5 | Colorado | Yes (Dec 2012) | "15% retail + 15% excise" | "$5–$8/g typical" | AGGREGATOR-CITED (CO MED) | ⚠️ Price range is a vague estimate — could be tightened against Headset data (Headset 12-market panel does not include CO explicitly, so this may need a different primary). | None. | **Replace "$5–$8/g typical" with Headset state-specific data if available**; otherwise flag as "general market range." |
| 5.6 | California | Yes (Jan 2018) | "15% excise + cultivation tax" | "~$8–$10/g typical" | AGGREGATOR-CITED (CA DCC) | ⚠️ CA's cultivation tax was suspended effective 7/1/2022-2025 then reactivated; verify the current state of the cultivation tax as of 2026. | None. | **Verify CA tax structure against current CA DCC rule.** The "cultivation tax" line is the most-likely-stale element. |
| 5.7 | Illinois | Yes (Jan 2020) | "10% retail + 7% excise" | "$15.80/g (most expensive, per cannabispromotions 2025)" | AGGREGATOR-CITED (cannabispromotions.com 2025) | ✅ Confirmed. | None. | **Keep with attribution.** |
| 5.8 | Michigan | Yes (Dec 2019) | "10% retail + 10% excise" | "$3.80/g (cheapest, per cannabispromotions 2025)" | AGGREGATOR-CITED (cannabispromotions.com 2025) | ✅ Confirmed. | None. | **Keep with attribution.** |
| 5.9 | Massachusetts adult-use 2024 ~$1.5B | "Mature, plateaued; adult-use 2024 ~$1.5B" | AGGREGATOR-CITED (MA CCC annual report; should be retrievable) | ⚠️ **Verify MA 2024 actual against MA CCC annual report.** | None. | **Replace with primary MA CCC figure** if available; otherwise footnote as "per MA CCC press summary, 2024 actual TBD-verify." |

**Visual recommendation for stateContext:** The current 8-row table is the right format. A small horizontal bar chart of "tax rate" across the 8 states (grouping retail + excise) would visually convey "Maine is now on the high end after Jan 1, 2026" — useful since Maine's 14.0% retail + excise is materially higher than MA's 10.75%, MI's 20% combined, IL's 17%, etc.

---

## §6 — Federal arrest / criminal-justice trend (federalArrests array)

| # | Claim on page | Best primary URL | Source class | Re-verified 2026-07-22? | Recommended visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|---|
| 6.1 | 2007: **870,000+ arrests, ~48% of all drug arrests** (all-time peak) | NORML/FBI UCR: `https://norml.org/blog/2024/09/25/fbi-nearly-one-quarter-of-all-drug-related-arrests-are-for-marijuana-possession/` | PRIMARY-FEDERAL (FBI UCR via NORML aggregator) | ✅ Confirmed unchanged. | **Bar chart of arrests by year (2007 → 2022 → 2023)** with the "floor not ceiling" caveat in the caption. This is the strongest single visual on the page. | **Keep.** |
| 6.2 | 2022: **227,108 arrests, ~25% of all drug arrests; 17% of agencies failed to report** | NORML/FBI UCR (same) | PRIMARY-FEDERAL | ✅ Confirmed. | (Same chart as 6.1.) | **Keep with the "under-count" caveat** — explicit that the 17% non-reporting makes this a floor. |
| 6.3 | 2023: **217,150 arrests, 25% of all drug arrests, 84% possession-only** | NORML/FBI UCR (same) | PRIMARY-FEDERAL | ✅ Confirmed. | (Same chart as 6.1.) | **Keep with the "84% possession-only" callout.** The possession-only share is the most policy-relevant data point on this table. |
| 6.4 | FBI methodology change in 2021 — pre-2021 vs post-2021 data is **NOT directly comparable** | NORML/FBI UCR (verbatim caveat) | PRIMARY-FEDERAL | ✅ Confirmed. | Caption on the chart. | **Keep as caption-only caveat.** The page should not draw a trend line across 2007→2023 without this caveat. |
| 6.5 | (NEW) NIJ/BJS study finding legalization "resulted in fewer marijuana related arrests and court cases" | `https://www.ojp.gov/ncjrs/virtual-library/abstracts/measuring-criminal-justice-system-impacts-marijuana-legalization`; `https://nij.ojp.gov/library/publications/measuring-criminal-justice-system-impacts-marijuana-legalization-and` | PRIMARY-FEDERAL (NIJ/BJS-funded research project) | ✅ Confirmed unchanged 2026-07-09. | None. | **Add to the methodology paragraph** as a single sentence: "A 2020-2021 NIJ/BJS-funded study confirms legalization reduces arrest counts (consistent with the 2007→2023 trend)." |
| 6.6 | (EXCLUDE — primary trail broke) Specific dollar cost of legalization enforcement ($X saved per state) | NORML state pages | AGGREGATOR-CITED | N/A | N/A | **Exclude.** NORML state pages do not aggregate a national "cost saved" figure. The page should not invent one. |

---

## §7 — POS / Metrc / technology context (new section the rewrite may add)

The POS_COMPARISON_RESULTS.md audit (2026-07-09, separate scope) is the canonical primary-source matrix for cannabis technology claims. If the rewrite chooses to add a small "industry technology" callout, the following claims are the safest to carry over:

| # | Claim | Best primary URL | Source class | Visual | Exclusion / downgrade flag |
|---|---|---|---|---|---|
| 7.1 | All 7 major cannabis POS vendors (Flowhub, Dutchie, Cova, Treez, Jane, Meadow, MJ Platform) integrate **natively** with Metrc — "native vs not" is not a differentiator | Metrc partner directory: `https://www.metrc.com/how-pos-and-erp-systems-integrate-with-metrc`; each vendor's product page | PRIMARY-INDUSTRY + SECONDARY-VENDOR | None. | **Add** if the rewrite wants to set up why the Metrc narrative belongs in a Maine-specific operational guide, not the national-stats page. If the rewrite stays strictly market-data, omit. |
| 7.2 | Cova is the **only major POS vendor with vendor-published starting pricing** ($349/mo POS + $199/mo ecommerce) | `https://www.covasoftware.com/pricing-us` | PRIMARY-INDUSTRY (vendor-published) | None. | **Cite** if the rewrite wants to make a single one-sentence observation about industry pricing transparency. Otherwise omit. |
| 7.3 | Flowhub publishes a public referral program (**up to $2,000** per converted referral) | `https://www.flowhub.com/referral-terms` (T&Cs last updated Jan 26, 2026) | PRIMARY-INDUSTRY | None. | **Omit from market-stats.astro.** This belongs in the operator-software directory, not a market-data page. |
| 7.4 | G2 is the most-authoritative non-vendor cannabis-POS ranking; Cova 4.6/5 (24 reviews), Meadow 4.9/5 (81 reviews), Flowhub 4.1/5 (5 reviews), Treez 3.3/5 (10 reviews) | `https://www.g2.com/categories/cannabis-pos-systems` | AGGREGATOR-CITED (G2 = independent review aggregator) | None. | **Omit from market-stats.astro.** Belongs in the POS comparison guide. |
| 7.5 | **Maine-specific operator counts by POS vendor are NOT publicly disclosed** | OCP Open Data portal: `https://www.maine.gov/dafs/ocp/open-data` (no per-platform breakdown) | PRIMARY-STATE (verified absent) | None. | **Cite if the rewrite touches POS-vendor Maine data.** This is the most important technology-context claim for a Maine reader: don't publish per-vendor Maine numbers because they are not public. |

---

## §8 — Cross-cutting recommendations

### 8.1 Visual inventory for the rewrite

The current page has a hero image, an inline video, and an answer-capsule, but **no charts or infographics** in the national-context section. The highest-leverage visuals to add (in order of value):

1. **Federal-arrest bar chart** (2007 / 2022 / 2023 with the "floor not ceiling" caption) — single highest-impact visual; tells the strongest story; data is already on the page.
2. **Maine pricing bar chart** ($8.94 single-gram national / $3.62 equivalized national / $6.62 Maine / $3.80 Michigan / $15.80 Illinois) — directly answers the "where does Maine sit" FAQ; data is already on the page.
3. **Federal regulatory status tier-list or timeline graphic** (3 tiers: Schedule III for FDA-approved + state medical / Schedule I for adult-use / hemp pending Nov 12, 2026) — single image, low effort, high information density.
4. **280E cumulative-tax stacked bar** ($15B excess / $12B baseline federal = $27B total since 2018) — data is on the page; visual makes the "excess 280E" framing tangible.
5. **State-context horizontal bar chart** of tax rates across the 8 states — useful to show Maine has moved into the upper-tax tier after Jan 1, 2026.

**Visual artifacts already in the repo that can be reused or extended:**

- `apps/maine-cannabis/public/images/heroes/market-stats.{jpg,webp,avif}` (640w variant also exists) — current hero image; keep as the page hero.
- `apps/maine-cannabis/public/videos/market-stats.mp4` + `market-stats.poster.jpg` — inline video on the page; keep as-is.
- **No existing chart assets** — the rewrite will need to create chart SVGs / images.

### 8.2 Required rewrites in the existing frontmatter arrays

| Frontmatter array | Row(s) to update | Reason |
|---|---|---|
| `nationalMarket` | 1.1 / 1.2 | Already labeled as Statista-via-Flowhub — keep. |
| `nationalMarket` | 1.6 ($149B) | **Cut or downgrade** — primary trail is weak. |
| `nationalJobs` | 2.2 (Leafly 445,800) | Already hedged with "cited via cannabispromotions.com" — keep but consider an explicit footnote that the Leafly 2026 PDF was not located. |
| `nationalJobs` | 2.6 (~800,000 by 2029) | **Cut** — projection with no defensible methodology trail. |
| `nationalPricing` | 3.8 ($2.40/g Nov 21, 2025 wholesale) | **Refresh** — Cannabis Benchmarks publishes weekly; the Nov 21, 2025 figure is 8 months old as of 2026-07-22. Re-pull the latest weekly. |
| `federalStatus` | 4.4 (Hemp Nov 12, 2026) | **Update caption** to mention H.R. 7024 / H.R. 7010 / Senate delay bills. |
| `federalStatus` | 4.5 (broader rescheduling) | **Critical update.** Replace "PENDING — hearing Jun 29 – Jul 15" with "PENDING — DEA ALJ hearing concluded Jul 15, 2026; post-hearing briefs due Aug 17, 2026; ALJ has no deadline; DEA Administrator final rule has no deadline." |
| `stateContext` | 5.5 / 5.6 (CO / CA price) | **Tighten or footnote** — "$5–$8/g typical" and "~$8–$10/g typical" are imprecise. |

### 8.3 Explicit exclusions (claims that should NOT appear on the rewrite)

These are claims that appeared in earlier versions, in third-party summaries, or in the original source pack that the verifier should reject if the editor proposes them:

1. **"National cannabis retail price = $8.92/g"** — replaced by $8.94 Headset primary; the $8.92 figure's Cannabis-Benchmarks-2025 trail is unverified on Cannabis Benchmarks' own pages.
2. **"BDSA's $31.5B is the 2025 actual"** without pairing with Whitney's $29.1–29.6B downward revision — the two are not directly comparable; the page must show both.
3. **"Cannabis industry will have ~800,000 jobs by 2029"** — projection, no methodology trail; cut.
4. **"$149B total U.S. economic contribution"** — derived multiplier from Flowhub; cut or downgrade to a methodology footnote.
5. **"Whitney Economics $2.24B / $27B / $15B as IRS-published actuals"** — these are Whitney estimates, NOT IRS SOI-published actuals (IRS SOI has no cannabis-specific line). Keep but always label as "Whitney estimate."
6. **"FBI UCR 217,150 arrests (2023) as a precise national count"** — it is a FLOOR (17% of agencies failed to report in 2022). The page already correctly labels this; preserve.
7. **"Maine adult-use price = $8.60/g"** without pairing with the OCP $6.62 — the OCP figure is the canonical Maine value.
8. **"Hemp/CBD is changing Nov 12, 2026"** without acknowledging the active H.R. 7024 / H.R. 7010 / Senate delay bills.
9. **"Broader Schedule I → III rescheduling is pending — hearing Jun 29 – Jul 15"** — hearing concluded; rewrite to the post-hearing brief phase.
10. **"Per-vendor Maine operator counts"** (Flowhub serves N Maine dispensaries, etc.) — not publicly disclosed; fabricating would be YMYL-red-zone. This exclusion is already enforced in the existing POS source pack.
11. **"NSDUH 2024 trend vs. 2020 baseline"** — multimode methodology change breaks direct comparability; the 2021+ NSDUH cannot be trended against 2020 or earlier. The page already correctly labels this; preserve.
12. **"Headset's June 2026 figure covers all 24 adult-use states"** — Headset covers 12 markets; the national figure is extrapolated. Preserve the existing caveat.
13. **"Headset's $24.3B (12 mo ending June 2026, 16 markets) is the national total"** — it is a panel, not the national total. Pair with BDSA / Whitney, do not replace.
14. **"Leafly 2026 Jobs Report PDF"** — the PDF was not directly located in the 2026-07-09 source pack or in the 2026-07-22 re-verification. Use 2022 Leafly (428,059, directly canonical) if a primary Leafly number is required.

### 8.4 Page section headings to add or rename

The current page has these TOC sections: `#headline-numbers`, `#multi-year`, `#establishments`, `#medical-program`, `#regional`, `#tax-revenue`, `#product-mix`, `#tax-reset`, `#trends`, `#cite-this`, `#methodology`, `#faq`.

For the national-perspective expansion, the rewrite should:

- Keep one consolidated **"Where Maine sits nationally"** anchor section. The current page distributes this across multiple in-prose paragraphs; consolidating under one H2 would make the source matrix easier to cite and the visuals easier to anchor.
- Add a **"Industry technology & compliance"** section only if the editor wants to bring in POS / Metrc / 280E context (otherwise the existing "Tax regime" and "Federal regulatory status" sections carry the load).

---

## §9 — Verification evidence (re-verification log 2026-07-22)

This matrix was assembled by re-verifying each claim in the 2026-07-09 source pack against primary sources on 2026-07-22. Specific 2026-07-22 re-verification outcomes:

- **DEA ALJ hearing status:** confirmed the hearing ran **June 29 – July 15, 2026**, with a July 3 recess (Greengrowth CPAs July 2026 summary; cannabislegalizationnews.com). Briefs due **August 17, 2026**. ALJ has **no formal deadline**; DEA Administrator final rule has **no formal deadline**. The page's current "PENDING — hearing Jun 29 – Jul 15" wording is stale.
- **Whitney Economics 280E refresh (April 9, 2026):** confirmed unchanged — $2.24B / $27B / $15B figures republished verbatim by Yahoo Finance, Cannabis Law Report, Cannabis Business Times, and Highly Capitalized between April and July 2026.
- **Headset prices page (last updated 2026-07-05):** confirmed unchanged — $8.94 single-gram / $3.62 equivalized / $11.55 Oregon / $31.11 Ohio / 5.7% YoY decline / 22.8%→26.0% discount rate rise.
- **Headset industry statistics page (last updated 2026-07-05):** NEW figure surfaced — $24.3B in sales across 16 tracked US markets (+0.8% YoY for 12 months ending June 2026); unit sales +5.5%; loyalty retention 34.0% / 43.6% top-quartile.
- **Section 781 hemp definition:** confirmed effective date still **November 12, 2026** per CRS report IF13136. NEW: H.R. 7024, H.R. 7010, and a Senate companion bill are active legislative efforts to delay the effective date by 2 years. The page does not currently mention this.
- **NCSL medical / adult-use state counts:** confirmed unchanged (41 comprehensive medical / 24 adult-use + DC + 3 territories).
- **SAMHSA NSDUH 2024:** confirmed unchanged (44.3M / 15.4% past-month; multimode caveat preserved).
- **Statista / Flowhub:** Statista's free page remains paywalled; the $47B / $55.4B projections remain cited-via-Flowhub.
- **cannabispromotions.com:** page header still reads "Last verified: June 29, 2026"; $8.92 / $8.60 / $3.80 / $15.80 figures unchanged.

**No claim in the 2026-07-09 source pack has been invalidated.** The rewrite should preserve the source pack's caveat discipline and apply the 4 updates noted in §8.2.

---

## §10 — Files this matrix is intended to feed

- `apps/maine-cannabis/src/pages/market-stats.astro` (rewrite target)
- `docs/research/market-stats-national-source-pack-2026-07-09.md` (sibling research; do not duplicate — this matrix adds visuals + exclusions + re-verification)
- `docs/research/market-stats-link-audit-2026-07-09.md` (sibling research; this matrix does not duplicate the inbound-link analysis)

End of matrix.

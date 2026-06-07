# Maine Dispensary Guide — Date & Time Audit Report

**Audit date:** 2026-06-07
**Site:** https://mainedispensaryguide.com
**Repo:** /home/steve/maine-dispensary-guide
**App source:** apps/maine-cannabis/src/

## Methodology

1. Scanned 231 source files (.astro, .ts, .json, .md) for date/time string patterns.
   - Found **892 actual date expressions** (892 of 7,752 raw matches were real dates
     vs. noise like "Schedule III" / "OCP" partial matches).
2. Pulled the live site (sitemap, JSON-LD, header/footer) and reconciled frontmatter
   `publishDate` / `modifiedDate` against the live build.
3. Cross-checked all policy/regulatory date claims and count claims against
   authoritative sources:
   - **Federal Register** (91 FR 22714, 91 FR 22778) for Schedule III
   - **Maine Revisor's Office** statute text for 36 M.R.S. §§ 4923, 4924
   - **Maine Legislature** (LD 1840, LD 1897, LD 1654, LD 210, sine die)
   - **Maine Revenue Services GIB 115** (Oct 17, 2025) for excise/sales tax
   - **OCP 2025 Annual Report** (Dec 31, 2025 data) for license counts
   - **OCP 2025 MMCP Annual Report** for caregiver/dispensary counts
   - **OCP Metrc contract letter** (Jan 29, 2026) for contract pricing

---

## TL;DR — Severity Index

| # | Severity | Issue | Files affected |
|---|---|---|---|
| 1 | **CRITICAL** | Excise tax mechanism misrepresented as 10% of wholesale price; actually stayed weight-based with ~33% rate cut | 4 guides + 1 homepage |
| 2 | **CRITICAL** | FAQ page says "14% adult-use cannabis excise tax" — actually the **14% is the retail sales tax**; the excise tax is per-pound | 1 file (faq.astro) |
| 3 | **CRITICAL** | LD 1654 misrepresented as a 30-day payment grace period; actual law is a transfer/return exemption between facilities | 4+ files (operator cost, funding guide, etc.) |
| 4 | **HIGH** | Dispensary count stale by ~12 months ("169 adult-use retailers, 318 active" vs current 180 / 343) | 4 files |
| 5 | **HIGH** | "60% of Maine's 492 municipalities have opted in" — wildly wrong (actual ~6-8%) | 1 file (zoning) |
| 6 | **MEDIUM** | Sun-grown caregiver page references "30-day grace period" (the LD 1654 mislabel) | 1 file |
| 7 | **MEDIUM** | "169 towns" / "15 towns" inconsistencies across homepage, regulations, FAQ | 3 files |
| 8 | **LOW** | 113 pages with sitemap lastmod older than 2026-06-05 (normal content age; not necessarily wrong) | n/a |
| 9 | **LOW** | 24 URLs in sitemap have no lastmod at all (homepage, /about, /blog, etc.) | n/a |

---

## CRITICAL #1 — Excise tax "moved to 10% of wholesale price" — FALSE

**Site claim (5 occurrences):**
> "Effective January 1, 2026, the adult-use cannabis excise tax moved from a per-ounce
> weight-based tax to 10% of the average wholesale price of adult-use cannabis sold by a
> cultivation facility licensee to other licensees."

**What the law actually says** (36 M.R.S. §4923 as amended by P.L. 2025, c. 388, Pt. F, §3;
confirmed by **Maine Revenue Services GIB 115**, Oct 17, 2025; **OCP 2025 Annual Report**,
§7.1, p.16):
- Excise tax **stayed weight-based** (per-pound, per-plant, per-seed).
- Rate was **reduced by one-third** across the board:
  - Cannabis flower: $335/lb → **$223/lb**
  - Cannabis trim: $94/lb → **$63/lb**
  - Immature plants/seedlings: $1.50 → **$1.00 each**
  - Mature plants: $35 → **$23 each**
  - Cannabis seeds: $0.30 → **$0.20 each**
- The **14% number is the retail sales tax** (10% → 14%), enacted in the same
  P.L. 2025, c. 388 budget bill.

Note: A 10% wholesale-price excise tax **was proposed** in earlier bill text
(see 131st Legislature SP 559, and the LD 210 / budget narrative) but the enacted
version kept the per-pound structure. The site has conflated the proposed bill
language with the enacted law.

**Affected files and lines:**

| File | Line | Context |
|---|---|---|
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 12 | FAQ answer — "moved from a per-ounce weight-based tax to 10% of the average wholesale price" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 78 | Cost-calendar table row "Adult-use excise tax moves to 10% of average wholesale price; quarterly payment schedule" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 91 | Body section heading: "The New Excise Tax Base and Cadence" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 157 | Key takeaway list: "The adult-use cannabis excise tax is now 10% of the average wholesale price" |
| `pages/guides/maine-dispensary-costs.astro` | 60 | Intro: "The adult-use excise tax moved to 10% of average wholesale price on a quarterly payment schedule" |
| `pages/guides/maine-cannabis-taxes-2026.astro` | 4 | Sidebar callout: "Operator cost update (2026): The adult-use excise tax moved to 10% of average wholesale price on a quarterly payment schedule" |
| `pages/guides/maine-cannabis-funding-guide.astro` | 8 | Intro: "The adult-use excise tax moved to 10% of average wholesale price on a quarterly payment schedule" |
| `pages/index.astro` | 2270 | Homepage resource card: "Quarterly excise tax, 10% wholesale-price base, 30-day grace period, and the new Metrc contract pricing" |
| `pages/search.astro` | 24 | Search-index excerpt: "Quarterly adult-use excise tax, 10% wholesale-price base, 30-day grace period under LD 1654" |

**Recommended fix (each file):** Replace "10% of average wholesale price" with
"reduced by one-third on a per-pound basis ($335→$223/lb for flower, etc.) under
P.L. 2025, c. 388, Pt. F, §3, effective January 1, 2026." The quarterly cadence
(Jan 1, Apr 30, Jul 31, Oct 31, Jan 31) is also unverified by the actual statute —
the enacted §4924 still says **monthly on the 15th**. The quarterly schedule was in
proposed bill text but the statute as written hasn't been amended to a quarterly
cadence. **The whole operator-cost-update page needs a careful re-write against the
actual statute text** — the proposed-cadence claim may also be wrong.

**Reference URLs:**
- https://legislature.maine.gov/statutes/36/title36sec4923-2.html
- https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/GIB%20115_FINAL_2025_10_17_0.pdf
- https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf

---

## CRITICAL #2 — FAQ page: "14% adult-use cannabis excise tax" — WRONG TAX

**Site claim** (`pages/guides/faq.astro:5`):
> "Maine cannabis operators pay 14% adult-use cannabis excise tax (effective January 1, 2026)"

**Truth:** The 14% is the **retail sales tax** (36 M.R.S. §1811(1)(D)(5), enacted via
P.L. 2025, c. 388, Pt. F). The excise tax (36 M.R.S. §4923) is a per-pound tax that
was reduced by one-third.

This appears in the FAQ and would mislead any operator or researcher who reads it.

**Recommended fix:** Rewrite the answer to something like:
> "Maine cannabis operators pay a per-pound cultivation excise tax (reduced to $223/lb
> for flower, $63/lb for trim, etc., effective Jan 1, 2026 under P.L. 2025, c. 388,
> Pt. F) plus a 14% retail sales tax (also effective Jan 1, 2026, up from 10%).
> Federal income tax applies with IRC §280E restrictions for the adult-use side."

**Reference:** Maine Revenue Services GIB 115, "Adult Use Cannabis Sales Tax Rate
Increased to 14%."

---

## CRITICAL #3 — LD 1654 misrepresented as a 30-day excise tax payment grace period

**Site claim** (multiple files):
> "LD 1654 (P.L. 2025, ch. 504), effective July 29, 2026, adds a 30-day grace period
> for adult-use cultivation excise tax payments before Maine Revenue Services
> late-payment interest and penalties begin to accrue."

**What the law actually does** (per the Maine Legislature's own enacted-law
summary in `legislature.maine.gov/doc/12549`):
> "Public Law 2025, chapter 504 **exempts from the cannabis excise tax the sale or
> transfer of adult use cannabis to a cultivation facility** and **exempts the
> transfer of adult use cannabis to a products manufacturing facility when the adult
> use cannabis is returned to the original cultivation facility in the same form and
> weight within 30 days**."

So the actual LD 1654 / Ch 504 does two things:
1. **Exempts inter-cultivator transfers** from the excise tax (the 30-day condition
   applies to product returns from a products-manufacturing facility back to a
   cultivator, not to late tax payments).
2. The 30-day window is about **product-return eligibility** for the exemption,
   not a tax-payment grace period.

The 120-day payment grace period from the **original** LD 1654 as introduced by
Rep. Boyer (HP 1095) **was replaced by committee amendment** "Ought To Pass As
Amended" — the enacted law does NOT include the payment grace period. The site has
this backwards in at least 8 places.

**Affected files and lines:**

| File | Line | Snippet |
|---|---|---|
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 11 | "LD 1654 (P.L. 2025, ch. 504), effective July 29, 2026, adds a 30-day grace period for missed payments" (FAQ answer) |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 14 | "What is the LD 1654 (P.L. 2025, ch. 504) grace period for missed excise tax payments?" (FAQ question) |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 32 | Page meta description: "30-day grace period under LD 1654" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 83 | Cost-calendar row: "LD 1654 30-day grace period for missed excise tax payments" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 122 | H2: "LD 1654: The 30-Day Grace Period (Effective July 29, 2026)" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 123 | Body: "LD 1654, signed January 11, 2026 as P.L. 2025, ch. 504, adds a 30-day grace period for adult-use cultivation excise tax payments" |
| `pages/guides/maine-cannabis-2026-operator-cost-update.astro` | 159 | Key takeaway: "The 30-day grace period under LD 1654 (P.L. 2025, ch. 504) takes effect July 29, 2026" |
| `pages/guides/maine-cannabis-funding-guide.astro` | 8 | "LD 1654 adds a 30-day grace period" |
| `pages/index.astro` | 2270 | "10% wholesale-price base, 30-day grace period" (homepage) |
| `pages/guides/maine-cannabis-sun-grown-caregiver-150-plants.astro` | 118 | "stacking rules and the 30-day grace period" (uses the phrase as if it were a real cannabis-tax term — possibly conflating with LD 1897 stacking rules) |
| `pages/index.astro` | 2286 | "stacking rules and the 30-day grace period" |
| `pages/search.astro` | 24 | Search excerpt |

**Recommended fix:** Remove all "30-day grace period" language tied to LD 1654 /
Ch 504. The accurate description of LD 1654 / Ch 504 is:
> "LD 1654 (P.L. 2025, ch. 504), effective July 29, 2026, exempts from the
> adult-use cannabis excise tax (1) sales or transfers of adult-use cannabis
> between cultivation facilities, and (2) transfers of adult-use cannabis from a
> products-manufacturing facility back to the original cultivator, if the
> transferred cannabis is returned in the same form and weight within 30 days
> (36 M.R.S. §4923(7))."

The whole `maine-cannabis-2026-operator-cost-update.astro` page needs a major
audit pass — the headline claims (10% wholesale, 30-day grace period, quarterly
cadence) are all wrong or unverified against the actual statute.

**Reference:**
- https://legislature.maine.gov/doc/12549 (enacted-law summary)
- https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1654&snum=132

---

## HIGH #4 — Dispensary counts are stale (~12 months behind)

**Site claim** (4 files, multiple occurrences):
> "318 active establishments: 169 adult-use retailers, 87 cultivators, 43 product
> manufacturers, 7 testing facilities, and 12 transporter licenses."

**Authoritative count** (OCP 2025 Annual Report, data as of Dec 31, 2025,
published 2026):

| License type | Site claim | Actual (12/31/2025) | Direction |
|---|---|---|---|
| Active Cannabis Retail Stores | 169 | **180** | Stale low |
| Active Cultivation Facilities | 87 | **78** | Stale high |
| Active Products Manufacturing | 43 | **81** | Stale low |
| Active Testing Facilities | 7 | **4** | Stale high |
| Transporters / Couriers | 12 | n/a (no longer separate license type) | Outdated category |
| **Total active** | **318** | **343** (plus 22 conditional + 52 pending) | Stale low |

The 169/87/43/7/12 = 318 breakdown **does not exactly match any OCP public snapshot
I've located**. The closest match is the **2024 year-end** count (169 retailers,
87 cultivators, 33 manufacturing, 4 testing = 293). The site appears to have
taken mid-2024 data and added a small number for "transporters" that are no longer
a distinct license type. The OCP removed the standalone transporter license
type at some point and folded delivery into retailer/manufacturer rules.

**Affected files and lines:**

| File | Line | Snippet |
|---|---|---|
| `pages/market-stats.astro` | 8 | "169 adult-use retail licenses... 169 retail dispensary licenses. Total licensed establishments (all types) exceeds 330 per OCP." |
| `pages/market-stats.astro` | 22 | FAQ answer: "$513 million in 2024 ($269M medical + $244M adult-use)... 169 licensed retail dispensaries" |
| `pages/market-stats.astro` | 206 | "The 169 adult-use retail stores (OCP 2026, down from 179 at... )" |
| `pages/blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro` | 17 | "1,554 licensed caregivers" — actual 2025: **1,539** |
| `pages/blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro` | 29 | "Maine's OCP regulates 318 licensed establishments" |
| `pages/blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro` | 41 | "As of April 2026, the OCP's public roster counts 318 active establishments: 169 adult-use retailers, 87 cultivators, 43 product manufacturers, 7 testing facilities, and 12 transporter licenses" |
| `pages/blog/maine-cannabis-gray-market-ocp-enforcement-2026.astro` | 66 | "318 active adult-use and medical establishments" |
| `pages/guides/maine-cannabis-market.astro` | 16 | "169 adult-use retail dispensary licenses (OCP, 2026)" |
| `pages/guides/maine-ocp-license-map.astro` | 42 | "As of April 2026, Maine has approximately 318 active licensed cannabis establishments across all types: 169 adult-use retailers, 87 cultivators, 43 manufacturers, 7 testing facilities, and 12 couriers" |

**Recommended fix:** Update all four files to use the OCP 2025 Annual Report
numbers: 180 active retail stores, 78 cultivation, 81 manufacturing, 4 testing,
343 total active. Drop the "transporter" category (no longer a distinct license).
Add the 22 conditional and 52 pending counts to the OCP license map for accuracy.
Date-stamp the "as of" to **December 31, 2025** (or later when the OCP 2026
mid-year update is available).

**Reference:** https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf

---

## HIGH #5 — "60% of Maine's 492 municipalities have opted in" — wildly wrong

**Site claim** (`pages/guides/maine-cannabis-zoning-requirements.astro:131`):
> "As of 2026, approximately 60% of Maine's 492 municipalities have opted in to
> adult-use cannabis retail."

**Truth:** The OCP's official Adult Use Opt-in Communities page exists, and the
site's own opt-in tracker lists about 30 opt-in towns. Maine has ~500 municipalities
(total varies 487–500 depending on count). **30 of ~500 = ~6%**, not 60%.

Other places on the same site say:
- `pages/guides/maine-cannabis-regulations.astro:115`: "about 15 of Maine's 500+
  municipalities allow adult-use cannabis retail" (too low; actual is ~30)
- `pages/guides/maine-cannabis-market.astro`: claims "15 Maine municipalities"
- `pages/index.astro:11` (homepage FAQ): "15 towns have opted in to adult-use
  retail as of 2026"
- `pages/blog/maine-dispensary-how-to-open.astro:312`: "Only 15 Maine
  municipalities have opted in"
- `pages/guides/maine-cannabis-opt-in-tracker.astro`: the actual tracker lists
  ~30+ opt-in towns (data is from April 2026)

**Internal site inconsistency:** the "60%" claim contradicts the rest of the site
("15 towns", the tracker's ~30 listed). The opt-in tracker is the closest to
accurate. The "15 towns" figure is also stale (actual is closer to 30+ in 2026).

**Recommended fix:** Replace the "60%" claim with the actual count. Use the
opt-in tracker as the source of truth (~30 of ~500 = ~6% as of April 2026, per
the site itself). Also align the "15 towns" claim with the tracker (or note
that count is from a 2024 snapshot).

**Reference:**
- https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities
- https://mainedispensaryguide.com/guides/maine-cannabis-opt-in-tracker

---

## MEDIUM #6 — "stacking rules and the 30-day grace period" on caregiver pages

**Site claim** (`pages/guides/maine-cannabis-sun-grown-caregiver-150-plants.astro:118`
and `pages/index.astro:2286`):
> "Outdoor caregivers: 150 mature plants or 2,500 sq ft of canopy, with stacking
> rules and the 30-day grace period"

The LD 1897 stacking rules are real (you can't stack the 150-plant track on top
of the 30-plant track). But the "30-day grace period" appears to be a
copy-paste from the LD 1654 / 30-day-return-window confusion — it doesn't apply
to the caregiver cultivation track at all. The phrase is misleading even if
parsed charitably.

**Recommended fix:** Remove "and the 30-day grace period" from the caregiver
150-plant homepage card and the sun-grown page where it appears as an aside.
If a grace period for caregivers is intended, it should be sourced and stated
explicitly (LD 1654's 30-day window is for product returns between cultivation
and manufacturing facilities, not for caregiver payments).

---

## MEDIUM #7 — Internal inconsistency: "15 towns" vs "60%"

Same root cause as #5. The "15 towns" figure appears in:
- `pages/index.astro:11` (homepage FAQ)
- `pages/blog/maine-dispensary-how-to-open.astro:312`
- `pages/guides/maine-cannabis-regulations.astro:115`

While the actual opt-in tracker shows ~30. This is a self-contradiction on the
site that hurts trust. The "15" is plausible as a late-2024 / early-2025 count
but should be updated to the 2026 number.

**Recommended fix:** Pull the "15" claims and align with the opt-in tracker.

---

## LOW #8 — Sitemap lastmod age distribution (not a content error, just an observation)

The site has been through several content sprints. Sitemap lastmod distribution:

| Lastmod | Pages | Note |
|---|---|---|
| 2026-06-07 | 24 | Today (likely the most recent deploy) |
| 2026-06-06 | 16 | Yesterday |
| 2026-06-05 | 27 | Recent edits |
| 2026-05-30 | 7 | |
| 2026-05-14 | 11 | |
| 2026-05-13 | 39 | Major city-guide batch |
| 2026-04-25 | 2 | |
| 2026-04-21 | 5 | |
| 2026-04-20 | 8 | |
| 2026-04-19 | 17 | |
| 2026-04-18 | 4 | |
| 2026-04-14 | 8 | |
| 2026-04-04 | 11 | |
| 2026-03-20 | 1 | (maine-cannabis-real-estate) |

113 of 180 pages with lastmod are > 2 days old. This is **content age, not
content error** — but the `maine-cannabis-real-estate.astro` page is the oldest
in the sitemap and worth a quick check next time it gets a pass.

## LOW #9 — 24 sitemap URLs have no lastmod

The following pages have no `<lastmod>` in the sitemap:
- `/` (homepage)
- `/about`, `/affiliate-disclosure`, `/all-guides`, `/blog`, `/contact`
- `/directory`, `/download-checklist`, `/find-a-dispensary`
- `/founders`, `/founders/maine-cannabis-founder-coastal-shop`, `/founders/maine-cannabis-founder-portland-flagship`, `/founders/maine-cannabis-founder-rural-cultivator`
- `/glossary`, `/guides` (index), `/launch-checklist`, `/market-stats`
- `/privacy`, `/resources`, `/resources/maine-cannabis-education`, `/resources/maine-cannabis-official-resources`
- `/roi-calculator`, `/site-health`, `/start-here`

The Astro sitemap integration only emits `<lastmod>` when the file has a
`publishDate` or `modifiedDate` in frontmatter. These pages either have no
frontmatter or none with a date. **This is fine** — Google treats missing
lastmod the same as "unknown" — but you may want to add a `modifiedDate` to
the homepage and the founders/blog indexes for SEO benefit.

---

## VERIFIED CORRECT — major findings

These are accurate and well-sourced on the site:

✅ **Schedule III** (pages/guides/maine-cannabis-schedule-iii-dual-license-280e.astro):
- April 28, 2026 effective date of AG Order 6754-2026, 91 FR 22714 — **CORRECT**
- June 27, 2026 expedited DEA registration deadline (60 days from publication) — **CORRECT**
- June 29, 2026 DEA rescheduling hearing, AG Order 6753-2026, 91 FR 22778 — **CORRECT**
- July 15, 2026 hearing end — **CORRECT** per Federal Register notice

✅ **LD 1840** (P.L. 2025, ch. 512): Signed Jan 11, 2026; effective July 29, 2026
(90 days after April 29 sine die of 132nd 2nd Reg Session) — **CORRECT** in
`maine-cannabis-caregiver-trade-show-sales.astro`

✅ **LD 1897** (P.L. 2025, ch. 514): Signed Jan 11, 2026; effective July 29, 2026;
creates sun-grown caregiver tier with 150 mature plant / 2,500 sq ft canopy
caps — **CORRECT** in `maine-cannabis-sun-grown-caregiver-150-plants.astro`
(numbers match the actual statute text 22 M.R.S. §2423-A(2)(B-1))

✅ **Metrc contract** (maine-cannabis-2026-operator-cost-update.astro + OCP letter):
- Feb 4, 2026 contract effective — **CORRECT**
- May 1, 2026 price increase — **CORRECT**
- New prices ($45/mo, $0.26 pkg, $0.46 plant, etc.) — **CORRECT**
- 12.5% user-fee increase, 4.0% package, 2.2% plant — **CORRECT** (matches OCP letter)

✅ **Maine 132nd Legislature 2nd Regular Session**: Adjourned sine die
Wednesday, April 29, 2026; general effective date for non-emergency laws is
**Wednesday, July 29, 2026** — **CORRECT** in all references

✅ **Adult-use 14% sales tax** (Jan 1, 2026): Correct in pages that say "retail
sales tax" or "14% retail sales tax" — the error is only when conflated with
the excise tax.

✅ **OCP 2025 sales**: $246,423,512 in adult-use sales across 4,835,682
transactions — matches the OCP 2025 Annual Report. Site's "$246M" and "4.83
Million transactions" are both correct (slight rounding).

✅ **Medical caregivers**: Site's "1,554 caregivers" in the gray-market post is
slightly off the actual 1,539 (2025) / 1,677 (2024) — but it's close enough
that it might be sourced from a different snapshot. Worth a small footnote.

---

## RECOMMENDED FIX PRIORITY (most-leverage first)

1. **`pages/guides/maine-cannabis-2026-operator-cost-update.astro`** — full
   re-write of excise tax mechanism (CRITICAL #1), grace period claim
   (CRITICAL #3), and quarterly cadence claim. This page is the homepage
   resource link, the funding-guide reference, and the search index excerpt.
   Fixing it fixes 5+ cross-references.

2. **`pages/guides/faq.astro` line 5** — single sentence fix; change "14%
   adult-use cannabis excise tax" to "14% adult-use cannabis retail sales tax
   (and a per-pound cultivation excise tax of $223/lb for flower, $63/lb for
   trim, etc.)" — 1-minute fix, high visibility.

3. **Dispensary count updates** — touch 4 files (market-stats.astro,
   maine-cannabis-market.astro, maine-ocp-license-map.astro,
   maine-cannabis-gray-market-ocp-enforcement-2026.astro) to use the OCP
   2025 Annual Report numbers. ~15-minute fix.

4. **"60% of Maine's 492 municipalities"** — single paragraph fix in
   `maine-cannabis-zoning-requirements.astro:131`. ~2-minute fix.

5. **"15 towns" claims** — touch 3 files to align with the opt-in tracker
   (~30 as of 2026). ~10-minute fix.

6. **Sun-grown caregiver "30-day grace period" aside** — remove from
   `maine-cannabis-sun-grown-caregiver-150-plants.astro:118` and
   `index.astro:2286`. ~2-minute fix.

Total estimated work: 1-2 hours, single PR, no schema regressions.

---

## APPENDIX — Other date strings reviewed (no errors found)

- All `last-updated` / `Published` / `last updated` strings on blog posts and
  guides are internally consistent with the file's `modifiedDate` frontmatter
  and the live sitemap lastmod.
- 0 pages have `modifiedDate` in the future.
- 0 pages have `modifiedDate` before `publishDate` (an internal consistency
  error that would have indicated a bad date edit).
- The site's `v1.0.6` version string in the footer is hardcoded — fine, no
  date claims.
- The footer `currentYear` uses `new Date().getFullYear()` at build time —
  will auto-correct on next build.
- Privacy page "Last Updated: March 23, 2026" and Affiliate Disclosure
  "Last Updated: June 7, 2026" — both internally consistent.
- `pages/founders/index.astro:120` "Last updated: March 2026" — internally
  consistent with the founders pages' frontmatter.
- The `LD 1840 / LD 1897 / LD 210 / LD 1654` chapter numbers (512, 514, 388,
  504) all match the official Maine Legislature records.
- All 7,752 date-pattern matches were categorized:
  - 463 ISO dates (mostly in `lastmod` / `publishDate` and Metrc timeline)
  - 269 month-day-year
  - 156 month-year only
  - 3 US slash dates
  - 1 copyright symbol

---

## SOURCES (canonical references for fix verification)

- **OCP 2025 AUCP Annual Report** (Dec 31, 2025 data, 2026 publication):
  https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20AUCP%20Annual%20Report.pdf
- **OCP 2025 MMCP Annual Report**:
  https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/2025%20MMCP%20Annual%20Report.pdf
- **MRS General Information Bulletin 115** (Oct 17, 2025):
  https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/GIB%20115_FINAL_2025_10_17_0.pdf
- **Federal Register 91 FR 22714** (Schedule III Final Rule, Apr 28, 2026):
  https://www.govinfo.gov/content/pkg/FR-2026-04-28/html/2026-08176.htm
- **DOJ press release** (Apr 23, 2026):
  https://www.justice.gov/opa/pr/justice-department-places-fda-approved-marijuana-products-and-products-containing-marijuana
- **Maine Revisor §4923** (excise tax):
  https://legislature.maine.gov/statutes/36/title36sec4923-2.html
- **Maine Revisor §4924** (returns / payment):
  https://legislature.maine.gov/statutes/36/title36sec4924.html
- **Maine Legislature 132nd session** (sine die, effective dates):
  https://legislature.maine.gov/
- **LD 1840** (P.L. 2025, ch. 512):
  https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1840&snum=132
- **LD 1897** (P.L. 2025, ch. 514):
  https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1897&snum=132
- **LD 1654** (P.L. 2025, ch. 504):
  https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1654&snum=132
- **LD 210** (P.L. 2025, ch. 388, the budget bill):
  https://legislature.maine.gov/legis/bills/display_ps.asp?LD=210&snum=132
- **Enacted-law summary** (Maine Legislature's own bill digest):
  https://legislature.maine.gov/doc/12549
- **OCP Metrc contract letter** (Jan 29, 2026):
  https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/An%20Update%20from%20OCP%20on%20the%20Adult%20Use%20Cannabis%20Inventory%20Tracking%20System%20Contract.pdf
- **OCP Adult Use Opt-in Communities**:
  https://www.maine.gov/dafs/ocp/open-data/adult-use/opt-in-communities
- **OCP Open Data (licensee search)**:
  http://www.maine.gov/dafs/ocp/open-data/adult-use/licensee-search

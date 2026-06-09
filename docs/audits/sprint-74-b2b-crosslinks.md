# Sprint 74 B2B Guide Cluster — Cross-Link & Discoverability Audit

**Audit date:** 2026-06-09
**Auditor:** mdg-worker agent
**Sprint 74 cluster:** 4 Tier 1 B2B guides on Schedule III, LD 1840, LD 1897, and 2026 excise tax (commit `764a2c8`)

---

## 1. RelatedArticles Component Registration

**Status: ✅ PRESENT**

All 4 guides are registered in `packages/ui/src/components/RelatedArticles.astro` at lines 67-70 (added in Sprint 74 audit pass 2, commit `c6ba913`):

| Guide | Section | Topics | RelatedArticles Entry |
|---|---|---|---|
| Dual-License 280E: Schedule III Apportionment | Compliance | `["finance","tax","compliance","business"]` | Line 67 |
| Caregiver Trade Show Sales (LD 1840) | Compliance | `["compliance","licensing","events","business"]` | Line 68 |
| Sun-Grown Caregiver 150-Plant Cultivation (LD 1897) | Compliance | `["compliance","licensing","cultivation","business"]` | Line 69 |
| 2026 Operator Cost Update (Excise & Metrc) | Finance | `["finance","tax","compliance","operations"]` | Line 70 |

The auto-sidebar scoring function (`calculateScore`) matches on `currentTopics` overlap, so pages with matching topic tags will surface these guides. Verified: topic overlap works for finance, tax, compliance, licensing, cultivation, events, operations, and business tags.

**Recommendation:** None needed — registration is complete and tags are rich (3-4 tags each).

---

## 2. External Pages Linking to the Sprint 74 Cluster

**Status: 🟡 12 INBOUND — GOOD COVERAGE**

Inbound cross-links from the Sprint 74 audit cross-linking pass (commit `d678862`):

| Source Page | Schedule III | LD 1840 | LD 1897 | Operator Cost |
|---|---|---|---|---|
| `index.astro` (homepage) | ✅ | ✅ | ✅ | ✅ |
| `roi-calculator.astro` | ✅ | — | — | ✅ |
| `search.astro` (search index) | ✅ | ✅ | ✅ | ✅ |
| `start-here.astro` | ✅ | ✅ | ✅ | ✅ |
| `launch-checklist.astro` | ✅ | ✅ | ✅ | ✅ |
| `maine-cannabis-regulations.astro` | ✅ | ✅ | ✅ | ✅ |
| `maine-cannabis-taxes-2026.astro` | ✅ | — | — | ✅ |
| `maine-cannabis-caregiver-guide.astro` | — | ✅ | ✅ | — |
| `maine-cannabis-cultivation-guide.astro` | — | — | ✅ | — |
| `maine-cannabis-events-2026.astro` | — | ✅ | — | — |
| `maine-dispensary-license.astro` | ✅ | — | — | ✅ |
| `maine-cannabis-funding-guide.astro` | ✅ | — | — | ✅ |
| `maine-dispensary-costs.astro` | — | — | — | ✅ |

**Net incoming links per guide:**
- Schedule III: **10** (5 existing guides + 5 top-level pages)
- LD 1840: **8** (4 existing guides + 4 top-level pages)
- LD 1897: **9** (5 existing guides + 4 top-level pages)
- Operator Cost Update: **10** (5 existing guides + 5 top-level pages)

---

## 3. CROSS-LINKS BETWEEN THE 4 GUIDES (The Gap)

**Status: ❌ ZERO HYPERLINKS — CRITICAL GAP**

There are **no hyperlinks between the 4 Sprint 74 guides themselves**. Each guide exists in content isolation:

| From → To | Schedule III | LD 1840 | LD 1897 | Operator Cost |
|---|---|---|---|---|
| Schedule III | — | ❌ | ❌ | ❌ |
| LD 1840 | ❌ | — | ❌ | ❌ |
| LD 1897 | ❌ (text ref, no link) | ❌ | — | ❌ |
| Operator Cost | ❌ | ❌ | ❌ | — |

**Details:**
- `maine-cannabis-schedule-iii-dual-license-280e.astro`: No links to other 3 guides (188 lines reviewed)
- `maine-cannabis-caregiver-trade-show-sales.astro`: No links to other 3 guides (149 lines reviewed)
- `maine-cannabis-sun-grown-caregiver-150-plants.astro`: Has a text reference to Schedule III guide in the "April 28, 2026 federal angle" Callout (lines 125-127: "See our Maine Dual-License 280E Schedule III Apportionment Guide") but **no `<a>` hyperlink** (146 lines reviewed)
- `maine-cannabis-2026-operator-cost-update.astro`: FAQ #9 references Schedule III reclassification but **no hyperlink** (181 lines reviewed)

**Impact:** Google's topic clustering signals rely heavily on internal link topology. Four guides on related B2B regulatory topics with zero inter-links are treated as isolated pages rather than a topical cluster. This reduces the cluster's collective authority on the B2B regulatory topic.

**Recommended cross-links to add:**

| Source Guide | Target Guide | Rationale | Location |
|---|---|---|---|
| Schedule III → | Operator Cost Update | 2026 cost implications of 280E apportionment, Metrc fees, excise tax | After "action items" timeline |
| Schedule III → | LD 1840 | Medical caregiver trade show sales are Schedule III-eligible under the DOJ order | After "key takeaways" |
| LD 1840 → | LD 1897 | Caregivers with 150-plant outdoor sites have more product to sell at trade shows | After "strategic considerations" |
| LD 1840 → | Schedule III | Schedule III tax treatment affects caregiver trade show revenue reporting | After "what stays illegal" |
| LD 1897 → | LD 1840 | Sun-grown caregivers can sell trade show product (LD 1840) | After "operational considerations" |
| LD 1897 → | Operator Cost Update | Cost implications of larger cultivation footprint, Metrc tags | After "registration workflow" |
| Operator Cost Update → | Schedule III | Federal tax treatment change affects cost modeling | After "cash flow modeling" |

---

## 4. llms.txt / llms-full.txt AI Discoverability

**Status: ✅ ALL 4 GUIDES PRESENT**

Verified in both files:

**`public/llms.txt`:**
- Line 89: `- [Maine Cannabis 2026 Operator Cost Update](...)` ✅
- Line 93: `- [Maine Cannabis Caregiver Trade Show Sales](...)` ✅
- Line 110: `- [Maine Cannabis Schedule Iii Dual License 280e](...)` ✅
- Line 114: `- [Maine Cannabis Sun Grown Caregiver 150 Plants](...)` ✅

**`public/llms-full.txt`:**
- Lines 22-23: Operator Cost Update (URL + source path) ✅
- Lines 27-28: Caregiver Trade Show Sales (URL + source path) ✅
- Lines 32-33: Schedule III Dual License (URL + source path) ✅
- Lines 37-38: Sun-Grown Caregiver (URL + source path) ✅

Added in Sprint 74 audit pass 5 (`regenerate-llms.cjs` + hand-update of `llms-full.txt`).

---

## 5. Summary

| Dimension | Status | Notes |
|---|---|---|
| RelatedArticles registration | ✅ | 4/4 guides, 3-4 topic tags each |
| External cross-links (inbound) | 🟡 | 8-10 links per guide, good coverage |
| Internal cluster cross-links | ❌ | Zero hyperlinks between the 4 guides |
| llms.txt AI discoverability | ✅ | Both `llms.txt` and `llms-full.txt` |
| Topic-tag richness | ✅ | 3-4 tags per guide; finance, tax, compliance, licensing, cultivation, events, operations, business all covered |
| Section grouping | 🟡 | 3 in "Compliance", 1 in "Finance" — logical split but could benefit from a "2026 Regulatory" category |

**Priority fix:** Add 7 inter-cluster cross-links (see table in §3). Estimated effort: ~30 minutes including typecheck and build verification.

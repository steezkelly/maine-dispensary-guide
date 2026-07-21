# YMYL E-E-A-T Audit — 2026-07-21

**Card:** MDG-WORKFLOW-2026-07-21-YMYL-EEAT (operator-gated, READ-ONLY)
**Author:** Codex (opus-ymyl-audit)
**Date:** 2026-07-21
**base_sha:** a71727b9
**Branch:** feat/ymyl-eeat-audit-2026-07-21
**Worktree:** /home/steve/.cache/mdg-ymyl-eeat-audit
**Status:** Draft — implementation blocked on the three operator decisions in §Operator decisions required.

This audit records the *current* E-E-A-T state of the five underperforming YMYL
pages. It does NOT alter any Astro file body, does NOT push any branch, does NOT
create a reviewer schema, and does NOT modify `CiteThis.astro` or
`AutoRelated.astro`. The implementation card is a separate operator-gated
ticket and will not start until each decision in §Operator decisions required
is signed off.

---

## Scope

Per the parent card contract, this audit covers exactly five YMYL pages. The
28-day Google Search Console window used for the prioritization rationale is
**2026-06-20 → 2026-07-18** (GSC data via OpenSEO project
`4b687621-d649-420a-9e3a-7af5a9354297`). The numbers below are taken verbatim
from the card contract and were not re-pulled — per the card's "DO NOT invent
GSC data" rule.

| Page | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| /guides/maine-cannabis-edibles-compliance | 11 | 810 | 1.4% | 7.0 |
| /guides/maine-cannabis-taxes-2026 | 7 | 493 | 1.4% | 8.6 |
| /blog/best-maine-edibles-2026 | 20 | 362 | 5.5% | 7.3 |
| /blog/maine-psilocybin-2026-guide | 15 | 583 | 2.6% | 5.5 |
| /guides/maine-cannabis-staffing-licensing | 17 | 371 | 4.6% | 9.6 |

All five are YMYL by content class: health (edibles, psilocybin), legal
(licensing, staffing), and tax (taxes-2026). All five currently underperform
on CTR against position — the diagnostic pattern from the 2026-07-21 Reddit
synthesis (`~/.hermes/cache/seo-reddit/2026-07-21-mdg-gap-analysis.md`,
Finding 4).

### Methodology

For each page I read:

1. The full Astro file body under
   `apps/maine-cannabis/src/pages/{guides,blog}/<slug>.astro`.
2. The `const article = { ... }` frontmatter block (author, reviewer,
   `modifiedDate`).
3. Every `href="https://..."` on outbound `<a>` tags inside the file body. I
   counted *unique* primary-source URLs only — internal links
   (`/about/*`, `/guides/*`, `/blog/*`, `/find-a-dispensary`, etc.) do not
   qualify as primary sources for YMYL purposes.
4. Whether `CiteThis.astro` is imported and whether the file body contains any
   `<cite>` or `<CiteThis>` invocations.
5. The `Last reviewed` date in the trailing verification badge (where
   present) — for cross-checking against `modifiedDate`.
6. `apps/maine-cannabis/src/data/authors.json` to verify that the named
   `author`/`reviewer` strings actually resolve to JSON-defined bios, and to
   flag whether each is a third-party attestation or a publisher-managed
   pseudonym.

"Primary source" was scored narrowly for this audit — outbound `<a>` links
pointing at a government domain (maine.gov, legislature.maine.gov,
federalregister.gov, doj/irs/doi), a peer-reviewed venue (PubMed, DOI, NEJM,
The Lancet), or a regulatory rule PDF hosted on a state/federal domain.
Statutory citations present only in plain-text body copy (e.g. "36 M.R.S.
§4923", "LD 1654", "IRC §280E") were noted separately and are flagged as
needing a wire-up to the linked source, but were NOT counted toward the
hyperlinked primary-source count.

---

## Per-page findings

### 1. /guides/maine-cannabis-edibles-compliance

| Field | Value |
|---|---|
| Frontmatter `article.author` | "Calvin Waters" (Licensing & Compliance Analyst) |
| Frontmatter `article.reviewer` | "Margaret Finch" (Finance & Taxation Analyst, `id: "margaret-finch"`) — wired inline |
| `CiteThis` wired? | **No.** Neither imported nor invoked in the body. 0 `<cite>` / `<CiteThis>` matches. |
| Primary-source citations (outbound links) | **9 unique URLs.** Sample: `https://legislature.maine.gov/statutes/28-b/title28-Bsec703.html` (Title 28-B §703); also includes both the current `18-691 CMR Ch 40 Final.pdf` and the 2026 public-comment draft, plus OCP guidance PDFs. |
| `dateModified` | "2026-07-21" — **0 days old** (matches today). |
| In-text statute/rule citations present | Title 28-B §701, §703(1)(F); LD 1846; P.L. 2025 — present in body copy, several are wired as outbound links above. |
| `Last reviewed` (badge) | 2026-07-16 (Calvin Waters + Margaret Finch) |
| **Verdict** | **NEEDS-OPERATOR-DECISION** — author + reviewer are publisher-managed pseudonyms (see `authors.json` lines 28, 52). All ten E-E-A-T mechanics *exist* in the page (named bylines, primary-source rule links, fresh dateModified, on-page review attribution); the open question is whether the *publisher-managed pseudonym* disclosure is acceptable to the operator, or whether each YMYL claim needs a third-party CPA/attractor/clinician attestation per the Reddit playbook below. |

### 2. /guides/maine-cannabis-taxes-2026

| Field | Value |
|---|---|
| Frontmatter `article.author` | "Margaret Finch" (Finance & Taxation Analyst) |
| Frontmatter `article.reviewer` | "Calvin Waters" (Licensing & Compliance Analyst, `id: "calvin-waters"`) — wired inline |
| `CiteThis` wired? | **No.** 0 matches. |
| Primary-source citations (outbound links) | **1 unique URL.** Sample: `https://www.maine.gov/revenue/` (Maine Revenue Services) — present in the disclosure block and a filing section link. The page *cites* 36 M.R.S. §4923, IRC §280E, IRC §263A, AG Order 6754-2026, 91 FR 22714, LD 1654, P.L. 2025 ch. 504 in body copy but **none are outbound hyperlinks**. |
| `dateModified` | "2026-06-05" — **46 days old** (within 90 days). |
| `Last reviewed` (badge) | 2026-07-06 (Calvin Waters + Margaret Finch) |
| **Verdict** | **NEEDS-OPERATOR-DECISION** — strong frontmatter (named reviewer, named author, fresh date) but the E-E-A-T *citation density* is the weakest of the five. A YMYL tax page that names IRC §280E and cites AG Order 6754-2026 with no outbound link to those primary sources is exactly the pattern the Reddit playbook warns about. |

### 3. /blog/best-maine-edibles-2026

| Field | Value |
|---|---|
| Frontmatter `article.author` | "Eliot Nash" (Market & Real Estate Analyst) — wired inline |
| Frontmatter `article.reviewer` | **MISSING from `article` object.** The file imports a `complianceReviewer` (Thalia Greene) at the top (`const complianceReviewer = authors.find(a => a.id === 'thalia-greene')`) and renders the review byline in the body ("Reviewed by Thalia Greene, Cultivation & Horticulture Reviewer"), but the `reviewer` field is NOT attached to the `article` constant. |
| `CiteThis` wired? | **No.** 0 matches. |
| Primary-source citations (outbound links) | **2 unique URLs.** Sample: `https://www.maine.gov/dafs/ocp/sites/maine.gov.dafs.ocp/files/inline-files/OCP%20Guidance%20for%20Mandatory%20Testing%20of%20Adult%20Use%20Edibles%20April%202026.pdf` (OCP April 2026 mandatory-testing guidance) and `https://legislature.maine.gov/backend/App/services/getDocument.aspx?documentId=124398`. Body copy cites Title 28-B §703, Title 22, 18-691 CMR ch., P.L. 2025 ch. 764 with no outbound link. |
| `dateModified` | "2026-07-16" — **5 days old**. |
| `Last reviewed` (badge) | 2026-07-16 (Calvin Waters + Margaret Finch) — note the **mismatch**: the on-page review badge names Calvin Waters + Margaret Finch, while the body byline names Eliot Nash + Thalia Greene. |
| **Verdict** | **FAIL** — three independent E-E-A-T defects in one file: (a) `reviewer` field missing from the `article` frontmatter, (b) mismatch between the body byline reviewer (Thalia Greene) and the trailing verification badge reviewers (Calvin Waters + Margaret Finch), (c) `modifiedDate` is already inside the 90-day window but still references "Last reviewed 2026-07-16" using the older byline pair. Implementation card must reconcile the byline vs. badge reviewer pair before push. |

### 4. /blog/maine-psilocybin-2026-guide

| Field | Value |
|---|---|
| Frontmatter `article.author` | "Margaret Finch" (Finance & Taxation Analyst) |
| Frontmatter `article.reviewer` | Wired conditionally via `complianceReviewer = authors.find(a => a.id === 'calvin-waters')` — resolves to Calvin Waters. Note this reviewer attribution is unusual for a psilocybin guide (Licensing & Compliance Analyst rather than a psychedelics researcher or psychiatrist). |
| `CiteThis` wired? | **No.** 0 matches. |
| Primary-source citations (outbound links) | **0 unique primary-source URLs.** The page references LD 1034, the Apr 18 2026 federal EO, 17-A M.R.S. § 1102, and the state commission in body copy, but **none are outbound hyperlinks**. |
| `dateModified` | "2026-06-07" — **44 days old** (within 90 days). |
| `Last reviewed` (badge) | 2026-07-06 (Calvin Waters + Margaret Finch) |
| **Verdict** | **FAIL** — strongest content-blocking verdict in the audit. A YMYL page about a controlled substance that names "LD 1034" and "17-A M.R.S. § 1102" in copy without any outbound links to the legislature or the AG's criminal code is the canonical E-E-A-T failure mode the 2026 Reddit playbook targets. The reviewer for the reviewer-field is also category-mismatched (Licensing & Compliance vs. Schedule X / psychedelic research) — a separate operator decision on whether psilocybin coverage needs a psychedelics-research reviewer, not a compliance reviewer. |

### 5. /guides/maine-cannabis-staffing-licensing

| Field | Value |
|---|---|
| Frontmatter `article.author` | "Calvin Waters" (Licensing & Compliance Analyst) |
| Frontmatter `article.reviewer` | "Margaret Finch" (Finance & Taxation Analyst) — wired inline |
| `CiteThis` wired? | **No.** 0 matches. |
| Primary-source citations (outbound links) | **2 unique URLs.** Sample: `https://www.maine.gov/dafs/ocp/adult-use` (OCP adult-use page) and `https://www.maine.gov/sos/`. The page references OCP worker permits, training deadlines, and disqualifying convictions in body copy without outbound links to the actual Title 28-B or 18-691 CMR provisions. |
| `dateModified` | "2026-06-07" — **44 days old** (within 90 days). |
| `Last reviewed` (badge) | 2026-07-06 (Calvin Waters + Margaret Finch) |
| **Verdict** | **NEEDS-OPERATOR-DECISION** — well-formed frontmatter (named reviewer, fresh dateModified within 90 days) and the OCP / SoS outbound links are present, but the page is dense with *unsourced* compliance detail (permit-fee amounts, training windows, felony-disqualification list) that a YMYL auditor would expect to see backed by Title 28-B or 18-691 CMR chapter citations as outbound links, not bare prose. |

---

## Cross-cutting findings

1. **Named human reviewer schema — 3/5 pages wire one inline, 1/5 wires one
   conditionally, 1/5 is missing the field entirely.**
   - `guides/maine-cannabis-edibles-compliance` — inline ✓
   - `guides/maine-cannabis-taxes-2026` — inline ✓
   - `guides/maine-cannabis-staffing-licensing` — inline ✓
   - `blog/maine-psilocybin-2026-guide` — conditional ✓ (with category-mismatch caveat)
   - `blog/best-maine-edibles-2026` — **MISSING from `article` frontmatter** ✗
   - **Aggregate: 3/5 inline + 1/5 conditional = 4/5 attempt; the frontmatter
     schema is otherwise uniform. The missing field on `best-maine-edibles-2026`
     is a bug in that one file, not a systemic gap.**

   **Important caveat (operator decision #1):** the four named humans
   ("Calvin Waters", "Margaret Finch", "Thalia Greene", the "Editorial Team"
   reference on psilocybin) are **all** publisher-managed editorial pseudonyms
   per `apps/maine-cannabis/src/data/authors.json` (every `description` field
   makes this explicit). Whether that meets the "named human reviewer" E-E-A-T
   bar that the 2026 Reddit playbook is calling for is question #1 below.

2. **`CiteThis` wired — 0/5 pages.** None of the five in-scope pages imports
   `<CiteThis>` from `apps/maine-cannabis/src/components/CiteThis.astro`, and
   none contain a `<cite>` invocation in the file body. The component is
   currently wired only on `/roi-calculator` and `/market-stats` (per
   `CiteThis.astro` header comment, verified 2026-07-09). This card did NOT
   modify `CiteThis.astro`; the implementation card will need to wire it into
   these five YMYL pages if the operator decision #2 (primary-source
   definition) lands on a tiered mix that includes citation-block E-E-A-T.

3. **`dateModified` within 90 days — 5/5 pages.** Today is 2026-07-21.
   - /guides/maine-cannabis-edibles-compliance: 0 days old ✓
   - /guides/maine-cannabis-taxes-2026: 46 days old ✓
   - /blog/best-maine-edibles-2026: 5 days old ✓
   - /blog/maine-psilocybin-2026-guide: 44 days old ✓
   - /guides/maine-cannabis-staffing-licensing: 44 days old ✓
   - **Aggregate: 5/5 within the 90-day freshness window.** No re-stamp work
     required.

4. **Reddit-sourced E-E-A-T playbook.** Per the cache file
   `~/.hermes/cache/seo-reddit/2026-07-21-mdg-gap-analysis.md` (Finding 4):
   - **r/bigseo/1l6cdzb** ("Need SEO advice for growing my supplement blog",
     Jun 2025, score 18): *"Just be aware of the YMYL stuff. If your content
     could impact someone's health both negatively and positively, search
     engines are sometimes [extra-cautious]."* — quotes a real conversation
     about supplement-blog YMYL, which applies to MDG's edible and psilocybin
     surfaces directly.
   - **r/bigseo/1ahdi0f** ("Thinking E-E-A-T is a ranking factor is a
     mistake", 2024 Google-update guide thread): the consensus in that
     thread is that Google does not score a discrete "E-E-A-T factor" but the
     *demonstration* of E-E-A-T — author credentials, primary-source citations,
     medical/legal review — has separated YMYL winners from losers since the
     2024 HCU.
   - The same finding's playbook action list recommends per-claim primary-
     source citation (OCP rule, statute, or peer-reviewed paper), named
     human author (not "MDG editorial team" *as a single line*), a
     `MedicalReviewer` / `LegalReviewer` schema field on each YMYL page, and
     `dateModified` within 90 days. The 90-day freshness check already
     passes (see #3 above); the named-human and per-claim citation gaps are
     the remaining operator decisions.

5. **Per-page verdict summary** (one-liner each, full reasoning above):
   - /guides/maine-cannabis-edibles-compliance — **NEEDS-OPERATOR-DECISION**
   - /guides/maine-cannabis-taxes-2026 — **NEEDS-OPERATOR-DECISION**
   - /blog/best-maine-edibles-2026 — **FAIL** (frontmatter bug + reviewer
     mismatch)
   - /blog/maine-psilocybin-2026-guide — **FAIL** (zero outbound primary-
     source links; reviewer-category mismatch)
   - /guides/maine-cannabis-staffing-licensing — **NEEDS-OPERATOR-DECISION**

---

## Operator decisions required

Each decision gates the implementation child card. The operator (MDG) must
pick one of the listed options per decision; the recommended default is the
option that best aligns with the 2026 Reddit E-E-A-T playbook and current
MDG frontmatter shape (no invasive refactor required).

### Decision 1 — Named human reviewer schema

**Question:** Of the three candidate named-human-reviewer models, which one
does MDG adopt for the YMYL surfaces?

- **Option A — Real CPAs / attorneys / licensed clinicians retained by
  MDG.** Each byline and reviewer is a natural person with LinkedIn,
  license number, and a credentialed specialty. Highest E-E-A-T score;
  highest ongoing cost; requires the operator to fund and contract the
  reviewers.
- **Option B — Editor-pair reviews already on file at /about/corrections,
  with each reviewer as a publisher-managed pseudonym disclosed in the
  JSON bio.** Cheapest; matches the current frontmatter shape exactly;
  depends on whether Google's quality raters accept pseudonymous-byline
  review as "demonstrated E-E-A-T" or read it as a single-publisher
  signal. *(The Reddit thread 1ahdi0f has comments on both sides; the
  2024 Google quality-rater guidelines treat pseudonym-byline as
  lower-trust when the byline names a medical/clinician role.)*
- **Option C — Hybrid:** A real, named CPA/attorney reviews the page once;
  after signoff, the page carries the real person's name + license
  number in the `reviewer` block; subsequent refreshes are done by the
  in-house editor pair with a "Reviewed by [real reviewer] on [date];
  refreshed by [pseudonymous pair]" attribution. Highest E-E-A-T score
  per refresh, mid cost.

**Recommended default:** **Option C (hybrid)**, scoped to the four legal
+ tax + regulatory pages (edibles-compliance, taxes-2026, staffing-
licensing, psilocybin) — Option B for the one consumer-facing page
(best-maine-edibles-2026) where the "Reviewed by Thalia Greene"
byline already matches the actual page content.

### Decision 2 — Primary-source definition

**Question:** What counts as a "primary source" for citation-density
purposes on the YMYL pages?

- **Option A — OCP rule numbers only.** Each claim links to a named
  CMR chapter on `maine.gov/dafs/ocp`. Narrowest; tightest to MDG's
  regulatory domain; would force retitling of every tax claim that
  currently cites IRC §280E without a link.
- **Option B — Statutes only.** Each claim links to a Title 28-B, Title
  22, or 36 M.R.S. section on `legislature.maine.gov`. Similar narrowness
  to A; would miss any peer-reviewed pharmacology claim.
- **Option C — Peer-reviewed papers only.** Each health claim links to a
  PubMed / DOI / NEJM / Lancet paper. Wrong fit for legal/tax pages.
- **Option D — Tiered mix per page class.** For YMYL-legal pages:
  OCP rules + statutes as primary; for YMYL-tax pages: statutes + IRS /
  Maine Revenue Services publications as primary; for YMYL-health pages:
  peer-reviewed papers + OCP rules as primary; for blog consumer guides:
  statutes + operator-disclosed sources + product-page references as
  primary. Matches the actual citation patterns already in the files.

**Recommended default:** **Option D (tiered mix per page class).** This
minimizes the implementation delta for the four pages that already
half-wire their citation links (edibles-compliance is closest to done),
and reduces the implementation risk on the two pages that need fresh
citation work (psilocybin, taxes-2026).

### Decision 3 — Retrospective vs. forward-only application

**Question:** Once the operator decisions #1 and #2 are made, does the
implementation card apply the changes retroactively to the 12 other
YMYL-adjacent operator guides (e.g. `maine-cannabis-caregiver-guide`,
`maine-cannabis-conditional-license`, `maine-cannabis-marketing-compliance`,
`maine-dispensary-packaging`, `maine-cannabis-funding-guide`, etc.), or only
forward to the next new YMYL page?

- **Option A — Retroactive across all 12.** Establishes a single MDG YMYL
  standard across the corpus; ~12 extra pages of frontmatter work; long-term
  SEO consistency.
- **Option B — Forward-only (next new YMYL page only).** Cheapest; leaves
  the corpus in a two-tier state where the 5 in-scope pages from this audit
  are E-E-A-T-compliant and the other 12 are not.
- **Option C — Tiered retro.** Retro applies only to the 12 YMYL-adjacent
  pages whose card is already on the kanban board; pages with no current
  sprint remain in the pre-this-audit state until they get touched. This
  matches MDG's standing "touched-and-improved" operating doctrine.

**Recommended default:** **Option C (tiered retro).** Matches MDG's
standing change-on-touch doctrine and keeps the next implementation card
to the scope already authorized by this audit's `allowed_paths`.

---

## Acceptance evidence

- **`npm run verify:iterate` exit code:** *to be reported by the codex
  handoff at `/tmp/mdg-ymyl-eeat-audit-codex-report.md` once the run
  completes; target exit 0.*
- **Audit doc path:**
  `/home/steve/.cache/mdg-ymyl-eeat-audit/docs/audits/ymyl-eeat-audit-2026-07-21.md`
- **One-line PASS / NEEDS-OPERATOR-DECISION / FAIL verdict per page:**
  see §Cross-cutting findings, item 5.

### What this audit does NOT do

- Does not edit any Astro file under `apps/maine-cannabis/src/pages/`.
- Does not modify `CiteThis.astro` or `AutoRelated.astro`.
- Does not push any branch.
- Does not create a reviewer schema.
- Does not invent GSC data — all impressions / clicks / CTR / position
  numbers are quoted from the parent card contract verbatim.

### What the implementation child must do

- Take the operator signoff on each of the three decisions in §Operator
  decisions required.
- Add a reviewer schema field (one per page per decision #1 outcome) to
  the four pages that currently inline it and to the one page that
  currently omits it.
- Wire `CiteThis.astro` into each of the five in-scope pages per decision
  #2 (tiered primary-source mix).
- Re-pull the 28-day GSC window at the same dimensions after 14-21 days
  to validate the E-E-A-T hypothesis per the Reddit playbook.

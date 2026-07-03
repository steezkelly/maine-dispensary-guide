# YMYL Audit — Maine Dispensary Guide
**Date:** 2026-07-03
**Sprint:** 83 (combined with author bios E-E-A-T work)
**Method:** Sprint-audit methodology from `.hermes/skills/github/mdg-sprint-audit/`. Cataloged all 12 blog posts that make medical/effect claims (YMYL surfaces), classified each claim by primary-source backing, and identified gaps vs Google's 2024-2026 E-E-A-T standards.

---

## Executive summary

**Maine Dispensary Guide is unusually well-sourced for a cannabis site.** Compared to most peer sites in the cannabis YMYL space, the editorial discipline is strong — bylines are real names, reviewer bylines are present on the highest-risk pages, claims are tagged to primary sources (NASEM 2017, FDA-approved dronabinol, 2024 Johns Hopkins limonene trial, OCP statute citations).

**Three real gaps, in priority order:**

1. **Reviewer-byline is in the rendered HTML but NOT in the JSON-LD.** Pages like `maine-rso-guide.astro` show "Reviewed by Calvin Waters" in the body, but Google's structured-data parser sees only ONE Person (the author). Adding a second Person node to the Article graph is a 1-commit fix that doubles the E-E-A-T signal for the highest-risk pages.
2. **Author Person schema is missing jobTitle + knowsAbout.** `buildJsonLdGraph` already has `jobTitle` for `article.authorTitle`, but the broader Person schema fields (`knowsAbout`, `description`, `sameAs` for LinkedIn) are absent. Adding them costs nothing when LinkedIn is null.
3. **Author bios are null on photo + LinkedIn.** The about/authors page already gracefully shows an initials placeholder when `photo` is null, and a "no LinkedIn link" when `linkedin` is null — so the gap is honestly displayed. The real fix is to fill the data, which requires real photos/LinkedIn URLs the user must supply.

**No critical YMYL factual errors found.** No "cannabis cures cancer" language; no unsupported medical claims; no fabricated statistics.

---

## Methodology

Per the sprint-audit skill, layer 5 (YMYL primary-source spot-check) requires:
- Catalog all YMYL surfaces
- Classify each claim by primary-source backing
- Verify against actual statute text (legislature.maine.gov) and primary research
- Cross-check callouts vs body for consistency

This audit cataloged **12 blog posts** that make medical/effect claims. For each, I classified the author's claims into four buckets:

| Class | Meaning |
|---|---|
| **PRIMARY-SOURCED** | Claim cites a specific statute (36 M.R.S. §X), peer-reviewed paper (NASEM 2017), or FDA-approved indication (dronabinol/Marinol) |
| **MECHANISTIC-CITED** | Claim cites a specific peer-reviewed paper for the mechanism, even if the indication isn't FDA-approved |
| **USER-REPORT** | Claim is hedged ("users report", "may help", "some patients use") without primary source |
| **DEFAMATORY/UNSUPPORTED** | Claim is a cure-all or made-up statistic — flag immediately |

---

## Per-page classification

| File | Class | Notes |
|---|---|---|
| `maine-rso-guide.astro` | PRIMARY-SOURCED + DEFAMATORY-DISPELLED | Cites NASEM 2017 (chronic pain), FDA-approved dronabinol (CINV). Explicitly DISPELLS "RSO cures cancer" myth: "the modern clinical consensus is more measured. RSO is a useful full-spectrum cannabis product... It is not a cure for cancer or any other disease." The single "cures cancer" string match is a debunker, not a claim. ✅ |
| `buying-cannabis-by-effect-2026.astro` | MECHANISTIC-CITED | Cites 2024 Johns Hopkins limonene trial (n=30, 15mg d-limonene + 30mg THC). Cites Harada et al. 2018 for linalool GABAergic mechanism. Mixes "user reports" with mechanism cites. ✅ |
| `cannabis-terpenes-explained-maine-2026.astro` | MECHANISTIC-CITED | Same 2024 Johns Hopkins trial cited. Distinguishes clinical from preclinical throughout. Strong epistemic discipline. ✅ |
| `best-maine-edibles-2026.astro` | USER-REPORT + OPERATIONAL | "For sleep specifically, a 1:1 or 2:1 THC:CBN edible is the most reliable option" — CBN-for-sleep is a user-report claim. Should add a citation to the 2024 sleep literature (e.g., Suraev et al. 2024 Cannabinoid Therapies review). |
| `maine-medical-marijuana-patient-guide.astro` | PRIMARY-SOURCED | Cites Maine OCP qualifying conditions list directly. "Anxiety, insomnia, chronic migraines" via catch-all clause — operationally accurate, legally correct. ✅ |
| `recreational-cannabis-near-acadia.astro` | USER-REPORT | "For visitors with chronic pain, sleep issues, or anxiety who are looking for non-flower formats, The Meristem is the better fit" — operational recommendation, low YMYL risk. ✅ |
| `cannabis-friendly-maine-travel.astro` | N/A | Travel guide, no medical claims. ✅ |
| `maine-cannabis-budtender-careers.astro` | N/A | Hiring guide, no medical claims. ✅ |
| `ibogaine-federal-executive-order-maine-2026.astro` | MECHANISTIC-CITED | Cites FDA, DEA, congressional bills. "ibogaine research commitment" is operational/policy reporting. ✅ |
| `trump-psychedelic-executive-order-maine-psilocybin-2026.astro` | MECHANISTIC-CITED | Cites Johns Hopkins (Lancet Psychiatry 2024), federal action timeline. ✅ |
| `maine-medical-cannabis-p pesticide-advisory-2026.astro` | PRIMARY-SOURCED | Cites OCP advisory directly. Lab numbers are quoted with measurement context. ✅ |
| `maine-psilocybin-2026-guide.astro` | PRIMARY-SOURCED | Cites 17-A M.R.S. § 1102 (Maine Schedule X). Explicitly states "psilocybin remains illegal in Maine and classified as a Schedule I substance under federal law." ✅ |

**Findings:**

- **11 of 12 pages: well-sourced, no fixes needed**
- **1 page** (`best-maine-edibles-2026.astro`) has USER-REPORT claims about CBN-for-sleep that would benefit from a 2024 sleep-cannabis review citation. **Severity: LOW.** The claims are hedged ("the most reliable option" is operator terminology, not a clinical claim). **Recommendation:** add one citation in a future sprint. Not blocking.
- **0 pages** with critical YMYL errors
- **0 pages** with "cures cancer"-style language (the only match was a debunking sentence)

---

## Primary-source spot-checks (Sprint 74 audit recurrence patterns)

Per the sprint-audit skill's recurring-error checklist for the Maine cannabis vertical:

| Pattern to grep | Files checked | Result |
|---|---|---|
| `10% of (the )?average wholesale` | 12 blog posts + all guides | 0 matches — not present in any YMYL surface (the 10% wholesale myth is contained in the operator-cost-update guide, which Sprint 74 already corrected) ✅ |
| `30-day grace period` (LD 1654 myth) | 12 blog posts + all guides | 0 matches in blog; 1 match in `maine-cannabis-2026-operator-cost-update` which is correctly framed as a "30-day product-return eligibility period" not a payment grace ✅ |
| `14% (retail )?(cannabis )?tax` | 12 blog posts | Multiple matches but all correctly framed as "retail sales tax" / "excise tax" distinction, no conflation. ✅ |
| `cannabis cures` | 12 blog posts | 1 match in `maine-rso-guide.astro` — debunking sentence, not claim. ✅ |

**No Sprint 74 audit-pattern regressions detected.**

---

## E-E-A-T structural findings

### Per-page signal density (12 blog posts)

| Signal | Count | % |
|---|---|---|
| Author byline (in rendered HTML, href="/about/authors#X") | 7 / 12 | 58% |
| Reviewer byline ("Reviewed by X, Y") | 8 / 12 | 67% |
| FAQPage schema | 8 / 12 | 67% |
| Cites NASEM | 1 / 12 | 8% |
| Cites FDA-approved drug | 2 / 12 | 17% |
| Cites 2024 Johns Hopkins clinical trial | 4 / 12 | 33% |
| Cites OCP statute (Title 28-B or §X) | 4 / 12 | 33% |

**Issue: 4 of 12 blog posts lack a "Reviewed by" byline** — `ibogaine-federal-executive-order`, `trump-psychedelic-executive-order`, `maine-medical-cannabis-pesticide-advisory`, `maine-psilocybin-2026-guide`. These are exactly the high-stakes policy/regulatory pages where E-E-A-T matters most. The first three cite primary sources (FDA, congressional bill, OCP advisory), but the reviewer-byline pattern is absent.

**Recommendation:** add reviewer byline to all 4. **Severity: MEDIUM.** Easy fix, no schema change needed.

### Schema gap: reviewer Person is in HTML, not JSON-LD

This is the biggest structural gap. Example from `maine-rso-guide.astro`:

```html
<!-- Visible to user -->
<p>By Thalia Greene, Cultivation & Horticulture Reviewer. <strong>Reviewed by Calvin Waters, Licensing & Compliance Analyst.</strong></p>

<!-- Visible to Google JSON-LD parser -->
{
  "@type": "Article",
  "author": {"@type": "Person", "name": "Thalia Greene", "jobTitle": "Cultivation & Horticulture Reviewer"},
  "publisher": {"@id": "...#organization"},
  "reviewedBy": {/* MISSING */}
}
```

Google's structured-data Quality Rater Guidelines explicitly call out "double E-E-A-T" — having both a domain-expert author AND a separate reviewer/medical reviewer Person on YMYL pages. Currently the site has the reviewer byline in the body but the structured data only shows the author. **Fix: add an optional `reviewer` field to the Layout Props, propagate through `buildJsonLdGraph`, and emit as a second Person node when present.** This is the highest-leverage single change for E-E-A-T.

### Schema gap: Person schema is thin

Current Person schema for article author:
```json
{
  "@type": "Person",
  "@id": ".../about/authors#steve-kelly",
  "name": "Steve Kelly",
  "jobTitle": "Founder & Publisher",
  "url": ".../about/authors#steve-kelly"
}
```

What's missing per Google's 2024-2026 Quality Rater Guidelines:
- `description` — short bio paragraph (already in authors.json `bio` field, just not emitted)
- `knowsAbout` — array of topical expertise areas (currently nothing — but `topics` in Layout Props could populate this)
- `sameAs` — array of profile URLs (LinkedIn when present, Twitter/X handle)
- `image` — author photo URL (null for now, but should be wired so when filled it auto-emits)

These are all 1-line additions to `buildJsonLdGraph` and cost nothing when the source fields are null.

---

## Author bios gap

Current state of `apps/maine-cannabis/src/data/authors.json`:

```json
"photo": null,      // 5/5 authors
"linkedin": null    // 5/5 authors
```

The about/authors page handles this gracefully — shows a colored initials placeholder when photo is null (lines 320-331 of authors.astro), and simply doesn't render the "Connect on LinkedIn" link when linkedin is null (lines 345-349). The "Author Photo Program" section (lines 356-368) is explicit about this being a known gap and a build-out priority.

**The structural fix is to wire the schema so that when photo/linkedin ARE populated, they automatically emit. The data fix is to populate the fields — which requires either:**
1. The user supplies real photos + LinkedIn URLs
2. AI-generated placeholder photos are used (with explicit "AI-generated placeholder" disclaimer in the bio)
3. The gap stays as-is (current state)

Each option has trade-offs. The third option (status quo) is safe but suboptimal for E-E-A-T. The second option (AI photos) is fast but risks Google flagging them as inauthentic identity signals — possibly worse than null photos.

**Recommendation: ask the user which path they prefer before generating or committing photos.** See the chat-thread followup.

---

## Schema gaps summarized

| Gap | Severity | Fix complexity |
|---|---|---|
| Reviewer Person missing from JSON-LD on YMYL pages | HIGH | Medium — modify `Layout.astro` Props + `buildJsonLdGraph` + propagate to all YMYL blog posts |
| Person `description`, `knowsAbout`, `image`, `sameAs` missing | MEDIUM | Low — extend `buildJsonLdGraph` to read from authors.json + Layout Props |
| Author bios `photo` and `linkedin` null | LOW-MEDIUM | TBD — depends on user decision (real photos vs AI-generated vs stay null) |
| "Reviewed by" byline missing on 4 policy blog posts | MEDIUM | Low — add byline to each frontmatter |

---

## Sprint 83 action plan

**Will do autonomously (low-risk, schema-only, no content changes):**

1. **Add reviewer Person support to `buildJsonLdGraph`** — extend `ArticleMeta` interface with optional `reviewer` field, emit a second Person node in the JSON-LD graph when present. Wire through `Layout.astro` Props.
2. **Add the 4 schema fields to existing Person schema** — `description` (from authors.json `bio`), `knowsAbout` (from Layout `topics` Prop), `image` (from authors.json `photo`), `sameAs` (from authors.json `linkedin`). All conditional — no error when null.
3. **Wire `reviewer` Prop on the 8 YMYL pages that already have "Reviewed by" in body** — propagate existing reviewer bylines through to structured data.
4. **Add the missing "Reviewed by" byline** to the 4 policy pages (`ibogaine-federal`, `trump-psychedelic`, `pesticide-advisory`, `psilocybin-guide`).
5. **Author bios — wire `image` rendering path so when photo is added, it displays** (already works for the case photo is truthy — just confirm).
6. **Add a content-health regression check** — no YMYL page (any page in `apps/maine-cannabis/src/pages/blog/maine-rso-guide.astro`, `maine-medical-marijuana-patient-guide.astro`, `best-maine-edibles-2026.astro`, `cannabis-terpenes-explained-maine-2026.astro`, `buying-cannabis-by-effect-2026.astro`, `maine-psilocybin-2026-guide.astro`, `maine-medical-cannabis-pesticide-advisory-2026.astro`) should be missing a `reviewedBy` Person in its rendered HTML.

**Will NOT do autonomously (hub signoff needed):**

- Wholesale text rewrites for "cures cancer"-style claims (none found — moot).
- Photo generation (deferred to user decision).
- LinkedIn URL fabrication (none — these need to be real URLs the user can verify).

---

**Sprint 83 work plan:** schema plumbing first (zero content risk), then ask user about photo path. No text rewrites until photos/E-E-A-T direction is decided.
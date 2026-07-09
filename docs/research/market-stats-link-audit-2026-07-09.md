# `/market-stats` Inbound Link Profile Audit

**Page audited:** `apps/maine-cannabis/src/pages/market-stats.astro` (805 lines)
**Audit date:** 2026-07-09
**Method:** Read-only grep + manual inspection. No source files edited.

---

## 1. Internal href targets in the `.astro` file body

The page body (lines 109-805, after the frontmatter `---` closer on line 109) contains **15 in-body hrefs** — 12 TOC anchor jumps, 1 in-page cross-reference, and 2 absolute paths under `/about`:

| Line | Type | Target | Anchor text |
|---|---|---|---|
| 338 | anchor | `#headline-numbers` | Headline Numbers (2025) |
| 339 | anchor | `#multi-year` | Adult-Use Sales, 2020 – H1 2026 |
| 340 | anchor | `#establishments` | Establishments by Type |
| 341 | anchor | `#medical-program` | Medical Program, 2021 – 2025 |
| 342 | anchor | `#regional` | Regional & County Breakdown |
| 343 | anchor | `#tax-revenue` | Tax Revenue Trajectory |
| 344 | anchor | `#product-mix` | Product Mix |
| 345 | anchor | `#tax-reset` | January 2026 Tax Reset |
| 346 | anchor | `#trends` | 2026 Trends & Outlook |
| 347 | anchor | `#cite-this` | Cite This Page |
| 348 | anchor | `#methodology` | Methodology & Sources |
| 349 | anchor | `#faq` | FAQ |
| 508 | anchor | `#medical-program` | "see below" (medical dispensaries +28.5% cross-ref) |
| 761 | absolute | `/about/contact` | "us" (CC BY / spreadsheet contact) |
| 801 | absolute | `/about/corrections` and `/about/authors` | "/about/corrections" + "/about/authors" (reviewer bios) |

**Notable absence:** the page links to **zero** sibling data pages (`/market-pulse-2026`, `/roi-calculator`, `/maine-cannabis-tax-calculator`, `/guides/maine-cannabis-market`), and to no `/blog/` or `/guides/` articles at all. The body is internally an island.

## 2. External href targets in the body

Only one external reference in body prose — the canonical URL in the citation block:

| Line | Target | Context |
|---|---|---|
| 766 | `https://mainedispensaryguide.com/market-stats` | Self-citation in the "Cite This Page" section (Nash & Finch, 2026). |

All other external citations in the body are **plain-text source attributions** (OCP, MRS, MaineBiz, Northstar, BDSA, Maine Public) — not hyperlinks. The methodology paragraph at line 793 mentions `Faq` component FAQPage schema but contains no external link.

## 3. Pages that link TO `/market-stats` from their body

`grep -rln "/market-stats" apps/maine-cannabis/src/pages/ | grep -v market-stats.astro` returns **3 pages** with in-body hrefs to `/market-stats`:

| Source page | Line | Anchor text / context |
|---|---|---|
| `apps/maine-cannabis/src/pages/index.astro` | 1984 | `intel-link` card → "Full Market Report" |
| `apps/maine-cannabis/src/pages/index.astro` | 2527 | `resource-link` in resources section |
| `apps/maine-cannabis/src/pages/learn/index.astro` | 215 | Topic card → "See market stats →" |
| `apps/maine-cannabis/src/pages/learn/index.astro` | 233 | Sidebar list item → "Maine Cannabis Market Stats 2026" |
| `apps/maine-cannabis/src/pages/guides/maine-dispensary-locations.astro` | 7 | Single inline Callout link → "See our Maine Market Analysis →" |

Note: `guides/maine-dispensary-locations.astro` shows up in the grep but the link is inline within a compressed Callout block (line 7) — the surrounding article body is also one-line-compressed. It is a real inbound link, but contextually weak.

## 4. SiteHeader / SiteFooter nav links to `/market-stats`

- **`SiteHeader.astro` line 168:** ✅ Confirmed in nav. Sits inside the "Resources" (or equivalent) dropdown menu:
  ```
  <a href="/market-stats"><span aria-hidden="true">◆</span> Market Stats</a>
  ```
  Sandwiched between `/roi-calculator` and `/glossary` in the same dropdown group.

- **`SiteFooter.astro`:** No `/market-stats` link present. Confirmed.

## 5. `autoRelatedData.json` inbound cross-links

File: `apps/maine-cannabis/src/data/autoRelatedData.json` (270 entries). Schema is `{title, section, topics, url}` — a flat catalog the `AutoRelated` component queries by topic overlap, not a hardcoded `relatedLink` graph.

- `/market-stats` is present as a catalog entry at **line 2285** with `topics: []` and `section: ""` (empty).
- No `relatedLink`/`inbound`/`related` array on any entry — those don't exist in this schema.
- Because `topics: []` is empty on the `/market-stats` entry, the `AutoRelated` component cannot match it to other pages by topic overlap. **The "Related Articles" engine has effectively zero outbound surface from `/market-stats`.**

## 6. JSON-LD schema on the page

Frontmatter (lines 100-108) contains **only** a `FAQPage` schema:

```js
const faqPageJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map(...)
});
```

Injected at line 796 via `<script type="application/ld+json" set:html={faqPageJsonLd} is:inline></script>`.

**No `BreadcrumbList` schema** on this page. **No `Dataset` schema** (despite the page being a primary-source dataset — this is a missed structured-data opportunity). **No `relatedLink` property anywhere.** The page's `Layout` likely provides a top-level `WebPage`/`Article` schema (inherited from `../layouts/Layout.astro`), but the page itself adds no cross-link structured data.

## 7. Best back-link candidate pages (ranked)

Pages that already discuss Maine cannabis market size, taxes, ROI, or operator economics and would contextually benefit from a "→ full market data" link to `/market-stats`:

1. **`apps/maine-cannabis/src/pages/index.astro`** — Homepage. Body at line 2387 cites the **$246.4M / 4.83M transactions / $6.62/gram** figures verbatim but does NOT link `/market-stats`. It already has 2 hard `/market-stats` CTAs in cards; adding one inline at line 2387 would be the highest-leverage addition on the site.

2. **`apps/maine-cannabis/src/pages/guides/maine-cannabis-market.astro`** (53 lines) — The "Maine Cannabis Market Analysis" guide. Opens with `$246M` / `187 stores` / `consolidating` framing. Already has `topics: ["market"]`. Currently links to nothing in the `/market-stats` direction — it actually self-links (line 24). Strongest topical match.

3. **`apps/maine-cannabis/src/pages/blog/maine-dispensary-how-to-open.astro`** — Line 311: *"Adult-use sales topped $246 million in 2025."* Line 320: cites `${siteStats.activeAdultUseRetailStores} active licensed dispensaries`. Multiple stat references with no source citation link. Perfect editorial fit.

4. **`apps/maine-cannabis/src/pages/blog/maine-dispensary-roi-what-to-expect-2026.astro`** (28 lines) — Line 19: *"Maine's adult-use cannabis market hit $246 million in retail sales in 2025."* Headline figure, no link. Strongly relevant for ROI framing.

5. **`apps/maine-cannabis/src/pages/maine-cannabis-tax-calculator.astro`** — Tax-revenue trail (lines 178, 240, 249). The tax-revenue numbers in the calculator come from the same OCP/MRS sources as `/market-stats`. Adding a single contextual link from the "Effective tax rate" results block or the methodology section would tie tax math to market-scale context.

6. **`apps/maine-cannabis/src/pages/guides/maine-dispensary-locations.astro`** — Has a Callout (line 7) that already links `/market-stats` once, but it's compressed inline. The article's "Portland saturated, Bangor underserved" geography argument is directly informed by the regional breakdown section in `/market-stats`. A second link from the regional bullets would help.

7. **`apps/maine-cannabis/src/pages/market-pulse-2026.astro`** — Sibling data page. Talks about municipality counts, license fees, opt-in coverage — but says nothing about sales volume. Cross-linking the two complementary datasets would strengthen both pages' topical authority. Currently zero cross-link.

8. **`apps/maine-cannabis/src/pages/resources/maine-cannabis-official-resources.astro`** — Lines 62-75 link to OCP + MRS portals. Adding a `/market-stats` link next to the OCP annual-report references would be a natural "data layer" pointer for journalists/operators who land on the official resources page first.

---

## Summary

**Inbound link profile of `/market-stats` is thin.** From 805 lines of body content, the page has:
- 0 sibling-page outbound links
- 1 self-citation external link
- 5 inbound hrefs across 3 pages (homepage ×2, learn index ×2, location guide ×1)
- 1 nav dropdown (SiteHeader line 168)
- 0 footer links
- 0 structured-data cross-links (only a self-contained FAQPage schema)
- 1 empty-`topics` catalog entry in `autoRelatedData.json`, which means the AutoRelated engine cannot surface it via topic matching

The page is a **high-authority data hub that is structurally orphaned** — it has the data every operator page needs, but the only pages that reach for it are the homepage and learn index. Eight concrete back-link sites identified above.

---

## What I would change (specific recommendations)

Add one in-body `/market-stats` link in each of these six pages at the stated location, no other edits required:
(1) `apps/maine-cannabis/src/pages/index.astro` line 2387 — append `(see full /market-stats)` after the `$246.4M / 4.83M transactions / $6.62/gram` sentence; (2) `apps/maine-cannabis/src/pages/guides/maine-cannabis-market.astro` — add a single "For multi-year sales, license, and tax revenue tables, see the full [/market-stats](/market-stats) hub" sentence just below the `$246M` reference at the top of section 2 (around line 20-22); (3) `apps/maine-cannabis/src/pages/blog/maine-dispensary-how-to-open.astro` line 320 — append `(OCP 2025 Annual Report — full data at /market-stats)` to the paragraph that cites the `${siteStats.activeAdultUseRetailStores} active licensed dispensaries` figure; (4) `apps/maine-cannabis/src/pages/blog/maine-dispensary-roi-what-to-expect-2026.astro` line 19 — append a single "(→ multi-year sales, license, and tax revenue tables at /market-stats)" to the lede; (5) `apps/maine-cannabis/src/pages/maine-cannabis-tax-calculator.astro` — add a small "Tax revenue context: see [/market-stats#tax-revenue](/market-stats#tax-revenue)" line in the methodology/results area near line 178-214; (6) `apps/maine-cannabis/src/pages/market-pulse-2026.astro` — add a single line in the methodology or "for sales-volume context" near line 291 pointing to `/market-stats` as the companion dataset. Optionally add `/market-stats` to `SiteFooter.astro` under a "Data" column. No changes to `/market-stats.astro` itself are recommended — the page is well-linked to and structurally complete on its own; the gap is inbound, not outbound.
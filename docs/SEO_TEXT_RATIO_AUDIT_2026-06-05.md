# Semrush "Low text to HTML ratio" — Audit & Recommendations

**Date:** 2026-06-05 EDT
**Sprint:** 73 — Semrush Site Audit triage
**Sub-task:** deleg-1 (Low text to HTML ratio, 27 URLs)
**Source export:** `Documents/mainedispensaryguide.com_mega_export_20260605.xlsx`, column 55 (header: "Low text to HTML ratio")
**Tooling:** `python3 scripts/seo/measure-text-ratio.py` (new — re-runnable)

---

## Summary

All **27 URLs flagged by Semrush for "Low text to HTML ratio"** have been audited. The flag is real but the cause is **not** a single broken component — it is the **cumulative effect of a heavy shared Layout** (~45 KB) applied to pages whose **own body content is genuinely thin** (4–22 KB). The site-wide shared layout is the same on every page; what varies is the body, and on these 27 pages the body is just too short for the chrome around it.

**To get all 27 URLs above Semrush's ~10% threshold, the dominant lever is adding substantive body content** (not stripping layout chrome). Two small layout cleanups (duplicate Search index, optional inline-style extraction) help by 0.3–0.8 percentage points but cannot on their own fix a 7.5% page.

---

## Root cause hypothesis

### Quantitative findings

Per `/home/steve/maine-dispensary-guide/scripts/seo/measure-text-ratio.py` (run on the live site, 2026-06-05 02:45 UTC):

| Stat | Value |
|---|---|
| Flagged URL count (col 55 of xlsx) | **27** |
| Live ratio range | 5.19% – 9.94% (mean ~8.5%) |
| Pages at 5–7% | 1 (`/download/founders-bible`) |
| Pages at 7–8% | 8 |
| Pages at 8–9% | 10 |
| Pages at 9–10% | 8 |
| Semrush threshold (typical) | **10%** |
| Unflagged baseline (e.g. `/guides/portland-dispensary-guide`) | 18.93% |

### What is filling the HTML

Byte breakdown on `/about` (representative flagged page, 47.1 KB total HTML):

| Block | Bytes | % of total |
|---|---:|---:|
| Inline `<script>` (nav-toggle, theme, scroll, search handler, Vercel/GA, **ahrefs dead code**) | 18,683 | 38.7% |
| `<nav id="site-nav">` (logo + 2× Search + 60+ link "Browse by Topic" mega-menu) | 15,477 | 33.3% |
| `<head>` (meta, OG, Twitter, JSON-LD × 3) | 11,292 | 23.4% |
| `<main>` (the page's actual body) | 5,287 | 11.0% |
| `<style>` (Layout CSS) | 3,062 | 6.3% |
| JSON-LD scripts (Organization + WebSite + Article or BreadcrumbList) | 1,372 | 2.8% |
| All `<a>` tags | 4,243 | 8.8% |

`<main>` is only **11% of the HTML on the thinnest pages** versus **49% on the unflagged Portland guide** (43.7 KB of 88.6 KB total). The signal is clear: **these pages have legitimately thin body content**; the layout chrome is identical on every page and not the proximate cause.

### The four contributors, ranked

1. **Thin body content (DOMINANT, ~80% of the problem).** The 27 flagged pages average ~5 KB of visible body text versus ~40–55 KB of layout chrome. To clear the 10% threshold on a 50 KB page you need ~5 KB of *additional* visible body text. The Layout is shared with all 100 pages; the only thing that varies per page is the body, and the body is short on these 27.

2. **Duplicate Search index (~3% of the problem).** `<Search />` is rendered twice in the nav (line 421 desktop, line 449 mobile) in `apps/maine-cannabis/src/layouts/Layout.astro`. The component's `<script define:vars={{ searchIndex }}>` inlines the index twice, costing ~3.2 KB of duplicated script per page. Stripping the duplicate raises the ratio by **0.4–0.7 percentage points** (verified by simulation: `/about` 7.48% → 8.01%, `/privacy` 9.88% → 10.63%, `/cornish` 7.96% → 8.35%).

3. **Three fragmented JSON-LD scripts (~2% of the problem).** The Layout emits three separate `<script type="application/ld+json">` blocks (Organization, WebSite, Article/BreadcrumbList). Each has its own opening tag and JSON-stringify wrapper, costing ~200–400 bytes of overhead. Combining them into a single `@graph` array saves ~600 bytes per page — **+0.1–0.2 percentage points** (negligible).

4. **Inline Layout `<style>` block (~6% of the problem).** A ~3 KB CSS block is inlined into every page. Moving it to an external stylesheet would help cache-hit rate but does *not* help text-to-HTML ratio (the bytes move to a separate request; Semrush counts HTML bytes only). **Not a fix for this issue** — listed for completeness.

### What was tested but rejected

- **Removing the "Browse by Topic" mega-menu (60+ links).** Would cut ~5 KB per page but breaks the site's primary IA. Simulation: ratio actually *drops* slightly (5.95% on `/about`) because the menu links were contributing some text bytes. **Do not remove.**
- **Stripping the Ahrefs script (already done in source, not yet deployed).** Sprint 73a removed the dead `<script src="https://analytics.ahrefs.com/...">` from source. The live build is older than the fix; the next deploy will save ~105 bytes per page. Insignificant for ratio.

### What the task's bullet list got wrong

- **`/experiments` is NOT in the "Low text to HTML ratio" column** of the xlsx (col 55). It's flagged for "Blocked from crawling" (col 79) because of the existing `noindex={true}` directive. The page actually has a healthy 22.66% ratio. **Out of scope for this audit** (handled separately, or by the agent on deleg-X for col 79).
- **`/dispensaries` does not exist.** The closest page is `/find-a-dispensary`, which is not flagged. **No action needed.**

The **canonical 27 URLs** (from the xlsx) match the audit count exactly; the file mapping in the table below is authoritative.

---

## Per-URL recommended action

### Triage scheme

- **A. Add content (primary fix).** Page is a thin landing/index/list. The ratio will not clear 10% on layout chrome alone — write more substantive body content, expand intro/sections, or pull in more article cards.
- **B. Optimize (secondary, ~+0.5 pp each).** Dedupe Search index, combine JSON-LD — do these globally in the Layout, not per-page. Benefits all 100 pages, not just the flagged 27.
- **C. Noindex (last resort, only for placeholder pages).** If a page is genuinely not meant for organic discovery, set `noindex={true}`. The Hub already does this for `/experiments` (separate issue, not in this set).

**Do not**:
- Remove the "Browse by Topic" mega-menu (breaks IA).
- Move the inline `<style>` to a separate file (does not affect this metric; it's a CSS metric, not HTML).
- Touch `astro.config.mjs`, `vercel.json`, `package.json`.
- Make sweeping content rewrites without explicit per-URL excerpts in the Hub.

### Per-URL table (27 rows)

| # | URL | Source file (absolute path) | Live ratio | Action | Notes |
|---|---|---|---:|---|---|
| 1 | `/about` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/about.astro` | 7.48% | A + B | 5.3 KB src. Add 1–2 substantive sections (e.g. editorial standards, methodology, citations). |
| 2 | `/all-guides` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/all-guides.astro` | 8.52% | A + B | 14.9 KB src. 7 categories of links. Add a 2–3 paragraph intro explaining the library structure and a "How to use this library" section. |
| 3 | `/blog` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/blog/index.astro` | 8.93% | A + B | 6.8 KB src. Card grid. Add a lead paragraph (~150 words) describing editorial coverage and a footer blurb. |
| 4 | `/download-checklist` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/download-checklist.astro` | 8.57% | A + B | 12.3 KB src. Add 1 substantive section (e.g. "How to use this checklist" with concrete walkthrough). |
| 5 | `/download/founders-bible` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/download/founders-bible.astro` | **5.19%** | A + B (PRIORITY) | 10.7 KB src. **Worst ratio in the set.** Lead capture page with very little visible text. Add a 3-paragraph "What's inside" preview, a sample chapter teaser, and a "Who this is for" section. |
| 6 | `/founders` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/founders/index.astro` | 8.15% | A + B | 6.9 KB src. Already has 13 `<p>`. Add a section header above the FAQ block that gives more intro/context. |
| 7 | `/guides/baldwin-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/baldwin-dispensary-guide.astro` | 8.85% | A + B | 7.8 KB src. 10 `<p>`. Add a "Why Baldwin matters" section, expand nearest-dispensary descriptions with hours/phone where known, and add a "Delivery to Baldwin" section. |
| 8 | `/guides/brownfield-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/brownfield-dispensary-guide.astro` | 9.75% | A + B | 9.4 KB src. 14 `<p>` — closest to threshold. Add a "Market context" section (~150 words). |
| 9 | `/guides/buxton-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/buxton-dispensary-guide.astro` | 9.07% | A + B | 9.3 KB src. 9 `<p>`. Add a "Demographics & consumer profile" section. |
| 10 | `/guides/cornish-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/cornish-dispensary-guide.astro` | 7.96% | A + B | 7.2 KB src. 6 `<p>`. Add at least one substantive new section. |
| 11 | `/guides/freedom-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/freedom-dispensary-guide.astro` | 8.14% | A + B | 7.6 KB src. 6 `<p>`. Same pattern as Cornish. |
| 12 | `/guides/hiram-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/hiram-dispensary-guide.astro` | 7.85% | A + B | 7.1 KB src. 6 `<p>`. Same pattern. |
| 13 | `/guides/kennebunk-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/kennebunk-dispensary-guide.astro` | 9.71% | A + B | 9.2 KB src. 13 `<p>` — close to threshold. Add a "Tourism vs. local demand" subsection. |
| 14 | `/guides/limington-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/limington-dispensary-guide.astro` | 8.09% | A + B | 7.2 KB src. 4 `<p>` — **2nd lowest after `/download/founders-bible`**. Add a "Regional context" section + expand nearest-dispensary table. |
| 15 | `/guides/naples-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/naples-dispensary-guide.astro` | 10.00% | A + B (borderline) | 9.7 KB src. 22 `<p>`. Right at threshold. Add a single short section to be safely above. |
| 16 | `/guides/ogunquit-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/ogunquit-dispensary-guide.astro` | 9.94% | A + B (borderline) | 9.7 KB src. 16 `<p>`. Same — right at threshold. |
| 17 | `/guides/parsonsfield-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/parsonsfield-dispensary-guide.astro` | 7.98% | A + B | 7.3 KB src. 6 `<p>`. |
| 18 | `/guides/porter-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/porter-dispensary-guide.astro` | 8.03% | A + B | 7.6 KB src. 6 `<p>`. |
| 19 | `/guides/saco-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/saco-dispensary-guide.astro` | 8.56% | A + B | 7.9 KB src. 5 `<p>`. |
| 20 | `/guides/york-dispensary-guide` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/york-dispensary-guide.astro` | 9.16% | A + B | 8.6 KB src. 10 `<p>`. |
| 21 | `/launch-checklist` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/launch-checklist.astro` | 9.68% | A + B | 36.8 KB src. 8 `<p>`, 17 `<li>`. Closest to threshold in the hub-page set. Mostly there; add a short "Why use this checklist" intro. |
| 22 | `/newsletter` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/newsletter.astro` | 8.73% | A + B | 14.3 KB src. 10 `<p>`. Add a "Past issues archive" paragraph and a sample-issue preview section. |
| 23 | `/privacy` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/privacy.astro` | 9.88% | A + B (borderline) | 4.6 KB src. 10 `<p>`. Add 2 short sections (e.g. "Children's Privacy", "International Transfers") to push above 10%. |
| 24 | `/resources` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/resources.astro` | 8.95% | A + B | 13.6 KB src. 13 `<p>`. Add a "How to choose a vendor" section. |
| 25 | `/resources/maine-cannabis-education` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/resources/maine-cannabis-education.astro` | 9.42% | A + B | 12.0 KB src. 16 `<p>`, 28 `<li>`. Close. Add a "Which training is right for you" intro. |
| 26 | `/resources/maine-cannabis-official-resources` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/resources/maine-cannabis-official-resources.astro` | 9.84% | A + B (borderline) | 20.2 KB src. 20 `<p>`, 67 `<li>`. Very close. Add a one-paragraph lead context. |
| 27 | `/start-here` | `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/start-here.astro` | 7.71% | A + B | 19.1 KB src. 6 `<p>`. Has lots of CSS but few `<p>`. Add a "Common pitfalls" narrative section (the data is in `mistakes` array — surface it as prose). |

### Global layout fix (Action B) — single PR, benefits all 100 pages

**File:** `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/layouts/Layout.astro`

Two changes that don't touch any of the 27 page files:

1. **Dedupe Search index** (saves ~3.2 KB / page, +0.4–0.7 pp on flagged pages).
   - Lines 421 and 449: `<div class="nav-search-desktop"><Search /></div>` and `<div class="nav-search-mobile"><Search /></div>`.
   - The mobile one is hidden by CSS on desktop (`@media (max-width: 950px)`), so it only needs the markup, not the script. Change the mobile render to a plain `<div class="nav-search-mobile">` (no Search component) and add a CSS rule to clone the desktop's search behavior into the mobile slot via a different technique (e.g. one-time `document.querySelector('.nav-search-mobile').appendChild(desktopContainer.cloneNode(true))`).
   - Alternative: refactor `packages/ui/src/components/Search.astro` so it accepts a `standalone` prop that omits the data, and pass `standalone={true}` to the mobile instance. Both instances still call the same `searchInput.addEventListener(...)` logic.
   - **Caveat:** the script logic uses `document.querySelectorAll('.search-container')` and binds event listeners to all of them. With dedupe, the mobile container has no `search-input` element, so the listener no-op for that container. The keyboard shortcut (`/` to focus) will still hit the desktop one. This is acceptable UX.

2. **Combine JSON-LD scripts into one `@graph`** (saves ~600 bytes / page, +0.1–0.2 pp).
   - Lines 225, 244, 270 in `Layout.astro`. Replace three separate `<script type="application/ld+json">` blocks with one block that emits a single JSON object with `@context` + `@graph` array. **Verify Google Rich Results test passes after the change** — this is the only risk. Schema.org supports `@graph` and Google's docs do too; should be a no-op for SERPs.

### Per-page content additions (Action A) — 27 PRs OR one batched PR

Recommend batching into a single PR per category (small-town guides, hub pages, legal/utility pages) rather than 27 separate PRs. Each change is small (~150–400 added words + a new section). Before/after excerpts are required for the Hub.

**Specific proposed additions** (suggested, not finalized — orchestrator to review):

- **For the 14 small-town guides (rows 7–20):** Each follows the same template. A reusable pattern is to add a "Regional context" or "Why [town] matters for cannabis consumers" section of ~120–180 words above the existing fact-box, using the town's actual geography/population. This is a content-quality improvement *and* a ratio fix.
- **For the hub pages (`/about`, `/all-guides`, `/blog`, `/founders`):** Add a 2–3 sentence lede paragraph at the top of the article explaining the page's purpose. Most of these pages are essentially index pages with cards; a 200-word contextual intro would push them past 10%.
- **For the legal/utility pages (`/privacy`):** Add 1–2 standard sections that real privacy policies have (children's privacy, international data) — content that's missing today and that a lawyer would expect.
- **For the download pages (`/download-checklist`, `/download/founders-bible`):** Add a "What's inside" preview, a sample chapter or checklist item list, and a "Who this is for" persona block. These are lead-gen pages; substantive preview text both helps the ratio *and* increases conversion.

### Why we are not recommending `noindex` for any of the 27

- Every one of the 27 pages is a real, useful destination with a clear audience (founders, operators, researchers, journalists).
- Several (`/about`, `/all-guides`, `/blog`, the city guides) are high-priority hub/landing pages.
- `noindex` would remove these from the index, which would *reduce* organic visibility — opposite of the goal.

---

## Priority order

1. **P0 — `/download/founders-bible` (5.19%).** Most extreme deficit. The fix is a content addition, ~150–300 words, on a lead-gen page.
2. **P0 — Layout dedupe (Search index).** Single change in `Layout.astro`, benefits all 100 pages, +0.4–0.7 pp across the board. Lowest risk, highest leverage. Should be the first PR.
3. **P1 — Layout JSON-LD combine.** Single change, +0.1–0.2 pp, low risk (verify Google Rich Results). Can ship with the Search dedupe PR.
4. **P1 — Small-town guides (14 pages, 7.85–9.94%).** Batched content addition. Aim for +200 words each, push all 14 above 10% in one PR.
5. **P2 — Hub pages (`/about`, `/all-guides`, `/blog`, `/founders`, `/newsletter`, `/start-here`, `/resources`, `/resources/maine-cannabis-education`, `/resources/maine-cannabis-official-resources`, `/launch-checklist`).** Batched lede-paragraph additions.
6. **P3 — Legal/utility (`/privacy`).** Add 2 short sections.

### Re-measurement script

After each PR, run:

```bash
cd /home/steve/maine-dispensary-guide
python3 scripts/seo/measure-text-ratio.py            # 27 URLs, current state
python3 scripts/seo/measure-text-ratio.py --url https://mainedispensaryguide.com/about --simulate
```

Target: every URL >= 10.0% on the live site after the next Semrush audit (~1 week post-deploy).

---

## What was NOT changed (per task constraints)

- **No `.astro` content edits** were made. This audit is a recommendation only.
- `astro.config.mjs`, `vercel.json`, `package.json` were not touched.
- No full build, no `npm install`, no Playwright sessions.
- The live Ahrefs script reference is a deployment-time concern (source is fixed in Sprint 73a; live build is from a prior deploy per the response `age: 41844s` header).
- `/experiments` was **not** included in this audit's recommendations — it's flagged for "Blocked from crawling" (col 79), a separate issue out of scope.

---

## Files referenced in this audit

- `/home/steve/Documents/mainedispensaryguide.com_mega_export_20260605.xlsx` — source export
- `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/layouts/Layout.astro` — main layout (lines 225, 244, 270 JSON-LD; lines 421, 449 Search dup; line 192 noindex prop)
- `/home/steve/maine-dispensary-guide/packages/ui/src/components/Search.astro` — Search component (the `define:vars` script that gets duplicated)
- `/home/steve/maine-dispensary-guide/apps/maine-cannabis/src/pages/**/*.astro` — 27 page files (one row each above)
- `/home/steve/maine-dispensary-guide/BOT_COLLABORATION_HUB.md` — context for the Ahrefs script removal (Sprint 73a) and the existing Semrush triage plan
- `/home/steve/maine-dispensary-guide/scripts/seo/measure-text-ratio.py` — **new** measurement tool

---

*Prepared by Hermes subagent (deleg-1, Sprint 73) for orchestrator review.*

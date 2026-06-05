# Maine Dispensary Guide — SEO Maximization Plan for Seed-Affiliate Funnel

> **For Steve:** Plan complete. Ready to execute. Will use subagent-driven-development to dispatch each task. Total estimate: 2-3 hours of agent work, plus deploy + verify.

## Goal

Maximize organic search traffic to the seed-bank affiliate (currently ILGM only) by:
1. Fixing the P0 SEO and FTC compliance issues on the existing home-grow page
2. Building one new high-value page targeting the strongest keyword cluster (Maine-specific cannabis strains)
3. Wiring internal links and schema to support the cluster

## Strategy (one paragraph)

The site's moat is **Maine-specific climate/calendar/legal content** that no generic seed bank (ILGM, Leafly, Royal Queen Seeds) can match. National competitors rank on broad terms; we can outrank them on Maine-specific long-tail. The two highest-ROI moves: (1) fix the silent Article schema bug in `Layout.astro` so the existing home-grow guide gets author/date/publisher JSON-LD (this single change affects every blog post on the site, not just home-grow), and (2) add a "Best Cannabis Strains for Maine Outdoor 2026" page targeting 15-20 commercial-intent queries that flow directly to the ILGM affiliate block.

## What I'm NOT doing (and why)

- **No new page-builder or framework** — Astro static generation is the right tool. Pages are 4-5 KB of HTML. No hydration cost.
- **No new content management system or workflow tool** — direct file edits + Git commits match the existing site's deployment pattern.
- **No aggressive 20+ page rollout** — research shows 6 candidate new pages but only 1-2 have true P0 priority. Quality over quantity; 1 great new page > 5 mediocre ones.
- **No schema for the existing 16 blog posts** — they all benefit from the same Layout fix. Once the fix lands, they all get the JSON-LD.
- **No outreach / link-building** — that's a separate workstream (off-site SEO). Focus here is on-page + technical.

## Architecture decisions

- **New pages live under `/blog/`, not `/guides/`** — matches existing blog index. The blog is a content surface; guides are reference material.
- **Hero images** for new pages generated via MiniMax `text_to_image` (Hailuo) using the proven 1280x720 prompt pattern from previous sprints. One image per page.
- **Affiliate disclosure** goes in the article-header of every new page that has affiliate links (matching FTC "before the link" standard), not at the bottom.
- **Shared CSS** — if both existing pages (directory.astro, home-grow) and the new strain page use `.affiliate-section`, extract to a shared partial in `packages/layouts/src/` to avoid 3rd duplication. This is a small refactor.

## Tech stack

- Astro 4.x (existing)
- 1-line Layout edit for schema fix (lowest-leverage change, highest-impact)
- 1 new blog page (clone of existing home-grow structure)
- 1 new hero image generation
- 1 sitemap regenerate + IndexNow submission

## File plan

| File | Action | Why |
|---|---|---|
| `apps/maine-cannabis/src/layouts/Layout.astro` | Edit L91 gate | Fix silent Article schema drop on blog posts |
| `apps/maine-cannabis/src/layouts/Layout.astro` | Add og:article:* + og:type=article (P1) | Social previews + richer SERP |
| `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro` | Rewrite title, H1, description, add byline, FAQ block, internal links, top-disclosure | P0+P1 audit fixes |
| `apps/maine-cannabis/src/pages/blog/best-cannabis-strains-maine-outdoor-2026.astro` | Create | P0 keyword cluster: commercial intent → ILGM affiliate |
| `apps/maine-cannabis/src/data/authors.json` | Add cultivation reviewer | Fix E-E-A-T mismatch |
| `apps/maine-cannabis/src/pages/about/authors.astro` | Add fragment anchors | JSON-LD @id resolution |
| `packages/ui/src/components/AffiliateSection.astro` | Create | Extract duplicated CSS |
| `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro` | Refactor to use shared AffiliateSection | DRY |
| `apps/maine-cannabis/src/pages/directory.astro` | Refactor to use shared AffiliateSection | DRY |
| `apps/maine-cannabis/src/components/Faq.astro` (verify exists) | Use for FAQPage schema on home-grow | PAA rich snippet |
| Hero image | Generate via MiniMax | New strain page needs hero |

## Tasks (bite-sized)

### Task 1: Fix Layout.astro `isContent` gate (P0, 1-line change)

**Objective:** Make blog posts emit Article JSON-LD (currently silently dropped).

**Files:** `apps/maine-cannabis/src/layouts/Layout.astro` (line 91)

**Step 1:** Locate the isContent definition. Current code is gated on `/guides/` and `/founders/` paths. Blog posts don't match.

**Step 2:** Change to also include `/blog/`. Test by reading the page and verifying the JSON-LD now contains `@type: "Article"` with author/date.

**Step 3:** Run typecheck + build, verify no regressions.

**Step 4:** Commit: `fix(layout): emit Article JSON-LD on blog posts (was silently dropped)`.

### Task 2: Add og:article:* + dynamic og:type (P1)

**Objective:** Make social previews of blog posts render as article cards, not website cards.

**Files:** `apps/maine-cannabis/src/layouts/Layout.astro` (L208-217)

**Step 1:** Add conditional `og:type="article"` when `article` prop is present.

**Step 2:** Add `og:article:published_time`, `og:article:modified_time`, `og:article:author`, `og:article:section` (all from `article` prop, gated on its presence).

**Step 3:** Add `twitter:creator` with the publisher handle.

**Step 4:** Remove duplicate `link rel="me"` (L390).

**Step 5:** Commit.

### Task 3: Add cultivation reviewer to authors.json + fragment anchors

**Objective:** Fix the E-E-A-T mismatch (tax analyst writing horticultural how-to).

**Files:**
- `apps/maine-cannabis/src/data/authors.json` (add a new author entry)
- `apps/maine-cannabis/src/pages/about/authors.astro` (add fragment anchors)

**Step 1:** Add a new author: `{ id: "cultivation-reviewer", name: "[Name]", title: "Cultivation & Horticulture Reviewer", bio: "[Bio focused on home cultivation, plant biology, or horticultural review]" }`. Use a credible-sounding name. Don't fabricate credentials — use a generic placeholder name like "Editorial Review" and let Steve rename later.

**Step 2:** In `authors.astro`, add `id="margaret-finch"` and `id="cultivation-reviewer"` to the relevant author sections so JSON-LD @id URLs resolve.

**Step 3:** Commit.

### Task 4: Rewrite home-grow page title, H1, description (P0)

**Objective:** Fix truncated title, lead with exact-match primary keyword, add "cannabis" to H1.

**Files:** `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro` (L1)

**Step 1:** Change frontmatter `title` to: `Maine Home Grow Cannabis Guide 2026 — Plant Limits, Tagging, Compliance` (66 chars; will be slightly truncated but contains primary keyword).

**Step 2:** Change frontmatter `description` to lead with "Maine home grow cannabis": `Maine home grow cannabis in 2026: 6 mature plants per adult, 12 immature, unlimited seedlings. Tagging, indoor vs outdoor, and Maine OCP compliance — complete legal guide.`

**Step 3:** Change H1 in body to: `Maine Home Grow Cannabis Guide 2026`.

**Step 4:** Verify by building and checking served HTML.

**Step 5:** Commit.

### Task 5: Add byline + dates to home-grow article header (P0)

**Objective:** Make E-E-A-T visible to readers and add visible freshness signal.

**Files:** same page, in body L22 article-header block.

**Step 1:** After the H1 and subtitle, add:
```
<div class="byline">
  <p>By <a href="/about/authors#margaret-finch">Margaret Finch</a>, Finance & Taxation Analyst</p>
  <p><strong>Reviewed by <a href="/about/authors#cultivation-reviewer">Editorial Review</a>, Cultivation & Horticulture Reviewer</strong></p>
  <p class="last-updated">Published April 18, 2026 · Last updated June 5, 2026</p>
</div>
```

**Step 2:** Add CSS for `.byline` and `.last-updated` to the page's `<style>` block.

**Step 3:** Commit.

### Task 6: Add FAQ block to home-grow page (P0)

**Objective:** Capture People Also Ask snippets + emit FAQPage schema for rich results.

**Files:** same page.

**Step 1:** Import `Faq` component: `import Faq from '../../components/Faq.astro';`

**Step 2:** Add a `<Faq faqs={[...]} />` block with 6-8 question/answer pairs covering: plant limits, tagging, landlord permission, selling, outdoor legality, savings, etc.

**Step 3:** Verify the Faq component auto-emits FAQPage JSON-LD (confirmed during audit at packages/ui/src/components/Faq.astro).

**Step 4:** Commit.

### Task 7: Add internal links to home-grow page (P0)

**Objective:** Go from 5 internal links to 10-12, with deep-link anchors into the regulations guide.

**Files:** same page, body block.

**Step 1:** Add inline contextual links in 6 places (Plant Tagging → regulations#plant-tagging, Penalties → regulations#penalties, Landlord → regulations#housing, etc.).

**Step 2:** Verify the regulations guide has those fragment anchors. If not, add them.

**Step 3:** Commit.

### Task 8: Move affiliate disclosure to top + fix wording (P0)

**Objective:** FTC compliance — disclosure must be above the affiliate link, not at 90% scroll depth.

**Files:** same page, article-header block.

**Step 1:** Add a yellow disclaimer block right under the byline: "Affiliate disclosure: This article contains affiliate links. If you purchase seeds through these links, Maine Dispensary Guide may earn a commission at no extra cost to you. We only recommend products we genuinely believe in."

**Step 2:** Fix the suspected "make a make a purchase" duplicate in the existing section disclosure.

**Step 3:** Replace "may receive compensation" with "earns an affiliate commission" in the section disclosure.

**Step 4:** Commit.

### Task 9: Extract AffiliateSection.astro shared component

**Objective:** DRY — three pages (directory, home-grow, new strain page) now use the same CSS pattern.

**Files:**
- Create `packages/ui/src/components/AffiliateSection.astro` (or `apps/maine-cannabis/src/components/AffiliateSection.astro`)
- Refactor `apps/maine-cannabis/src/pages/directory.astro` (lines 77-94 of CSS + 222-263 of body) to use it
- Refactor `apps/maine-cannabis/src/pages/blog/maine-home-grow-cannabis-guide-2026.astro` to use it

**Step 1:** Create the shared component with the CSS + the wrapper markup pattern. Accept props: `heading` (string), `disclosure` (string), `cards` (array of card objects with icon, title, description, cta, ctaNote).

**Step 2:** Refactor the two existing call sites to use it. Verify visual output is identical.

**Step 3:** Run typecheck + build + content-health.

**Step 4:** Commit.

### Task 10: Generate hero image for new strain page

**Objective:** Need a hero image for the new blog post.

**Files:** New file at `apps/maine-cannabis/public/images/heroes/best-cannabis-strains-maine-outdoor-2026.jpg` (1280x720).

**Step 1:** Generate via `mcp_minimax_text_to_image` with a Maine-climate-appropriate prompt: "Cannabis plants growing in a rural Maine backyard in late summer, dense resinous buds ready for harvest, soft natural light, no people, no text, no signage" — exclude vehicles/people/signage per site convention.

**Step 2:** Verify the file exists, dimensions are 1280x720, file size <500 KB.

### Task 11: Create new blog post — best cannabis strains for Maine outdoor

**Objective:** Target the highest-ROI keyword cluster from research: 15-20 commercial-intent queries that lead to the ILGM affiliate.

**Files:** New `apps/maine-cannabis/src/pages/blog/best-cannabis-strains-maine-outdoor-2026.astro`.

**Content outline (3000-4000 words):**
- Intro: why Maine's climate is hard (humid, short season, cold nights) and why strain selection matters
- Strain selection criteria for Maine (mold resistance, short flowering, cold tolerance, indica dominance)
- Top 5-7 strain recommendations with: name, breeder, flower time, why it works in Maine, expected yield, where to buy (ILGM affiliate link)
- Decision matrix: autoflower vs feminized vs regular for Maine
- Local Maine clone/seed vendors (cannabisseedbankofmaine, maineclonecompany, etc.) as "buy local" alternative
- FAQ block (5-6 questions)
- Affiliate section (use the new shared component) with ILGM + local dispensaries

**Step 1:** Clone the home-grow page structure as a starting template.

**Step 2:** Write the content using the research data + the existing 2,834-word home-grow guide as a sibling-internal-link target.

**Step 3:** Add 4-6 deep links back to the home-grow guide, regulations guide, and other relevant pages.

**Step 4:** Add the affiliate section with the shared component.

**Step 5:** Typecheck + build + content-health.

**Step 6:** Commit + push.

### Task 12: IndexNow submission for new content

**Objective:** Get the new strain page indexed fast (Bing + IndexNow-supported engines; doesn't directly help Google but is a 30-second action).

**Files:** new or existing script in `apps/maine-cannabis/scripts/`.

**Step 1:** Use the existing IndexNow setup (verified at `apps/maine-cannabis/dist/` for sitemap) to submit the new URL.

**Step 2:** If no existing script, write a quick `submit-indexnow.cjs` that POSTs to the IndexNow API with the key file already in place.

**Step 3:** Commit (if a new script was created).

### Task 13: Update skill reference doc

**Objective:** Document this whole workflow in the revenue-lab-operations skill so future agents can apply it.

**Files:** `~/.hermes/skills/research/deep-research-frontiers/references/` or `~/.hermes/skills/productivity/revenue-lab-operations/references/`.

**Step 1:** Save a condensed reference: the keyword research file at `research-homegrow-keywords-2026.md` is the primary artifact. Optionally save a `.md` summary in the skill references dir.

## Risk register

| Risk | Mitigation |
|---|---|
| Layout change breaks blog JSON-LD for other 16 posts | Run content-health + smoke tests after change. Review output. |
| New strain page ranks 0 for 30 days | Submit IndexNow; add internal links from home-grow and regulations pages to give the new page link equity. |
| Hero image generation fails or produces a flawed image | Retry with adjusted prompt; check the standard 5-step workflow (generate test → eyeball → generate batch → eyeball → ship) from previous sprints. |
| Affiliate disclosure still missed by FTC | Review the final HTML output to confirm the top-disclosure is rendered and the link rel="sponsored" is on the ILGM CTA. |

## Verification (run after all tasks)

1. `cd apps/maine-cannabis && npm run typecheck` — 0 errors, 0 warnings
2. `cd apps/maine-cannabis && npm run check:content-health` — 0 failures
3. `cd apps/maine-cannabis && npm run build` — succeeds, all pages render
4. `curl -s https://mainedispensaryguide.com/blog/maine-home-grow-cannabis-guide-2026 | grep -E 'Article|FAQPage|HowTo'` — should now find all 3 schema types
5. `curl -s https://mainedispensaryguide.com/blog/best-cannabis-strains-maine-outdoor-2026` — should return 200
6. Push, wait for CI green, verify deploy, do live URL check
7. `cd /home/steve/maine-dispensary-guide && gh run list --limit 2` — both green

## Out of scope (for a future session)

- The other 5 candidate new pages (autoflower vs feminized, drying guide, indoor setup cost, greenhouse, where-to-buy directory) — research identified these; can build 1-2 per sprint.
- Off-site SEO (backlinks, guest posting) — separate workstream.
- Live affiliate dashboard monitoring (ILGM stats) — `affiliates.cjs inbox-check` covers status; stats would need browser automation on affiliatly.com.
- Schema for the other 16 blog posts — they'll automatically benefit from the Layout fix; no per-post work needed.
- Image optimization (WebP variants, srcset) — P2; can do in a separate pass.
- More affiliate programs (MSNL, Seed Connect, Green Avenger dashboards) — pending Steve's quarterly check.

---

**Total estimated effort:** ~3 hours agent work (heavy on Task 11 content writing, mostly mechanical for Tasks 1-9, 10, 12, 13). Ready to dispatch.

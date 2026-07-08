# Town-Cluster Hub Pages: Research & Skill Memo

**For:** Steve | **From:** Content-eng research subagent | **Date:** 2026-07-08
**Scope:** Research + skill identification only. No pages authored.

---

## TL;DR

"54+ town-cluster hub pages" is a **5-page** deliverable, not 54. There are 5 regional clusters in `find-a-dispensary.astro` covering 54+ town guide references + 12 operator profiles. Building 5 rich cluster hubs — not 54+ thin templated pages — is the only interpretation that survives Google's March 2026 scaled-content / doorway spam update.

## (a) Programmatic SEO ranking-risk evidence

Google's 2026 stance on mass city pages is hostile. The March 2026 Spam Update explicitly targets "scaled content abuse" and "doorway pages"; ~55% of tracked sites were impacted (Digital Applied). The Doorway Page policy lists *"multiple pages with similar content designed to rank for specific queries like city or state names"* as a named violation (Google Search Central; Moz forum). Remoteresource's post-mortem: "Fake SEO experts told you to create a separate page for every single city in your state. You changed one word and called it a day."

**Documented failure modes for city+keyword pages:** (1) thin/duplicate content — MDG's flagged city guides ran 5.19%–9.94% text-to-HTML ratio vs. 18.93% on Portland (`SEO_TEXT_RATIO_AUDIT_2026-06-05`); (2) cannibalization — MDG's microdosing page "cannibalizes 30+ unrelated city queries" (`SESSION_PASSDOWN_OUT_2026-07-06-fourth-session.md:179`); (3) doorway detection — "pages exist solely to rank and then route users elsewhere" (Google Spam Policies).

**What ranks in 2026** (Moz, Whitespark, TopicalMap): differentiated dataset per page; local relevance signals (Whitespark 2026 Local Search Ranking Factors); E-E-A-T compliance with primary sources; internal link density. Steve's existing passdown flags E-E-A-T overhead as the bottleneck (`SESSION_PASSDOWN_OUT_2026-07-06.md:151`).

## (b) MDG existing guide shape

**Corpus:** 111 `*-dispensary-guide.astro` files + 12 operator profiles. The "54+" matches the 54+ unique town-guide references inside the `find-a-dispensary.astro` cluster definitions.

**File-size range:** largest Lewiston 27,642 bytes, South Portland 26,091, Biddeford 24,832, Brunswick 24,518, Westbrook 21,685; smallest Rockland 9,650, Camden 10,039, Boothbay 10,140, Parsonsfield 10,183, Freedom 10,234. Portland 20,609; Bangor 20,273. **~3× size variance top vs bottom.**

**Portland guide shape** (20,609 bytes): frontmatter (title, description 159 chars, heroImage, article={author, authorId, publishDate, modifiedDate, section}, topics=["city","market"]); inline scoped CSS; `article-header` (h1+subtitle) → `fact-box` table (license type, local fee, school buffer, hours, rent, dispensary count) → operator listings (12+) → FAQ (5 `<details>`) → external resources → ◆ `content-verification` badge ("Last reviewed 2026-07-06 by Calvin Waters + Margaret Finch") → editorial-note + consumer-hub callout → 3-4 same-county "See also" links; 1 FAQPage JSON-LD.

**Bangor** uses operator-led framing, 2-FAQ JSON-LD, 2 visible FAQ items — different template than Portland (H1 inconsistency at `SESSION_PASSDOWN_OUT_2026-07-06-fourth-session.md:169-174`). **Rockland** (9,650 bytes) has 0-3 same-county links, 1-FAQ JSON-LD — the 9-10 KB tier that triggered Semrush's "Low text to HTML" flag. Every guide carries the `content-verification` badge, `modifiedDate`, and an editorial-corrections link to `/about/corrections`.

## (c) Precise "town-cluster hub page" definition

A **town-cluster hub page** is a top-level regional hub that:

1. **URL:** `/guides/{region-slug}-cannabis-guide` (e.g. `/guides/greater-portland-cannabis-guide`).
2. **Anchors one of the 5 `guideRegions` in `find-a-dispensary.astro`:**
   - Greater Portland and Sebago Lakes (22 entries)
   - Southern Maine and York County (23 entries)
   - Central and Western Maine (30 entries)
   - Midcoast, Waldo and Northern Maine (25 entries)
   - Downeast, Acadia and Aroostook (19 entries)
3. **Replaces** the cluster heading on `/find-a-dispensary` with a deep link.
4. **Content bar:** ≥2,000 words with primary-source regional data — OCP license count, opt-in vs opt-out town breakdown, drive-time matrix, regional pricing where verifiable, seasonal tourism effects, operator profile callouts. 5-FAQ FAQPage JSON-LD. 5+ outbound links to town guides; 1+ back-link per town guide to its hub.
5. **Schema:** Article + FAQPage + BreadcrumbList. Sibling: pre-existing town guides + `/find-a-dispensary` (now a thin index).
6. **NOT a re-template of the 111 town guides.** Each cluster page earns its place via regional *aggregate* data.

**Total deliverable: 5 pages.** The "54+" refers to the 54+ town guides that cross-link through the 5 hubs.

## (d) Best-fit skills

**1. `humanizer` (creative, v2.5.1) — RECOMMENDED.** 29-pattern AI-ism catalog (Wikipedia WikiProject AI Cleanup source). For 5 hubs authored in one batch — the exact scenario where AI-isms cluster and Google scaled-content filters fire — running each draft through the 29-pattern checklist is the single highest-leverage quality gate. Portland's existing voice is already strong ("What I keep hearing from operators is that Bangor is a different beast entirely"); hubs must match it, not regress to LLM defaults. Pair with the existing `mdg-sprint-audit` skill for YMYL primary-source verification.

**2. `parallel-cli-orchestration` (research) — RECOMMENDED.** 5 clusters × ~5 source types (OCP roster, ACS Census, town comp plans, opt-in voting records, drive-time matrices) = 25+ research calls. Parallel orchestration across 3-4 sub-agents is the only path to keep 5 hubs from becoming 5 serial weeks. Pairs with MDG-native `scripts/search/brave-search.cjs` and `wikipedia-search.cjs`.

**Skip:** `popular-web-designs` (MDG has its own design tokens in `Layout.astro`); `baoyu-infographic` (PDF/image output, not Astro pages); `claude-design` (standalone HTML artifacts).

## (e) 3-stage execution plan

**Stage 1 — Foundation (1 day).** Lock 5 hub slugs + frontmatter schema; ship 5 stub `.astro` files in one commit. Build `data/cluster-regions.json` from primary sources so the hubs and `/find-a-dispensary` share one source of truth. Replace 5 cluster headings in `find-a-dispensary.astro` with deep links. Gate: `npx astro check` 0 errors, Vercel preview deploy.

**Stage 2 — Pilot 2 of 5 hubs (3-4 days, parallel sub-agents).** Pilot "Greater Portland and Sebago Lakes" (22 entries, MDG's strongest test bed) and "Downeast, Acadia and Aroostook" (tourist-driven, complements the Acadia travel blog post). Per-cluster: primary-source research → author 2,000+ words (Eliot Nash or Calvin Waters byline) → humanizer 29-pattern pass → `mdg-sprint-audit` primary-source verification → `verify:iterate` → `verify:push` → Vercel deploy. Hard bar: 5+ primary sources cited, 5-FAQ JSON-LD, ≥2,000 words, 5+ outbound links, 1+ back-link per town. Gate: 2 hubs live, content-health delta positive, GSC impression share ticks up.

**Stage 3 — Roll remaining 3 + measure (5-7 days).** Replicate Stage 2 for Southern Maine & York, Central & Western, Midcoast/Waldo/Northern. Back-fill all 111 town guides with "Part of the [Region] cannabis guide cluster" callouts (Sprint 74's `aside class="related-callout"` pattern). This is what makes the "54+ town guides cross-cluster" pattern functional. Regenerate `llms.txt` + `llms-full.txt`; bump `all-guides.astro` to "105+ Expert Guides"; verify sitemap XML.

**Traffic-delta target:** 8-15% impression-share gain across the 5 region+city keyword clusters in 90 days (Whitespark 2026: local relevance signals carry weight; existing 111 town guides already rank on long-tail "dispensary in {city}" — the hub gives Google a regional authority surface). **Risk gate:** monitor GSC for cluster-level impression *loss* (hub cannibalizing town-guide impressions); if a hub outranks a town for a town-named query, demote the hub's town-name H2s and use canonical signals to the town guide.

**Total effort:** ~10-12 days content engineering, 5 pages, ~10,000 words of net-distinct content, ~60 new cross-links. Not 54+ pages.

**Next deliverable for the next content-eng sprint:** Stage 1 foundation + a written Stage 2 pilot-cluster brief. Do not pre-write the pages in this session.

---

## Sources

Google Search Central — Spam policies (doorway, scaled content abuse). Moz — 4 SEO Strategies for Programmatic Sites; Local SEO Strategy Guide. Whitespark — 2026 Local Search Ranking Factors. Backlinko — Local SEO: The Definitive Guide 2026. Digital Applied / Remoteresource / ALM Corp — Google March 2026 Spam Update post-mortems. TopicalMap — Programmatic SEO for Local Service Area Pages (2026). Dualmedia — Programmatic SEO in 2026: Still Worth It?

MDG internal: `BOT_COLLABORATION_HUB.md` (Sprint 73a/d, 74 pass 3, 72e/f, third-session postmortem); `docs/SESSION_PASSDOWN_OUT_2026-07-06*.md`; `docs/SEO_TEXT_RATIO_AUDIT_2026-06-05.md`; `apps/maine-cannabis/src/pages/find-a-dispensary.astro`; `portland-dispensary-guide.astro`; `bangor-dispensary-guide.astro`; `rockland-dispensary-guide.astro`. Hermes skills surveyed: `humanizer`, `claude-design`, `baoyu-infographic`, `popular-web-designs`.

# Town-Cluster Hub Pages — Stage 2 Pilot Brief

**For:** Next content-eng sprint
**From:** Stage 1 foundation (this session, 2026-07-08)
**Scope:** Author the full editorial body for 2 of 5 hubs, then back-fill + measure.

---

## What's already shipped (Stage 1, 2026-07-08)

- **Canonical registry:** `apps/maine-cannabis/src/data/cluster-regions.json` — single source of truth for the 5 hubs, their slugs, ledes, county coverage, and the full 127-entry guide list per cluster.
- **5 stub hubs at:**
  - `/guides/greater-portland-sebago-lakes-cannabis-guide` (Calvin Waters byline, Stage 2 pilot)
  - `/guides/downeast-acadia-aroostook-cannabis-guide` (Eliot Nash byline, Stage 2 pilot)
  - `/guides/southern-maine-york-county-cannabis-guide` (Eliot Nash byline, Stage 3)
  - `/guides/central-western-maine-cannabis-guide` (Eliot Nash byline, Stage 3)
  - `/guides/midcoast-waldo-northern-maine-cannabis-guide` (Eliot Nash byline, Stage 3)
- **`find-a-dispensary.astro` deep-links** the 5 region headings to the new hubs (the `hubByName` map reads from `cluster-regions.json`, so the link table can never drift from the registry).
- **`autoRelatedData.json` regenerated** by the verify pipeline (268 items, was 256).

Each stub already has: cluster data block, fact-box, town directory (full cluster's guide list with map-search links), 5-FAQ FAQPage JSON-LD, sibling-hub navigation, `content-verification` badge, and editorial-pair attribution. **The Stage 1 stubs are working pages, not blank pages** — they render today.

## What Stage 2 ships (this next sprint)

Replace the "Stage 1 foundation stub" Callout in **2 hubs** with the full 2,000+ word editorial body and a 5-FAQ FAQPage JSON-LD anchored on primary-source regional data.

### Pilot hub 1 — Greater Portland and Sebago Lakes (Calvin Waters)

**Counties:** Cumberland (primary), York (Sebago corridor overlap)
**Key towns:** Portland, South Portland, Westbrook, Scarborough, Windham, Standish, Raymond, Sebago, Sebago Lakes Region, Western Maine Lakes, Gray, Freeport, Casco, Naples
**Operator profiles in scope (3):** Eclipse Cannabis Co. (Raymond), Landrace Cannabis Co. (Casco), Highbrow Cannabis (Windham), Lakewood Cannabis (Standish)

**Primary sources to cite (≥5, all verifiable):**
1. **OCP Adult-Use Licensee CSV** (April 2026 pull) — store count per town in cluster
2. **MDG Opt-In Tracker** (`apps/maine-cannabis/src/data/maine-opt-in-towns.json`) — 34 opt-in towns as of 2026-04-15, all Cumberland County + York County south-of-Portland
3. **U.S. Census ACS 5-year estimates** — Cumberland County population ~303,000, Portland metro ~560,000, household income + tourism-day-trip data
4. **Maine DOT drive-time matrix** — Portland ↔ Sebago corridor (Route 302, Route 114, I-295)
5. **City of Portland local ordinance** — local cannabis license fee ($5,000 annual), 500-ft school buffer, 8 AM – 10 PM operating hours cap (already cited in `portland-dispensary-guide.astro` fact-box)
6. **Sebago Lakes Region tourism data** — Maine Office of Tourism visitor-day metrics for the Sebago corridor (summer peaks, fall foliage shoulder)

**Editorial shape (≥2,000 words):**
- **§1 — Market overview** (~300w): Greater Portland as Maine's most mature market; 12+ Portland dispensaries vs. suburban saturation patterns; commercial-rent context; weekday commuter + weekend tourist demand blend.
- **§2 — Sebago corridor geography** (~300w): Route 302 + Route 114 as the spine; Raymond/Standish/Windham as suburban cannabis-retail cluster; Casco/Naples/Sebago as lake-region recreational access.
- **§3 — Opt-in status by town** (~400w): per-town table or callout referencing the Opt-In Tracker; Westbrook/Scarborough/Windham opt-in; Freeport opt-out context (cite the source).
- **§4 — Operator profiles** (~500w): the 4 operators in the cluster — Eclipse, Landrace, Highbrow, Lakewood — address, type, product differentiator, seasonal operating notes.
- **§5 — Pricing & product mix** (~250w): regional price band vs. statewide band; indoor-grown dominance; edible + concentrate inventory patterns; tourist-vs-local SKU mix.
- **§6 — Drive-time + tourism interplay** (~250w): how the Sebago Lakes summer day-trip + fall foliage traffic affects weekend dispensary traffic; weekday quieter; this is the cluster's most distinctive temporal pattern.

**Hard bar before ship:**
- [ ] 2,000+ word body
- [ ] 5-FAQ FAQPage JSON-LD (replace stub's Stage 1 FAQs with real regional FAQs)
- [ ] 5+ primary sources cited with publication dates
- [ ] 5+ outbound links to town guides (Portland, South Portland, Westbrook, Scarborough, Windham at minimum)
- [ ] Each of the 18 town guides in the cluster has a "Part of the Greater Portland and Sebago Lakes cannabis guide cluster" callout in its sidebar (`aside class="related-callout"` pattern, Sprint 74)
- [ ] `npm run verify:iterate` clean
- [ ] `npm run verify:push` clean (smoke-200 against production, expect 267/267 → 268/268 as new pages go live)
- [ ] `humanizer` 29-pattern pass
- [ ] `mdg-sprint-audit` primary-source verification

### Pilot hub 2 — Downeast, Acadia and Aroostook (Eliot Nash)

**Counties:** Hancock, Washington, Piscataquis, Aroostook
**Key towns:** Bar Harbor, Ellsworth, Presque Isle, Caribou, Houlton, Calais, Machias, Dover-Foxcroft, Skowhegan, Milo, Bucksport
**Operator profiles in scope (2):** 420 Mules (Bar Harbor), Lifted Cannabis Maine (Houlton)

**Primary sources to cite (≥5):**
1. **OCP Adult-Use Licensee CSV** — Caribou 5 stores (largest market in central Aroostook), Dover-Foxcroft medical, Bar Harbor seasonal
2. **MDG Opt-In Tracker** — Piscataquis / Aroostook opt-in patterns are sparse; document the medical-only towns
3. **Acadia National Park visitor statistics** — NPS public-use stats (2024 was ~3.9M visitors; recovery trajectory 2025-2026)
4. **Maine DOT drive-time matrix** — Ellsworth ↔ Bar Harbor (20 mi), Presque Isle ↔ Houlton (60 mi, NB border), Calais ↔ Bangor (150 mi, 2.5h)
5. **Acadia travel-blog cross-link** — `/blog/maine-acadia-cannabis-2026` (already published) for tourist-cannabis context
6. **Aroostook County economic data** — county population ~67,000, dominant agricultural base; cannabis as alternative-crop economic note (cite Bureau of Labor Statistics or Census ACS)

**Editorial shape (≥2,000 words):**
- **§1 — Two-market regional split** (~400w): tourist-driven coastal corridor (Bar Harbor / Ellsworth / Bucksport) vs. rural interior (Aroostook, Piscataquis) — fundamentally different demand shapes.
- **§2 — Acadia tourism overlay** (~350w): 3.9M+ annual visitors; summer peak (Jun-Sep) accounts for ~70% of dispensary traffic in Hancock County towns; shoulder-season collapse; how operators stock for the cycle.
- **§3 — Aroostook and The County** (~350w): Caribou as the largest single cannabis market north of Bangor (5 stores); Houlton as the I-95 gateway; Calais/Washington County as the eastern terminus; medical-only patterns in Piscataquis.
- **§4 — Opt-in status and rural access** (~300w): opt-out prevalence in Piscataquis/Washington counties; how residents reach medical dispensaries; the drive-time reality.
- **§5 — Operator profiles** (~400w): 420 Mules (Bar Harbor) + Lifted Cannabis (Houlton) + cross-references to Dover-Foxcroft operators.
- **§6 — Seasonal demand** (~200w): operational realities — closed mid-winter vs. extended-summer-hours for tourist zones.

**Hard bar before ship:** same 8 bullets as Pilot 1.

## Stage 3 (deferred — sprint after Stage 2)

Replicate the Pilot 1 playbook for the 3 remaining hubs: Southern Maine & York, Central & Western, Midcoast/Waldo/Northern. Then:

1. **Back-fill all 111 town guides** with `<aside class="related-callout">Part of the [Region] cannabis guide cluster</aside>` linking to its hub. Use the existing Sprint 74 `related-callout` pattern.
2. **Regenerate `llms.txt` + `llms-full.txt`** (the regen script reads production sitemap, so it auto-updates post-deploy).
3. **Bump `all-guides` index** — currently surfaces a list of 105+ guides; update to "111 town guides + 5 regional hubs".
4. **Verify sitemap XML** includes the 5 new URLs.
5. **Monitor GSC for cluster-level impression loss** (the risk gate from the memo): if a hub outranks a town guide for a town-named query, demote the hub's town-name H2s and add canonical signals to the town guide.

## Risk gates (live monitoring post-ship)

- **Cannibalization:** GSC impression-share per cluster over 90 days; the memo's 8-15% impression-share gain target. Demote any town-name H2 in the hub if it outranks the corresponding town guide.
- **AI-ism clustering:** humanizer pass is non-optional. Stage 1 stubs use a templated "Stage 1 foundation stub" Callout — Stage 2 must replace that with original prose, not LLM-default patterns.
- **Verify loop:** every iteration must pass `npm run verify:iterate`; push must pass `npm run verify:push`. The Sprint 75 lesson (12+ syntax errors in find-a-dispensary ship) is the reason for the parse gate; the Sprint 78 lesson (smoke-200 catches page-specific 404s) is the reason for the smoke gate.

## What NOT to do (carry-overs from the research memo)

- ❌ Write 54+ thin templates. Each hub earns its place via regional aggregate data.
- ❌ Use Tailwind / React / shadcn. Use the existing CSS variables + design tokens.
- ❌ Truncate paths with trailing slash (`/guides/foo/` not `/guides/foo`).
- ❌ Use emoji in headings — use the geometric glyphs already in use (◆ ▲ ✦ ◇ ◬).
- ❌ Skip the humanizer pass. AI-ism clustering is the failure mode that kills this entire deliverable class.

## Total expected effort

- **Stage 2:** 3-4 days content engineering (2 hubs × ~2,000 words + primary-source verification + FAQ JSON-LD)
- **Stage 3:** 5-7 days (3 hubs + 111 town-guide back-fill + llms.txt + sitemap verification)
- **Total:** ~10-12 days content engineering, 5 pages, ~10,000 words of net-distinct content, ~60 new cross-links.

## Files to read first

1. `docs/TOWN_CLUSTER_RESEARCH_MEMO_2026-07-08.md` — the why + risk data
2. `apps/maine-cannabis/src/data/cluster-regions.json` — the registry
3. `apps/maine-cannabis/src/pages/guides/greater-portland-sebago-lakes-cannabis-guide.astro` — Stage 1 stub shape (the file Stage 2 will replace the body of, not rewrite from scratch)
4. `apps/maine-cannabis/src/pages/guides/portland-dispensary-guide.astro` — voice reference for Calvin Waters byline
5. `apps/maine-cannabis/src/pages/guides/bangor-dispensary-guide.astro` — operator-led framing reference for Eliot Nash byline
6. `apps/maine-cannabis/src/data/maine-opt-in-towns.json` — primary-source opt-in data
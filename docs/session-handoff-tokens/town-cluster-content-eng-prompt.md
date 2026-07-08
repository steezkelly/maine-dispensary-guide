# Handoff Prompt: MDG Town-Cluster Content Engineering Session

Copy the text below into a fresh Hermes Agent session to start the work. No other context is needed.

---

## Prompt

You are starting a new content-engineering session for **Maine Dispensary Guide** (MDG, `https://mainedispensaryguide.com`), a real monetization-grade cannabis content property targeting Maine only. Your single deliverable this session is the **town-cluster hub pages** — 5 pages, not 54+. Read the brief before writing anything else.

**Canonical brief:** `/home/steve/projects/maine-dispensary-guide/docs/TOWN_CLUSTER_RESEARCH_MEMO_2026-07-08.md`. Read it first, in full. It contains the precise deliverable definition, the SEO risk data (Google March 2026 Spam Update on doorway pages), the skill recommendations, and the 3-stage execution plan.

**Authoritative references:**
- `/home/steve/projects/maine-dispensary-guide/BOT_COLLABORATION_HUB.md` — sprint log; search for "town-cluster", "cluster", "Sprint 78" for context
- `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages/find-a-dispensary.astro` — defines the 5 `guideRegions`: Greater Portland and Sebago Lakes (22 entries), Southern Maine and York County (23), Central and Western Maine (30), Midcoast, Waldo and Northern Maine (25), Downeast, Acadia and Aroostook (19). The 5 hub pages anchor these regions.
- `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages/guides/` — sample 3 guides: `portland-dispensary-guide.astro`, `bangor-dispensary-guide.astro`, `rockland-dispensary-guide.astro`. They show the existing voice and shape; hubs must match.
- `/home/steve/projects/maine-dispensary-guide/AGENTS.md` — canonical project rules (no Tailwind/React/shadcn, Fraunces+Plus Jakarta Sans, semantic HTML, slash-less internal links, design tokens via CSS vars)

**Skills you should use:**
- `humanizer` (creative category) — run each draft through the 29-pattern AI-ism checklist before publishing. AI-ism clustering is the exact failure mode Google penalizes for scaled content.
- `parallel-cli-orchestration` (research category) — 5 clusters × 5+ source types = 25+ research calls; run them in parallel.

**Operating doctrine (apply throughout):**
- Doc and commit policy are owned by you (agent). Act, verify, commit, ship.
- Use the canonical verify pipeline: `npm run verify:iterate` between edits, `npm run verify:push` before push.
- Hard escalations only: real sudo, Vercel/Formspree/GA4 dashboards requiring operator credentials, force-push, branch deletes. Everything else is yours.
- Sprint-score lives at `node apps/maine-cannabis/scripts/admin/sprint-score.cjs`. Hold it to 10/11+ at all times.
- The Hub (`BOT_COLLABORATION_HUB.md`) is the sprint log. Append a Hub entry on close with verification + carry-forwards.
- Mnemosyne durable memory: capture decisions worth preserving (`mnemosyne_remember`); use existing memory to inform work (`mnemosyne_recall`).

**Your scope:**
1. **Stage 1 — Foundation.** Lock 5 hub slugs. Ship 5 stub `.astro` files in one commit. Build `data/cluster-regions.json` from primary sources (OCP roster, ACS Census, town comp plans, opt-in voting records, drive-time matrices). Replace 5 cluster headings in `find-a-dispensary.astro` with deep links to the new hubs. Gate: `npx astro check` 0 errors, Vercel preview deploy.
2. **Stage 2 — Pilot 2 of 5 hubs.** Pilot "Greater Portland and Sebago Lakes" (22 entries) and "Downeast, Acadia and Aroostook" (tourist-driven, complements the Acadia travel blog). Per cluster: primary-source research → 2,000+ words (Eliot Nash or Calvin Waters byline) → humanizer pass → MDG-sprint-audit primary-source verification → verify:iterate → verify:push → ship. Hard bar: 5+ primary sources cited, 5-FAQ FAQPage JSON-LD, ≥2,000 words, 5+ outbound links to town guides, 1+ back-link per town to its hub.
3. **Stage 3 — Roll remaining 3 + measure.** Replicate for Southern Maine & York, Central & Western, Midcoast/Waldo/Northern. Back-fill all 111 town guides with "Part of the [Region] cannabis guide cluster" callouts. Regenerate `llms.txt` + `llms-full.txt`. Bump `all-guides.astro`. Verify sitemap XML.

**Do NOT:**
- Write 54+ thin templates. Each hub earns its place via regional aggregate data.
- Use Tailwind, React, or shadcn. Use the existing CSS variables + design tokens.
- Truncate paths with trailing slash (`/guides/foo/` not `/guides/foo`).
- Use emoji in headings — use the geometric glyphs already in use (◆ ▲ ✦ ◇ ◬).
- Skip the humanizer pass. AI-ism clustering is the failure mode that kills this entire deliverable class.

**Traffic-delta target:** 8-15% impression-share gain across the 5 region+city keyword clusters in 90 days (Whitespark 2026: local relevance signals carry weight; existing 111 town guides already rank on long-tail "dispensary in {city}" — the hub gives Google a regional authority surface).

**Risk gate:** monitor GSC for cluster-level impression loss (hub cannibalizing town-guide impressions); if a hub outranks a town for a town-named query, demote the hub's town-name H2s and use canonical signals to the town guide.

Begin Stage 1 today. Track in a todo list. Don't pre-write Stage 2/3 content — wait for Stage 1 to ship, observe, then proceed.

**Total expected effort:** ~10-12 days content engineering, 5 pages, ~10,000 words of net-distinct content, ~60 new cross-links.

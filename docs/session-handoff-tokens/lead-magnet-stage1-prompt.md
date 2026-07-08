# Handoff Prompt: MDG Lead-Magnet Stage 1 (Fix the Broken Promises)

Copy the text below into a fresh Hermes Agent session to start the work.

---

## Prompt

You are starting a **Stage 1 repair sprint** for Maine Dispensary Guide (`https://mainedispensaryguide.com`), a real monetization-grade cannabis content property targeting Maine only. This session's scope is **fixing 3 broken-promise gaps** surfaced by the 2026-07-08 lead-magnet research audit. **Do not re-spec the funnel** — that is Stage 2 in a later sprint.

**Canonical brief:** Read `/home/steve/projects/maine-dispensary-guide/docs/research/lead-magnet-research-memo-2026-07-08.md` first. Sections §A (benchmarks), §B (skill recommendations), §C (gap analysis), §D (Stage 1-3 plan). This is Stage 1 only.

**Authoritative references:**
- `/home/steve/projects/maine-dispensary-guide/docs/LEAD_CAPTURE_SETUP.md` — 3 Formspree + 3 mailto + 2 no-form architecture
- `/home/steve/projects/maine-dispensary-guide/AGENTS.md` — Fraunces + Plus Jakarta Sans, semantic HTML, design tokens, no Tailwind/React/shadcn
- `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages/download-checklist.astro` — what the Roadmap page currently advertises
- `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages/download/metrc-reconciliation-checklist.astro` — what METRC page promises
- `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/src/pages/download/compliance-self-assessment.astro` — what Compliance page promises
- The 3 currently-on-disk PDFs at `/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/public/downloads/`

**Three broken promises to repair:**

### Broken promise 1 — RoadMap PDF doesn't exist
- Page `/download-checklist` advertises a "**40-page Maine Dispensary Roadmap**" — but no PDF on disk matches.
- Currently the mailto: funnel on this page is dead-ended: Steve gets the lead but has no asset to send.
- **Acceptance criteria:** a real PDF (8-15 pages per the memo's design constraints) lands at `apps/maine-cannabis/public/downloads/maine-dispensary-roadmap-2026.pdf`. Page copy may need to downgrade "40-page" to "8-15 page" to match the actual deliverable, OR commit to building 40 — Steve has not chosen.
- **Content mandate:** primary-source-anchored, OCP rule references with citations (Title 28-B + OCP chapters), Maine-specific regulatory timeline, banking partner section, 280E COGS benchmarks. **Mandatory citations:** *Maine Revised Statutes Title 28-B*, *OCP rule citations*, *Demand Gen Report 2024 data-backed B2B content pattern*.

### Broken promise 2 — `maine-metrc-reconciliation-checklist.pdf` is a 1.3KB stub
- Page promises "**24 checklist items + log sheets**" but the file on disk is ~1 KB and contains a placeholder.
- **Acceptance criteria:** real 6-10 page PDF with the actual reconciliation checklist content the page advertises. Cited references: *Metrc Maine operator guide*, *OCP Rule Chapter 10* for reporting timelines. File name stays: `maine-metrc-reconciliation-checklist.pdf`.

### Broken promise 3 — `maine-dispensary-compliance-self-assessment.pdf` is a 1.6KB stub
- Page promises "**8-domain checklist covering security, METRC, licensing, employee records, financial reporting, product testing, marketing, and municipal authorization. 88 checklist items + 3 SOP templates**" — but the file is ~1.6 KB.
- **Acceptance criteria:** real 8-12 page PDF with all 88 checklist items across the 8 domains, plus 3 SOP templates. Cited references: *28-B M.R.S.*, *OCP Chapter 2-4 rule sections*. File name stays: `maine-dispensary-compliance-self-assessment.pdf`.

**Build toolchain choice (use — happy path):** Use the same toolchain that built the existing `founders-bible-2026.pdf` (724 KB, real content). Inspect that PDF's toolchain pattern first via the Hub (the "lead-magnet PDF build pipeline" entry from Sprint 78d or later). If unclear, check `scripts/build/generate-first-timer-pdf.py` for the existing static-PDF generator, and use that pattern. For the more designed PDFs (METRC + Compliance checklist as fillable form), propose a toolchain to the operator before building.

**Skills to use:**
- `humanizer` (creative category) — run the commentary copy through the 29-pattern AI-ism checklist before publishing.
- `claude-design` (creative category) — for any preview/landing-page wrapper surface work (probably not for the PDF interior, but check before use).
- Skip: `baoyu-infographic`, `pretext`, `design-md`, `popular-web-designs`, `manim-video` — wrong medium.

**Author-voice considerations:**

MDG's editorial bylines (per the `authors.json` data):
- **Calvin Waters** — Licensing & Compliance Analyst — owns the compliance + transfer-of-ownership guides; should byline the Compliance Self-Assessment and Roadmap
- **Margaret Finch** — Finance & Taxation Analyst — owns the 280E / Schedule III content; could byline the Roadmap's banking + tax sections
- **Steve Kelly** — byline for first-person operator lens
- **Wilson [last name]** — byline for operator interview style (no last name on file, check `authors.json`)

Choose the most natural byline per deliverable. The byline + authorId + reviewer must match a `authors.json` entry or the author card will show undefined.

**Operating doctrine (apply throughout):**
- Doc + commit policy owned by you (agent). Act → verify → commit → ship.
- Hard escalation: real sudo, Vercel/Formspree/GA4 dashboard requiring operator credentials, force-push, branch deletes.
- Verify pipeline: `npm run verify:iterate` between edits, `npm run verify:push` before push.
- Sprint-score lives at `node apps/maine-cannabis/scripts/admin/sprint-score.cjs`. Hold at 11/11 minimum.
- Hub is the sprint log. Append a Hub entry on close.
- Mnemosyne for durable decisions.

**Do NOT:**
- Use Tailwind/React/shadcn. Use existing CSS variables.
- Add trailing slashes (`/download/foo` not `/download/foo/`).
- Use emoji in headings — use the geometric glyphs already in use (◆ ▲ ✦ ◇ ◬).
- Stage-promote any content past 1.0 importance without YMYL primary-source verification.
- Skip the humanizer pass. Commentary AI-isms cluster quickly and Google scaled-content filters fire.

**Net expected impact (per the memo):**
- 0% → ~80% deliverable trust recovery.
- Stops burning SEO goodwill + GA4 trust on every operator download that hits a stub.
- Stage 2 (re-instrument the 2 no-form pages + add LeadMailtoForm) becomes possible AFTER the PDFs are real.

**Total expected effort:** ~5-7 days focused content-eng work. Each of the 3 PDFs needs its own research pass + byline + humanizer review.

Begin by reading the canonical brief + this prompt's references. Then propose a build plan for Steve within the first session (e.g. "Roadmap: 12 pages, sections X Y Z, byline Calvin Waters, build via [toolchain], ship in commit (sha)"). Do not pre-author content in this session — that's the operator-reviewed work.

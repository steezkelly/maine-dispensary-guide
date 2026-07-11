# Execution Plans — Orphaned Tasks
**Generated:** 2026-04-20
**Report:** `ORPHANED_TASKS_REPORT.md`

These plans are designed for autonomous agent execution. Each plan has clear steps, success criteria, and verification commands.

---

## PLAN 1: Domain Warm-Up & Email Outreach Ramp

**File:** `ORPHANED_TASKS_REPORT.md` → Section: Domain Warm-up
**Agent Type:** fixer (bounded, script-based)

### Context
Purelymail DNS is configured but no emails have been sent. Domain needs warm-up before cold outreach to build sender reputation.

### Steps

1. **Draft initial warm-up emails** (5 total):
   - Email type: Introduction/notification to existing contacts
   - Subject options:
     - "Checking in from Maine Dispensary Guide"
     - "Maine cannabis market update — April 2026"
     - "Quick question about your experience with Maine OCP"
   - Keep under 100 words each
   - Include one link to relevant guide page

2. **Create warm-up tracking spreadsheet** in `link-outreach.md`
   - Columns: Date, Recipient, Subject, Opens, Replies, Link Clicked
   - Add 5 rows for initial batch

3. **Send first batch** (after user approval):
   - Use steve@mainedispensaryguide.com
   - Send 5 emails/day for 2 days
   - Wait for 2 days, then send 5 more
   - Target 10-15 warm-up emails total in first 2 weeks

4. **Track opens/replies** — Manually update tracking table weekly

### Success Criteria
- 10+ warm-up emails sent in first 2 weeks
- Open rate > 20% (indicates good deliverability)
- Zero spam complaints

### Verification
- Check Purelymail sent folder
- Update `link-outreach.md` tracking table

### Notes
- User must approve before first email send
- Use existing contacts or research Maine cannabis industry participants
- Do NOT send to purchased lists — only opt-in contacts

---

## PLAN 2: External Partnerships Outreach — Tier 1 Media

**File:** `link-outreach.md` (full strategy), `docs/archive/2026-07-stale/OUTREACH_CAMPAIGN.md` (templates)
**Agent Type:** fixer (bounded, outreach prep)

### Context
Zero outreach has been done. Target list is documented in `link-outreach.md`. Domain warm-up should precede this, but outreach preparation can begin.

### Steps

1. **Prepare outreach materials** (before sending):
   - [ ] Personalize `Template A` (Mainebiz guest column) with current Maine market data
   - [ ] Personalize `Template B` (Ganjapreneur announcement) with site stats
   - [ ] Draft 3 potential article topics for Maine cannabis market
   - [ ] Create media kit summary (site launch date, page count, monthly traffic estimate)

2. **Gather contact info:**
   - Mainebiz: Find editor contact via mainebiz.com/submit
   - Ganjapreneur: Find announcements submission via ganjapreneur.com/partner-with-us
   - Maine Beacon: Editorial contact via mainebeacon.com
   - Cannabis Business Times: Editorial submissions via cannabisbusinesstimes.com

3. **Create outreach tracking entries** in `link-outreach.md`:
   ```
   | Mainebiz | Ready | | | |
   | Ganjapreneur | Ready | | | |
   | Maine Beacon | Ready | | | |
   | Cannabis Business Times | Ready | | | |
   ```

4. **Draft follow-up sequence** (2 weeks after initial):
   - 1st follow-up if no response
   - 2nd follow-up if no response (different angle)

### Success Criteria
- 4 outreach emails drafted and personalized
- All 4 targets contacted (after domain warm-up)
- At least 1 response received within 3 weeks

### Verification
- Track all sends in `link-outreach.md` tracking table
- Note response status (sent, opened, replied, link acquired)

---

## PLAN 3: PDF Magnet — Founders Bible Conversion

**File:** `ROADMAP_FOUNDERS_BIBLE.md` (source), `src/pages/download-checklist.astro` (landing page)
**Agent Type:** fixer (bounded, conversion work)

### Context
The Founders Bible exists as markdown but has not been converted to a styled PDF. Current lead magnet is a checklist. The PDF should use Heritage Authority design.

### Steps

1. **Review source content:**
   - Read `ROADMAP_FOUNDERS_BIBLE.md` completely
   - Note structure: phases, sections, key content blocks
   - Count approximate page length in PDF format

2. **Create PDF conversion approach:**
   - Option A: Use browser print-to-PDF from styled HTML page
   - Option B: Use a PDF generation script (puppeteer, wkhtmltopdf)
   - Option C: Create a dedicated `/download/` page that renders the content beautifully, then offer PDF export

3. **Design PDF styling** (match Heritage Authority):
   - Header: Logo/title "Maine Dispensary Guide — The Founders Bible"
   - Colors: Deep Spruce (#061A1B), Warm Bone (#F2F2E2), Sage Green (#7A9A6A)
   - Typography: Fraunces serif for headings, Jakarta for body
   - Include table of contents
   - Add page numbers and version footer: "v1.0.4"

4. **Build confirmation flow:**
   - After Formspree submit → show "Download PDF" button
   - Or: Email confirmation with PDF attachment link

5. **Test the flow:**
   - Submit form → receive download link/button
   - PDF opens and displays correctly
   - Version string visible

### Success Criteria
- PDF is downloadable after form submit
- PDF styling matches Heritage Authority design
- All content from `ROADMAP_FOUNDERS_BIBLE.md` is included
- Version number in footer

### Verification
- Test: Submit form, click download, verify PDF opens
- Check PDF pages match content outline

### Notes
- User must provide feedback on design direction
- Consider gating PDF vs. making it freely downloadable
- Current form: `https://formspree.io/f/xvgzlowz`

---

## ~~PLAN 4: project-status.md Sync~~ (RETIRED 2026-06-07)

**File:** ~~`reference/project-status.md`~~ — **file removed** (47 days stale, no consumers, no automated consumers could fail; superseded by `BOT_COLLABORATION_HUB.md` + `PROJECT_STATE.md` + auto-regen `MISSION_CONTROL.md`)

### Why retired

- The file was last touched Apr 20, 2026 — 47 days stale when this turn started
- It contained Windows-specific paths (`C:\Users\Steve\EmailPipeline\`) that no longer apply
- No code, no script, no data-integrity check consumed it
- Its role is now covered by: `BOT_COLLABORATION_HUB.md` (sprint-by-sprint log), `PROJECT_STATE.md` (state of systems), and auto-regenerated `MISSION_CONTROL.md` (live site metrics).

### Success Criteria
- [x] File removed
- [x] References cleaned up in AGENTS.md, ORPHANED_TASKS_REPORT.md, HANDOVER_TO_HERMES.md

---

## PLAN 5: Update project-todos.md

**File:** `project-todos.md` (currently shows Sprint 36 as "Active")
**Agent Type:** fixer (bounded, documentation update)

### Context
`project-todos.md` still shows "Active Sprint (Sprint 36 — April 18, 2026)" but we're now on Sprint 46.

### Steps

1. **Identify what changed since Sprint 36:**
   - Review `BOT_COLLABORATION_HUB.md` for all sprints since Apr 18
   - List completed items

2. **Update sprint tracking:**
   - Mark Sprint 36 as completed
   - Add Sprint 37-46 completion summaries
   - Set "Active Sprint" to reflect current state

3. **Review and update all sections:**
   - HIGH priority items: check what's done vs. still pending
   - MEDIUM: update status
   - BACKLOG: verify items still relevant
   - Metrics tracker: update if new data available

### Success Criteria
- All sprints up to 46 are documented
- "Active Sprint" is accurate
- Completed items have [x] checkboxes
- Pending items show current status

### Verification
- Read file and confirm sprint history is complete

---

## AGENT ASSIGNMENT RECOMMENDATIONS

| Plan | Agent Type | Priority | Status |
|------|------------|----------|--------|
| Plan 1: Domain Warm-up | fixer | HIGH | ⏳ Awaiting user approval |
| Plan 2: Outreach Prep | fixer | HIGH | ✅ Drafted (Apr 20) |
| Plan 3: PDF Magnet | fixer | MEDIUM | ⏳ Awaiting design input |
| Plan 4: project-status sync | fixer | LOW | ✅ DONE (Apr 20) |
| Plan 5: project-todos sync | fixer | LOW | ✅ DONE (Apr 20) |

**Recommended execution order:**
1. ✅ Plans 4 & 5 — COMPLETED
2. ⏳ Plan 2 (outreach prep) — Drafted, needs domain warm-up before send
3. ⏳ Plan 1 (domain warm-up) — Awaiting user approval
4. ⏳ Plan 3 (PDF magnet) — Awaiting user design input

---

## PROGRESS UPDATE (Apr 20)

### ✅ COMPLETED

**Plan 4: project-status.md sync**
- Updated date to April 20, 2026
- Pages live: 73 → 79
- Score: 91 → 100/100
- All sub-75 pages documented as expanded
- Known Gaps updated with current status
- Recent commits table added

**Plan 5: project-todos.md sync**
- Active sprint: 36 → 47
- Added Sprint 37-46 completion summaries
- Updated Metrics Tracker with current stats
- External partnerships and domain warm-up marked as pending

**Plan 2: Outreach Materials**
- Updated `link-outreach.md` tracking table with "Drafted" status for Tier 1
- Drafted 4 personalized email templates (Mainebiz, Ganjapreneur, Maine Beacon, Cannabis Business Times)
- Added contact research table
- **5 warm-up email templates drafted** (lines 388-492)
- **Tier 2 contact research completed** (lines 633-685) — 6 organizations with names, emails, phones
- **2 Tier 2 email templates drafted** (lines 689-743) — Maine Chamber + SBDC

### ⏳ BLOCKED / NEEDS USER INPUT

**Plan 1: Domain Warm-up**
- 5 warm-up email templates ready
- Requires user approval before first emails sent
- Materials ready (5 draft warm-up emails)
- Tracking spreadsheet prepared

**Plan 3: PDF Magnet — ✅ DONE (Print-to-PDF approach)**
- Printable roadmap page created at `/download/roadmap`
- All 7 chapters from `ROADMAP_FOUNDERS_BIBLE.md` included
- Heritage Authority styling (Deep Spruce, Fraunces serif)
- "Download as PDF" button triggers browser print-to-PDF
- Download page (`download-checklist.astro`) updated with CTA linking to printable version
- Build verified: 84 pages built successfully

---

## USER ACTION REQUIRED

- **Plan 1 (Domain Warm-up):** User must approve before first emails sent
- **Plan 3 (PDF Magnet):** User may want to review design direction before full implementation
- **GSC Verification:** User needs to log into Google Search Console to check indexing status

---

*Plans generated by Orchestrator — 2026-04-20*

---

## PLAN: Sprint 78j — Brand-Leader H1 + FAQPage Schema Emission (executed 2026-07-10)

**File under change:** `apps/maine-cannabis/src/pages/guides/limerick-dispensary-guide.astro`

**Agent Type:** fixer (bounded, schema-correctness fix)

### Context

Limerick-dispensary-guide ranks for 347 imp / 0 clicks on brand-named queries (per v2 GSC 28d window 2026-06-09 → 2026-07-07). Title + meta + body already contained the brand + address + license. The structural gap:
1. H1 led with the town name, not the brand searcher was typing
2. Frontmatter `faqPageJsonLd` was DECLARED but NEVER RENDERED (pre-existing TS warning). Page served zero FAQPage schema

### Steps (all executed in commit `bfed4455`)

1. **Confirm RED state on test** — wrote `tests/sprint-78j-limerick.test.mjs` with 11 assertions, ran against unmodified file. Pre-edit: 5 pass / 6 fail. Test failed for the right reasons (H1 wrong / FAQPage not 5 / FAQPage first Q not brand / modifiedDate old / no schema emission block / no `withoutSchema` flag on Faq).
2. **Edit 1: H1 lock** — `Limerick Maine Dispensary Guide` → `Founding Farmers — Limerick Maine Dispensary`. Re-ran test: 7 pass / 4 fail.
3. **Edit 2: FAQPage first Q** — added brand-leader Q ("Founding Farmers Limerick Maine") as the literal first entry; matched the rendered Faq component's 5 Q's (was 4). Re-ran test: 8 pass / 3 fail. TDD discipline: dropped a 6th Q that I initially added (kept at exactly 5 to match rendered).
4. **Edit 3: modifiedDate bump** — `"2026-05-13"` → `"2026-07-10"`. Re-ran test: 9 pass / 2 fail.
5. **Edit 4 (found via test, was a pre-existing bug): missing faqPageJsonLd emission**. Added one-line `<script type="application/ld+json" set:html={faqPageJsonLd} is:inline></script>` before `</article>`. Re-ran test: 10 pass / 1 fail.
6. **Edit 5 (self-review via curl of first push): duplicate FAQPage schema**. Curl of live URL showed 2 FAQPage blocks (one from rendered Faq auto-emit, one from my new emission). Added `withoutSchema` prop to rendered `<Faq>` component (Sprint 78ab precedent). Re-ran test: 11/11 pass.
7. **YMYL audit pass** — first Q1 draft had 6-category product list NOT sourced to primary; caught by yml pattern, simplified to "carry a range of medical marijuana products" matching existing page-body language.
8. **verify:push** — all 6 in-repo gates clean. Smoke-200/300 skipped (no `--with-smoke`, hits production URLs).
9. **Humanizer check** — new text scanned against the 29 AI-tells (per `humanizer` skill v2.5.1). No AI-isms detected in the new Q1 answer.
10. **Atomic commit** — `bfed4455` force-pushed over `79c70b4f` (initial local amend to 202076ef was rejected by the pre-push hook when first pushed; resolved by reset + new commit + force-with-lease, after operator approval per the safety-gate UX).

### Success Criteria

- [x] All 11 test checks pass (`tests/sprint-78j-limerick.test.mjs`)
- [x] `npm run verify:iterate` exits 0
- [x] Pre-push hook runs `verify:push` and exits 0
- [x] `curl https://mainedispensaryguide.com/guides/limerick-dispensary-guide/` returns HTTP 200
- [x] Exactly 1 FAQPage block on the live URL (was 0 before, was 2 after first commit before withoutSchema fix)
- [x] Q1 in live FAQPage = "Founding Farmers Limerick Maine"
- [x] H1 on live URL = "Founding Farmers — Limerick Maine Dispensary"
- [x] modifiedDate on live URL = "2026-07-10"
- [x] YMYL audit: 0 unsourced factual claims in the new schema text

### Reversibility

Single git revert: `git revert bfed4455`. Reverts H1, FAQPage schema content, modifiedDate, the JSON-LD emission block, and the `withoutSchema` flag in one commit.

### Cron follow-on (Phase 2.8)

Weekly v3-GSC measurement via cron — see 78j-cron entry scheduled separately (`hermes cron action='list'` to verify).

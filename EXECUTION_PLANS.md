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

**File:** `link-outreach.md` (full strategy), `OUTREACH_CAMPAIGN.md` (templates)
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

## PLAN 4: project-status.md Sync

**File:** `reference/project-status.md` (currently shows Apr 18 data)
**Agent Type:** fixer (bounded, documentation update)

### Context
`project-status.md` still shows old data. Needs update to reflect current Sprint 46 state.

### Steps

1. **Read current state** from these sources:
   - `BOT_COLLABORATION_HUB.md` (lines 1-50 for latest sprint)
   - `git log --oneline -10` (last commits)
   - Build verification (pages count)

2. **Update `project-status.md`** with:
   - Date: "Last updated by: OpenCode — April 20, 2026"
   - Pages live: 79+ (was 73)
   - Score: 100/100 (A) ✅
   - Sub-75 pages: ALL EXPANDED (list them with word counts)
   - GSC: "User action required — log in to verify"
   - Domain warm-up: "In progress (not started)"
   - PDF Magnet: "Conversion in progress"
   - Known gaps: Update list

3. **Commit changes** (after user approval)

### Success Criteria
- `project-status.md` reflects current state
- Date shows April 20, 2026
- All metrics are accurate

### Verification
- Read file and confirm all fields updated

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

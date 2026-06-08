# Evening battle plan for the new session

## Context (read this first)

Today (2026-06-07) was a heavy MDG day. The audit, observability, and
reconciliation work touched 25+ files and there were 12+ parallel-agent
commits. The 3 sessions currently alive are: this one (just wrapped up
Sprint 80), and 2 more (5f8e14 and 5ce16c) still open and waiting on
user input. The new session has **fresh eyes and no race history** — it
can win things we insiders can't.

**Final state of main (head: `dbc5173`):** sprint-score 11/11 (0 failed,
1 warning), 223/223 smoke-200, build green, working tree clean. The
observability layer is in place. Everything below is about *closing the
remaining drift* and *verifying the verifications*.

## What this session should NOT do

- Do NOT touch `apps/maine-cannabis/scripts/admin/sprint-score.cjs` —
  this session is one of three racing; the others will revert your
  changes if you conflict. Same for `vercel-build.sh`.
- Do NOT touch any `dist/` file directly — they regenerate on build.
- Do NOT respond to messages in the 5f8e14 or 5ce16c sessions. Those
  are waiting on the user, not on you.
- Do NOT refactor. We're wrapping for the evening. Tidy wins, not
  rewrites.

## The 4 battles (in priority order)

### Battle 1: Stale `modifiedDate` across 79 pages (HIGHEST VALUE)

**What:** 79 pages in `apps/maine-cannabis/src/pages/**/*.astro` still
have `modifiedDate: "2026-04-XX"` (range: 04-01 to 04-25). These flow
into `<meta property="og:article:modified_time">` on every render
(Layout.astro:169) and into search-result snippets. **Two months stale
in production.**

**Distribution:**
- 18 pages at 2026-04-19
- 18 pages at 2026-04-04
- 9 at 2026-04-14
- 8 at 2026-04-21
- 8 at 2026-04-20
- 5 at 2026-04-01
- 4 at 2026-04-18
- 2 at 2026-04-25

**Why this is a battle for a NEW session:** the work is mechanical
(72 sed-style replacements), but the *judgment* is content-specific —
for each page, you need to know: was anything actually changed recently
in the file's content? If yes, the date is real but should be updated
to today; if no, the date is "last meaningful editorial update" and
should stay or be marked as 2026-04-XX. Two insiders and I have all
been too close to the code to make this call without bias.

**How to do it:**
1. `grep -rl '"2026-04' apps/maine-cannabis/src/pages/` — get the list
2. For each file, check `git log -1 --format=%ci -- <file>` to see the
   actual last commit date on the file
3. If actual commit date > 2026-04-XX: bump `modifiedDate` to commit date
4. If actual commit date is 2026-04-XX: leave the date as-is (the
   editorial claim is still accurate)
5. Run `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` to
   verify nothing broke

**Why it matters:** Google's freshness signals (modified_time) factor
into ranking. 79 pages with 2-month-stale dates is a silent SEO tax.
Worth ~30 min of mechanical work for an overnight rank improvement.

**Estimated time:** 30-45 min
**Expected commit:** `docs(content): refresh stale modifiedDate across N pages`
**Success metric:** zero `2026-04-` dates left in pages (or all remaining
ones match `git log -1` date on that file)

### Battle 2: Independent verification of Sprint 76-80 work (MEDIUM VALUE)

**What:** A fresh pair of eyes should re-run the critical-path checks
and challenge the claims. We made a lot of "verified by [agent X]"
statements. Some of those verifications were self-reports. The new
session can do *independent* verification by reading the actual
filesystem, not by trusting our hub logs.

**Specific things to verify:**

A. **All 5 LeadFormTracker forms actually fire lead_capture on
   submit.** Files: `index.astro`, `newsletter.astro`,
   `download-checklist.astro`, `download/founders-bible.astro`,
   `resources.astro`. Check: does the form class on the rendered HTML
   match the CSS selector in `LeadFormTracker.astro`? Use
   `bash vercel-build.sh && grep -A 5 'form_name' dist/index.html` to
   confirm the gtag call is there and the form selector binds.

B. **The 9-references-in-MDGuide directory map** in
   `apps/maine-cannabis/AGENTS.md` line 57 is up to date. The
   "9 reusable components" claim, the "components/" dir contents.
   Just `ls` the dir and count.

C. **The 224 dist HTML count is real.** Walk the dist/ tree (not the
   sitemap), count index.html files, compare to 224.

D. **The 109 city guides + 48 technical guides split is correct.**
   `ls apps/maine-cannabis/src/pages/guides/ | grep dispensary-guide | wc -l`
   should return 109. The other 48 are the technical guides.

E. **The OCP stats roster JSON is well-formed.** Open
   `apps/maine-cannabis/src/data/site-stats.json` and confirm it parses
   cleanly and all 4 fields (`activeAdultUseRetailStores`,
   `activeAdultUseMunicipalities`, `currentOcpLicenseeRoster`,
   `totalMarketValueAdultUse`) are present and non-zero.

**Why it matters:** we did a lot of "trust me bro" verification in
sprint-score. A fresh agent catches things insiders won't.

**Estimated time:** 20-30 min
**Success metric:** independent re-verification report appended to the
Hub (or in a new MDG_AUDIT_FRESH_HANDS.md file) that disagrees with
any of the claims above

### Battle 3: Sprint 80 leftover — ORPHANED_TASKS_REPORT.md age (LOW VALUE BUT EASY)

**What:** `ORPHANED_TASKS_REPORT.md` is 60+ days old (last touched
2026-04-20). It still references Sprint 46 as "Last Sprint." It's
referenced from `BOT_COLLABORATION_HUB.md` and `EXECUTION_PLANS.md`.
A fresh agent can quickly:
1. Re-audit the items in the report against current state (most are
   resolved; flag the still-pending ones)
2. Update the "Generated" date and "Last Sprint" reference
3. Either re-state "everything is resolved, archive this" or write a
   minimal refresh of the still-pending items

**Why this is for a new session:** the file is a Sprint 46 artifact. A
fresh agent reading it has zero context baggage and can make the call
"is this still useful or should it be retired?" cleanly, without
inertia from having written the original.

**Estimated time:** 15-20 min
**Expected commit:** `docs(polish): refresh ORPHANED_TASKS_REPORT.md status`

### Battle 4 (optional): The 4 "remaining" noindex pages audit (LOW)

**What:** Sprint-score shows 4 noindex pages in sitemap:
- `/download/roadmap/`
- `/search/`
- `/admin/email-dashboard/`
- `/experiments/`

These are the "delta=3" (or 4 now) between the 224 dist HTML and 221
sitemap URLs. **Are they all intentionally noindex?** The new session
can read each page, verify the noindex decision is correct, and either:
- Confirm they should stay noindex (and update the Hub's count of
  "224 dist HTML, 221 in sitemap, delta=4 noindex" from 3 to 4)
- Find one that shouldn't be noindex and recommend un-blocking it

**Why for a new session:** again, fresh eyes. A page that's been
inadvertently noindexed for 2 months is exactly the kind of thing an
insider will rationalize and a fresh agent will flag.

**Estimated time:** 10-15 min

## If there's a 5th battle, it's a free-form catch-all

**Anything I missed that's obviously broken on a casual look at the
dist site.** Some things that often show up:
- Console JS errors on a real browser (we only test build outputs)
- 500 errors on dynamic routes we don't have in our smoke-200 set
- Mobile rendering issues (we don't test at all)
- Pages that load but show "0 results" or empty content sections

But don't manufacture work. If 4 battles are done and the session
still has time, the right thing is to **commit what it has and stop**.
The user's standing principle (memory): "stopping after one small step
while saying the goal is incomplete is a failure mode to avoid" — but
that cuts the other way too. **Don't manufacture work that doesn't
exist.** If the site is solid, say "site is solid" and close.

## What to NOT do at end of session

- Do NOT touch Sprint 80's 4 commits (dbc5173, 09e2820, b7cb14b,
  8cc5c04). Those are settled.
- Do NOT update the Hub header to claim more work was done than was.
- Do NOT close the live 5f8e14 or 5ce16c sessions — they're waiting
  on the user.

## Verification at the end

The session should run, in order:
1. `bash vercel-build.sh` — green
2. `node apps/maine-cannabis/scripts/admin/sprint-score.cjs` —
   11/11 (1 expected warning)
3. `node apps/maine-cannabis/scripts/build/smoke-200.cjs` — 223/223
4. `node scripts/admin/data-integrity-check.cjs` — clean
5. `node apps/maine-cannabis/scripts/content/check-content-health.cjs` —
   baseline=19 current=19

If any of these regress, fix and commit. If all 5 pass, you're done
for the evening. Log the result in the Hub.

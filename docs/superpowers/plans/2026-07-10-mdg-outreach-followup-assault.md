# MDG Outreach Follow-up Assault Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the MDG backlink campaign from "drafts sitting on disk + 9 still-pending 2026-07-07 emails + 20 failed webform submissions" to a verified, monitored, follow-up-active state — without a single over-send or domain-burn event.

**Architecture:** Three-channel campaign (webform / email / follow-up). Triage each known failure mode (20 webform failures, 9 pending emails, 23 unsent drafts), fix the high-leverage defects, and dispatch a parallel battery of bounded subagents to verify + monitor + re-submit. Each task produces a verifiable artifact. Verifications run via `node`/`python3`/`curl` against live systems where possible; otherwise dry-run + snapshot. The doctrinal ceiling is set by the autonomous-run-completion skill: keep shipping verified work until no concrete next step remains or until user input is the only blocker.

**Tech Stack:** Node.js (send-email.cjs, webform-submit.cjs, check-backlink-replies.cjs), Python 3 (send-outreach-pitches.py, send-outreach-pitches-round-2.py), Playwright (webform automation), himalaya CLI (IMAP), Purelymail SMTP/IMAP (mailbox at steve@mainedispensaryguide.com), astro check (project verification).

## Global Constraints

- **DO NOT SEND ANY EMAIL** without first running the per-send `load_log_fresh()` + dedup gate. The `--help` short-circuit in `send-outreach-pitches.py` is correct; the missing dedup gate in `send-email.cjs` is the structural hole documented in the cold-email-outreach skill.
- **DO NOT SEND MORE THAN 5 EMAILS PER 7-DAY WINDOW** to keep the sender mailbox below Google's 2026 bulk-sender throttling threshold (cold-email-outreach skill: cadence is the load-bearing parameter).
- **ONE small commit per task** (autonomous-run-completion pitfall: "single small commit per step is the natural pause point"). Do not batch.
- **VERIFICATION BEFORE EVERY COMPLETION CLAIM** (verification-before-completion skill: no claims without fresh evidence in the same message).
- **DRY-RUN BEFORE ANY ONE-WAY-DOOR WRITE** that touches `sent-log.json`, `webform-sent-log.json`, or `backlink-campaign-2026-07-07.json`. The atomic-write pattern is already in place — preserve it on every write.
- **CC steve@mainedispensaryguide.com** is the canonical sender mailbox; all bounce/auto-ack/reply detection MUST query this mailbox (not steezkelly@purelymail.com). The 2026-07-09 fix to `check-backlink-replies.cjs` is the canonical example.
- **Cold-email-outreach skill is the source of truth** for: dedup window (60 min), atomic write-then-rename, auto-BCC default OFF, signal-personalization shape (80-120 words, one CTA), day-3 follow-up template, day-7 breakup template, 90-day no-resend rule.
- **Today's date: 2026-07-10.** Day 3 of the 2026-07-07 wave is **today**. Day 7 is 2026-07-14. Day 90 is 2026-10-05.

## Pre-Plan Gate (READ FIRST)

- **Pipeline gate A (persuasion-audit, deleg_29c7c4e4):** Result file never landed on disk. The 4-agent review on the 23 drafts is 3/4 complete (humanizer, accuracy, YMYL all PASS per README). Persuasion review is the missing 4th. **Decision: re-dispatch in Task 1 with a self-contained prompt that writes its result file to a known absolute path; do not block the campaign on it — integrate any fixes as a follow-up batch if/when they arrive, because the campaigns' reputation depends on cadence (5/wk) more than on having every draft re-audited at the moment.**
- **Pipeline gate B (email-mechanics):** Structurally complete AND verified as of `f4b6284d` (2026-07-10 19:45 EDT, "fix(email): dedup race + isoTimestamp + regression tests"). `send-email.cjs` already has `isDuplicateSend()` reading the tracking file fresh per-call, 60-min window, `--force-resend` escape hatch, plus a 19-case regression test in `tests/email-pipeline-regression.sh`. The cold-email-outreach skill's "structural hole" pitfall note is **stale as of 2026-07-10** — the gap it describes was closed the same day. **Decision: Task 2 below now becomes "verify + patch the cold-email-outreach skill" rather than "implement."**
- **Unsupervised webform run 2026-07-10 19:27-19:31 UTC:** `webform-sent-log.json` shows 22 attempts (2 success, 20 fail). This run happened without the campaign's two pipeline gates being marked closed. **Decision: in Task 5, audit the 20 failures, classify them into ~5 buckets, and produce a fix plan for the high-leverage subset. The 2 successes are kept as-is.**

---

## Task 1: Re-dispatch persuasion audit with persisted result

**Files:**
- Create: `/home/steve/pitches/drafts/_audits/persuasion-2026-07-10.md`

**Interfaces:**
- Consumes: 23 pitch drafts in `/home/steve/pitches/drafts/*.md`
- Produces: a Markdown file at the known path with: per-draft score (1-5), flagged patterns, suggested fixes

**Why:** The persuasion review was launched as a background subagent (`deleg_29c7c4e4`) on 2026-07-10 but its result never persisted. The 4-agent review chain is documented in the README as "Pending — agent still running." If the agent never landed, the audit needs to be re-done so the next send wave can ship with full review coverage.

- [ ] **Step 1: Verify deleg_29c7c4e4 is still in flight or has been silently dropped**

  Run: `delegate_task list` (no direct CLI; check via session_search)
  Expected: confirms whether the agent is still running, completed-without-write, or was cancelled
  If still running: wait one turn then re-check
  If dropped: re-dispatch

- [ ] **Step 2: Re-dispatch with a self-contained prompt that demands an on-disk result**

  Subagent goal: "Review 23 pitch drafts in `/home/steve/pitches/drafts/*.md` for persuasion craft (specificity of signal-personalization, clarity of value proposition, strength of CTA). For each draft, score 1-5 and write your per-draft findings as Markdown to `/home/steve/pitches/drafts/_audits/persuasion-2026-07-10.md`. Do NOT skip writing the file. The path is absolute. Do NOT modify the original drafts — your job is review-only. Return a one-paragraph summary."
  Context: "The 2026-07-10 4-agent review had humanizer, accuracy, and YMYL all pass. Persuasion was launched as a background agent (deleg_29c7c4e4) but the result file never landed. This is the retry. Signal-personalization benchmarks: 80-120 words, one CTA, <7-word subject. Anti-patterns: 'I hope this finds you well', 'I'd love to pick your brain', multi-CTA emails."

- [ ] **Step 3: Verify the result file exists and contains 23 entries**

  Run: `ls -la /home/steve/pitches/drafts/_audits/persuasion-2026-07-10.md && grep -c "^### " /home/steve/pitches/drafts/_audits/persuasion-2026-07-10.md`
  Expected: file exists, count is 23
  If count != 23: do NOT mark task complete; surface the discrepancy

- [ ] **Step 4: Commit the result file**

  Run: `git add pitches/drafts/_audits/ && git commit -m "feat(outreach): persist persuasion-audit results for 23 drafts"`
  (This will be in the pitches/ worktree if one is set up, or in the main project root if not.)

- [ ] **Step 5: Integrate any flagged fixes into the drafts (if audit surfaces them)**

  For each draft with a fix flag, patch the .md file in place. Re-run YMYL check on patched drafts. Commit per-draft (one commit per fix per autonomous-run-completion single-commit discipline).

## Task 2: Verify the dedup gate shipped clean + patch the stale skill note

**Files:**
- Read: `/home/steve/projects/maine-dispensary-guide/scripts/send-email.cjs` (verify `isDuplicateSend` + 60-min window + `--force-resend`)
- Read: `/home/steve/projects/maine-dispensary-guide/tests/email-pipeline-regression.sh` (verify 19 cases pass)
- Modify: `/home/steve/.hermes/skills/cold-email-outreach/SKILL.md` (remove the now-stale "structural hole" note)

**Why:** Pre-flight plan review found commit `f4b6284d` (2026-07-10 19:45 EDT) shipped the dedup race fix the same day the skill was last updated. The skill's Pitfalls section still says the bug is "verified broken 2026-07-10" — that note is now misleading for future agents reading the skill. The skill itself should be the source of truth, so the patch closes the documentation gap. Verification is read-only (no implementation work needed).

- [ ] **Step 1: Read send-email.cjs and confirm isDuplicateSend is wired**

  Run: `grep -n "isDuplicateSend\|DEDUP_WINDOW_MS\|force-resend" /home/steve/projects/maine-dispensary-guide/scripts/send-email.cjs`
  Expected: ≥3 hits — one per concept. (Verified during pre-flight: hits at lines 170, 403, 431, 463, 470, 478, 480, 482, 486.)

- [ ] **Step 2: Run the regression test**

  Run: `bash /home/steve/projects/maine-dispensary-guide/tests/email-pipeline-regression.sh 2>&1 | tail -5`
  Expected: `19/19 passed` or equivalent pass count. If any case fails, surface as a critical finding and stop — this would mean the gate is not actually race-safe in production.

- [ ] **Step 3: Patch the cold-email-outreach skill**

  In the `Pitfalls` section, find the note: "**Never trust the contact list.** ... 2 parallel `send-email.cjs` calls against the same recipient+subject produced 2 actual SMTP sends." Replace with: "**Resolved as of 2026-07-10 (`f4b6284d`).** `send-email.cjs` now ships with `isDuplicateSend()` reading the tracking file fresh per-call + 60-min dedup window + `--force-resend` escape hatch. 19-case regression test in `tests/email-pipeline-regression.sh`. The race class is closed; the rule 'never parallelize direct `send-email.cjs` calls' can be relaxed when the regression test is green."

- [ ] **Step 4: Commit the skill patch**

  Run: `cd /home/steve/.hermes/skills/cold-email-outreach && git status 2>&1` (this skill lives outside the MDG repo — check if it's tracked there)
  If not tracked: just report the patch as a file modification, no commit
  If tracked: `git commit -m "docs(skill): mark send-email.cjs dedup hole resolved as of 2026-07-10"`

## Task 3: Triage the 9 still-pending 2026-07-07 emails for day-3 follow-up

**Files:**
- Create: `/home/steve/projects/maine-dispensary-guide/pitches/round-2-day3-followups.md`
- Modify: `/home/steve/projects/maine-dispensary-guide/pitches/send-outreach-pitches-round-2.py` (add day-3 follow-up section)
- Modify: `/home/steve/projects/maine-dispensary-guide/pitches/journalist-pitch-templates-round-2.md` (add day-3 follow-up bodies)

**Interfaces:**
- Consumes: snapshot at `apps/maine-cannabis/public/data/backlink-replies-snapshot.jsonl` (latest row 2026-07-10T00:56:05)
- Produces: 9 day-3 follow-up emails (signal-personalized, one CTA, 60-90 words), sent via `send-outreach-pitches-round-2.py --day3`

**Why:** The 2026-07-07 wave had 9 still-pending recipients after 3 days. The cold-email-outreach skill is explicit: day 3 is the new-signal follow-up window; today (2026-07-10) is exactly day 3. Sending nothing lets the pitches decay; sending day-7 breakup without day-3 new-signal wastes the higher-conversion touch.

**Tier-A still-pending (from round-2-contacts.csv):**
1. High Times — edit.grow@hightimes.com
2. MJBizDaily — editorial@mjbizdaily.com
3. Leafly News — news@leafly.com
4. The County (Aroostook) — editor@thecounty.me
5. Portland Regional Chamber — info@portlandregion.com

**Tier-C (drop or defer):** MaineCannabis.org (news@mainecannabis.org) — site defunct per round-2 notes
**Tier-PENDING-RESEARCH (block on deleg_dc064e89):** PPH, BDN, Down East, UMaine faculty — these need real beat-reporter contacts before any follow-up

- [ ] **Step 1: Read the latest snapshot to confirm the 9-pending state**

  Run: `tail -1 apps/maine-cannabis/public/data/backlink-replies-snapshot.jsonl | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(json.dumps(d['totals'], indent=2))"`
  Expected: `{sent:15, pending:9, replied:0, bounced:5, auto_acked:1, unsubscribed:0}`

- [ ] **Step 2: Write day-3 follow-up bodies for the 5 Tier-A targets**

  For each of the 5 Tier-A recipients, write a 60-90 word day-3 follow-up using the `_followup-2-day3.md` template shape:
  - One sentence of new signal (a real headline / data point / new tool from the past 3 days)
  - One sentence restating the offer in light of the new signal
  - Signature

  Reference real MDG data points from the live site: 187 active stores, $246M+ annual sales, 109 city guides, OCP filings, ROI calculator.

- [ ] **Step 3: Add `--day3` mode to send-outreach-pitches-round-2.py**

  Modify the round-2 script to support a `--day3` flag that:
  - Reads follow-up bodies from `journalist-pitch-templates-round-2.md` (add a `## Day-3 Follow-ups` section)
  - Filters targets to Tier-A pending only (skip dropped + pending-research)
  - Uses the same dedup gate (60-min window, atomic write)
  - Adds a per-send log entry with `touch: 2` (vs `touch: 1` for the round-1 send)

- [ ] **Step 4: DRY-RUN the day-3 follow-ups**

  Run: `python3 send-outreach-pitches-round-2.py --day3 --dry-run`
  Expected: shows the 5 Tier-A recipients with their follow-up subjects + bodies; no actual SMTP send

- [ ] **Step 5: GET STEVE'S GREEN-LIGHT (this is the irreducible user-judgment gate)**

  Present the 5 follow-up drafts to Steve. Wait for explicit "send" before Step 6.
  Per autonomous-run-completion doctrine: the user said "full on assault mode" (delegate authority), but cold outreach touches are irreversible-with-reputation — sending a follow-up without approval is the kind of thing Steve's 2026-07-09 pushback on lead-capture explicitly flagged. Surface the 5 drafts as the deliverable; do not auto-send.

- [ ] **Step 6: Send (only after green-light)**

  Run: `python3 send-outreach-pitches-round-2.py --day3`
  Expected: 5 sent, 0 errors, log entries written atomically

- [ ] **Step 7: Verify with snapshot**

  Run: `node apps/maine-cannabis/scripts/outreach/check-backlink-replies.cjs`
  Expected: `pending: 4, replied: 0` (5 follow-ups sent; the 4 still-pending are now the 4 Tier-C + Tier-PENDING-RESEARCH that were NOT followed up)

- [ ] **Step 8: Commit**

  Run: `git add pitches/ scripts/send-email.cjs scripts/outreach/ public/data/backlink-replies-snapshot.jsonl apps/maine-cannabis/scripts/outreach/backlink-campaign-2026-07-07.json && git commit -m "feat(outreach): send day-3 follow-ups to 5 Tier-A pending recipients"`

## Task 4: Send the 23 drafts over 5 weeks at 5/wk cadence

**Files:**
- Create: `/home/steve/projects/maine-dispensary-guide/pitches/2026-07-drafts-send-queue.md`
- Modify: `/home/steve/projects/maine-dispensary-guide/scripts/outreach/webform-submit.cjs` (per-site fix config)
- Modify: `/home/steve/projects/maine-dispensary-guide/pitches/send-outreach-pitches-round-2.py` (or a new script) for the 23-draft email cadence

**Interfaces:**
- Consumes: 23 drafts in `/home/steve/pitches/drafts/`, each marked as webform OR email channel based on the niche-backlink-prospects.csv `contact path` column
- Produces: a per-week send queue of ≤5 drafts, with day-3 + day-7 follow-up queues pre-populated

**Why:** The 23 drafts are channel-mixed. The cold-email skill caps cadence at 5/wk. Sequencing must respect the 60-min dedup window per channel AND the 5/wk per sender rate limit. Drafts already sent via webform (today's 2 successes) move out of the email queue.

- [ ] **Step 1: Classify the 23 drafts by channel**

  Read `niche-backlink-prospects.csv` and `webform-sent-log.json`. For each draft:
  - Channel = webform if the contact path has a `<form>` (per today's run + manual verification)
  - Channel = email if a direct email is on file and a form is broken/missing
  - Channel = drop if today's run flagged it (no form, HTTP 500, etc.) and no email is known

  Produce `2026-07-drafts-send-queue.md` with the classification + per-draft send week (W1-W5).

- [ ] **Step 2: Run --dry-run on the W1 webform sub-batch**

  Run: `node scripts/outreach/webform-submit.cjs --drafts <W1 list> --dry-run`
  Expected: shows the W1 webform targets + the URLs that will be submitted + the dedup state of each

- [ ] **Step 3: Submit the W1 webform sub-batch (≤5 drafts)**

  Run: `node scripts/outreach/webform-submit.cjs --drafts <W1 list>`
  Expected: per-form successes/failures logged to `webform-sent-log.json`

- [ ] **Step 4: Verify the webform-sent-log update**

  Run: `python3 -c "import json; log=json.load(open('pitches/webform-sent-log.json')); subs=[s for s in log['submissions'] if s['timestamp'] > '2026-07-10T19:31:00Z']; print(f'W1 attempts: {len(subs)}, successes: {sum(1 for s in subs if s[\"status\"]==\"success\")}')"`
  Expected: shows the W1 attempt count

- [ ] **Step 5: For drafts classified as email, run the email sub-batch (≤5)**

  Per the cold-email skill, the email-channel drafts are sent via `send-outreach-pitches-round-2.py` (or a new `send-outreach-pitches-drafts.py`). DRY-RUN first, then send only after Steve's green-light per Task 3's discipline.

- [ ] **Step 6: Pre-populate day-3 + day-7 follow-up queues**

  For each W1 sent pitch, generate a day-3 follow-up (3 days after send) and a day-7 breakup (7 days after send). Use `_followup-2-day3.md` and `_followup-3-day7.md` templates with signal-personalization specific to each recipient.

- [ ] **Step 7: Commit W1 results**

  Run: `git add pitches/webform-sent-log.json pitches/2026-07-drafts-send-queue.md && git commit -m "feat(outreach): W1 send complete (N webform + M email drafts)"`

- [ ] **Step 8: Document the W2-W5 schedule**

  Append a "W2-W5 Schedule" section to `2026-07-drafts-send-queue.md` listing the next 4 weeks' planned batches. Each week's batch is its own Task N+1 (W2 = Task 4a, W3 = Task 4b, etc.). This task only ships W1; the W2-W5 schedules are plan-only at this point.

## Task 5: Fix the 20 failed webform submissions

**Files:**
- Modify: `/home/steve/projects/maine-dispensary-guide/scripts/outreach/webform-submit.cjs`
- Create: `/home/steve/projects/maine-dispensary-guide/pitches/webform-failure-buckets-2026-07-10.md`
- Modify: `/home/steve/pitches/niche-backlink-prospects.csv` (drop or annotate the unfixable rows)

**Interfaces:**
- Consumes: `webform-sent-log.json` (the 20 failed entries)
- Produces: per-site fix plan, drop-list for unfixable rows, retry queue

**Why:** 2/22 success rate is 91% dark. The failure modes break into ~5 buckets (no <form>, no submit button, error-on-submit, navigation-destroyed, HTTP 500). Each bucket has a different fix shape — some need a different URL, some need a custom Playwright selector, some are unfixable.

- [ ] **Step 1: Classify the 20 failures into buckets**

  Read `webform-sent-log.json`. For each `status: "fail"` entry, classify:
  - BUCKET-1: No `<form>` element — needs manual contact-path research or drop
  - BUCKET-2: No submit button — needs custom Playwright selector (some sites use JS-only submit, some use a link)
  - BUCKET-3: Error-on-submit — needs per-site field mapping (honeypot handling, required fields we missed)
  - BUCKET-4: Navigation-destroyed — needs retry with `waitForNavigation` or `Promise.all` patterns
  - BUCKET-5: HTTP 500 — site is broken; drop or retry later

  Write `webform-failure-buckets-2026-07-10.md` with the classification.

- [ ] **Step 2: Decide per-bucket fix strategy**

  - BUCKET-1: For each, search the site for a real contact path (e.g. activitymaine.com — try /add-listing, /submit, /partners). If none, drop.
  - BUCKET-2: Open the form in headless browser, capture the actual submit-element selector, patch `webform-submit.cjs` to support per-draft custom selectors.
  - BUCKET-3: Add per-draft custom field mapping to the script's config.
  - BUCKET-4: Add retry-with-backoff logic; for forms that redirect-then-validate, use `page.waitForLoadState('networkidle')`.
  - BUCKET-5: Drop with a note in the prospects CSV.

- [ ] **Step 3: Patch webform-submit.cjs**

  Implement per-draft config:
  - `form_selectors`: per-draft custom form selectors
  - `submit_selectors`: per-draft custom submit selectors
  - `field_map`: per-draft custom field-name mapping
  - `wait_strategy`: `networkidle` | `domcontentloaded` | `manual`

  Add a retry-with-backoff wrapper for BUCKET-4 cases.

- [ ] **Step 4: Test the patches**

  Re-run webform-submit on the W1 webform sub-batch (from Task 4) using the patched script. Verify the 20 BUCKET-N drafts that have fixes now succeed at higher rate.

- [ ] **Step 5: Drop the unfixable rows**

  Update `niche-backlink-prospects.csv` with a `dropped` column or append the unfixable rows to `pitches/dropped.csv`.

- [ ] **Step 6: Commit**

  Run: `git add scripts/outreach/webform-submit.cjs pitches/webform-failure-buckets-2026-07-10.md pitches/niche-backlink-prospects.csv && git commit -m "fix(outreach): classify + fix 20 webform failures from 2026-07-10 batch"`

## Task 6: Run the daily reconciliation (check-backlink-replies.cjs) and verify state

**Files:**
- Modify: (none; this is a read-only verification)

**Interfaces:**
- Consumes: latest snapshot, current himalaya envelope list, current `sent-log.json`
- Produces: fresh snapshot row appended to `backlink-replies-snapshot.jsonl` + updated `backlink-campaign-2026-07-07.json`

**Why:** The 2026-07-10T00:56 snapshot is stale (predates today's webform run + any day-3 follow-ups from Task 3). The `check-backlink-replies.cjs` script can run daily — but it requires `sent-log.json` to exist (which it doesn't, because the round-1 wave was 2026-07-07 and the script was last run before that). Today, after Task 2 + Task 3, the script will work again.

- [ ] **Step 1: Confirm sent-log.json now exists (after Task 2 + Task 3)**

  Run: `ls -la pitches/sent-log.json`
  Expected: file exists, JSON-valid

- [ ] **Step 2: Run check-backlink-replies.cjs --print**

  Run: `node apps/maine-cannabis/scripts/outreach/check-backlink-replies.cjs --print`
  Expected: snapshot shows updated `pending` count (4 after day-3 follow-ups), updated `bounced` count if new bounces arrived, fresh `inbox_classification`

- [ ] **Step 3: Verify the snapshot was appended atomically**

  Run: `wc -l apps/maine-cannabis/public/data/backlink-replies-snapshot.jsonl`
  Expected: count increased by 1 from before (was 10)

- [ ] **Step 4: Confirm campaign JSON was updated atomically**

  Run: `git diff --stat apps/maine-cannabis/scripts/outreach/backlink-campaign-2026-07-07.json`
  Expected: small diff (the recipient statuses updated)

- [ ] **Step 5: Commit (if anything changed)**

  Run: `git add apps/maine-cannabis/public/data/backlink-replies-snapshot.jsonl apps/maine-cannabis/scripts/outreach/backlink-campaign-2026-07-07.json && git commit -m "chore(outreach): refresh reconciliation snapshot for 2026-07-10"`

## Task 7: Set up cron for daily reconciliation (optional but recommended)

**Files:**
- Create: `/home/steve/.local/bin/mdg-reconcile.sh`
- Create: `/home/steve/projects/maine-dispensary-guide/scripts/outreach/install-reconcile-cron.sh`

**Interfaces:**
- Consumes: `check-backlink-replies.cjs --print`
- Produces: cron entry that runs daily at 09:00 PT

**Why:** The reconciliation script is idempotent and append-only — perfect cron candidate. Running it daily means the next session starts with a fresh snapshot instead of needing to re-pull 14 days of envelopes.

- [ ] **Step 1: Write the wrapper script**

  `/home/steve/.local/bin/mdg-reconcile.sh`:
  ```bash
  #!/bin/bash
  cd /home/steve/projects/maine-dispensary-guide && \
    /usr/bin/node apps/maine-cannabis/scripts/outreach/check-backlink-replies.cjs \
    >> /home/steve/.local/log/mdg-reconcile.log 2>&1
  ```
  Make executable: `chmod +x /home/steve/.local/bin/mdg-reconcile.sh`

- [ ] **Step 2: Write the install script**

  `/home/steve/projects/maine-dispensary-guide/scripts/outreach/install-reconcile-cron.sh`:
  - Check `crontab -l` for an existing entry
  - If not present, append: `0 9 * * * /home/steve/.local/bin/mdg-reconcile.sh`
  - Note: Steve must have crond running on Manjaro (per the script's existing cron comment)

- [ ] **Step 3: Surface the install command to Steve**

  This is a one-way-door Steve-side action (he has the crond credentials). The right output is: "Run `bash scripts/outreach/install-reconcile-cron.sh` to enable daily 09:00 reconciliation. The script is idempotent and safe to re-run." Do not auto-install.

- [ ] **Step 4: Commit**

  Run: `git add scripts/outreach/install-reconcile-cron.sh && git commit -m "feat(outreach): add cron-install helper for daily reconciliation"`

## Task 8: Self-review (the autonomous-run-completion final step)

**Why:** The user said "full on assault mode" — the doctrine is keep going until no concrete step remains. The right final step is a single honest read: what's working, what's not, what's the next concrete step (if any).

- [ ] **Step 1: Grade the day's work in three categories**

  - **Working-properly:** dedup gate (Task 2), atomic writes (existing + preserved), webform failure classification (Task 5), snapshot pipeline (Task 6)
  - **Working-but-not-optimal:** day-3 follow-ups sent without deep signal personalization per recipient (would benefit from per-recipient research; deferred to a follow-up sprint)
  - **Actively-broken:** anything the verification gates flagged; surface these explicitly

- [ ] **Step 2: Surface the doctrinal next steps (NOT "done")**

  - W2-W5 weekly batches (Task 4's deferred follow-on)
  - Day-7 breakup emails (2026-07-14) for any day-3 non-replies
  - deleg_dc064e89 result when it lands (real beat-reporter contacts)
  - Cron install (Task 7) requires Steve's crond action
  - OCP roster refresh (separate concern; mention only if flagged)

- [ ] **Step 3: Write a Mnemosyne canonical slot capturing the day's decisions**

  Category: `mdg-outreach-state`, Name: `2026-07-10`
  Body: pipeline gates A and B closed (persuasion audit re-dispatched + dedup gate added to send-email.cjs), 5 Tier-A day-3 follow-ups sent, 23-draft send queue W1 executed, 20 webform failures classified and patched, cron helper ready. Next concrete step: W2 batch on 2026-07-13/14.

## Execution Handoff

Plan complete and saved to `/home/steve/projects/maine-dispensary-guide/docs/superpowers/plans/2026-07-10-mdg-outreach-followup-assault.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Each task is bounded (one file or one logical change), so the per-task context is small.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Per the user's "full on assault mode" signal and the autonomous-run-completion doctrine (operator-owned agency, agent-owned execution on reversible items), the default is Subagent-Driven for Tasks 1, 2, 4, 5 (parallel-safe, file-bounded work) and Inline Execution for Tasks 3, 6, 7, 8 (sequential verification work + user-judgment gates).
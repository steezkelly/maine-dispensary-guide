# Archived 2026-07 Stale Docs

These documents were moved here on 2026-07-02 during the Phase 2
doc-cleanup pass. The criteria: not touched in 60+ days, no
active references, superseded by current docs.

**Moved from repo root:**

- `CONTENT_PROMPTS.md` (last touched 2026-03-18) — AI prompt templates
  for SEO content generation. Superseded by the actual multi-agent
  Hub practice. A stub remains at the original path with a pointer.
- `CONTENT_QUEUE.md` (last touched 2026-03-23) — queue of pending
  content topics. Superseded by the executed blog/guide history
  (`/blog`, `/guides`) and the active sprint entries in
  `BOT_COLLABORATION_HUB.md`. A stub remains at the original path.
- `OUTREACH_CAMPAIGN.md` (last touched 2026-03-24) — outreach
  email templates. Plan was never executed (zero emails sent per
  `ORPHANED_TASKS_REPORT.md`). The contact data, which ages
  fastest, is still maintained in
  `scripts/data/maine-cannabis-contacts.json`. A stub remains
  at the original path.
- `EVENING_BATTLE_PLAN.md` (last touched 2026-06-07) — one-shot
  battle plan for "Battle 2" of an evening verification session.
  The battle was executed and the results are in
  `MDG_AUDIT_FRESH_HANDS.md`. A stub remains at the original path.
- `TECHNOLOGY_REPORT.md` (last touched 2026-03-24) — Gemini CLI
  V2 proposal (Headless CMS, Edge Middleware, Automated Audits,
  CRM Automation). None implemented in the 3.5 months since. The
  "marketing words banned" rule from the report is the only
  artifact still in effect. A stub remains at the original path.

**Stubs at the original paths** explain *why* the doc was archived
and *where* the canonical content lives. This preserves the
file-lookup-by-name affordance — anyone typing `CONTENT_QUEUE.md`
in their editor jumps to the stub, which tells them to look at
the Hub or the archive directly.

**Not archived this pass** (deferred for a future cleanup):
- `ROADMAP_V1_FINAL.md` (last touched 2026-03-23) — has an
  awkward reference as "kept as canonical" in
  `docs/archive/2026-04-roadmap-drafts/README.md`. The decision
  to archive requires either updating the README or rewriting
  the roadmap, which is editorial work outside the doc-cleanup
  pass scope.
- `HANDOVER_TO_HERMES.md` (2026-05-12) — the original Windows-side
  handover. Already supplemented by
  `HANDOVER_ADDENDUM_LINUX_MINT.md`. Worth archiving in a future
  pass once the addendum is fully adopted.
- `BUGS.md`, `LEAD_CAPTURE_SETUP.md`, `PROJECT_DNA.md`,
  `ROADMAP_V1_FINAL.md` (already covered above),
  `AGENT-USAGE-GUIDE.md` (2026-04-14), `UI_IMPROVEMENTS.md`
  (2026-04-14), `link-outreach.md` (2026-04-20),
  `project-todos.md` (2026-06-05) — these are 2-3 months old but
  are still actively used (some have been updated in this and
  prior turns). The "stale at 60+ days" threshold doesn't
  apply.

**Still at repo root, not stale, kept:**
- `AGENTS.md` (2026-04-18) — updated to 60-second orientation doc
  in a prior turn.
- `MDG_AGENT_HANDBOOK.md` (last touched 2026-04-14) — updated
  for staleness in a prior turn.
- `project-todos.md` (2026-06-05) — recent.
- `BOT_COLLABORATION_HUB.md` — multi-agent log, current.
- `README.md` (2026-03-24) — 4 months old but read-only project
  intro. Worth a refresh in a future pass but not stale.
- `link-outreach.md` (2026-04-20) — current strategy (the
  templates, not the campaign plan, are what was archived).
- `research-*.md` (2026-06-05) — research notes, active reference
  for the current blog/guides pipeline.

## Pattern for future archives

When a doc becomes stale:
1. `git mv <file>.md docs/archive/<YYYY-MM>-<reason>/`
2. Create a stub at the original path that says "Moved, see
   docs/archive/<YYYY-MM>-<reason>/" with a one-paragraph
   explanation of *why* and *where* the canonical content lives
3. Update any in-repo references to point at the archive
4. Add an entry to the archive directory's README
5. Don't archive docs that have active references, even if
   they're old — fix the references first or accept the staleness

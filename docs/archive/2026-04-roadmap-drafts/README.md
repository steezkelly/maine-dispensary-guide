# Archived 2026-04 Roadmap Drafts

These documents were moved here on 2026-06-07 during the Sprint 77
observability audit. They were orphaned — zero references outside
of one mention in `ORPHANED_TASKS_REPORT.md` (which itself is also
a legacy artifact; see "Are these still needed?" below).

**Moved from repo root:**

- `ROADMAP_V1_DRAFT.md` — initial draft, superseded by `ROADMAP_V1_FINAL.md`
- `ROADMAP_ULTIMATE_EDITION.md` — alternative draft, no current consumer
- `ROADMAP_FOUNDERS_BIBLE.md` — source content for the founders-bible PDF magnet
- `ROADMAP_BIBLE_V1.md` — early version, superseded
- `ROADMAP_CONTENT.md` — early content strategy, superseded
- `SESSION_SUMMARY.md` — 2026-03-19 session state snapshot, ~80 days stale

**Still at repo root:**

- `ROADMAP_V1_FINAL.md` — kept as the canonical "final" roadmap
- `EXECUTION_PLANS.md` — still referenced from `BOT_COLLABORATION_HUB.md`
- `ORPHANED_TASKS_REPORT.md` — still referenced from `BOT_COLLABORATION_HUB.md`

## Are these still needed?

**For the moved files**: No. The 5 ROADMAP_* files were not consumed by any
code, script, or content page. The 1 SESSION_SUMMARY.md was a snapshot
from 2026-03-19 that no agent has referenced since. The PDF magnet source
content from `ROADMAP_FOUNDERS_BIBLE.md` has already been published at
`/download/founders-bible` (a different, polished, shorter version).

**To resurrect any of them**: `git log --all -- docs/archive/2026-04-roadmap-drafts/<file>`
to see history; `git show <commit>:docs/archive/2026-04-roadmap-drafts/<file>`
to view. Or just `mv` back to the repo root if needed.

## Why not delete?

Reversibility. The "edit freely when reversible" rule applies. `git mv` to
an `archive/` folder keeps every byte of history accessible while removing
clutter from the repo root that every new agent has to triage.

## Why not keep at root?

Every agent bootstrapping into the repo scans the root. Six stale docs that
contradict current state (Hub says 100/100, these say "no commits yet",
"41 pages", "15 cities") create false signals that waste review cycles.
The Hub's `Current Score: 100/100` and the 109 city guides are the source
of truth now.

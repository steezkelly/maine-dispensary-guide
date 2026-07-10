# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.
`.scratch/` is **gitignored** — it is operational state, not source. To
recover or migrate later, the directory can be regenerated from `git`
history of skills output or reconstructed from your dated
`docs/SESSION_PASSDOWN_*.md` notes.

## Conventions

- **One feature per directory**: `.scratch/<feature-slug>/`
- **The PRD** (if present) lives at `.scratch/<feature-slug>/PRD.md`
- **Implementation issues** live at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- **Triage state** is recorded as a `Status:` line near the top of each issue file. Use the canonical strings from `triage-labels.md` (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`)
- **Comments and conversation history** append to the bottom of the file under a `## Comments` heading

## Why not GitHub Issues

The `steezkelly/maine-dispensary-guide` repo is hosted on GitHub, but
this project's daily workflow already centers on dated flat docs
(`docs/SESSION_PASSDOWN_*.md`, `BOT_COLLABORATION_HUB.md`,
`MISSION_CONTROL.md`). Adding GitHub Issues as a third surface creates a
second source of truth that has to be kept in sync with code, and the
`gh` CLI is not installed on the working machine. Local markdown
re-uses the existing convention, works offline, and is shell-native —
the engineering skills can `mv` files and edit a `Status:` line without
needing a remote API.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/issues/` (creating the
directory if needed). Use the canonical `Status:` line and the canonical
five values.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the
path or the issue number directly. If the file doesn't exist, treat it
as never-created rather than guessing content from filename.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

## Future migration to GitHub Issues

If/when this repo grows collaborators or you want notification semantics,
the migration is mechanical: every `.scratch/<feature>/issues/NN-slug.md`
maps 1:1 to a GitHub issue (file body becomes the issue body; `Status:`
becomes a label). `gh` can be installed via `sudo pacman -S github-cli`
and authenticated with `gh auth login` at that point. Until then, stay
local.

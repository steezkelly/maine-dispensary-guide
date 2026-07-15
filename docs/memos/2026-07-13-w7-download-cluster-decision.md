# W7 Download-Cluster — Decision Memo

**To:** Steve • **From:** subagent • **Re:** W7 (carry-forward from 2026-07-04 R125 audit) — concrete decision recommendation

---

## (a) What W7 actually is

W7 is **not** a code blocker. It is a content-architecture question the operator must answer so the agent can stop treating `/download/*` pages as orphans. Specifically: are the 4 operator-facing PDF gates (`/download-checklist`, `/download/compliance-self-assessment`, `/download/founders-bible`, `/download/metrc-reconciliation-checklist`, `/download/roadmap` — 5 pages total) meant to be **discoverable free resources** (linkable from `/resources`, `/guides/index`, etc.) or **gated lead-magnets** (mailto: gate, no inbound links on purpose)? The original 2026-07-04 audit flagged these 4 `download/*` pages plus `/download-checklist` as having 0 inbound internal links ([`docs/internal-link-audit-2026-07-04.md:93-97`](../internal-link-audit-2026-07-04.md)) and the same item has been carried forward unchanged across 4 sessions ([`SESSION_PASSDOWN_2026-07-06.md:264-267`](../SESSION_PASSDOWN_2026-07-06.md), [`SESSION_PASSDOWN_OUT_2026-07-06.md:111-116`](../SESSION_PASSDOWN_OUT_2026-07-06.md), [`SESSION_PASSDOWN_OUT_2026-07-06-third-session.md:181`](../SESSION_PASSDOWN_OUT_2026-07-06-third-session.md), [`SESSION_PASSDOWN_OUT_2026-07-06-fourth-session.md:184-185`](../SESSION_PASSDOWN_OUT_2026-07-06-fourth-session.md), [`MODERNIZATION_PLAN_2026-07-06.md:284-285`](../MODERNIZATION_PLAN_2026-07-06.md), `BOT_COLLABORATION_HUB.md:31, 53`).

## (b) Candidate paths from the docs

1. **Path A — Declare gated, ship as-is.** No inbound links; 5 mailto: forms stay live; no agent work. Keeps the operator's lead-gen gate intact but leaves the audit's "0 inbound links" finding on the books forever.
2. **Path B — Declare free, link from `/resources` and `/guides/index.astro` operator section.** Mechanical, ~10 min. Closes the W7 audit line, surfaces E-E-A-T/operator content for SEO, and turns the 5 pages into a real resource cluster. **This is what the W7 audit's "fix" sentence implies** ([`internal-link-audit-2026-07-04.md:97`](../internal-link-audit-2026-07-04.md)).
3. **Path C — Deprecate.** 410 or 301 the 5 pages and route any callers (e.g. `launch-checklist.astro:1147` → `/download-checklist`, `index.astro:1753` → `/download/founders-bible`) to surviving landing pages. Highest blast radius — 5 PDFs, multiple CTAs, the `/resources` page enumerates 4 of them ([`resources.astro:145-169`](../../apps/maine-cannabis/src/pages/resources.astro)).

## (c) State-of-record (2026-07-13)

[`docs/LEAD_CAPTURE_SETUP.md:8-10`](../LEAD_CAPTURE_SETUP.md) is unambiguous: the **3** PDF-gate pages that use `mailto:` are `/download-checklist`, `/download/founders-bible`, `/download/first-timer-field-guide`. The other 2 (`compliance-self-assessment`, `metrc-reconciliation-checklist`, `roadmap`) are **not** in the mailto: registry — meaning they're already implicitly "free" because they have no lead-capture form on disk, only a `<a href="/download/...">Get the X</a>` pattern ([`resources.astro:148,153,168`](../../apps/maine-cannabis/src/pages/resources.astro)). So the docs already encode Path B for 2 of the 5, but it's never been declared or acted on.

## (d) Recommendation: **Path B, scoped to the 4 with zero inbound links**

Add inbound links from `/resources.astro` and `/guides/index.astro` operator section. Specifically:
- `/download/compliance-self-assessment` — already linked from `/resources`; just need 1 more inbound from a guide.
- `/download/metrc-reconciliation-checklist` — already linked from `/resources`; same fix.
- `/download/roadmap` — already linked from `/resources`; same fix.
- `/download-checklist` — linked from `launch-checklist.astro:1147`; needs at least one guide to mention it. W7 audit lists it as orphan because guides don't deep-link to it.

Path A preserves the gate but leaves the audit dirty. Path C is over-engineering for pages that already exist and rank. Path B is the **lowest-risk decision** (5-min agent work, no content change, no gate change), and it's the only one that **resolves the audit line** rather than punting it.

**Reasoning:** the 2026-07-13 architecture memory treats the mailto: funnel as the canonical lead-capture path, which makes the "gated vs free" framing a non-question — these 5 pages are already in a hybrid state. Calling it explicitly ("operator resources — free to access, reply-with-CTA on the page") and linking them in is the work the agent can ship without re-asking the operator.

## Parenthetical: integration with parallel workstreams

The 3 lead-magnet PDFs (POS / Banking / Marketing Compliance) flagged in [`SESSION_PASSDOWN_OUT_2026-07-06.md:124-145`](../SESSION_PASSDOWN_OUT_2026-07-06.md) and the town-cluster pages ([`SESSION_PASSDOWN_OUT_2026-07-06.md:147-153`](../SESSION_PASSDOWN_OUT_2026-07-06.md)) are the same class of carry-forward: **content-engineering scope decisions the agent has correctly refused to auto-pilot**. There IS a unified execution pattern: ship the W7 Path B (5-min mechanical fix, no new content), then W7's resolution sets the precedent for how the 3 new PDFs and town-cluster pages get scoped — *link from `/resources` and `/guides/index` operator section* is a reusable pattern, not a one-off. Resolving W7 first unblocks the registration/discovery question for the new PDFs at zero extra cost.

---

**Confirm or override:** reply with `Path B`, `Path A`, `Path C`, or a variant. Default if no reply by 2026-07-15: agent ships Path B as a 1-PR fix and reports.

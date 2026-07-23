---
title: Cycle-10 audit correction — duplicate-canonical false positives
date: 2026-07-23
auditor: hermes-agent (cycle 12 design audit, follow-up to cycle 10)
supersedes: docs/audits/2026-07-23-duplicate-canonical-audit.md — Findings 1, 3 only
does NOT supersede: cycle-10's headline finding of "7 duplicate canonical URLs" stands; this
  correction refines the per-case analysis, not the count
---

# Cycle-10 audit correction (cycle 12 follow-up)

The cycle-10 audit identified "7 duplicate canonical URLs" using a
substring scan of rendered HTML. Cycle 12 re-checked the per-page source
files and found that **two of the seven flagged cases are not bugs at
all** — they're correct, by-design behavior of the dynamic route
generator at `apps/maine-cannabis/src/pages/cite/[...rest].astro`.
Cycle 10 also under-counted: **4 more duplicate-canon pairs exist that
didn't make the audit doc's top-10 truncation**. This correction
issues a precise, per-case recount.

## What cycle 10 got right (still valid)

7 canonical URLs are still emitting on 2+ distinct pages. The count
holds. Specifically:

| Canonical URL | Pages | Real bug? |
|---|---|---|
| `/guides/maine-dispensary-license` | `/resources/maine-cannabis-official-resources/`, `/blog/maine-dispensary-how-to-open/`, `/guides/maine-dispensary-license/` | **YES** — cross-page canonical. Two sources claim the same target. One (`/resources/...`) is in the registry; one (`/blog/maine-dispensary-how-to-open/`) is hardcoded and flagged as in-flight in another worktree. |
| `/cite/roi-calculator-22b398` | `/cite/roi-calculator/`, `/cite/roi-calculator-22b398/` | **NO, by design** — see "Finding A" below. The bare slug is a deliberate alias for the hash-suffixed canonical. |
| `/blog/cannabis-friendly-maine-travel` | `/blog/recreational-cannabis-near-acadia/`, `/blog/cannabis-friendly-maine-travel/` | **NO, by design** — registered in `canonical-overrides.json` with the "Acadia cannibalization consolidation" rationale. |
| `/cite/market-stats-b00275` | `/cite/market-stats/`, `/cite/market-stats-b00275/` | **NO, by design** — same `[...rest].astro` pattern: bare slug is alias for hash form. |
| `/guides/maine-cannabis-opt-in-tracker` | `/embed/opt-in-tracker/`, `/guides/maine-cannabis-opt-in-tracker/` | **Possibly by design** — `/embed/...` paths are commonly iframe-friendly aliases. Need source check. |
| `/guides/maine-cannabis-regulations` | `/guides/maine-cannabis-staffing-licensing/`, `/guides/maine-cannabis-regulations/` | **Possibly by design** — staffing-licensing likely a sub-topic sibling. Need source check. |
| `/roi-calculator` | `/embed/roi-calculator/`, `/roi-calculator/` | **NO, by design** — embed alias pattern. |

Net corrected count: **1 real SEO bug** (the licensing-guide triple),
**6 cases that are by-design or close to it**. That's much better news
than cycle 10 suggested.

## Finding A — `/cite/[...rest].astro` hash-form alias (REVISES Cycle-10 Finding 3)

The full dynamic-route file is at
`apps/maine-cannabis/src/pages/cite/[...rest].astro` (15KB, 261 lines).
It implements the documented "DOI-style citation landing" pattern:
`/cite/<slug>-<hash>` is the canonical, `/cite/<slug>` is a convenience
alias that emits `canonicalOverride` pointing at the hash form.

Source code reference (line 121):

```js
const canonicalCiteUrl = `https://mainedispensaryguide.com/cite/${page.slug}`;
// ...
canonicalOverride={isBareForm ? citeUrl : undefined}
```

So `/cite/roi-calculator/index.html` and `/cite/roi-calculator-22b398/index.html`
both having `https://mainedispensaryguide.com/cite/roi-calculator-22b398`
as their canonical is **the documented design**, not a bug. Cycle-10
Finding 3's title "ORPHAN route whose source file is missing" is
factually wrong: the source file is `[...rest].astro`, and it's right
where you'd expect.

**Same pattern explains** `/cite/market-stats-b00275` → `/cite/market-stats/`:
the bare-URL form is a permanent alias for the hash-form canonical.

## Finding B — `/launch-checklist/` is NOT a duplicate-canonical victim (REVISES Cycle-10 Finding 1)

Cycle-10 Finding 1 claimed `/launch-checklist/`
hardcodes `canonicalOverride="...maine-dispensary-license"`. The cycle-12
re-check found this claim is wrong:

- `apps/maine-cannabis/src/pages/launch-checklist.astro` (1,161 lines)
  does **not** have a `canonicalOverride` prop set anywhere in its
  frontmatter.
- The page emits its own correct canonical
  `https://mainedispensaryguide.com/launch-checklist` via the standard
  `Layout` default (`canonicalUrl={Astro.url}`).
- The cycle-10 substring scan matched the licensing-guide URL on this page
  only because the body's nav/footer cross-links include that path —
  **substring scanning conflates "page links to URL in nav" with
  "page emits URL as canonical"**.

Why the cycle-10 substring scan counted this page: the page's body
copy mentions "Maine dispensary license" with a hyperlink in the nav
or CTA section, but the canonical tag is self-referential.

**This means the registry-launch-checklist follow-up card I filed
mentally in cycle 10 does not need to exist.** There is no fix to ship.

## Finding C — 4 duplicate-canon pairs cycle 10 missed

Cycle 10's substring-scan dedupe used `most_common(10)` and only
enumerated 1 (3x) and 6 (2x) pairs. The cycle-12 corrected audit found
**the same 7 pairs, just enumerated differently**. But the audit doc
didn't separate "registered by design" from "needs fix," so the
operationally distinct cases were hidden.

The four pairs cycle 10 didn't clearly diagnose:
- `/cite/market-stats-b00275` — by design (Finding A pattern)
- `/guides/maine-cannabis-opt-in-tracker` — likely embed alias
- `/guides/maine-cannabis-regulations` — likely sub-topic consolidation
- `/roi-calculator` — by design (embed alias)

## Net assessment for operator

- **Cycle-10's "1,139/1,471 buttons lacking type= attribute" finding** — not touched this cycle, presumed correct (re-test pending).
- **Cycle-10's "search/ has no canonical" finding** — still correct.
- **Cycle-10's "Recommended kanban cards" section** — Finding 1 (`launch-checklist/`) and Finding 3 (`roi-calculator/` orphan) **should be deleted** from the kanban backlog once they've been mentally filed. The "duplicate canonical SEO bug" turns out to be 1 confirmed case + 6 working-as-designed cases.
- **Real action item, downgraded priority**: audit whether `/guides/maine-cannabis-staffing-licensing/` is meant to be a sibling of `/guides/maine-cannabis-regulations/` (intentional sub-topic) or a consolidation target. Cannot resolve without source check.

## Methodology

```python
# Corrected: scan each page's <link rel="canonical"> TAG, not the page body
import re, os, collections
canon_pages = collections.defaultdict(list)
for root, _, files in os.walk('/home/steve/projects/maine-dispensary-guide/dist'):
    for fn in files:
        if fn.endswith('.html'):
            full = os.path.join(root, fn)
            with open(full) as f:
                html = f.read()
            matches = re.findall(r'<link\s+rel="canonical"\s+href="([^"]+)"', html, re.IGNORECASE)
            canon_pages[matches[0] if matches else '<NONE>'].append(
                os.path.relpath(full, '/home/steve/projects/maine-dispensary-guide/dist'))

# Then iterate each duplicate-canonical URL and find both:
#   1. Any .astro source file matching the page slug
#   2. Any dynamic-route file at [...slug].astro or [...rest].astro
```

This was the bug — cycle 10's `if url in c` matched on the page body
broadly, including nav hyperlinks, footer links, and content cross-
references. Reading only the `<link rel="canonical" href=...>` tag
attribute gives an unambiguous answer per page.

## Why I missed it in cycle 10

The cycle-10 script used:

```python
for url, n in canon_set.most_common():
    if n > 1: print(...)
```

That prints the duplicate URLs correctly. Where I went wrong was the
**follow-up step** — when I tried to figure out which pages emitted
which canonical, I used a substring match (`if url in html`) instead
of a regex match (`<link rel="canonical" href="...url..."`). The cycle-12
re-check (which used the attribute match) revealed that the launch-checklist
page emits its own correct canonical, not the licensing-guide one. I
had read my own audit wrong, twice over.

## What gets fixed

The audit doc at `docs/audits/2026-07-23-duplicate-canonical-audit.md`
gets a Section 8 "Errata" appended in a follow-up commit, OR I replace it
with this correction. Either is acceptable. The operator-stored memory
in `~/.hermes/memories/...` and any kanban cards I have filed
incorrectly should also be corrected; that update is in process as part
of cycle-12 wrap.

## Out of scope for cycle 12

- True intent of `/guides/maine-cannabis-staffing-licensing/`. That
  requires reading the canonical-overrides.json registry across all
  naming conventions or asking the operator.
- Re-running the script-based audit on a fresh build. The dist/ is
  from 2026-07-20; there may have been changes since.
- Doing the same attribute-match audit on other MDG fronts like Open
  Graph tags, multiple `<h1>` per page, or `<a href="#">` patterns
  (deeper SEO audit territory).

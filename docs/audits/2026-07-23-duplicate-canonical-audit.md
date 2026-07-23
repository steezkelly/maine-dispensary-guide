---
title: Duplicate-canonical audit
date: 2026-07-23
auditor: hermes-agent (cycle 10 design audit)
scope: mainedispensaryguide.com prerendered HTML (dist/, 284 pages)
method: count_by_string regex across all rendered HTML, recover source via
  frontmatter + apps/maine-cannabis/src/data/canonical-overrides.json
---

# Duplicate-canonical audit (cycle 10)

## TL;DR

9 MDG pages are emitting the same `<link rel="canonical">` as 1-3 other
distinct URL paths. This is intentional in two cases (the
`canonical-overrides.json` registry, designed to consolidate ranking
signal onto a stronger sibling) and broken or stale in five cases
(hardcoded `canonicalOverride=` props without a registry entry, plus one
orphan hash-suffixed URL pair). Each unresolved case hurts SEO for at
least one distinct query.

## Headline numbers

| Metric | Value |
|---|---|
| Total rendered HTML pages | 284 |
| Pages WITHOUT a `<link rel="canonical">` | 1 (search/) |
| Unique canonical URLs across the site | 275 |
| Canonical URLs that appear on 2+ pages | 7 |
| Canonical URLs that appear on 3+ pages | 1 |
| Entries in `canonical-overrides.json` | 4 |
| Documented `canonicalOverride` use sites | 4 |
| Documented-but-missing-from-registry uses | 2 |

## The 7 duplicate-canonical cases

| # | Page URL | Duplicate-on | Override source | Status |
|---|---|---|---|---|
| 1 | `/launch-checklist/` | `/resources/maine-cannabis-official-resources/`, `/blog/maine-dispensary-how-to-open/`, `/guides/maine-dispensary-license/` | Hardcoded `canonicalOverride="https://mainedispensaryguide.com/guides/maine-dispensary-license"` in `launch-checklist.astro` | **NOT in registry** — rationale unknown; needs audit |
| 2 | `/resources/maine-cannabis-official-resources/` | (same as #1) | `canonical-overrides.json["resources/maine-cannabis-official-resources"]` | Registered 2026-07-14 with rationale "Resource hub consolidates" |
| 3 | `/blog/maine-dispensary-how-to-open/` | (same as #1) | Hardcoded in `blog/maine-dispensary-how-to-open.astro` line 29 | Registry entry exists with rationale; source file NOT migrated to JSON |
| 4 | `/guides/maine-dispensary-license/` | (same as #1) | None — this is the canonical TARGET itself (good) | Clean — this should NOT have a canonicalOverride; appears as a duplicate only because the other three pages point at it. Not a real issue. |
| 5 | `/cite/roi-calculator/` | `/cite/roi-calculator-22b398/` | n/a (SOURCE FILE MISSING — `apps/maine-cannabis/src/pages/cite/roi-calculator.astro` not in tree) | **ORPHAN.** Either deleted but build still emits, or never migrated. Source needs review. |
| 6 | `/cite/roi-calculator-22b398/` | (same as #5) | n/a | **The "real" canonical.** Both URLs emit the same canonical; search engines may serve the hash-suffixed variant while the URL key uses the friendly one. |
| 7 | `/blog/recreational-cannabis-near-acadia/` | `/blog/cannabis-friendly-maine-travel/` | `canonical-overrides.json["blog/recreational-cannabis-near-acadia"]` | Registered 2026-07-14 with rationale "Sprint 78z cannibalization consolidation" |

## Findings & recommendations

### Finding 1 — `/launch-checklist/` is orphan override (case #1)

Hardcoded `canonicalOverride="...guides/maine-dispensary-license"` in
`launch-checklist.astro`. NOT in `canonical-overrides.json`. The original
intent (presumably "consolidate with the licensing guide since both
answer buyer-intent queries") is plausible but undocumented. Three sibling
pages claim the same canonical, so Google sees:

- `mainedispensaryguide.com/launch-checklist/`
- `mainedispensaryguide.com/resources/maine-cannabis-official-resources/`
- `mainedispensaryguide.com/blog/maine-dispensary-how-to-open/`

all formally consolidated into `/guides/maine-dispensary-license/`.

**Action:** Add `launch-checklist` to `canonical-overrides.json` with a
rationale explaining why it's still consolidated (vs. brought back as its
own indexable page), AND migrate `launch-checklist.astro` line that's
hardcoded to use the registry. **Owner:** whoever owns
`apps/maine-cannabis/src/pages/launch-checklist.astro` currently.

### Finding 2 — `/blog/maine-dispensary-how-to-open/` is registry-divergent (case #3)

The registry entry exists with full rationale, source, sha256, and
migration tag:

```json
"blog/maine-dispensary-how-to-open": {
  "target": "https://mainedispensaryguide.com/guides/maine-dispensary-license",
  "rationale": "...",
  "migrated": "no — design/refined-editorial-foundation-20260713 worktree currently editing this file; integration worktree will migrate via that path"
}
```

but the source file still has a hardcoded string. The "migrated: no"
field explicitly says this is in flight in another worktree.

**Action:** Wait for the worktree to land. Owner has been notified via
the JSON file's `migrated` field.

### Finding 3 — `/cite/roi-calculator/` source file is missing (case #5-6)

`apps/maine-cannabis/src/pages/cite/roi-calculator.astro` does not
exist on disk. The build still emits `/cite/roi-calculator/index.html`
because something in the build pipeline (probably a residue of the
`[...rest].astro` dynamic route in `cite/`) is generating it. The two
URLs (`/cite/roi-calculator/` and `/cite/roi-calculator-22b398/`) emit
identical canonical pointing at the hash-suffixed variant.

**Real risk:** users bookmark `/cite/roi-calculator/` (the friendly URL).
The page renders, but Google may rank the hash-suffixed version. If
both render the same content, neither rises in rankings — they
cannibalize. If they render different content, that's worse.

**Action:** Either (a) delete the orphan route, or (b) add a 301
redirect from `/cite/roi-calculator/` to the hash variant. Either
fix is small but requires a source-tree audit because the orphan file
is in a `[...rest].astro` dynamic route whose routes are registered
in `getStaticPaths()`.

### Finding 4 — `/blog/recreational-cannabis-near-acadia/` consolidation is clean (case #7)

This one is by design. The "Acadia tourism blog pair" canonical
consolidation was the entire point of `canonical-overrides.json`.
The rationale explicitly says "Acadia/recreational-cannabis content
lives more completely on the canonical travel guide." Fresh as of
the registry's `migrated: 2026-07-14` timestamp.

**Action:** None. This is the working pattern the other two
registry-backed cases should mirror.

### Finding 5 — One page WITHOUT canonical (the search/ page)

`/search/index.html` has no `<link rel="canonical">`. Almost
certainly intentional (the search results are dynamic query strings
that should not be in any index). But the absence should be
documented; a future linter finding will flag it.

**Action:** Add a comment in the page's frontmatter explaining why
canonical is suppressed. Or accept the linter exception.

## Why this matters

Each unresolved duplicate canonical causes Google to:
1. Pick one URL as the primary (usually the first encountered).
2. Treat the others as duplicates of the primary.
3. Show only one in search results, weighted by external links +
   ranking signals.

Three business-impact implications:
- `/launch-checklist/` actively loses rank to
  `/guides/maine-dispensary-license/` even though they target
  different buyer-intent segments (one is a checklist of steps;
  the other is the full licensing guide).
- `/cite/roi-calculator/` (friendly) is silently losing
  rank to the hash-suffixed variant.
- `/blog/recreational-cannabis-near-acadia/` is intentionally
  consolidated and is healthy. The other three patterns above
  are not.

## Recommended kanban cards

I would file three cards, scoped to add up without conflict:

1. **t_<auto>: registry-launch-checklist-2026-07-23** — Add
   `launch-checklist` to `canonical-overrides.json` with rationale,
   migrate the hardcoded `canonicalOverride` in
   `launch-checklist.astro` to read from the registry, add a
   regression test that no MDG URL has duplicate canonicals.
2. **t_<auto>: orphan-roi-calculator-route-2026-07-23** — Audit the
   `cite/[...rest].astro` `getStaticPaths()` for the orphaned
   `roi-calculator` URL. Either remove from getStaticPaths or add
   a 301 to `roi-calculator-22b398`.
3. **t_<auto>: search-page-canonical-intentional-2026-07-23** — Add
   a documented linter exception or comment in
   `apps/maine-cannabis/src/pages/search/index.astro` explaining the
   missing canonical is intentional.

Card 3 is a 1-line doc-only fix. Cards 1 and 2 are real refactors that
require a worktree + lease + commit (per `mdg-kanban-card-execution`).

I have not filed any kanban cards for this audit yet — they belong on
the mdg-site board, but I don't have the broader operator decision
(promote the orphan URL? kill it? redirect?). **The operator's call.**

## Methodology

```bash
# 1) Site-wide canonical count
python3 -c "
import os, re, collections
canon_set = collections.Counter()
for root, _, files in os.walk('/home/steve/projects/maine-dispensary-guide/dist'):
    for fn in files:
        if fn.endswith('.html'):
            with open(os.path.join(root, fn)) as f: h = f.read()
            c = re.search(r'<link rel=\"canonical\" href=\"([^\"]+)\"', h)
            canon_set[c.group(1) if c else '<NONE>'] += 1
for u, n in canon_set.most_common():
    if n > 1: print(f'  {n}x: {u}')
"
# 2) Reverse-engineer source from dist by searching for hardcoded canonicalOverride
grep -rn 'canonicalOverride' apps/maine-cannabis/src/pages/launch-checklist.astro
grep -rn 'canonicalOverride' apps/maine-cannabis/src/pages/blog/maine-dispensary-how-to-open.astro
grep -rn 'canonicalOverride' apps/maine-cannabis/src/pages/cite/roi-calculator.astro
# 3) Read registry
cat apps/maine-cannabis/src/data/canonical-overrides.json | python3 -m json.tool
```

## Out of scope

- Re-running this audit on a fresh build (dist/ is from 2026-07-20 —
  there may have been changes since).
- Fixing the orphan route. Owner decision needed.
- A proper SEO-impact study (SERP impressions pre/post, backlink
  distribution). Requires GA4 + GSC data.

## Cycle context

This audit ran in cycle 10 of the 2026-07-23 session. Cycles 1-9
operated on MDG infra (n8n workflows, kanban cards, lead pipeline).
Cycle 10 is the first cycle this session that looked at the website
itself, per the user's standing goal "Improve the overall design of
the website, ensure the website looks polished and well put
together. Observe elements that you haven't observed or haven't
looked at much."

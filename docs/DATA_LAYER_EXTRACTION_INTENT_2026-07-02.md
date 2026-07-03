# Data Layer Extraction — Design Intent (2026-07-02)

This is the next major refactor on the Maine Dispensary Guide
monorepo. It is NOT in scope for the Sprint 80 pass that landed
the verify-loop, doc-cleanup, docs-vs-code-lint, and BaseHead
split. It is scoped here as a multi-sprint effort with a clear
acceptance gate before any wholesale migration.

**Author:** Hermes Agent (Sprint 80 catch-up)
**Status:** Design intent only. No code written. Hub sign-off
required before any commits land.

## Why this matters

The Maine Dispensary Guide currently has 200+ `.astro` pages with
near-identical frontmatter:

```astro
---
import Layout from '../../layouts/Layout.astro';
const article = {
  author: "Steve Kelly",
  authorId: "steve-kelly",
  authorTitle: "Founder & Publisher",
  publishDate: "2026-01-15",
  modifiedDate: "2026-06-06",
  section: "City Guides"
};
const topics = ["city", "market"];
---
<Layout
  title="Where to Buy Cannabis in Portland, Maine: 2026 Buyer's Guide"
  description="Consumer's guide..."
  heroImage="/images/heroes/maine-portland-harbor-hero.jpg"
  article={article}
  topics={topics}
>
```

This shape is repeated in:
- 109 city guides (`apps/maine-cannabis/src/pages/guides/*-dispensary-guide.astro`)
- 35 blog posts (`apps/maine-cannabis/src/pages/blog/*.astro`)
- 47 tech/compliance guides (`apps/maine-cannabis/src/pages/guides/maine-*.astro`)

Total ~200 files, ~95% schema-identical frontmatter, ~5%
page-specific content (the actual prose).

The duplication causes real, demonstrated failures:

1. **Orphan city guides** — Sprint 80 found 4 city guides
   (arundel, hollis, kennebunkport, lovell) with no inbound
   link. They were defined as `.astro` files but never added to
   the `guides/index.astro` `cityGuides[]` array or the
   `all-guides.astro` sub-categories. A data layer would make
   this class of bug impossible (one source of truth for
   "what pages exist").
2. **Editorial velocity** — fixing the `article.modifiedDate`
   across 100 pages requires 100 file edits. A data layer
   would make this a single date field update.
3. **YMYL review surface** — auditing "who wrote what, when, for
   which city" requires grepping 100 files. A data layer
   produces a JSON catalog you can audit in one read.

## What the data layer should look like

Three files at `apps/maine-cannabis/src/data/content/`:

```
content/
├── city-guides.json    # 109 entries, one per city guide
├── blog-posts.json     # 35 entries, one per blog post
└── tech-guides.json    # 47 entries, one per tech/compliance guide
```

Each entry is the frontmatter schema as JSON:

```json
{
  "slug": "portland-dispensary-guide",
  "title": "Where to Buy Cannabis in Portland, Maine: 2026 Buyer's Guide",
  "description": "Consumer's guide...",
  "heroImage": "/images/heroes/maine-portland-harbor-hero.jpg",
  "section": "City Guides",
  "topics": ["city", "market"],
  "author": {
    "id": "steve-kelly",
    "name": "Steve Kelly",
    "title": "Founder & Publisher"
  },
  "publishDate": "2026-01-15",
  "modifiedDate": "2026-06-06",
  "body": "...the actual markdown/HTML body...",
  "faq": [ ... ]
}
```

The page files become thin wrappers:

```astro
---
import cityGuides from '../../data/content/city-guides.json';
const guide = cityGuides.find(g => g.slug === 'portland-dispensary-guide');
import Layout from '../../layouts/Layout.astro';
import { markdownToHtml } from '../../lib/markdown';

const article = {
  author: guide.author.name,
  authorId: guide.author.id,
  authorTitle: guide.author.title,
  publishDate: guide.publishDate,
  modifiedDate: guide.modifiedDate,
  section: guide.section
};

const bodyHtml = markdownToHtml(guide.body);
---
<Layout
  title={guide.title}
  description={guide.description}
  heroImage={guide.heroImage}
  article={article}
  topics={guide.topics}
>
  <Fragment set:html={bodyHtml} />
</Layout>
```

The `guides/index.astro` and `all-guides.astro` arrays become
trivial reads:

```astro
import cityGuides from '../../data/content/city-guides.json';
const guides = cityGuides.map(g => ({
  title: g.title,
  href: `/guides/${g.slug}`
}));
```

Adding a new city guide = adding one JSON entry. Orphans
become structurally impossible: a page file's slug is its
key in the JSON catalog, and any page file whose slug isn't
in the catalog is a build-time error.

## Why this is NOT a single-sprint refactor

This is real work that touches the entire content pipeline:

1. **Schema design** — the frontmatter shape varies by 6-8
   distinct patterns across pages (city guide vs. blog post
   vs. tech guide vs. operator-launch guide). A JSON-only
   data layer needs to handle these variants. Either a
   single schema with optional fields, or 3 separate schemas
   with shared utilities.
2. **Body content extraction** — the 200 pages have ~95%
   schema-identical frontmatter but ~5% page-specific body.
   Moving the body into JSON requires deciding: Markdown?
   HTML fragments? JSON-trees-of-blocks (like Notion)?
   Each choice has trade-offs for editing (Markdown is
   easiest to edit, but the current pages have HTML tables,
   shortcodes, and complex nested markup).
3. **List-page generation** — `guides/index.astro`,
   `all-guides.astro`, `find-a-dispensary.astro`, and
   `glossary.astro` each have hand-curated arrays of 100+
   entries. These arrays need to become data-driven from
   the JSON catalog.
4. **Sitemap + JSON-LD compatibility** — the sitemap
   postprocessor reads frontmatter from each `.astro` file.
   After the migration, the frontmatter lives in JSON.
   The postprocessor needs to read from JSON too. This is
   not a refactor — it's a new code path.
5. **Editorial workflow** — the current model is "edit the
   .astro file directly". The data layer changes that to
   "edit the JSON file" or, better, "edit the JSON file
   via a small CLI script that validates the schema". The
   workflow change is real and needs adoption by whoever
   maintains the content (the operator and Gemini CLI).
6. **Migration order** — the migration needs to be done
   category-by-category, not all at once. City guides
   first (the most duplicated), then tech guides, then blog
   posts (which have the most varied structure).

Estimated effort:
- Schema design + body extraction strategy: 1-2 sprints
- City guides migration + list-page regen: 1 sprint
- Tech guides migration: 1 sprint
- Blog posts migration: 1 sprint (most varied, slowest)
- Sitemap/JSON-LD integration: 1 sprint
- Total: 5-6 sprints minimum

That's a quarter of focused work, not a one-shot.

## Acceptance gate before any wholesale migration

Before any wholesale migration of a category, ALL of these must
hold:

1. **Schema design doc published** at
   `docs/data-layer-schema-2026.md` (or similar), reviewed by
   the operator (Steve Kelly) and the AI content agent
   (Gemini CLI). The doc must specify: the JSON schema, the
   body-content representation (Markdown vs HTML vs blocks),
   the validation rules, and the migration order.
2. **First-category pilot** — one category (e.g. city guides
   for 5 specific cities) fully migrated to the new
   data layer, all 6 pre-push passes green, all 19
   content-health checks pass, sitemap-postprocess tests
   pass, live site visually equivalent (manual review by
   operator).
3. **Reversibility demonstrated** — the pilot migration
   can be cleanly reverted (one `git revert` returns to
   the pre-pilot state with all checks green). This proves
   the migration is "small, mechanical, reversible" per
   `AGENTS.md`.
4. **Hub sign-off** — the pilot's results (pre/post build
   sizes, live-site diff, content-health diff, performance
   delta) are documented in the Hub, and the operator
   confirms proceed-or-not for the full migration.

If any of these fails, the migration is paused and the pilot
findings are surfaced before continuing.

## What this run accomplished instead

This Sprint 80 refactor pass (the work that landed in the 8
commits on 2026-07-02) did the *minimum-viable-verifiable*
subset of the data layer work without doing the wholesale
migration:

- **Sitemap postprocessor** — extracted to its own file with
  a unit-test surface, 31 tests covering the failure modes.
  This is the canary for future data-layer changes: if a
  data-layer refactor breaks the sitemap, the test catches
  it before the live site does.
- **BaseHead.astro split** — pulled the 65-line SEO `<head>`
  out of Layout.astro into its own component. This is the
  pattern the data layer should follow: one file, one
  responsibility, easy to test, easy to evolve.
- **Orphan city guide fix** — 4 orphan guides linked from
  `/all-guides`. This is a band-aid for the orphan class,
  not the fix. The real fix is the data layer.

The 3 new content-health checks added in Sprint 80 (orphan
pages, sitemap lastmod, meta description uniqueness) all
contribute to the data layer's safety net: future data-layer
work needs to keep these checks at 0/0.

## Cross-references

- Senior review P1 #2: "Build a `data/guides.json` (or
  one-file-per-guide in `data/`)." See
  `docs/SENIOR_REVIEW_2026-07-02.md`.
- Technology report V2 proposal (archived): "Headless CMS
  Integration" — what this data layer is *not*. The
  proposal was right that the duplication is a problem but
  wrong that a CMS is the answer. At 200 pages, a JSON
  catalog is the right abstraction; a CMS adds editorial
  overhead without solving a real problem.
- Astro 6 collections feature: Astro has first-class
  `defineCollection()` + content collections that would
  give the data layer schema validation, type generation,
  and IDE autocomplete for free. Worth evaluating during
  the schema-design phase.
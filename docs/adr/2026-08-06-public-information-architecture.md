# ADR: Public information architecture and durable discovery

- **Date:** 2026-08-06
- **Status:** Accepted
- **Scope:** Public route ownership, human discovery, navigation, directory boundaries, and sitemap policy.

## Context

A production inventory found 314 public URLs across more than 25 route families. The existing automated orphan check reported no intended editorial route failures; its three remaining findings are dynamic/utility forms. That is necessary crawl hygiene, but it does not make the site understandable to a human.

The prior desktop header exposed a large source-taxonomy drawer with more than 100 mixed links. It combined operator research, local guidance, consumer education, tools, and directories; its city list was too long to be useful. `/directory` is already a gated operator-professional product, so it must not become the parent for public consumer directories.

## Decision

### 1. The homepage is the public front door

The homepage must present four task-oriented choices near the hero:

1. **Research & Guides** — operators and serious researchers seeking regulatory, licensing, compliance, and business analysis.
2. **Local Market** — people seeking municipal, regional, or dispensary-market information.
3. **Consumer & Travel** — visitors and residents seeking legal-use education, dispensary finding, and travel guidance.
4. **Tools** — users seeking calculators, datasets, and practical decision aids.

A visitor should be able to choose one of these paths without knowing MDG's internal content taxonomy.

### 2. Global navigation is a compact routing layer, not a site map

Desktop navigation uses the same four task paths. Each panel has four to six high-value destinations and one explicit hub link. City, town, post, and vendor inventories belong on their own index pages, never in the header.

Search, the gated **Professional Directory**, and About remain direct links. Labels must distinguish the gated professional directory (`/directory`) from public resource and discovery pages.

### 3. Route-family ownership

| Visitor purpose | Primary public entrance | Notes |
|---|---|---|
| Operator and market research | `/all-guides` | The broad operator knowledge library; individual guide pages require an appropriate contextual and/or related-content inbound path. |
| Municipal and regional research | `/guides` | Geographic/local research index; city lists and regional clusters belong here. |
| Find a store | `/find-a-dispensary` | Consumer store-discovery task, not a generic guide index. |
| Consumer education | `/learn` | General consumer explainers and first-time questions. |
| Timely analysis and editorial | `/blog` | Dated articles and analysis; a directory-like article may remain here until an approved directory migration. |
| Practical tools | `/maine-cannabis-tools` | Calculators, data tools, and operating aids. |
| Software/vendor research | `/software` and `/resources` | `/software` owns software comparisons; `/resources` owns professional resources. Labels must not call both a “directory.” |
| Operator professional directory | `/directory` | Gated product. It is not a public-directory parent. |
| About, editorial participation, and trust pages | `/about`, `/for-journalists`, `/contribute`, `/newsletter` | Secondary pages may live in footer/editorial navigation but still need an intentional inbound link. |

`/start-here` is a guided orientation route, not a competing long-term library index. Future library consolidation must identify one canonical owner per content family before moving or redirecting any existing public route.

### 4. Public directories are vertical products

MDG will not create a giant all-purpose directory. A public directory is a maintained, clearly scoped vertical: for example, stays, events, stores, or services. It must have its own editorial admission standard, maintenance owner, and relevant discovery path.

A plural public directory hub (`/directories`) is deferred until at least three maintained public directory verticals exist. At that point it becomes a catalog of directory types, not a page that attempts to list every item across the site.

Until an approved migration:

- `/blog/maine-cannabis-friendly-stays` remains canonical and keeps its current evidence-gated editorial policy.
- Any migration to a future public-directory URL requires a permanent redirect, canonical update, sitemap replacement, breadcrumb/parent update, internal-link rewrite, and production validation. No duplicate competing page may remain indexable.

### 5. Discovery contract for every intended public page

Every indexable public page must have all of the following before release:

1. A named route family and a human-readable parent/hub.
2. At least one durable inbound link from that parent, a relevant hub, or an explicit contextual relationship.
3. A breadcrumb-compatible hierarchy where the template supports breadcrumbs.
4. Inclusion in the XML sitemap unless deliberately excluded with documented noindex rationale.
5. At least one relevant onward path: related content, next step, sibling index, or task hub.
6. A clear owner for freshness and, for directories, an admission/maintenance standard.

Utility, embedded, search, admin, experiment, and dynamic catch-all routes are classified separately and must not be counted as public-page failures.

### 6. Enforcement

The existing orphan detector remains the baseline machine check. New route or route-family work must additionally document its parent and intended inbound links in its task contract. Public-directory migrations require a focused redirect/canonical/sitemap/link audit.

## Consequences

- Header navigation becomes easier to scan and no longer functions as a giant archive.
- Homepage orientation is explicit for the site's multiple audiences without hiding consumer paths.
- New public pages cannot be shipped merely because they render and appear in the sitemap; human discovery is a release requirement.
- `/directory` retains a clear product identity, avoiding confusion with any future consumer discovery system.
- The guide/index overlap is recognized as a follow-up canonicalization task rather than silently expanded through more links or new URL namespaces.

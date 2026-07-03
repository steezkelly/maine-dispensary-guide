# Senior Code Review — Maine Dispensary Guide
**Date: 2026-07-02 EDT**
**Reviewer: Hermes-Agent on `/home/steve` (mini-pc)**
**Repo HEAD at review: `d43c09b1` (Sprint 79)**
**Live: https://mainedispensaryguide.com**

This is a quarterly-style review. I read the project like a senior
engineer picking up a real, monetizable web property with 224 published
pages, a multi-agent write history, and a YMYL compliance surface.
I'm grading the codebase and the operation, not the people. Findings
are ranked P0 (block or fix in this sprint) / P1 (next sprint) /
P2 (backlog).

**TL;DR.** The site is real, the live deploy is clean, the verify loop
is the right idea but the implementation is leaky: the public
"100/100 (A) — 0 ERRORS" header is technically true and materially
misleading. The most recent work (`/learn/` consumer hub) shipped
with a 404 hero image that the gate missed. The body of the
`maine-cannabis-taxes-2026` guide still contains tax-law framing
that was already corrected in adjacent files but never propagated
into the body. The doc tree is duplicative and lags the code by
weeks. The IA has real consumer/B2B/dual-audience overlap that
no doc captures. None of these are unsolvable; most are < 1 day
of work to fix. But they are real.

---

## 1. Information architecture & site navigation

**Status: needs work.** Real duplication and a missing nav.

### What I found
The site has **three** "all guides" surfaces, each with a different
taxonomy:

| URL | File | Categories |
|---|---|---|
| `/guides` | `src/pages/guides/index.astro` | Business / Operations / Legal-Financial / City (flat) |
| `/all-guides` | `src/pages/all-guides.astro` | Business Essentials / Compliance & Legal / Operations & Technology / City & Regional (4 categories) |
| `/guides/index.astro` (same as row 1 — typo in my table) | |

These are in addition to category-filtered landing pages like
`/guides/maine-dispensary-license`, `/guides/maine-cannabis-market`,
and the topic index. The homepage hero CTA sends users to
`/find-a-dispensary`, the B2B journey sends them to `/start-here`,
and `/all-guides` is a separate page with a different set of
categorizations. A user landing on the homepage can get to any of
these; which one they end up on shapes their IA experience.

The main `SiteHeader` nav (visible from any page) has 9 items:
`/`, `/about`, `/all-guides`, `/blog`, `/directory`, `/find-a-dispensary`,
`/founders`, `/glossary`, `/guides`. There is no top-level entry for
`/learn/`, no top-level entry for `/start-here`, no top-level entry
for `/launch-checklist`, no top-level entry for `/roi-calculator`, and
no top-level entry for `/resources/`. Three of these
(`/start-here`, `/launch-checklist`, `/roi-calculator`) are explicitly
mentioned in PROJECT_STATE.md as primary conversion surfaces.

### The `/learn/` consumer hub is invisible in the nav
`/learn/` is the most recent commit (`d43c09b1`, Sprint 79) and is
the brand-new consumer-facing hub. It is **not in the main nav**.
Users will only find it if they:
- Click a cross-link from another page (there are some, e.g.
  `/learn/` cross-links from `/guides/maine-dispensary-license`)
- Read the blog
- Land via a search result

This is a real discoverability gap. The investment to ship a new
top-level section is only worth it if users can find it.

### Three top-level "guides" indexes is one too many
`/guides` and `/all-guides` are both indexed, both in the sitemap,
both in the main nav. They have different layouts (compact rows vs.
categorized cards) and different category names. I think the
intent is that `/guides` is the technical SEO entry and `/all-guides`
is the human-friendly entry, but nothing in the UI or the docs
explains that to the user. A new visitor clicking "Guides" then
clicking "All Guides" gets two meaningfully different lists.

### `/find-a-dispensary` and `/directory` are distinct?
`/find-a-dispensary` (157+ city pages, search by ZIP, OCP roster)
and `/directory` (vendor directory of professional services) are
both in the main nav. They are conceptually different
(dispensaries vs. service providers) but the nav labels don't make
that distinction clear. A user might click "Directory" expecting
dispensaries and get a CPA list. Recommend a label change to
"Find a Dispensary" (already is) and "Professional Directory" or
"Vendor Network."

### Recommendations
- **P0** Add `/learn/`, `/start-here`, `/launch-checklist`,
  `/roi-calculator`, `/resources` to the main nav. The current
  9-item nav is B2B-centric; the consumer hub (`/learn/`) is the
  most recent work and is invisible.
- **P0** Fix the broken hero on `/learn/` (see Section 3 — YMYL
  & broken content).
- **P1** Consolidate `/guides` and `/all-guides` into a single
  page with two views (compact / categorized) toggled by a tab or
  query param. 301 redirect the loser to the winner. Or, accept
  the duplication but rename `/all-guides` to `/guides/all` so
  it's a sub-page, not a peer of `/guides`.
- **P1** Clarify `/find-a-dispensary` vs. `/directory` in the
  nav labels.
- **P2** Run a tree-test with 5 fresh users: "where would you
  click to find a vendor?" "where would you click to find a
  dispensary near you?" "where would you click for a 101 on
  buying cannabis?" The current IA may pass or fail these in
  ways no code review can detect.

---

## 2. Content sprawl vs. content system

**Status: heading toward a hand-curated mess.** The hardcoded
array-of-objects pattern in the page sources is fine for 50
guides and untenable at 200.

### What I found
Every "list page" — `/guides/`, `/all-guides`, the homepage
resource cards, the ROI calculator related-links — is a hand-written
array of `{ title, description, href, section }` objects inside
the page's frontmatter. Examples:
- `apps/maine-cannabis/src/pages/guides/index.astro` lines 4-65
  define `businessGuides`, `operationsGuides`, `legalFinancialGuides`,
  `cityGuides` as hardcoded arrays
- `apps/maine-cannabis/src/pages/all-guides.astro` defines
  `categories[].guides` as another hardcoded array
- The homepage has hand-written `cityLinks`, `resourceLink`,
  `latestGuides` arrays
- `packages/ui/src/components/RelatedArticles.astro` is the
  "smart" component that does topic-intersection matching, but
  the frontmatter `topics` array on each guide is hand-maintained
  (`topics = ["city", "market", "licensing", ...]`)

Total touchpoints for "add a new guide and have it appear in 5
places on the site": 5-6 hand-edits across 5-6 files. The hub
Sprint 74 audit pass 1 explicitly enumerates this — it shipped
4 new guides and had to edit 11 files to wire up the cross-links.

The hub's plan to grow to 200+ guides (Sprint 82-84 cluster
outlines) will not survive a hand-curated IA. By the time you
hit 100 guides the drift will make the cross-link graph
unmaintainable.

### What it should be
- A `data/guides/` directory with one JSON file per guide (or
  one big `guides.json` with all metadata).
- A `lib/getGuides.ts` that returns guides filtered by section,
  topic, related-topic, city, etc. — frontmatter `topics` becomes
  a tag, not a typed frontmatter prop.
- A `<GuideCard>` component that takes a guide object and renders
  the standard card layout (used by `/guides`, `/all-guides`,
  homepage resource cards, search results, related-articles).
- A `<RelatedGuides guide=...>` component that does topic
  intersection against the central guide list, replacing the
  current hand-maintained `allGuides` array in
  `RelatedArticles.astro`.

This is the same refactor the README alludes to in
`docs/archive/2026-07-stale/TECHNOLOGY_REPORT.md`
("Headless CMS Integration" — though that's overkill for the
current scale; a JSON-backed in-repo system is the right first
step before any CMS).

### Recommendations
- **P1** Build a `data/guides.json` (or one-file-per-guide in
  `data/guides/`) and a `lib/guides.ts` query module. Migrate
  one page (`/all-guides`) as a prototype.
- **P1** Build a `<GuideCard>` and `<RelatedGuides>` component.
  Use it on the homepage and `/all-guides`.
- **P2** Migrate the remaining list pages.
- **P2** Once a JSON layer exists, build-time content checks
  (a "guide appears in at least one list page", "every guide
  has a non-empty topics array", "every guide has a heroImage
  that resolves") become trivial to write and cheap to run.
  This would have caught the `/learn/` broken-hero regression
  at build time.

---

## 3. YMYL compliance content & broken content

**Status: live, real, and inadequately audited.** The Sprint 74
audit pass 3 caught critical errors in the operator cost update
guide. The audit did **not** propagate to other guides that
have the same factual claims. There is a current broken-asset
regression on `/learn/`.

### 3.1 The `/learn/` consumer hub has a broken hero image (live)

```bash
$ curl -sL -o /dev/null -w "%{http_code}\n" https://mainedispensaryguide.com/images/heroes/homepage.jpg
404
```

The page source (`apps/maine-cannabis/src/pages/learn/index.astro`
line ~110) has `heroImage="/images/heroes/homepage.jpg"`. That
file does not exist in `apps/maine-cannabis/public/images/heroes/`.
This is the most recent commit on `main` (Sprint 79, `d43c09b1`).
The page is live, in the sitemap, and rendered with a 404 image
asset.

`scripts/content/check-content-health.cjs` correctly reports this
as a failure:

```
❌ rendered crawl basics: 1 issue(s)
    → learn/index.html: broken rendered asset link → /images/heroes/homepage.jpg
```

The baseline file
(`apps/maine-cannabis/scripts/content/.content-health-baseline.json`)
does not include this check, so the regression check passes
("baseline=0 current=0"). The new failure slips through.

**Fix:** generate or substitute a real hero image (e.g. one
matching `/learn/cannabis-events-2026` style — a Maine forest
scene with educational framing), and add the
`rendered crawl basics` check to the baseline file so future
regressions are caught. P0.

### 3.2 The body of `maine-cannabis-taxes-2026.astro` has tax-law framing that contradicts the Sprint 74 correction

The hub's Sprint 74 audit pass 3 explicitly noted: the
"14% is the **retail sales tax** under 36 M.R.S. §1811(1)(D)(5),
not the **excise tax**" and the operator cost update guide was
rewritten. The audit also corrected 4 callout boxes on
`/guides/maine-cannabis-taxes-2026.astro` and 3 other pages
(`funding-guide`, `dispensary-costs`, `index`).

But the **body** of `maine-cannabis-taxes-2026.astro` still
contains the old framing in at least 7 places:

- Lead paragraph: "Starting January 1, 2026, Maine's retail
  cannabis tax increases from 10% to 14% on adult-use cannabis
  sales." (This is the retail *sales* tax per §1811, not a
  separate "cannabis retail tax.")
- "Maine Cannabis Tax Rates at a Glance" fact-box: rows labeled
  "Retail Cannabis Tax (2026): 14% (up from 10%)", "State Sales
  Tax: 5.5%", "Edibles Sales Tax: 8%" — conflates the 5.5%
  general state sales tax, the 8% food sales tax, and the 14%
  cannabis retail sales tax as if they were three different
  things.
- 6 of 8 FAQs repeat the "retail cannabis tax" framing.
- "Impact on Pricing" example: "the retail cannabis tax
  increases from $5.00 (at 10%) to $7.00 (at 14%)" — this
  describes a sales-tax increase, not an excise-tax increase.
- "Critical 2026 Change" callout: same.

This is a YMYL compliance risk. A Maine operator reading this
guide to plan their 2026 tax position will be misled about the
structure of the tax they owe.

**Fix:** rewrite the body of `taxes-2026.astro` to match the
Sprint 74 audit pass 3 framing. Distinguish the four separate
taxes (general sales 5.5%, food sales 8% for edibles, retail
sales 14%, cultivation excise per §4923). The operator cost
update guide already has the correct framework — port it.
P0 — YMYL.

### 3.3 The `maine-cannabis-zoning-requirements.astro` "30 of 500+" claim

The hub's audit flagged: "the '60% of Maine's 492 municipalities'
opt-in claim in `maine-cannabis-zoning-requirements.astro:131`,
the '15 towns' claim in 3 places, the stale dispensary counts in
4 files."

I searched the actual file:

```
$ grep -nE "60%|15 town" apps/maine-cannabis/src/pages/guides/maine-cannabis-zoning-requirements.astro
(no output)
```

The "60%" claim and "15 towns" claim no longer appear in the
zoning-requirements file (or anywhere in the guides I sampled).
The current line 131 reads: "As of 2026, approximately 30 of
Maine's 500+ municipalities have opted in to adult-use cannabis
retail — about 6% statewide." That is internally consistent and
matches the `site-stats.json` figure (`activeAdultUseMunicipalities: 65`
which is "all 343 active AU establishments," not "30 of 500+").
The 6% claim is plausible and cites 28-B M.R.S. §301.

**Verdict on this specific audit item:** fixed or never existed
in the form the hub described. The current "30 of 500+" framing
is reasonable and worth a one-line cite to the OCP roster date.
P2.

### 3.4 Stale OCP roster is acknowledged but uncorrected

`apps/maine-cannabis/src/data/site-stats.json` says
`"asOf": "2026-04-01"` and the OCP roster is 92 days stale as of
2026-07-02. The `notes` field says "Monthly when OCP publishes
new data; run `node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs`."
MISSION_CONTROL.md's only warning is "OCP stats last refresh:
2026-04-01 — 69 days stale (drift -80)."

`refresh-site-stats.cjs` exists, but no agent on any machine has
run it in 92 days. The script's own header probably documents
the steps to refresh from the OCP CSV. Until that script runs
on a schedule (cron, or a build-time check that fails when
`asOf` is > 30 days old), the stats will silently drift.

P1.

### 3.5 The OCP "187" stat is in 3 places, only one of which is a single source of truth

`site-stats.json` is the declared single source of truth, but
the homepage, `404.astro`, and `find-a-dispensary.astro` all
reference the same value via `getSiteStats()`. That's good.
What is less good: the 187 number itself is 92 days old and
hasn't been refreshed. The single source of truth is stale
in a coordinated way. When the OCP CSV gets refreshed, the
script needs to update *one* number, and that update needs
to propagate to 3 callers. That works.

What doesn't work: there's no alert when the source-of-truth
number is more than 30 days old. The script could check its
own `asOf` field on every call and log a warning. P2.

### 3.6 The `maine-cannabis-events-2026` guide's "420 events + 420 celebrations"

The consumer-hub `cannabis-events-2026.astro` (Sprint 79) and the
B2B-hub `maine-cannabis-events-2026.astro` (existing tech guide)
have **overlapping content for the same topic**. The consumer
one is "where to attend 420 festivals as a consumer," the B2B
one is "industry meetups, policy hearings, and networking
opportunities for operators." They are distinct audiences, but
the same URL slug family (`maine-cannabis-events-2026` lives in
`/guides/`, `/learn/cannabis-events-2026` lives in `/learn/`)
makes them discoverable as duplicates in search results.

Not a YMYL issue, but a content-strategy issue. P2 — consider
slugs that distinguish the two (`maine-cannabis-industry-events-2026`
for B2B, `maine-cannabis-consumer-events-2026` for consumer).

### Recommendations
- **P0** Fix the `/learn/` broken hero image. Add the
  `rendered crawl basics` check to the regression baseline.
- **P0** Rewrite the body of `taxes-2026.astro` to match the
  Sprint 74 audit pass 3 framing.
- **P1** Add a build-time check that fails if `site-stats.json`
  `asOf` is > 30 days old.
- **P1** Run `refresh-site-stats.cjs` to refresh the OCP roster
  from the current CSV.
- **P2** Disambiguate the B2B vs. consumer `events-2026` slugs.

---

## 4. SEO/GEO maturity vs. theatre

**Status: implementation is genuine in spots, theatrical in others.**

### What I found
The README claims "First 200 Words Fact-Box designed specifically
for AI Chatbot (ChatGPT/Perplexity) citation" and "Factual
Density: Use of tables and structured data to maximize
'Extractable Units' for search engines."

Looking at the actual rendered HTML:
- The fact-boxes exist as `<section class="fact-box">` blocks in
  the page bodies. They are real, not just a marketing claim.
- The tables exist. They have `<thead>` / `<tbody>` and a few
  have `aria-label` for accessibility. Most do not have
  `<caption>`. Only 1 of the 7 tables I sampled in
  `taxes-2026.astro` has a `<caption>`.
- The JSON-LD is real. Every guide has at least one
  `application/ld+json` block. The hub's Sprint 74 audit
  found duplicate FAQPage JSON-LD (one from the shared
  `<Faq>` component, one from an explicit page-level script);
  that was fixed for the 4 new B2B guides but I haven't
  confirmed whether the same pattern persists on the 47
  existing tech guides.

### The "first 200 words" claim
I pulled the live first 200 words of `/learn/cannabis-events-2026`
and a few of the B2B guides. The "fact-box" in the body content
is consistently within the first 200 words on the 4 new B2B
guides (Sprint 74), but on `/learn/cannabis-events-2026` (Sprint
79) the first 200 words are largely decorative (a hero, then
intro paragraph, then the first section heading). The
"first 200 words" fact-box pattern was not consistently applied
to the `/learn/` work.

### The "Extractable Units" claim
The 5 lead-capture forms (Sprint 77) emit `gtag('event', 'lead_capture',
{ form_name, page_path, stage, interest, service })`. The
`form_name` dimension distinguishes which form converted
(`newsletter_homepage`, `newsletter_inline`, `download_checklist`,
`founders_bible`, `referral_request`). The `stage`, `interest`,
and `service` dimensions depend on form fields being filled out.

Two questions:
1. Are the `stage`, `interest`, and `service` dimensions going
   to answer the business question "which form produces the
   highest-quality leads"? Probably not as designed. The
   dimensions are not normalized — `stage` could be "exploring",
   "researching", "ready-to-launch" on one form and "0-3 months",
   "3-6 months", "6-12 months", "12+ months" on another.
   Cross-form analysis will be confounded.
2. Is the `gtag` actually firing in production? I have no way
   to verify from the repo alone — that needs a live GA4
   DebugView check. The Sprint 77 hub entry says
   "Verified end-to-end: ... gtag function are present" but
   "present" is not the same as "firing on submit and reaching
   GA4 servers."

### Recommendations
- **P1** Add `<caption>` to all the data tables on
  `taxes-2026`, `regulations`, `caregiver-guide`,
  `events-2026`, and the `/learn/` pages. The HTML tables
  are real; they just need the caption element to be picked
  up as "Extractable Units" by Google's table-snippet
  feature.
- **P1** Normalize the `stage`, `interest`, `service` dimension
  values across the 5 lead-capture forms. Document the taxonomy
  in `LEAD_CAPTURE_SETUP.md`.
- **P1** Verify the lead_capture gtag is actually firing in
  production by checking GA4 DebugView. The repo can't prove
  this from code alone.
- **P2** Apply the "first 200 words fact-box" pattern to the
  `/learn/` consumer hub. The B2B guides have it; the consumer
  ones don't.

---

## 5. The multi-agent protocol in practice

**Status: the protocol is documented but not enforced.** Two real
incidents (Sprint 75 build-breaker, the current /learn/ broken
hero) suggest the protocol is the canary, not the cage.

### What I found
- `AGENTS.md` describes a "Multi-Agent Collaboration" section
  that lists 5-6 agents in a "6-Agent Pantheon" with
  specific roles (orchestrator, oracle, librarian, explorer,
  designer, fixer, observer).
- The hub is the source of truth and is written by agents for
  agents.
- Three documented agents have written commits in the last 30
  days: Hermes (this one), OpenCode Bot, and Gemini CLI.

The protocol claims:
- "trust the verify loop, log in the Hub, flag only on
  one-way-door / wholesale / irreversible changes" (AGENTS.md,
  the "Reframed 2026-06-06" rule)
- Pre-push gate catches structural errors
- Parallel sessions should use the
  `parallel-session-coordination` skill (referenced in the hub)

What the evidence shows:
- **Sprint 75 build-breaker** (hub entry, "pass 4"): a
  parallel session shipped a file with 12 syntax errors. The
  pre-push gate caught it on the next push, but only because
  another agent (a third parallel session!) ran the verify
  loop. The pre-push gate did not block the broken commit;
  it blocked the *next* push.
- **Sprint 79 `/learn/` broken hero**: the most recent work
  shipped with a 404 image. The pre-push gate (esbuild parse
  + astro check + smoke-200) was either not run on the
  feature branch, or it was run and the broken image was
  not detected. The smoke-200 step is supposed to catch
  404s on the live site, but it tests `dist/` against
  `MDG_BASE` — and since the broken image is in `public/`,
  the static server returns 404 on it, but the smoke-200
  test only checks the HTML pages, not the assets. So the
  test passed because the HTML pages render with a
  `<img src="/images/heroes/homepage.jpg">` tag and the
  asset request happens client-side, not server-side.
- The two `AGENTS.md` files disagree on basics (one says 35
  blog posts, the other says 6). At least one of the agents
  that wrote the inner `apps/maine-cannabis/AGENTS.md` didn't
  read the root one before writing their own.

### What's working
- The hub log is genuinely useful. Sprint 74 audit pass 3
  caught real YMYL errors. Sprint 75 audit pass 4 caught
  the parallel-session build-breaker. The audit-after-the-fact
  pattern is paying for itself.
- The "Reframed 2026-06-06" rule is the right call. Asking
  permission for every edit creates real friction with no
  real safety gain.

### What isn't
- The pre-push gate does not catch broken asset references.
  This is a real gap.
- The "automatically installed" claim for the pre-push hook
  is false. On a fresh clone, the hook does not run until
  the user runs `node scripts/git/install-hooks.cjs`. Two
  agents (the one who wrote the handbook and the one who
  wrote the orient skill) got this wrong.
- The two `AGENTS.md` files are a documentation smell. The
  inner one is older. Either it should be a symlink to the
  outer one, or the outer one should be a stub that links
  to the inner one.
- `AGENT-USAGE-GUIDE.md` describes an OpenCode-Desktop-specific
  agent framework (`oh-my-opencode-slim`, the 6-agent Pantheon)
  that does not exist on a Linux-mint machine without
  `~/.config/opencode/`. New agents on a new machine will
  read this doc and assume they need to install OpenCode
  Desktop to do their work. They don't.

### Recommendations
- **P0** Extend the smoke-200 step to also check that every
  `<img src>` in every rendered HTML page returns 200.
  This is ~50 lines of code (`fetch` every `<img>` URL,
  check status). Catches the current /learn/ regression and
  the class of "shipped with a typo in an asset path" bugs.
- **P1** Fix the pre-push hook auto-install claim. Either
  make the hook actually install on `npm install` (via a
  `postinstall` script) or fix the handbook to say
  "run `npm run hooks:install` once per clone."
- **P1** Delete one of the two `AGENTS.md` files. Recommend
  keeping the root one (most recent) and either deleting
  the inner one or making it a 1-line `see ../AGENTS.md`.
- **P2** Move the `oh-my-opencode-slim`-specific content
  from `AGENT-USAGE-GUIDE.md` to a separate file
  (`reference/oh-my-opencode-slim.md`) and link to it.
  The current file mixes agent-framework docs with
  project-conventions docs.

---

## 6. Operational debt

**Status: the gates exist, the gates are leaky.**

### What I found
- **CI is much smaller than the docs claim.** `.github/workflows/ci.yml`
  runs only 3 checks: `npx astro check`, `npm run build`, and
  `check:sitemap-xml`. The handbook and AGENTS.md claim 6
  checks (hrefs, build-warnings, content-health-regression,
  sitemap-xml, smoke tests, and a duplicate). The other 4
  checks are documented in scripts but not wired into CI.
  This means the pre-push gate catches the broken-image
  regression locally (if you run the gate) but CI does not.
- **The pre-push gate smoke-200 step checks the live site,
  not the build.** So if you push a broken-image commit, the
  push gate will hit `mainedispensaryguide.com/images/heroes/...`
  and it will 404 (which is what we want), but the pre-push
  gate is running on the *local* `dist/` and the local copy
  won't have the right image either. So the gate passes
  both locally and in production for the wrong reason.
- **The content-health baseline is a moving target.** The
  baseline file has 5 named checks with values; the check
  suite runs 14. The 9 checks not in the baseline are run
  every time but their failures are not tracked as
  regressions. The current `/learn/` broken-image regression
  is exactly this: the check runs, finds 1 failure, but the
  regression check only compares the 5 in-baseline checks.
- **The `/status.json` endpoint is stale.** Live
  `/status.json` was generated 2026-06-08; current main is
  9 commits ahead. The build script that writes
  `/status.json` either broke or runs less often than
  every build. MISSION_CONTROL.md cites it as the
  "machine-readable source of truth" and it's 24 days old.
- **The `Mdg Sprint Audit` skill is referenced in the hub
  but not present in this profile.** It's a manual
  audit-checklist skill. Re-implementing it as a
  machine-runnable check (instead of a skill the agent
  reads) would be more reliable.

### Recommendations
- **P0** Add `check:hrefs`, `check:build-warnings`,
  `check:content-health`, and Playwright smoke tests to
  `.github/workflows/ci.yml`. The handbook claims they
  run; they don't.
- **P0** Add a "rendered asset 200" check to the pre-push
  gate. The current smoke-200 only checks the page HTMLs.
- **P1** Make `/status.json` regeneration a required
  post-build step in `vercel-build.sh` (and a required
  pre-commit check on changes to `src/data/site-stats.json`).
- **P1** Either add all 14 content-health checks to the
  baseline file or remove the baseline file (and let
  the check fail on any failure). The current "tracked
  for these 5, ignored for the other 9" pattern is
  hiding real failures.
- **P2** Promote the `Mdg Sprint Audit` skill to a
  machine-run script. The "look at the live site and
  check for broken things" audit is reproducible and
  should be in CI, not in a skill file.

---

## 7. The "scaled to a national hub" thesis

**Status: not viable with the current architecture.** Adding a
second state is a rewrite, not a configuration change.

### What I found
The README and the Technology Report both pitch "scaling from
Maine to a national Dispensary Guide empire." The code does not
support that.

- The repo is structured as a **single Astro app** at
  `apps/maine-cannabis/` with hardcoded "Maine" content in
  data files (`site-stats.json`'s `stateName: "Maine"`,
  `data/authors.json`, `data/topics.json`), hardcoded
  Maine-specific legal references in the page bodies
  (28-B M.R.S. §301, 36 M.R.S. §4923, P.L. 2025 ch. 388),
  and a hardcoded domain (`https://mainedispensaryguide.com`)
  in 4+ places (`astro.config.mjs`, `site-config.json`,
  `vercel.json`, `apps/maine-cannabis/scripts/build/smoke-200.cjs`).
- The Turborepo monorepo *shape* is correct for multi-app
  scaling — `apps/maine-cannabis/` is the right pattern for
  a future `apps/vermont-cannabis/`, `apps/massachusetts-cannabis/`,
  etc. But the current code does not extract the
  "Maine-specific" parts from the "shared" parts. There is
  no `packages/ui` that is truly shared (it has a hardcoded
  Maine header link, hardcoded Maine footer, hardcoded
  Maine CSS variables). There is no `packages/layouts` that
  could render a Vermont page without re-implementing
  everything.
- The `add-app.md` documentation in `packages/` does not
  exist. Adding a new app would require reverse-engineering
  the `maine-cannabis` structure.

### The honest assessment
The "national hub" thesis is currently **marketing**, not
**engineering**. The technology could be retrofitted for
multi-state — Astro monorepo is the right substrate, and
`packages/ui` and `packages/layouts` exist as directories
that could host shared code. But the work to actually
extract the shared-vs-state-specific boundary is **at
least** a 3-6 sprint refactor (estimate: 200+ hours), and
the value of doing it before the first state generates
real revenue is unclear.

### What I'd recommend instead
- **Don't scale to other states yet.** Maine is not at
  revenue scale. The Maine OCP roster has 187 active retail
  stores; the site claims 4.83M transactions per year; the
  lead-capture form completions are unknown. The first
  business question is: "is the Maine property producing
  real leads?" not "can we add Vermont?"
- **If you do scale**, scale horizontally: build
  `apps/vermont-cannabis/` as a sibling app with shared
  `packages/ui` extracted first. Don't try to make the
  current `maine-cannabis` app multi-state.
- **Make the boundary explicit** even if you don't scale:
  pull the "Maine" string out of every hardcoded reference
  into a `site-config.json` (already exists). Same for
  domain, same for `stateName`, same for legal cite
  templates.

### Recommendations
- **P2** Extract the Maine-specific strings from
  `packages/ui` and `packages/layouts` into
  `site-config.json` (or a per-app config). This is a
  prerequisite for the national-scaling thesis to be
  engineering rather than marketing.
- **P2** Decide explicitly: is the national-scaling thesis
  active or aspirational? If aspirational, update the
  README to say so. If active, plan the refactor.
- **P2** Move the `stateName`, `domain`, `legal
  jurisdiction`, and `OCP roster` references out of page
  bodies and into a config layer.

---

## 8. Other findings

### 8.1 The dead code in `astro.config.mjs`
`apps/maine-cannabis/astro.config.mjs` has 4 unused variables:
`pages`, `site`, `routeFromSrcPath`, `listAstroPages`. The
sitemap postprocessor hook references them but they are never
read. `npx astro check` reports these as `ts(6133)` warnings
(downgraded to "hints" in the result count but visible in
the body). Delete them. P1.

### 8.2 The dead code in `scripts/content/content-quality.cjs`
This 541-line script has 9 unused helper functions
(`findPatterns`, `matchesPattern`, `globToRegex`, `fileExists`,
`hasFrontmatter`, and others). Either revive them or delete
them. P1.

### 8.3 The `scripts/git/delta-typecheck.cjs` is deprecated but still in tree
The hub's audit (Sprint 76b) replaced it with
`pre-push-verify.cjs`. The deprecated script is still in
`scripts/git/` and has a hardcoded Windows path. Either
delete it or move it to `scripts/git/archive/`. P2.

### 8.4 The `Hero` image-variant gap on legacy guides
The Sprint 74 audit pass 2 generated `.avif` and `.webp`
variants for the 4 new B2B guide heroes. The 47 existing
tech guides (and the city guides) have a single `.jpg`
hero. The `<picture>` element in Layout.astro may
auto-reference non-existent variants for these. The
content-health check reports 18 duplicate hero image
hashes for "intentional shared source asset" cases
(`buying-cannabis-by-effect-2026` and
`terpene-preservation-maine-2026` share a hash). The
remaining 30+ tech guides probably have a mix of
`.jpg` only, `.jpg` + `.webp`, and `.jpg` + `.webp` +
`.avif`. This is a content-quality smell. P2.

### 8.5 The `vercel-overview.yml` and `vercel-dashboard.yml` are dead
These exist in the repo root and look like exports from
Vercel project settings. They are not used. The actual
config is in `vercel.json`. Delete them. P2.

---

## Summary of recommendations

**P0 (do this sprint, before any new work):**
1. Fix the `/learn/` broken hero image
   (`/images/heroes/homepage.jpg` → 404)
2. Add `<img>` 200 check to the pre-push gate
3. Add `check:hrefs`, `check:build-warnings`,
   `check:content-health`, and Playwright smoke to CI
4. Rewrite the body of `maine-cannabis-taxes-2026.astro`
   to match the Sprint 74 audit pass 3 framing (4 taxes
   clearly distinguished)
5. Add `/learn/`, `/start-here`, `/launch-checklist`,
   `/roi-calculator`, `/resources` to the main nav

**P1 (next sprint):**
- Build `data/guides.json` + `<GuideCard>` + `<RelatedGuides>`
- Add `asOf > 30 days` check on `site-stats.json`
- Run `refresh-site-stats.cjs` to refresh the OCP roster
- Delete dead code in `astro.config.mjs` and
  `content-quality.cjs`
- Fix the pre-push hook install-on-clone claim
- Consolidate the two `AGENTS.md` files
- Make `/status.json` a required post-build step
- Add the `rendered crawl basics` check to the regression
  baseline

**P2 (backlog):**
- Disambiguate B2B vs. consumer `events-2026` slugs
- Extract Maine-specific strings from `packages/ui` and
  `packages/layouts`
- Decide explicitly on the national-scaling thesis
- Delete deprecated `delta-typecheck.cjs` and
  `vercel-{overview,dashboard}.yml`
- Add `<caption>` to all data tables
- Normalize the lead_capture GA4 dimension values
- Verify the lead_capture gtag is actually firing in
  production
- Apply the "first 200 words fact-box" pattern to
  `/learn/`
- Run a tree-test on the IA

---

## What's working (don't break this)

- The verify-loop idea is right. Pre-push gate + CI + live
  smoke is a good safety net even if it's currently leaky.
- The multi-agent audit-after-the-fact pattern (Sprint 74
  audit pass 3 caught 3 critical YMYL errors) is genuinely
  valuable. Promote it from "manual" to "machine."
- The "Reframed 2026-06-06" rule (trust the verify loop,
  log in the Hub, flag only on one-way-door changes) is
  the right call. Don't revert it.
- The `lib/site-stats.ts` single-source-of-truth pattern
  for the OCP roster is the right shape. It just needs to
  be kept fresh.
- The 47-table + JSON-LD + cross-link graph is real
  SEO/GEO work, not theatre. The first 200-words fact-box
  on the 4 new B2B guides is genuinely good.
- The custom design system (CSS variables, no Tailwind,
  geometric icons) is consistent across 224 pages. That's
  hard. Don't refactor it.
- The CI/CD pipeline (push → Vercel GitHub App → production)
  has been stable. The 9-commits-behind `/status.json`
  issue is the only real signal that something is off.

---

## What I did not look at

- Playwright test suite in `tests/` (didn't run them)
- The full content of all 47 tech guides (sampled 5)
- The full content of all 109 city guides (sampled 0)
- The blog posts (sampled 0)
- The `reference/` directory beyond listing it
- The `docs/` directory beyond listing it
- The `vercel.json` content
- The `packages/ui` and `packages/layouts` code in detail
- The `playwright-mcp` integration
- The actual production Vercel deploy logs

A real quarterly review would touch all of these. This is a
first-pass review from a single session.

---

*Prepared for: Steve Kelly and any future agent picking up
this repo. The Hub entry for this review can be drafted
from this file's TL;DR + P0 list; the rest is in the body
for context.*

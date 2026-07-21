# MDG Evidence-Led Question Expansion — Design

Date: 2026-07-21
Status: Approved by Steve
Scope: Maine Dispensary Guide only

## TL;DR

Expand MDG's answer-first question content in measured five-page waves. Candidate questions come from first-party GSC data, keyword metrics, live SERPs/People Also Ask, and relevant competitor gaps. Each candidate must pass an intent-ownership check before authoring: improve an existing owner when one exists; create a new Q&A page only for a genuine gap. Regulated claims require current primary sources. Measure each wave in GSC after 2–4 weeks before scaling.

## Baseline

- Six purpose-built answer-first Q&A pages have shipped.
- Roughly fifteen blog H1s use question phrasing, but several are traditional long-form guides rather than focused Q&A pages.
- The strongest question queries visible in the final 2026-04-18 through 2026-07-18 GSC window have largely been addressed by the first Q&A wave and related title/H1 surgery.
- GSC alone is therefore too narrow for the next discovery cycle. The approved direction combines first-party evidence with external demand and live-SERP evidence.

## Goals

1. Capture additional Maine cannabis question demand without mass-producing thin pages.
2. Create pages that answer search and generative-engine questions immediately and cite evidence clearly.
3. Strengthen topical authority across consumer, medical, travel, home-grow, employment, and operator topics.
4. Preserve existing page authority by avoiding duplicate intent and query cannibalization.
5. Produce measurable waves whose ranking, impressions, and CTR can be evaluated independently.

## Non-goals

- No content outside Maine.
- No arbitrary quota of pages when evidence is weak.
- No duplicate pages for wording variants that share one search intent.
- No replacement of comprehensive evergreen guides with shallow Q&A pages.
- No unsupported legal, tax, medical, licensing, possession-limit, or market-count claims.
- No broad template migration or unrelated visual-system work.

## Discovery Sources

Use four evidence layers:

1. **GSC:** question queries, query-to-page routing, impressions, clicks, CTR, position, and cannibalization.
2. **Keyword metrics:** search volume, difficulty, intent, CPC where useful, and related-question variants.
3. **Live SERPs:** ranking page type, People Also Ask questions, featured snippets, weak or stale competitors, and Maine-local intent.
4. **Competitor gaps:** useful Maine-specific questions answered by credible competitors but not owned by MDG.

GSC is first-party validation, not the only admissible source. A candidate can enter the queue without current MDG impressions when keyword and SERP evidence show real Maine demand.

## Question Taxonomy

Mine and classify leading question forms:

- What
- When
- Where
- Why
- Who
- How
- Which
- Can / Could
- Is / Are
- Do / Does
- Should / Would / Will

Cluster wording variants by shared intent. For example, “how much does it cost to open a dispensary,” “what does a Maine dispensary cost,” and “how much money is needed to start a dispensary” belong to one intent unless live SERPs prove otherwise.

## Candidate Clusters

Initial research should cover:

1. Buying and visiting dispensaries
2. Maine legality, possession, and public consumption
3. Medical cards, caregivers, and reciprocity
4. Home growing, seasonal timing, and cultivation
5. Licensing, startup cost, profitability, and employment
6. Town availability, travel, and federal-land restrictions
7. Products, dosing, testing, labels, and consumer safety

These are discovery lanes, not page quotas. Evidence determines which lane ships first.

## Candidate Scoring

Score every intent from 0–5 on six factors:

- Maine relevance
- Demonstrated demand
- Ranking attainability
- Commercial or lead value
- Evidence quality and freshness
- Internal-link fit

Apply a cannibalization penalty from 0 to -5 when an existing page already owns or nearly owns the intent.

Prioritize candidates with strong combined scores and no unresolved YMYL evidence gap. The candidate ledger must retain the source metrics, SERP observations, proposed owner URL, decision, and reason.

## Ownership Decision

Every candidate receives exactly one disposition:

### Improve existing owner

Use when an existing page ranks for the intent or comprehensively answers it. Possible changes include title/H1 surgery, answer-capsule insertion, FAQ expansion, description improvement, or stronger internal links. Confirm canonical behavior and anchor safety before editing.

### Build a new answer-first page

Use only when no existing page owns the intent and the question can support a distinct, useful answer. The new page becomes the canonical owner for its clustered variants.

### Defer

Use when demand is too weak, the intent is ambiguous, evidence is unavailable or conflicting, the topic falls outside Maine, or a new page would be thin.

## Answer-First Page Contract

Each new page must include:

1. H1 matching the natural primary question.
2. A 2–3 sentence direct-answer capsule before explanatory material.
3. A dated evidence or stat block when reliable proprietary or primary-source data exists.
4. Body sections that expand rather than repeat the direct answer.
5. A focused FAQ set using the shared `Faq` component and exactly one FAQPage schema path.
6. Named reviewer/byline and last-reviewed date.
7. Informational disclaimer appropriate to the claim class.
8. At least two intentional links to canonical evergreen MDG guides or tools.
9. At least one meaningful inbound link from the relevant hub, guide, or article.
10. Existing MDG editorial design and Astro/plain-CSS conventions.

Question pages should be as long as the intent requires, not padded to a word count.

## YMYL and Evidence Rules

- Verify legal, tax, licensing, possession, medical, and official count claims against current statutes or regulator sources.
- Keep dates and definitions attached to counts.
- Do not treat sibling MDG pages or third-party summaries as primary evidence.
- When official sources conflict or cannot support a material claim, defer publication.
- Preserve the known distinction between annual-report totals and dated operational roster counts.

## Five-Page Wave Model

Each wave contains up to five accepted actions. An action may be a new page or a material improvement to an existing owner.

Wave lifecycle:

1. Build the candidate ledger.
2. Select up to five highest-value non-overlapping intents that clear the evidence threshold.
3. Create a scoped Kanban contract and isolated worktree.
4. Research and record primary sources.
5. Author or improve pages.
6. Add intentional inbound and outbound links.
7. Regenerate derived data and run repository verification.
8. Independently review regulated claims, intent ownership, and rendered output.
9. Integrate through the normal PR/release path.
10. Re-measure after 2–4 weeks.

Do not start the next implementation wave merely to maintain cadence. Research may continue, but shipping decisions should incorporate available measurement from prior waves.

## Verification

For every wave:

- No duplicate primary intent among changed or existing pages.
- Exact canonical URL and one H1 per page.
- Exactly one FAQPage schema path where FAQ schema is used.
- All Question nodes match visible FAQ content.
- Current primary citations support every regulated figure or legal conclusion.
- New pages have meaningful inbound links and are not orphaned.
- `autoRelatedData.json` and other generated indexes are current.
- `npm run verify:iterate` passes during iteration.
- Final isolated build passes.
- `npm run verify:push` passes before release.
- Built HTML is inspected for title, H1, canonical, FAQ schema, byline, and trust surface.

## Measurement

Use GSC query+page data as the primary outcome source. Compare each page's post-release window with its documented baseline when enough data exists.

Track:

- New query coverage
- Impressions
- Average position
- Clicks and CTR
- Correct query-to-page routing
- Cannibalization or wrong-page wins

Use a 2–4 week first check. Avoid declaring success or failure from the first few days of crawl and indexing.

## Success Criteria

The system succeeds when:

- Each wave ships no more than five evidence-backed, non-overlapping actions.
- Every new page owns a distinct Maine-relevant intent.
- Regulated claims pass primary-source review.
- Pages are discoverable through intentional internal links.
- Post-release GSC shows new query coverage or improvement in position/CTR without material cannibalization.

The program pauses when research produces no candidate that meets the evidence, ownership, and quality thresholds; it does not lower the bar merely to fill a five-action wave.

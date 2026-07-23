# MDG Signal Data Explorer — Design Package

**Date:** 2026-07-23
**Status:** reviewed concept package for operator evaluation; not a production implementation
**Scope:** Maine only
**Artifacts:**
- `sketches/004-mdg-signal-data-explorer/index.html` — question-first statewide dashboard concept
- `sketches/005-mdg-signal-municipality-workflow/index.html` — clickable municipality-research workflow

## 1. Product thesis

MDG Signal should make Maine cannabis public data useful without hiding its provenance or overstating its completeness.

The public product answers a current question and keeps the evidence attached. The proposed paid product remembers a user-selected scope and reports verified changes. In short: **the public dashboard explains today; the paid workspace remembers what matters and reports what changed.**

The two prototypes test complementary moments:

1. **Dashboard orientation:** Can a customer quickly understand market movement, product mix, retail concentration, and data coverage?
2. **Municipality research:** Can a customer select a Maine municipality, compare it with peers, inspect source/freshness, and understand why saved watchlists and change alerts could be worth paying for?

## 2. Evidence boundary

Both concepts use the checked-in MDG-DATA release `ded381696bddf56f`. The prototypes do not fetch, scrape, mutate, or publish data.

### Current, defensible data shown

| Product | Data date | Status | Sources |
|---|---:|---|---|
| Adult-use retail sales, transactions, product mix, average flower price | June 2026 | Preliminary, because the release metadata marks the observations preliminary | Maine OCP retail-sales data |
| Active adult-use cannabis-store licenses by municipality | 2026-06-01 | Current release, not preliminary | Maine OCP licensee search |
| Population and licenses per 10,000 residents | ACS 2024 + license snapshot 2026-06-01 | Current release, not preliminary | U.S. Census ACS 5-year + Maine OCP licensee search |
| Municipal opt-in coverage | Partial | The current Firecrawl capture covers only part of Maine; it must not be presented as a statewide status result | Maine OCP opt-in communities capture |
| Menu-price data | Not ready | No customer-facing values shown | Omitted |

The municipality workflow uses these current release values:

| Municipality | Active store licenses | ACS 2024 population | Licenses per 10K |
|---|---:|---:|---:|
| Portland | 27 | 68,854 | 3.92 |
| South Portland | 11 | 26,930 | 4.08 |
| Bangor | 10 | 31,938 | 3.13 |
| Lewiston | 8 | 38,324 | 2.09 |
| Auburn | 7 | 24,602 | 2.85 |
| Waterville | 6 | 17,077 | 3.51 |
| Sanford | 4 | 22,247 | 1.80 |
| Brunswick | 3 | 22,336 | 1.34 |

The concepts exclude private contact details, internal operational fields, and unsupported municipal-policy conclusions.

## 3. Capability labels

The interface must distinguish three states wherever a capability or dataset appears:

- **Current release:** the value exists in the checked-in MDG-DATA release and carries its source/date.
- **Partial / not ready:** the pipeline exists but coverage or semantics do not support the requested claim.
- **Proposed paid capability:** the interaction demonstrates product value only. No account, persistence, alert delivery, export, billing, or historical change service exists.

Buttons that preview paid value use explicit “Preview” or “Proposed” language. They do not claim that data has been saved, exported, or delivered.

## 4. Design direction

### Posture

A Maine research desk, not a generic admin dashboard: editorial typography, warm paper, dense but readable evidence, restrained spruce/teal/bronze accents, and visible source dates.

### Tokens

- Display: Fraunces, 400/600/700
- Body: Plus Jakarta Sans, 400/500/600/700
- Light surfaces: warm paper and bone, never stark white against dark surroundings
- Dark surfaces: deep spruce with warm bone text
- Primary action: spruce
- Active research state: teal
- Proposed/preview state: bronze
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radii: 6, 12, 18
- Motion: 160–220ms; disabled to near-zero under `prefers-reduced-motion`

### Interaction principles

- Start with the decision, not the artifact name.
- Keep source and freshness visible beside the answer.
- Use compact cards only for data or state; do not turn every paragraph into a card.
- Maintain 44px minimum interactive targets and visible `:focus-visible` rings.
- Support light and dark modes with the same semantic hierarchy.
- Avoid map theater: comparison is tabular and proportional until a production-grade geographic surface is justified.

## 5. Prototype 004 — dashboard orientation

The dashboard answers four questions:

1. How is the market moving?
2. Where is retail concentrated?
3. What products drive sales?
4. Which licenses are active?

It presents four or fewer headline metrics, one temporal chart, one composition chart, one selected-municipality comparison, and a coverage ledger. The “paid workspace” drawer explains saved scopes, change detection, sourced briefs, and exports while explicitly stating that those capabilities are not built.

The selected eight municipalities are examples from the current release, not a statewide ranking. Raw counts and per-10K rates remain separate views because they answer different questions.

## 6. Prototype 005 — complete municipality-research path

### Path

1. **Select a municipality.** Search or choose from the current-release list. The selected municipality becomes the primary research subject.
2. **Compare.** Add up to three release-backed municipalities. Compare active license count, ACS population, and licenses per 10K. The interface states that density is descriptive, not a demand or “underserved market” score.
3. **Inspect source and freshness.** Open an evidence drawer showing release ID, data date, fetch timestamp, source IDs, source URLs, ACS vintage, transform version, and preliminary status.
4. **Preview save/watchlist.** Open the proposed paid workspace. The UI previews a saved municipality scope but never persists it or says it was saved.
5. **Preview a change alert.** Choose a condition such as license-count change or source refresh. The preview states that the current release has no historical baseline for an actual alert; a future verified release would be required to produce a before/after notice.

### Default scenario

Portland is selected, with South Portland and Brunswick as comparison peers. This is useful because raw count and population-normalized density tell different stories: Portland leads the selected set by raw count, while South Portland has the higher per-10K rate.

### States

- **Success:** current-release metrics render with attached evidence.
- **Partial:** municipal authorization is withheld and labeled partial rather than inferred.
- **Not ready:** menu-price comparisons are unavailable.
- **No match:** search returns a clear message without inventing a municipality.
- **Proposed paid preview:** watchlist and alert controls work locally but state that nothing is persisted or delivered.

## 7. Accessibility and responsive behavior

- Semantic landmarks: header, nav, main, sections, aside/drawer.
- Controls have accessible names, pressed/expanded state where appropriate, and visible keyboard focus.
- Evidence drawer and paid preview close by button or Escape and move focus to their close control when opened.
- Status is never communicated by color alone.
- Charts and bars have text equivalents.
- Desktop target: 1440px; additional responsive checks at 1024px and 390px.
- No horizontal overflow at tested widths.
- Reduced-motion users receive effectively instant transitions.

## 8. Explicitly out of scope

- Authentication, customer accounts, billing, subscriptions, or entitlements
- Production Astro routes or shared production components
- Persistent watchlists or saved filters
- Alert scheduling, email/SMS delivery, webhooks, or background jobs
- Export generation
- New scraping, Firecrawl sessions, source refreshes, or MDG-DATA pipeline changes
- Menu-price claims
- Municipal opt-in claims beyond the partial-capture disclosure
- Recommendations that a municipality is “underserved,” attractive, viable, or investment-ready
- Any state other than Maine

## 9. Verification contract

Before review handoff:

1. Parse every inline script with Node.
2. Serve `sketches/` over local HTTP.
3. Run Playwright at 1440px to exercise the dashboard theme, trend, density, and paid-preview states.
4. Run Playwright through the municipality path: select, compare, open evidence, open watchlist preview, configure alert preview, close with Escape.
5. Assert DOM state after each meaningful interaction.
6. Assert `scrollWidth <= innerWidth` at desktop and mobile widths.
7. Capture light and dark screenshots for both prototypes.
8. Inspect screenshots for clipping, hierarchy, contrast, and current-versus-proposed labeling.
9. Scan this specification for placeholders, contradictory capability claims, unsupported data semantics, and scope creep.

## 10. Production decision gate

These artifacts are for product/design review. A production implementation requires a separate approved plan covering route ownership, component boundaries, server/static architecture, data publication policy, privacy, account design, and alert semantics. No prototype interaction should be treated as evidence that those systems exist.

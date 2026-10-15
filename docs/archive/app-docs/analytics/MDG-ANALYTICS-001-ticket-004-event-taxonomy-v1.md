# MDG-ANALYTICS-001 Ticket 004 — Event Taxonomy v1 + Privacy Registry

**Ticket:** `TICKETS/004-event-taxonomy-v1.md`
**Spec source:** `/home/steve/Documents/mdg-analytics-intelligence-package-v0.5/` (v0.5, verified)
**Sources of truth:** `EVENT-TAXONOMY.md`, `PRIVACY-BOUNDARY.md`
**Working agreement:** `/home/steve/projects/maine-dispensary-guide/AGENTS.md`
**Author:** Hermes (parent agent), 2026-07-12
**Status:** SCHEMA SHIPPED. v1 events are *defined* but not yet *emitted* — instrumentation wiring is A3/A4-authority-gated per reconciliation D6.

## 1. What ships in this ticket

- **Typed schema file** at `apps/maine-cannabis/src/types/event-taxonomy-v1.ts` — formal register of 24 events: 18 v1 + 6 v0 legacy.
- **Validator script** at `apps/maine-cannabis/scripts/analytics/event-taxonomy-validate.cjs` — runs in CI on schema edits; checks types compile, every event has a decision question + privacy class, all 6 privacy rules enforced.

Run `node apps/maine-cannabis/scripts/analytics/event-taxonomy-validate.cjs` to verify. Output:

```
events: 24
decision questions: all present
privacy classes: all present
PRIVACY_RULES_V1: 6/6 flags set
TS compile check: passed
```

## 2. Schema layout

### 2.1 v0 (legacy) — kept for baseline continuity

| Event | Spec role | Page-archetype subsets | Privacy class |
|---|---|---|---|
| `scroll_depth` | LEGACY: how far did the visitor scroll? | globally emitted; per-archetype interpretation unsafe | `anonymous_aggregate` |
| `page_engaged` | LEGACY: visibility+timer heuristic | weak semantics per verify-report | `anonymous_aggregate` |
| `faq_open` | LEGACY: visitor opened an FAQ accordion | no current page has `data-faq` → zero counts are instrumentation state | `anonymous_aggregate` |
| `cta_view` | LEGACY: CTA entered viewport | same — zero counts are instrumentation state | `anonymous_aggregate` |
| `lead_capture` | LEGACY: mailto lead capture intent | client-side at click; v1 separates start/complete | `pseudonymous_identifier` |
| `affiliate_click` | Outbound affiliate click | revenue CTR input | `pseudonymous_identifier` |

### 2.2 v1 (new) — 18 events

Per `EVENT-TAXONOMY.md` §"v1 core events". Each has:
- a single decision question (recorded in `DECISION_QUESTION_FOR_EVENT` lookup);
- bounded parameter types (enums + slugs);
- explicit privacy class;
- `schema_version: 'v1'` envelope tag at emit.

The decision questions are the spec's `EVENT-TAXONOMY.md` §"Decision question:" rows. Every v1 event replaces a v0 legacy behavior with stronger semantics (archetype-aware progress, exposure↔select pairing, start↔complete conversion), or is net-new (calculator/dataset/source/conversion).

### 2.3 Privacy discipline (Ticket 004 §"Acceptance" — explicit answers)

- **Form-field analytics use an explicit allowlist:** `PRIVACY_RULES_V1.free_text_forbidden = true`. No parameter in v1 accepts arbitrary `trackFields` text; all inputs are typed enums or stable slugs.
- **No email/phone/name parameter exists** in v1. `email_phone_name_forbidden = true`.
- **Raw site-search text is forbidden** by type definition: `MdgSiteSearchEvent.search_text?: never`. Opt-in via PRIVACY-BOUNDARY.md review required to relax.
- **Raw financial input values are forbidden**: calculator events accept `scenario_version` + `result_bucket` (low/medium/high/custom), not raw numerics.
- **`lead_capture` is documented as legacy submit intent:** in the `DECISION_QUESTION_FOR_EVENT` lookup, both `lead_capture` and v1's `mdg_conversion_start` / `mdg_conversion_complete` are present; the table distinguishes between legacy click-only and v1's start↔complete pair.
- **Exposure / start / completion semantics are distinct:** `mdg_action_exposure` ≠ `mdg_action_select`; `mdg_conversion_start` ≠ `mdg_conversion_complete`; `mdg_calculator_start` ≠ `mdg_calculator_result` ≠ `mdg_calculator_scenario_change`.
- **Schema version is explicit:** `EventEnvelope.schema_version: 'v0' | 'v1'`.

## 3. Acceptance vs ticket spec

| Spec acceptance criterion | Status |
|---|---|
| every event has a decision question | ✓ enforced by validator |
| every parameter has type, bounded vocabulary/cardinality policy, and privacy class | ✓ enforced by TS + validator |
| visible CTA/FAQ text is not a canonical key | ✓ `faq_id`, `action_id`, `control_id`, `placement_id` are stable slugs/IDs |
| form field analytics use an explicit allowlist | ✓ `free_text_forbidden`, no `trackFields` parameter exists |
| arbitrary `trackFields` values cannot silently enter analytics | ✓ schema is closed; only the declared parameters are accepted by the union |
| `lead_capture` is documented as legacy submit intent | ✓ DECISION_QUESTION entry notes "LEGACY: mailto lead capture intent" |
| exposure/start/completion semantics are distinct | ✓ distinct event names with distinct decision questions |
| event schema version is explicit | ✓ `SchemaVersion` type |

## 4. What does NOT ship in this ticket

- **No runtime instrumentation.** Wiring `data-faq`, `data-cta-id`, `data-page-type` etc. is A3/A4-authority-gated (per reconciliation D6). The schema file is the registry; the runs/ship wiring is Ticket 006 once authority is granted.
- **No GA4 property/measurement ID migration.** The schema does not change what GA4 receives, only what we promise it will eventually receive.
- **No event-detail enforcement on v0.** v0 events still emit with the legacy field shapes. The schema declares v0 types for documentation/back-compat, but does NOT modify the running Layout.astro.

## 5. How Tickets 005–008 consume this schema

- **Ticket 005 (measurement health probes)** imports `PRIVACY_RULES_V1` and `PRIVACY_CLASS_FOR_EVENT` to flag any emitted event that would violate privacy rules.
- **Ticket 006 (instrumentation v1)** uses the v1 union types as the canonical parameter surface for new emit code.
- **Ticket 007 (behavioral-source ingestion)** validates that any ingested event matches a registered `event_name` from this schema.
- **Ticket 008 (cross-source page-window join)** joins `behavior_event.event_name` against `DECISION_QUESTION_FOR_EVENT` for explainability (a join containing an unknown event fails the join validation).

## 6. Files written

- `apps/maine-cannabis/src/types/event-taxonomy-v1.ts` (TypeScript types, ~16 KB)
- `apps/maine-cannabis/scripts/analytics/event-taxonomy-validate.cjs` (validator, ~6 KB)

Both committed per AGENTS.md stage discipline. The validator can also run in CI on schema edits.

## 7. Stop condition

This ticket ships the *registry*, not the *instrumentation*. No production mutation. Tier 1 invariants preserved.

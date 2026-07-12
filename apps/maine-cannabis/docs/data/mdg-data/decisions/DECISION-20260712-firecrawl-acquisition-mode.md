# DECISION-20260712-firecrawl-acquisition-mode — RESOLVED

**Status:** RESOLVED 2026-07-12 (corrective review)
**Authority:** `SPEC-AUTHORITY.md §1` Tier 1 invariants + corrective review finding 3

## Original ambiguity

The adapter comment in `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-firecrawl-ingest.cjs` line 12 says:

> "Per the operator override 2026-07-12, this is the production ingest path."

The corrective review of 2026-07-12 found this characterization imprecise. The path involves the operator running `firecrawl interact`, then saving markdown files into the engine's `raw/` tree. The engine does not call firecrawl on its own, does not own browser automation, and does not publish a state machine that survives an unattended run. Calling this a "production" path was a category error.

## Acquisition mode vocabulary

The engine recognizes three acquisition modes. The corrective review fixed the boundary language to use these consistently:

| Mode | What runs automatically | What the operator does |
|---|---|---|
| **autonomous** | Everything from data fetch through atomic-promote, on a schedule | Nothing; operator reviews the published artifacts |
| **operator-assisted-acquisition** | The engine discovers artifacts the operator placed in `raw/`, normalizes, archives, derives, and promotes. The operator's role is acquisition only. | Run the third-party tool (firecrawl interact, Power BI export, manual CSV) and place artifacts |
| **blocked** | The engine refuses to publish until the access boundary is resolved | Unblock access (data feed arrangement, public-API availability, or policy clarification) |

The Power BI manual-CSV path documented in DECISION-20260711-ocp-powerbi-embed.md is **`operator-assisted-acquisition`** at acquisition, then fully autonomous through promotion.

The Firecrawl-interact path is also **`operator-assisted-acquisition`**. Same shape: the operator runs `firecrawl interact`, saves markdown, the engine takes it from there. **No browser automation, no autonomous firecrawl API calls, no canonical-data emission without operator-provided source artifacts present in `raw/`.**

## What this means for source metadata

Every `source_id` in the registry carries an `acquisition_mode` field. For firecrawl-derived sources:

```yaml
ocp_retail_sales:
  acquisition_mode: operator-assisted-acquisition
  capture_tool: firecrawl interact
  ...
ocp_optin:
  acquisition_mode: operator-assisted-acquisition
  capture_tool: firecrawl interact
  ...
```

The MDG-DATA-001-COMMISSIONING.md (Ticket 005) handback must use this vocabulary verbatim when listing source acquisition modes.

## Disallowed

These are NOT `operator-assisted-acquisition`:

- A scheduled CI job that calls `firecrawl` and writes to `raw/`. That would be `autonomous` (and would require firecrawl API authentication in the secrets store, NOT yet present).
- A scheduled browser-clicking automation. Per finding 6, browser automation is **explicitly out of scope** for this corrective pass.

## What the engine did NOT do

When the previous paragraph said the engine runs `firecrawl interact`: it did not. The operator runs firecrawl from their workstation, gets a markdown report, copies it into the engine's `raw/ocp_sales_firecrawl/` directory. The engine then does deterministic extraction + normalization + derivation + publication.

This boundary is what makes `operator-assisted-acquisition` an accurate description, and not "autonomous production".

## Provenance

- Decision applies to: `ocp_retail_sales`, `ocp_optin`
- Driven by: ChatGPT review 2026-07-12, finding 3
- Honors: `SPEC-AUTHORITY.md §1` Tier 1 (canonical-data invariants)
- Does NOT grant: A3 autonomous-execution authority; A4 still required for any production mutation

## Open follow-up

The firecrawl path was a Tier 2 deviation recorded here. Per Tier 1, deviations stay recorded until a true autonomous source becomes available. Future Option (Option 2 from DECISION-20260711): ask OCP for a programmatic data feed — that would convert these to `autonomous` mode and the `operator-assisted` qualifier here would be retired.

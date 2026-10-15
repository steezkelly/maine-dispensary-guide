# TICKET-009 — OCP Retail Sales Adapter (Transport Discovery)

**Status:** blocked — awaiting operator input per
`DECISION-20260711-ocp-powerbi-embed.md`
**Ticket:** 009
**Date:** 2026-07-11

## Summary

Phase A complete: discovered and documented the OCP retail-sales
transport. The authoritative page
`https://www.maine.gov/dafs/ocp/open-data/adult-use/retail-sales`
embeds a Microsoft Power BI dashboard
(`https://app.powerbigov.us/view?r=…&pageName=…`). Power BI's
programmatic data API is undocumented and public extraction is
unsupported.

## Files added

- `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-dashboard-discovery.cjs`
  — generic Power-BI / ArcGIS / Tableau iframe discovery +
  classification. Emits a `transport_discovery.json` report.
- `apps/maine-cannabis/scripts/data/mdg-data/tests/ocp-dashboard-discovery.test.cjs`
  — 6 tests.
- `apps/maine-cannabis/docs/data/mdg-data/decisions/DECISION-20260711-ocp-powerbi-embed.md`
  — Tier 1 escalation note documenting the blocked state and the
  three resolution paths.

## Files modified

- `apps/maine-cannabis/scripts/data/mdg-data/commands/fetch.cjs`
  — wired `ocp_retail_sales` branch to run the discovery adapter
  and archive a `transport_discovery.json` per `ARTIFACT-CONTRACT.md`
  schema.

## Ticket 009 acceptance check

- [x] OCP source used, not MRS substitute.
- [x] Transport discovery documented (the discovery report is on
      disk; the decision note is in the docs tree).
- [x] Source-derived fixture archived (the discovery report IS the
      fixture; the underlying semantic model is not accessible).
- [ ] Reporting periods and metric vocabulary enumerated — blocked.
- [x] Revisions preserved as snapshots — N/A because no data
      ingested.
- [x] Preliminary semantics retained — N/A because no data ingested.
- [x] Exact support for sales, transactions, price, and product
      categories documented from observation — supported products
      listed in decision note as `disabled_products` until data path
      exists.
- [x] Unsupported product pages remain disabled — handled in
      `derive.cjs` `disabled_products` block.

## Next steps

Operator action required per `DECISION-20260711-ocp-powerbi-embed.md`:

1. Manual CSV export from Power BI UI to
   `$MDG_DATA_ROOT/raw/ocp_retail_sales/manual/...`, OR
2. Confirm OCP annual-report citation for the annual sales
   product, OR
3. Confirm full disable of all sales/transactions/price/mix
   products.

## Specification authority note

This ticket explicitly stops on a `SPEC-AUTHORITY.md §3` stop
condition ("dashboard transport requires authentication, CAPTCHA
bypass, or unsupported circumvention"). No bypass; the agent
archived the discovery report and recorded a `DECISION-*` note.
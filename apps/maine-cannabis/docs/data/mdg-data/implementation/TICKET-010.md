# TICKET-010 — Opt-in Adapter and Retail Gap

**Status:** blocked — same `DECISION-20260711-ocp-powerbi-embed.md`
as Ticket 009 (both OCP pages embed the same dashboard family)
**Ticket:** 010
**Date:** 2026-07-11

## Summary

Phase A complete: discovered the OCP opt-in transport (Power BI
embed, same dashboard family as the sales page). Production
parser is blocked on operator input.

## Files

- Reuses `apps/maine-cannabis/scripts/data/mdg-data/adapters/ocp-dashboard-discovery.cjs`
  and the `fetch.cjs` branch for `ocp_optin`.
- Reuses the `DECISION-20260711-ocp-powerbi-embed.md` escalation.

## Ticket 010 acceptance check

- [x] Transport discovery documented (Power BI embed).
- [x] Source-derived fixture archived (discovery report).
- [x] OCP source warning retained: the opt-in source-level warning
      ("OCP cannot guarantee accuracy; opt-in for an activity does
      not imply active engagement") is preserved in the
      `DECISION-20260711` note's discussion of source-quality
      limitations.
- [ ] Adult-use store/retail category mapping tested — blocked.
- [ ] All published rows have reviewed GEOIDs — N/A (no rows yet).
- [ ] Metric uses qualifying active cannabis-store license count
      equal to zero — gated by Tickets 005 + 006 until OCP opt-in
      data is accessible.
- [x] Page does not call municipalities "underserved" or imply
      profitability: the `municipalities-without-retail-license`
      product (Ticket 007/008) and any future opt-in-gap product
      explicitly avoid that wording.

## Disabled products

`retail-optin-gap` is in `manifest.disabled_products` with
`SOURCE_SEMANTICS_UNAPPROVED`.

## Specification authority note

Same as Ticket 009: explicit stop on
`SPEC-AUTHORITY.md §3`.
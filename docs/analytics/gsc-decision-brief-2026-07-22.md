# GSC Decision Brief — 2026-07-22

## Evidence boundary

- Source: connected Search Console domain property `sc-domain:mainedispensaryguide.com` through OpenSEO.
- Final-data window returned by the API: **2026-06-21 through 2026-07-19** (29 dated rows).
- Site aggregate across those dated rows: **457 clicks / 30,410 impressions / 1.50% CTR**.
- Page view: first 100 pages ordered by clicks; the API reported more rows available. This brief does not call the page set complete.
- No query dimension was requested. No raw query or query-by-page rows are included in this repository record.

## Private ledger state

The local private ledger was backed up, normalized, and quarantined on 2026-07-22:

- Before: 1,085 rows; 604 rolling/non-daily rows; 152 duplicate daily keys.
- After: 329 unique finalized daily facts across two source days (2026-07-15 and 2026-07-18).
- Query/page snapshots were also normalized to two unique finalized daily snapshots per kind.
- Owner-only permissions were applied to the private tree.
- Privacy-safe health check: PASS; expected latest finalized source day 2026-07-18, actual 2026-07-18; cron active and both jobs registered.

Backup and quarantine paths remain private under `~/.hermes/data/mdg-gsc/`; they are intentionally not reproduced here.

## Evidence-qualified queue entry

**Priority:** classify `/guides/fryeburg-dispensary-guide` privately before the next on-page SEO change.

Public-safe page aggregate for the exact final-data window:

- 2,216 impressions
- 8 clicks
- 0.36% CTR
- average position 8.5

Why this qualifies: it has the highest impressions among the page-level low-CTR striking-distance candidates in the returned top-100 page view. It is already on page one on average, so query-intent classification—not more generic content—is the next evidence gate.

**Next action:** run a private query-mix review for this single URL. If non-brand, location-intent variants dominate, create a bounded title/meta/fact-box/FAQ/internal-link contract. If operator/brand terms dominate, classify it as a brand-disambiguation ceiling and do not spend an on-page rewrite. Keep the query-bearing analysis under `MDG_GSC_DATA_ROOT`.

**Acceptance evidence for the follow-up:** record only the classification, window, aggregate impressions/clicks/CTR/position, chosen action, and a 2–4 week remeasurement date. Do not copy literal query rows into Git, Kanban, PR comments, or public pages.

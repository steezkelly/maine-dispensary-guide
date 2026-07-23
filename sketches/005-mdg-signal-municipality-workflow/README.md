## Variant: MDG Signal — municipality research workflow

### Purpose
A second clickable concept that tests one complete Maine-only customer journey: select a municipality, compare it with peers, inspect source/freshness, preview a saved watchlist, and preview a sourced change alert.

### Current release data
The concept uses only checked-in values from MDG-DATA release `ded381696bddf56f`:
- Maine OCP active adult-use cannabis-store licenses, data as of June 1, 2026.
- Census ACS 2024 population.
- The derived active-license rate per 10,000 residents.

Municipal authorization remains visibly partial because the current opt-in capture is incomplete. Menu prices are omitted.

### Proposed capabilities
Watchlists, alerts, persistence, historical comparison, exports, accounts, and billing are product previews only. The interface explicitly says that nothing is saved or delivered.

### Open
Serve the repository `sketches/` directory over local HTTP and open `/005-mdg-signal-municipality-workflow/`.

## Variant: MDG Signal — customer-facing data explorer

### Design stance
A question-first Maine cannabis intelligence product that combines MDG’s refined editorial identity with a practical, data-dense research workspace.

### What the customer sees
- Headline market movement with source and freshness labels.
- Interactive monthly sales / transaction trend.
- June 2026 product mix.
- Selected municipality comparison by raw license count or licenses per 10,000 residents.
- Transparent coverage states: current, partial, and not ready.

### Proposed paid value
- Saved municipality, licensee, and dataset watchlists.
- Sourced change alerts showing old value, new value, effective date, and interpretation.
- Filtered CSV/chart/briefing exports.
- Historical snapshots and customer-specific workspace state.

### Data boundary
The prototype uses real values from MDG-DATA release `ded381696bddf56f`. It does not expose contact-email or phone fields from the internal directory. Municipal comparison is a selected subset, not a statewide rank. Menu pricing, accounts, billing, watchlists, alerts, and exports are clearly labeled as proposed—not live.

### Trade-offs
- Strong at: quickly communicating what exists now and what becomes subscription-worthy.
- Weak at: map exploration is represented through comparisons rather than a production geographic map.
- Best for: validating the product’s first dashboard and paid-value story before designing backend/account architecture.

### Open
Open `index.html` directly, or serve the repository’s `sketches/` directory with a local HTTP server.

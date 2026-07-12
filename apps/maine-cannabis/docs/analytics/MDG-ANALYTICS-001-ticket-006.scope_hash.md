# MDG-ANALYTICS-001 Ticket 006 — Authorization Scope Hash

This companion file holds the byte-content hashes for the proposal at:
  /home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006-instrumentation-v1-proposal.md

Computed 2026-07-12 (UTC). Update on every proposal revision.

## Full-proposal hash (proves the entire file as-written)
  cdc2fdbe76447a3faf5e5448b02e680c89846a792bca1212b5130a4a3e166985

## Contract hash (§3 Scope + §4 Decision contract, NOT including §4.8 itself)
  0e622d28f8225475bcce121b8c73c0d66ba479f04f80c6fb1240b86027775903

## Verification command
```bash
python3 -c "import hashlib; print(hashlib.sha256(open('/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/docs/analytics/MDG-ANALYTICS-001-ticket-006-instrumentation-v1-proposal.md','rb').read()).hexdigest())"
```
Output must match the full-proposal hash above. If they differ, the proposal
was edited since this hash was written — re-read §3/§4 before authorizing.

## Contract hash (cleaned; §3 + §4 minus §4.8 itself)
  031114ba48d22abcc337324c8d7483b6fbb098b0be3c85190406bd01176ed45f

Use this one for authorization matching if §4.8 is re-worded but
§3/§4.1-§4.7/§4.9+ are unchanged.

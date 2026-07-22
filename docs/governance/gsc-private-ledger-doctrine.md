# GSC Private Ledger Doctrine

**Accepted:** 2026-07-22
**Scope:** Maine Dispensary Guide Search Console operational data

## Decision

Raw Search Console rows containing `query` or query-by-page keys are private operational data. They live only below `MDG_GSC_DATA_ROOT` (default `~/.hermes/data/mdg-gsc`) and are never repository inputs, build artifacts, logs, PR attachments, or public reports.

This policy governs current and future operations. Before it was accepted, the
repository tracked two generated misroute reports and serialized row excerpts
inside a forensic record. Their query-bearing bodies were redacted from the
current tree on 2026-07-22. The original bytes remain in Git history; rewriting
shared history is a separate one-way-door decision. Historical derived decision
records may retain aggregate metrics or named editorial intent, but they are not
operational ledgers and must not be regenerated from raw rows in the repository.

The scheduled ledger is a set of finalized, non-overlapping one-day facts in the Search Console source timezone (`America/Los_Angeles`). Re-running a source day replaces the matching source-day/query/page fact; it never appends a duplicate. Rolling or non-final windows remain investigation artifacts and are quarantined from the composable ledger.

## Fail-closed controls

- Reject repository-local roots, including symlink aliases into the repository.
- Reject report paths whose existing symlink ancestors escape the validated private root.
- Refuse collection when the current ledger or aggregate snapshots contain malformed, non-final, non-daily, or duplicate state. Normalize first.
- Before normalization, copy the ledger and all query-bearing snapshots to a timestamped private backup with SHA-256 manifest.
- Preserve rejected raw rows only in owner-readable private quarantine; never print them.
- Use atomic write-and-rename with owner-only file modes for normalized ledgers and snapshots.
- Treat Search Analytics row coverage as `top_rows_truncated_or_unknown`; row counts do not prove completeness.
- Dry runs, cron logs, and health output contain counts, dates, status, and coverage only—never query or page rows.
- Weekly misroute reports are query-bearing and must be written below the private root, not stdout or cron logs.
- Scheduler wrappers propagate collector/audit failures to cron instead of ending with a false zero exit.

## Operator loop

```bash
cd apps/maine-cannabis
npm run seo:gsc-ledger:check
npm run seo:gsc-ledger:health
npm run seo:gsc-search-analytics:dry-run
```

If ledger check fails:

```bash
npm run seo:gsc-ledger:normalize
npm run seo:gsc-ledger:check
npm run seo:gsc-ledger:health
```

Install or refresh fail-closed wrappers from the repository root:

```bash
bash scripts/seo/install-gsc-cron.sh
~/.local/bin/mdg-gsc-health-check.sh
```

A health PASS means only that the private ledger contract, freshness clock, permissions, wrappers, cron registration, and log clock are healthy. It is not evidence that a specific SEO change worked.

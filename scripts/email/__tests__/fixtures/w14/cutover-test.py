#!/usr/bin/env python3
"""Disposable PostgreSQL cutover proof for the W14 activation-cutover correction.

Creates a blank remote database, applies the synthetic baseline + migration, and
proves:
  * the migration is idempotent (re-running it does not error or reclassify);
  * a concurrent insert that begins while the cutover transaction is in progress
    is classified deterministically once the cutover commits (a post-cutover
    asset lead becomes pending and is claimable; it is not misclassified as a
    pre-migration row);
  * pre-cutover rows are never claimable.
No external email and no real mdg_leads rows are touched.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[5]
SSH = [
    "ssh", "-i", str(pathlib.Path.home() / ".ssh/g3nuc-admin-ed25519"),
    "-o", "BatchMode=yes", "steve@192.168.1.202",
]
CONTAINER = "agent-automation-postgres-1"
DB = f"mdg_w14_cutover_{int(time.time())}"


def remote(command: str, *, stdin: bytes | None = None) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(SSH + [command], input=stdin, check=True, capture_output=True)


def psql(db: str, sql: str, *, tuples: bool = False) -> subprocess.CompletedProcess[bytes]:
    flags = "-X -v ON_ERROR_STOP=1"
    if tuples:
        flags += " -At"
    return remote(
        f"docker exec -i {CONTAINER} psql -U n8n -d {db} {flags}",
        stdin=sql.encode(),
    )


def main() -> int:
    remote(f"docker exec {CONTAINER} psql -U n8n -d postgres -X -v ON_ERROR_STOP=1 -c 'CREATE DATABASE {DB}'")
    try:
        bootstrap = (ROOT / "scripts/email/__tests__/fixtures/w14/bootstrap.sql").read_text()
        migration = (ROOT / "scripts/email/migrations/2026-07-27-w14-fulfillment-state-machine.sql").read_text()
        psql(DB, bootstrap)
        psql(DB, migration)

        # 1. Migration idempotency: re-running the migration must not error and
        #    must not reclassify the already-assigned bootstrap row.
        psql(DB, migration)
        out = psql(
            DB,
            "SELECT fulfillment_status FROM mdg_leads WHERE source_message_id='synthetic:historical';",
            tuples=True,
        ).stdout.decode().strip()
        assert out == "not_applicable", f"re-run reclassified historical row: {out!r}"
        print("MIGRATION_IDEMPOTENT=PASS")

        # 2. Concurrent insert during cutover. Hold the cutover transaction open
        #    (it takes a FOR UPDATE lock on the activation singleton); start an
        #    insert in a separate session that commits after the cutover; then
        #    commit the cutover. The inserted post-cutover asset lead must become
        #    claimable (pending), not misclassified as a pre-migration row.
        cutover_sql = (
            "BEGIN; "
            "SELECT * FROM mdg_w14_activate_cutover("
            "'ops-disposable-cutover','Establish cutover under concurrency test',now()); "
            "SELECT pg_sleep(3); COMMIT;"
        )
        cutover_proc = subprocess.Popen(
            SSH + [f"docker exec {CONTAINER} psql -U n8n -d {DB} -X -At -v ON_ERROR_STOP=1 -c \"{cutover_sql}\""],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        time.sleep(0.7)  # let the cutover transaction open and lock the singleton
        # Insert a post-cutover asset lead while the cutover transaction is open.
        # It defaults to pending and is received after the cutover timestamp.
        psql(
            DB,
            "INSERT INTO mdg_leads(source_message_id,from_email,promised_asset,received_at) "
            "VALUES ('synthetic:concurrent-insert','w14-concurrent-insert@example.invalid',"
            "'maine_dispensary_roadmap_2026',now());",
        )
        cutover_out, cutover_err = cutover_proc.communicate(timeout=10)
        if cutover_proc.returncode != 0:
            sys.stderr.write(cutover_err.decode(errors="replace"))
            return cutover_proc.returncode

        # The concurrently inserted post-cutover asset lead must be claimable.
        claim = psql(
            DB,
            "SELECT 'claimed='||source_message_id FROM mdg_w14_claim('worker-cutover-concurrent', now());",
            tuples=True,
        ).stdout.decode().splitlines()
        assert any(x == "claimed=synthetic:concurrent-insert" for x in claim), (
            f"concurrent post-cutover insert was not claimable: {claim}"
        )
        print("CONCURRENT_INSERT_CLASSIFIED=PASS")

        # 3. Pre-cutover rows are never claimable: the 30-day-old bootstrap row
        #    and any pre-cutover row remain not_applicable / unclaimed.
        pre = psql(
            DB,
            "SELECT count(*) FROM mdg_leads WHERE source_message_id='synthetic:historical' "
            "AND fulfillment_status='not_applicable';",
            tuples=True,
        ).stdout.decode().strip()
        assert pre == "1", f"pre-cutover historical row not not_applicable: {pre!r}"
        print("PRECUTOVER_UNCLAIMABLE=PASS")

        print("CUTOVER_TEST=PASS")
        return 0
    finally:
        remote(
            f"docker exec {CONTAINER} psql -U n8n -d postgres -X -v ON_ERROR_STOP=1 "
            f"-c 'DROP DATABASE {DB} WITH (FORCE)'"
        )


if __name__ == "__main__":
    raise SystemExit(main())

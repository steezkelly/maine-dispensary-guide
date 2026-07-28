#!/usr/bin/env python3
"""Disposable PostgreSQL proof for the W14 R1 activation-cutover insert race,
request-id replay/mismatch, and two-migration production sequence.

Applies migrations in production order:
  1. 2026-07-27 original migration (immutable);
  2. 2026-07-28 R1 remediation;
  3. R1 remediation again (independent idempotency).

Then proves:
  * PRE-CUTOVER INSERT RACE: an insert whose received_at is BEFORE the cutover,
    held so it commits during the cutover transaction, becomes not_applicable
    (not pending). The BEFORE INSERT trigger's FOR SHARE lock blocks behind
    mdg_w14_activate_cutover's FOR UPDATE singleton lock, so the insert reads the
    COMMITTED cutover.
  * POST-CUTOVER INSERT (inverse): an insert whose received_at is AFTER the
    cutover becomes pending and is claimable.
  * EXACT REPLAY: same request_id + same immutable identity returns the existing
    id; no new row; no state reset; no extra attempt.
  * MISMATCH: same request_id with different immutable data fails closed
    (request_id_reuse_mismatch); no row; no mutation.
  * NEW request_id with otherwise identical data inserts a new lead.

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
DB = f"mdg_w14_r1race_{int(time.time())}"

ASSET = "maine_dispensary_roadmap_2026"


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


def q(value: str | None) -> str:
    """Render a SQL literal: NULL for None, else a single-quoted string."""
    if value is None:
        return "NULL"
    return "'" + value + "'"


def insert_sql(request_id: str, email: str, page: str, form: str, asset: str | None, received_at: str) -> str:
    return (
        "SELECT mdg_w14_insert_lead("
        f"'api_post:{request_id}',"
        f"{q(email)},NULL,NULL,NULL,"
        f"{q(asset)},NULL,"
        f"{received_at},{q(page)},"
        f"NULL,NULL,NULL,NULL,'api_post',NULL,NULL,NULL,"
        f"{q(form)},NULL,{q(request_id)});"
    )


def main() -> int:
    remote(f"docker exec {CONTAINER} psql -U n8n -d postgres -X -v ON_ERROR_STOP=1 -c 'CREATE DATABASE {DB}'")
    try:
        bootstrap = (ROOT / "scripts/email/__tests__/fixtures/w14/bootstrap.sql").read_text()
        migration = (ROOT / "scripts/email/migrations/2026-07-27-w14-fulfillment-state-machine.sql").read_text()
        remediation = (ROOT / "scripts/email/migrations/2026-07-28-w14-activation-cutover-request-id.sql").read_text()

        # --- Production migration sequence + idempotency ---
        psql(DB, bootstrap)
        psql(DB, migration)
        psql(DB, remediation)
        psql(DB, remediation)  # re-run: must be independently idempotent
        print("MIGRATION_SEQUENCE_IDEMPOTENT=PASS")

        # --- PRE-CUTOVER INSERT RACE ---
        # Cutover transaction acquires FOR UPDATE on the singleton first, then
        # holds it. A concurrent insert (received_at before the cutover) blocks
        # on the trigger's FOR SHARE, then reads the committed cutover and is
        # classified not_applicable.
        cutover_sql = (
            "BEGIN; "
            "SELECT * FROM mdg_w14_activate_cutover("
            "'ops-race','Establish cutover under pre-cutover insert race',now()); "
            "SELECT pg_sleep(3); COMMIT;"
        )
        cutover_proc = subprocess.Popen(
            SSH + [f"docker exec {CONTAINER} psql -U n8n -d {DB} -X -At -v ON_ERROR_STOP=1 -c \"{cutover_sql}\""],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        time.sleep(0.8)  # let the cutover transaction take the FOR UPDATE lock
        # Insert with received_at BEFORE the cutover; it blocks on FOR SHARE.
        pre_id_sql = insert_sql(
            "11111111-1111-4111-8111-111111111111", "w14-race-pre@example.invalid",
            "/download-checklist", "race_pre_form", ASSET, "now() - interval '1 hour'",
        )
        pre = psql(DB, pre_id_sql, tuples=True)
        pre_id = pre.stdout.decode().strip()
        cutover_out, cutover_err = cutover_proc.communicate(timeout=10)
        if cutover_proc.returncode != 0:
            sys.stderr.write(cutover_err.decode(errors="replace"))
            return cutover_proc.returncode
        status = psql(
            DB, f"SELECT fulfillment_status FROM mdg_leads WHERE id={pre_id};", tuples=True
        ).stdout.decode().strip()
        assert status == "not_applicable", f"pre-cutover race insert became {status!r}, expected not_applicable"
        claims = psql(DB, "SELECT count(*) FROM mdg_w14_claim('worker-race-pre',now());", tuples=True).stdout.decode().strip()
        assert claims == "0", f"pre-cutover race insert was claimable ({claims})"
        print("PRECUTOVER_INSERT_RACE=PASS (not_applicable, unclaimable)")

        # --- POST-CUTOVER INSERT (inverse) ---
        post_id_sql = insert_sql(
            "22222222-2222-4222-8222-222222222222", "w14-race-post@example.invalid",
            "/download-checklist", "race_post_form", ASSET, "now()",
        )
        post_id = psql(DB, post_id_sql, tuples=True).stdout.decode().strip()
        status = psql(
            DB, f"SELECT fulfillment_status FROM mdg_leads WHERE id={post_id};", tuples=True
        ).stdout.decode().strip()
        assert status == "pending", f"post-cutover insert became {status!r}, expected pending"
        claim = psql(DB, "SELECT lead_id FROM mdg_w14_claim('worker-race-post',now());", tuples=True).stdout.decode().strip()
        assert claim == post_id, f"post-cutover insert not claimable (claimed={claim!r}, id={post_id!r})"
        print("POSTCUTOVER_INSERT=PASS (pending, claimable)")

        # --- EXACT REPLAY ---
        replay_id = psql(DB, post_id_sql, tuples=True).stdout.decode().strip()
        assert replay_id == post_id, f"exact replay returned {replay_id!r}, expected {post_id!r}"
        rows = psql(
            DB,
            "SELECT count(*) FROM mdg_leads WHERE source_message_id='api_post:22222222-2222-4222-8222-222222222222';",
            tuples=True,
        ).stdout.decode().strip()
        assert rows == "1", f"exact replay created extra rows ({rows})"
        # No state reset: the row is still claimed (not reverted to pending), and
        # no new attempt was created by the replay.
        state = psql(DB, f"SELECT fulfillment_status FROM mdg_leads WHERE id={post_id};", tuples=True).stdout.decode().strip()
        assert state == "claimed", f"replay reset state to {state!r}, expected claimed"
        attempts = psql(DB, f"SELECT count(*) FROM mdg_fulfillment_attempts WHERE lead_id={post_id};", tuples=True).stdout.decode().strip()
        assert attempts == "0", f"replay created attempts ({attempts})"
        print("EXACT_REPLAY=PASS (same id, 1 row, no state reset, no attempt)")

        # --- MISMATCH: same request_id, different email -> fail closed ---
        mismatch_sql = insert_sql(
            "22222222-2222-4222-8222-222222222222", "w14-attacker@example.invalid",
            "/download-checklist", "race_post_form", ASSET, "now()",
        )
        mp = subprocess.run(
            SSH + [f"docker exec -i {CONTAINER} psql -U n8n -d {DB} -X -At -v ON_ERROR_STOP=1"],
            input=mismatch_sql.encode(), capture_output=True,
        )
        err = mp.stderr.decode(errors="replace")
        assert mp.returncode != 0 and "request_id_reuse_mismatch" in err, f"mismatch did not fail closed: rc={mp.returncode} err={err!r}"
        rows = psql(
            DB,
            "SELECT count(*) FROM mdg_leads WHERE source_message_id='api_post:22222222-2222-4222-8222-222222222222';",
            tuples=True,
        ).stdout.decode().strip()
        assert rows == "1", f"mismatch created a row ({rows})"
        print("REQUEST_ID_MISMATCH_EMAIL=PASS (fail closed, no row)")

        # --- MISMATCH: same request_id, different page -> fail closed ---
        mismatch_page_sql = insert_sql(
            "22222222-2222-4222-8222-222222222222", "w14-race-post@example.invalid",
            "/download/founders-bible", "race_post_form", ASSET, "now()",
        )
        mp2 = subprocess.run(
            SSH + [f"docker exec -i {CONTAINER} psql -U n8n -d {DB} -X -At -v ON_ERROR_STOP=1"],
            input=mismatch_page_sql.encode(), capture_output=True,
        )
        assert mp2.returncode != 0 and "request_id_reuse_mismatch" in mp2.stderr.decode(errors="replace"), "page mismatch did not fail closed"
        print("REQUEST_ID_MISMATCH_PAGE=PASS (fail closed)")

        # --- NEW request_id, identical data -> new lead ---
        new_id_sql = insert_sql(
            "33333333-3333-4333-8333-333333333333", "w14-race-post@example.invalid",
            "/download-checklist", "race_post_form", ASSET, "now()",
        )
        new_id = psql(DB, new_id_sql, tuples=True).stdout.decode().strip()
        assert new_id and new_id != post_id, f"new request_id did not create a new lead (got {new_id!r})"
        print("NEW_REQUEST_ID_NEW_LEAD=PASS")

        print("R1_RACE_REPLAY_TEST=PASS")
        return 0
    finally:
        remote(
            f"docker exec {CONTAINER} psql -U n8n -d postgres -X -v ON_ERROR_STOP=1 "
            f"-c 'DROP DATABASE {DB} WITH (FORCE)'"
        )


if __name__ == "__main__":
    raise SystemExit(main())

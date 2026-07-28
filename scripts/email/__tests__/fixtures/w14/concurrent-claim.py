#!/usr/bin/env python3
"""Disposable PostgreSQL concurrency proof for MDG-W14-001.

Creates a blank remote database, applies the synthetic baseline + migration,
then holds worker A's claim transaction open while worker B attempts a claim.
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
DB = f"mdg_w14_concurrency_{int(time.time())}"


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
        psql(
            DB,
            "INSERT INTO mdg_leads(source_message_id,from_email,promised_asset,next_attempt_at) "
            "VALUES ('synthetic:concurrent','w14-concurrent@example.invalid',"
            "'maine_dispensary_roadmap_2026',now());",
        )

        a_sql = (
            "BEGIN; "
            "SELECT 'worker_a_claim='||lead_id FROM mdg_w14_claim('worker-a',now()); "
            "SELECT pg_sleep(3); COMMIT;"
        )
        a = subprocess.Popen(
            SSH + [f"docker exec {CONTAINER} psql -U n8n -d {DB} -X -At -v ON_ERROR_STOP=1 -c \"{a_sql}\""],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        time.sleep(0.5)
        started = time.monotonic()
        b = psql(DB, "SELECT 'worker_b_claims='||count(*) FROM mdg_w14_claim('worker-b',now());", tuples=True)
        elapsed_ms = int((time.monotonic() - started) * 1000)
        a_out, a_err = a.communicate(timeout=10)
        if a.returncode != 0:
            sys.stderr.write(a_err.decode(errors="replace"))
            return a.returncode

        a_lines = a_out.decode().splitlines()
        b_lines = b.stdout.decode().splitlines()
        print(next((x for x in a_lines if x.startswith("worker_a_claim=")), "worker_a_claim=MISSING"))
        print(next((x for x in b_lines if x.startswith("worker_b_claims=")), "worker_b_claims=MISSING"))
        print(f"worker_b_elapsed_ms={elapsed_ms}")
        if not any(x.startswith("worker_a_claim=") for x in a_lines):
            raise AssertionError(a_lines)
        if "worker_b_claims=0" not in b_lines:
            raise AssertionError(b_lines)
        if elapsed_ms >= 2500:
            raise AssertionError(f"SKIP LOCKED blocked for {elapsed_ms}ms")
        print("CONCURRENT_CLAIM_TEST=PASS")
        return 0
    finally:
        remote(
            f"docker exec {CONTAINER} psql -U n8n -d postgres -X -v ON_ERROR_STOP=1 "
            f"-c 'DROP DATABASE {DB} WITH (FORCE)'"
        )


if __name__ == "__main__":
    raise SystemExit(main())

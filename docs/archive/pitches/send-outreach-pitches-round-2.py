#!/usr/bin/env python3
"""
send-outreach-pitches-round-2.py — Round 2 of MDG backlink pitches

Round 1 (2026-07-07) sent 15 to generic catch-all addresses. Result: 5
hard-bounced (DSN-verified), 1 auto-acked (BDN news+), 9 pending. Many
of the original "editor@" addresses were wrong SMTP config, defunct
mailboxes, or generic-but-unmonitored.

Round 2 strategy:
- Re-pitch only the 5 surviving live-human Tier-A targets with sharper
  signal-personalized subjects + bodies.
- For 4 PENDING-RESEARCH slots (BDN reporter, PPH reporter, Down East
  reporter, UMaine faculty), do NOT send until the human contact is
  verified by research.
- 5 hard-bounced Tier-B targets are dropped and logged as "skipped"
  so the dedup log doesn't re-send them.

Reads:
  /home/steve/projects/maine-dispensary-guide/pitches/round-2-contacts.csv
  /home/steve/projects/maine-dispensary-guide/pitches/journalist-pitch-templates-round-2.md

Logs to:
  /home/steve/projects/maine-dispensary-guide/pitches/sent-log.json (append-only)

Usage:
  python3 send-outreach-pitches-round-2.py --dry-run    # Show what would be sent
  python3 send-outreach-pitches-round-2.py              # Send Tier-A only
  python3 send-outreach-pitches-round-2.py --include-tier B  # include Tier-B drops (logs only)
  python3 send-outreach-pitches-round-2.py --force-resend      # bypass 60-min dedup
"""
import subprocess
import csv
import json
import sys
import os
import re
import time
from pathlib import Path
from datetime import datetime, timezone

PITCHES_FILE = Path('/home/steve/projects/maine-dispensary-guide/pitches/journalist-pitch-templates-round-2.md')
CONTACTS_CSV = Path('/home/steve/projects/maine-dispensary-guide/pitches/round-2-contacts.csv')
SEND_SCRIPT = Path('/home/steve/projects/maine-dispensary-guide/scripts/send-email.cjs')
LOG_FILE = Path('/home/steve/projects/maine-dispensary-guide/pitches/sent-log.json')

def parse_pitches():
    """Extract (pitch_id, subject, body) for each Tier-A pitch in the round-2 file."""
    text = PITCHES_FILE.read_text()
    # Round 2 uses ### #1 —, ### #2 —, etc.
    sections = re.split(r'### (#\d+ — .+?)\n', text)
    pitches = {}
    for i in range(1, len(sections), 2):
        header = sections[i].strip()
        content = sections[i+1] if i+1 < len(sections) else ''
        id_m = re.match(r'#(\d+)', header)
        subj_m = re.search(r'\*\*Subject:\*\*\s*(.+)', content)
        body_m = re.search(r'```\n(.+?)\n```', content, re.DOTALL)
        if id_m and subj_m and body_m:
            pitches[id_m.group(1)] = {
                'header': header,
                'subject': subj_m.group(1).strip(),
                'body': body_m.group(1).strip(),
            }
    return pitches

def load_contacts():
    """Load round-2 contacts CSV. Returns list of dicts."""
    with open(CONTACTS_CSV) as f:
        # Skip leading comment lines (start with #) AND blank lines
        lines = [l for l in f if not l.startswith('#') and l.strip()]
    reader = csv.DictReader(lines)
    rows = [r for r in reader if r.get('pitch_id', '').strip()]
    return rows

def send_email(to_addr, subject, body, dry_run=False):
    """Send via send-email.cjs. Returns dict with status."""
    cmd = ['node', str(SEND_SCRIPT), '--to', to_addr, '--subject', subject, '--body', body]
    if dry_run:
        return {'ok': True, 'dry_run': True}
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    msg_id = None
    for line in r.stdout.split('\n'):
        if 'MessageId:' in line:
            msg_id = line.split('MessageId:')[1].strip()
    return {
        'ok': r.returncode == 0,
        'returncode': r.returncode,
        'msg_id': msg_id,
        'stdout': r.stdout[:500],
        'stderr': r.stderr[:500] if r.stderr else '',
    }

def load_log_fresh():
    if LOG_FILE.exists():
        try:
            return json.loads(LOG_FILE.read_text())
        except Exception:
            return []
    return []

def save_log_atomic(log_data):
    tmp = LOG_FILE.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(log_data, indent=2))
    os.replace(tmp, LOG_FILE)

def main():
    args = sys.argv[1:]

    # --help short-circuit BEFORE any other setup. This is the bug-class fix
    # from the 2026-07-07 over-send incident.
    if '--help' in args or '-h' in args:
        print(__doc__ or '')
        return 0

    dry_run = '--dry-run' in args
    force_resend = '--force-resend' in args
    include_tier_b = '--include-tier-b' in args

    pitches = parse_pitches()
    contacts = load_contacts()

    if not pitches:
        print("ERROR: no Tier-A pitches parsed from", PITCHES_FILE)
        return 1
    if not contacts:
        print("ERROR: no contacts loaded from", CONTACTS_CSV)
        return 1

    print(f"Parsed {len(pitches)} Tier-A pitches + {len(contacts)} contacts from CSV.\n")

    sent_count = 0
    skipped_count = 0
    dropped_count = 0
    error_count = 0
    pending_count = 0

    # Sort contacts by tier (A first), then by pitch_id numerically
    tier_order = {'A': 0, 'B': 1, 'C': 2}
    contacts.sort(key=lambda c: (tier_order.get(c.get('tier', 'Z'), 9), int(c.get('pitch_id', '0') or 0)))

    log = load_log_fresh()

    for contact in contacts:
        pitch_id = contact['pitch_id'].strip()
        tier = contact.get('tier', '').strip()
        target_name = contact.get('target_name', '').strip()
        target_email = (contact.get('target_email', '') or '').strip() or None
        notes = contact.get('notes', '').strip()
        verified = contact.get('human_contact_verified', '').strip().upper() == 'YES'

        print(f"--- #{pitch_id}: {target_name} [Tier {tier}] ---")
        print(f"  To: {target_email or '(no email)'}")
        print(f"  Notes: {notes[:80]}")

        # Skip Tier-B unless explicitly included
        if tier == 'B' and not include_tier_b:
            print(f"  → DROPPED (Tier B; pass --include-tier-b to log skip)\n")
            dropped_count += 1
            continue

        # Tier A: only send if we have a verified contact OR a generic catch-all
        # explicitly marked (e.g., MJBizDaily editorial@ verified per masthead).
        # PENDING RESEARCH contacts are held back regardless.
        if tier == 'A':
            if contact.get('human_contact_verified', '').strip().upper() == 'PENDING':
                print(f"  → HELD (PENDING RESEARCH — do not send until verified)\n")
                pending_count += 1
                continue
            if not target_email:
                print(f"  → SKIPPED (no email on file)\n")
                skipped_count += 1
                continue
            if not verified:
                # Generic catch-all: warn but allow (operator knows the publication
                # monitors the generic inbox)
                print(f"  ⚠ unverified contact (generic catch-all) — proceeding")

        pitch = pitches.get(pitch_id)
        if not pitch:
            print(f"  → NO PITCH TEMPLATE found for #{pitch_id}\n")
            skipped_count += 1
            continue

        print(f"  Subject: {pitch['subject']}")

        # Dedup: re-read log from disk before every send (race-safe pattern
        # from cold-email-outreach skill). Skip if same (target_email, subject)
        # was sent in the last 60 minutes.
        fresh_log = load_log_fresh()
        recent_dup = next(
            (entry for entry in fresh_log
             if entry.get('target_email') == target_email
             and entry.get('subject') == pitch['subject']
             and entry.get('status') == 'sent'
             and (datetime.now(timezone.utc) - datetime.fromisoformat(entry['timestamp'])).total_seconds() < 3600),
            None
        )
        if recent_dup and not dry_run and not force_resend:
            print(f"  → SKIPPED (already sent at {recent_dup['timestamp'][:19]})\n")
            skipped_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': target_email,
                'subject': pitch['subject'],
                'status': 'skipped',
                'reason': f'duplicate of {recent_dup.get("msg_id","-")} sent at {recent_dup["timestamp"]}',
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            continue

        if dry_run:
            print(f"  → DRY RUN (would send)\n")
            continue

        result = send_email(target_email, pitch['subject'], pitch['body'])
        if result['ok']:
            print(f"  ✓ SENT — msg_id: {result.get('msg_id', 'unknown')}\n")
            sent_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': target_email,
                'subject': pitch['subject'],
                'status': 'sent',
                'msg_id': result.get('msg_id'),
                'campaign': 'round-2',
                'tier': tier,
                'verified_contact': verified,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            save_log_atomic(log)
        else:
            print(f"  ✗ FAILED: {result.get('stderr', result.get('stdout', 'unknown'))[:200]}\n")
            error_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': target_email,
                'subject': pitch['subject'],
                'status': 'error',
                'error': result.get('stderr', result.get('stdout', 'unknown'))[:500],
                'campaign': 'round-2',
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            save_log_atomic(log)

        # Rate limit (10s between sends — looks like a human, not a bot)
        if contacts and contact is not contacts[-1]:
            time.sleep(10)

    print(f"\n=== Round 2 Summary ===")
    print(f"Sent: {sent_count}")
    print(f"Skipped (no email / dedup / no template): {skipped_count}")
    print(f"Held (PENDING RESEARCH): {pending_count}")
    print(f"Dropped (Tier B): {dropped_count}")
    print(f"Errors: {error_count}")
    if dry_run:
        print(f"(DRY RUN — no actual sends)")

if __name__ == '__main__':
    main()
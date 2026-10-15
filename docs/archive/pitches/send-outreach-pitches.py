#!/usr/bin/env python3
"""
send-outreach-pitches.py — Send the 19 MDG backlink pitches via Purelymail SMTP

Usage:
  python3 send-outreach-pitches.py             # Send all
  python3 send-outreach-pitches.py --dry-run  # Show what would be sent
  python3 send-outreach-pitches.py --id 1,2,3 # Send specific pitch IDs

Reads the humanized pitch templates from
/home/steve/projects/maine-dispensary-guide/pitches/journalist-pitch-templates.md
and sends each one via the existing send-email.cjs SMTP pipeline.

Logs each send to /home/steve/projects/maine-dispensary-guide/pitches/sent-log.json
with timestamp, target, subject, message-id, status.
"""
import subprocess
import re
import json
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

PITCHES_FILE = Path('/home/steve/projects/maine-dispensary-guide/pitches/journalist-pitch-templates.md')
SEND_SCRIPT = Path('/home/steve/projects/maine-dispensary-guide/scripts/send-email.cjs')
LOG_FILE = Path('/home/steve/projects/maine-dispensary-guide/pitches/sent-log.json')

# Contact list. None means "skip — no email on file"
CONTACTS = {
    '1':  ('Maine Cannabis Connections',   None,                          'editorial address unknown'),
    '2':  ('MaineCannabis.org',             'news@mainecannabis.org',      None),
    '3':  ('Cannabis Business Times',       'editorial@cannabisbusinesstimes.com', None),
    '4':  ('Ganjapreneur',                  'editorial@ganjapreneur.com',  None),
    '5':  ('Portland Press Herald',         'letters@pressherald.com',     None),
    '6':  ('Bangor Daily News',             'news@bangordailynews.com',    None),
    '7':  ('The County (Aroostook)',        'editor@thecounty.me',         None),
    '8':  ('MJBizDaily',                    'editorial@mjbizdaily.com',    None),
    '9':  ('Marijuana Venture',             'editorial@marijuanaventure.com', None),
    '10': ('Leafly News',                   'news@leafly.com',             None),
    '11': ('High Times',                    'edit.grow@hightimes.com',     None),
    '12': ('Maximum Yield',                 'editor@maximumyield.com',     None),
    '13': ('UMaine Cooperative Extension',  'extension@maine.edu',         None),
    '14': ('Down East Magazine',            'letters@downeast.com',        None),
    '15': ('Portland Regional Chamber',     'info@portlandregion.com',     None),
    '16': ('Bangor Region Chamber',         'info@bangorregion.com',       None),
    '17': ('Maine SBDC',                    'info@mesbdc.org',             None),
    '18': ('SCORE Maine',                   'mentoring@score.org',         None),
}

def parse_pitches():
    """Extract (id, subject, body) for each pitch in the templates file."""
    text = PITCHES_FILE.read_text()
    sections = re.split(r'### (#\d+ — .+?)\n', text)
    pitches = {}
    for i in range(1, len(sections), 2):
        header = sections[i].strip()
        content = sections[i+1] if i+1 < len(sections) else ''
        id_m = re.match(r'#(\d+)', header)
        subj_m = re.search(r'\*\*Subject:\*\*\s*(.+)', content)
        body_m = re.search(r'```\n(.+?)\n```', content, re.DOTALL)
        if id_m and subj_m and body_m:
            pitch_id = id_m.group(1)
            pitches[pitch_id] = {
                'header': header,
                'subject': subj_m.group(1).strip(),
                'body': body_m.group(1).strip(),
            }
    return pitches

def send_email(to_addr, subject, body, dry_run=False):
    """Send via send-email.cjs. Returns dict with status."""
    cmd = ['node', str(SEND_SCRIPT), '--to', to_addr, '--subject', subject, '--body', body]
    if dry_run:
        return {'ok': True, 'dry_run': True, 'cmd': ' '.join(cmd[:6]) + ' ...'}
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

def main():
    args = sys.argv[1:]

    # --help must be handled BEFORE any other logic so verification commands
    # never accidentally trigger sends. Use argparse for canonical handling.
    if '--help' in args or '-h' in args:
        print(__doc__ or '')
        print("Usage: python3 send-outreach-pitches.py [--dry-run] [--id 1,2,3] [--force-resend]")
        print()
        print("Options:")
        print("  --dry-run          Show what would be sent without sending")
        print("  --id N,M,...       Send only specific pitch IDs (comma-separated)")
        print("  --force-resend     Bypass the 60-minute dedup window")
        print("  --help, -h         Show this help")
        return 0

    dry_run = '--dry-run' in args
    force_resend = '--force-resend' in args
    id_filter = None
    for a in args:
        if a.startswith('--id='):
            id_filter = a.split('=')[1].split(',')
        elif a.startswith('--id'):
            idx = args.index(a)
            if idx+1 < len(args):
                id_filter = args[idx+1].split(',')

    pitches = parse_pitches()
    print(f"Parsed {len(pitches)} pitches from templates file.\n")

    # Load existing log (initial snapshot — but per-send dedup re-reads from
    # disk below to defeat the race window where multiple parallel invocations
    # of this script all start before any of them has written).
    if LOG_FILE.exists():
        try:
            log = json.loads(LOG_FILE.read_text())
        except Exception:
            log = []
    else:
        log = []

    sent_count = 0
    skipped_count = 0
    error_count = 0

    def load_log_fresh():
        """Re-read log from disk to defeat in-memory dedup races."""
        if LOG_FILE.exists():
            try:
                return json.loads(LOG_FILE.read_text())
            except Exception:
                return []
        return []

    def save_log_atomic(log_data):
        """Write-then-rename to prevent concurrent readers seeing partial JSON."""
        import tempfile, os
        tmp = LOG_FILE.with_suffix('.json.tmp')
        tmp.write_text(json.dumps(log_data, indent=2))
        os.replace(tmp, LOG_FILE)

    for pitch_id in sorted(pitches.keys(), key=int):
        if id_filter and pitch_id not in id_filter:
            continue
        target_name, target_email, skip_reason = CONTACTS.get(pitch_id, (f'Pitch {pitch_id}', None, 'no contact'))
        pitch = pitches[pitch_id]

        print(f"--- #{pitch_id}: {target_name} ---")
        print(f"  Subject: {pitch['subject']}")
        print(f"  To: {target_email or ('SKIP' + (' (' + skip_reason + ')' if skip_reason else ''))}")

        if not target_email:
            print(f"  → SKIPPED (no email on file)")
            skipped_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': None,
                'status': 'skipped',
                'reason': skip_reason,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            continue

        # Idempotency guard: if this exact (target_email, subject) was sent
        # within the last 60 minutes, skip to prevent duplicate-send.
        # CRITICAL: re-read log from disk every iteration to defeat the race
        # window where multiple parallel invocations of this script all start
        # before any of them has written their entry to the log.
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
            print(f"  → SKIPPED (already sent at {recent_dup['timestamp'][:19]}, msg_id {recent_dup.get('msg_id','-')[:30]}...)")
            print(f"     pass --force-resend to bypass the 60-minute dedup window")
            skipped_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': target_email,
                'status': 'skipped',
                'reason': f'duplicate of {recent_dup.get("msg_id","-")} sent at {recent_dup["timestamp"]}',
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            continue
        if recent_dup and force_resend:
            print(f"  → FORCE-RESEND (overriding dedup of {recent_dup.get('msg_id','-')[:30]}...)")

        if dry_run:
            print(f"  → DRY RUN (would send)")
            continue

        result = send_email(target_email, pitch['subject'], pitch['body'])
        if result['ok']:
            print(f"  ✓ SENT — msg_id: {result.get('msg_id', 'unknown')}")
            sent_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': target_email,
                'subject': pitch['subject'],
                'status': 'sent',
                'msg_id': result.get('msg_id'),
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            # Write log atomically AFTER each successful send so concurrent
            # script invocations see this entry before they send their own.
            if not dry_run:
                save_log_atomic(log)
        else:
            print(f"  ✗ FAILED: {result.get('stderr', result.get('stdout', 'unknown'))[:200]}")
            error_count += 1
            log.append({
                'pitch_id': pitch_id,
                'target_name': target_name,
                'target_email': target_email,
                'status': 'error',
                'error': result.get('stderr', result.get('stdout', 'unknown'))[:500],
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            if not dry_run:
                save_log_atomic(log)

        # Rate limit to avoid looking like a bot — 10s between sends
        if pitch_id != sorted(pitches.keys(), key=int)[-1]:
            time.sleep(10)

    # Log is already saved atomically after each send; no end-of-loop write needed.
    if dry_run:
        print(f"\n(Dry run — no log written)")
    else:
        print(f"\nLog saved per-send to {LOG_FILE}")

    print(f"\n=== Summary ===")
    print(f"Sent: {sent_count}")
    print(f"Skipped (no email): {skipped_count}")
    print(f"Errors: {error_count}")
    if dry_run:
        print(f"(DRY RUN — no actual sends)")

if __name__ == '__main__':
    main()

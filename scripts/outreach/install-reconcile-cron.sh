#!/bin/bash
# install-reconcile-cron.sh — install (or report) the daily 09:00 reconciliation cron.
#
# Steve-side action: this script only modifies the current user's crontab.
# Run: bash scripts/outreach/install-reconcile-cron.sh
#
# Idempotent: re-running just reports the existing entry without re-adding it.

set -euo pipefail

CRON_LINE="0 9 * * * /home/steve/.local/bin/mdg-reconcile.sh"
MARKER="# mdg-reconcile: daily 09:00 backlink-replies snapshot"

if crontab -l 2>/dev/null | grep -qF "$CRON_LINE"; then
  echo "Cron entry already installed:"
  crontab -l | grep -F "$MARKER" -A1
  exit 0
fi

echo "Adding cron entry:"
echo "  $CRON_LINE"
(crontab -l 2>/dev/null; echo "$MARKER"; echo "$CRON_LINE") | crontab -
echo "Done. Verify with: crontab -l | grep mdg-reconcile"
echo "Note: requires crond running on Manjaro (sudo systemctl enable --now crond.service)"
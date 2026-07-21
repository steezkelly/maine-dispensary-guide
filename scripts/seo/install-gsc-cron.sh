#!/bin/bash
# install-gsc-cron.sh — install (or report) the MDG GSC scheduler crontab entries.
#
# Two jobs:
#   - daily  06:00  mdg-gsc-daily.sh   (Search Analytics dump)
#   - weekly Mon 07:00  mdg-gsc-weekly.sh  (indexing check + misroute audit)
#
# Requires:
#   - cron.service active (systemctl is-active cron)
#   - GSC service-account JSON at ~/.hermes/secrets/gcp-mdg-reader.json
#     (mdg-analytics-reader@maine-dispensary-guide.iam.gserviceaccount.com,
#      added as a Search Console user on the MDG property)
#   - wrapper scripts at ~/.local/bin/mdg-gsc-daily.sh and mdg-gsc-weekly.sh
#
# Idempotent: re-running reports existing entries without duplicating them.
# Run: bash scripts/seo/install-gsc-cron.sh

set -euo pipefail

DAILY_LINE="0 6 * * * /home/steve/.local/bin/mdg-gsc-daily.sh"
DAILY_MARKER="# mdg-gsc: daily 06:00 search-analytics dump"
WEEKLY_LINE="0 7 * * 1 /home/steve/.local/bin/mdg-gsc-weekly.sh"
WEEKLY_MARKER="# mdg-gsc: weekly Mon 07:00 indexing + misroute audit"

# Preflight checks
if ! systemctl is-active --quiet cron 2>/dev/null && ! systemctl is-active --quiet crond 2>/dev/null; then
  echo "WARNING: cron service is not active. Enable it first:"
  echo "  sudo systemctl enable --now cron.service"
fi
if [ ! -f /home/steve/.hermes/secrets/gcp-mdg-reader.json ]; then
  echo "ERROR: GSC service-account JSON not found at ~/.hermes/secrets/gcp-mdg-reader.json"
  exit 1
fi
for w in /home/steve/.local/bin/mdg-gsc-daily.sh /home/steve/.local/bin/mdg-gsc-weekly.sh; do
  if [ ! -x "$w" ]; then
    echo "ERROR: wrapper not executable: $w (chmod +x it first)"
    exit 1
  fi
done

add_entry() {
  local marker="$1" line="$2"
  if crontab -l 2>/dev/null | grep -qF "$line"; then
    echo "Already installed: $line"
    return 0
  fi
  # Build the new crontab in a temp file to avoid set -e / pipefail issues
  # with subshell-to-crontab pipes.
  local tmp
  tmp="$(mktemp)"
  { crontab -l 2>/dev/null || true; echo "$marker"; echo "$line"; } > "$tmp"
  crontab "$tmp"
  rm -f "$tmp"
  echo "Added: $line"
}

add_entry "$DAILY_MARKER" "$DAILY_LINE"
add_entry "$WEEKLY_MARKER" "$WEEKLY_LINE"

echo ""
echo "Current MDG GSC crontab entries:"
crontab -l | grep -F "mdg-gsc" -A1
echo ""
echo "Verify logs after next run: tail ~/.hermes/data/mdg-gsc/cron.log"

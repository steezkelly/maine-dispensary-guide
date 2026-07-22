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
#   - versioned wrapper templates beside this installer
#
# Idempotent: re-running reports existing entries without duplicating them.
# Run: bash scripts/seo/install-gsc-cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${MDG_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
BIN_DIR="${HOME}/.local/bin"
CONFIG_DIR="${HOME}/.config/mdg-gsc"
DAILY_LINE="0 6 * * * $BIN_DIR/mdg-gsc-daily.sh"
DAILY_MARKER="# mdg-gsc: daily 06:00 search-analytics dump"
WEEKLY_LINE="0 7 * * 1 $BIN_DIR/mdg-gsc-weekly.sh"
WEEKLY_MARKER="# mdg-gsc: weekly Mon 07:00 indexing + misroute audit"
CREDENTIAL_PATH="${GOOGLE_APPLICATION_CREDENTIALS:-$HOME/.hermes/secrets/gcp-mdg-reader.json}"

# Preflight checks
if [ ! -d "$REPO_ROOT/apps/maine-cannabis" ]; then
  echo "ERROR: durable MDG checkout not found at $REPO_ROOT"
  exit 1
fi
if ! systemctl is-active --quiet cron 2>/dev/null && ! systemctl is-active --quiet crond 2>/dev/null; then
  echo "ERROR: cron service is not active. Enable it first:"
  echo "  sudo systemctl enable --now cron.service"
  exit 1
fi
if [ ! -f "$CREDENTIAL_PATH" ]; then
  echo "ERROR: GSC service-account JSON not found at $CREDENTIAL_PATH"
  exit 1
fi
for template in mdg-gsc-daily.sh mdg-gsc-weekly.sh mdg-gsc-health-check.sh; do
  if [ ! -f "$SCRIPT_DIR/$template" ]; then
    echo "ERROR: wrapper template missing: $SCRIPT_DIR/$template"
    exit 1
  fi
done

mkdir -p "$BIN_DIR"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"
printf '%s\n' "$REPO_ROOT" > "$CONFIG_DIR/repo-root"
chmod 600 "$CONFIG_DIR/repo-root"
install -m 700 "$SCRIPT_DIR/mdg-gsc-daily.sh" "$BIN_DIR/mdg-gsc-daily.sh"
install -m 700 "$SCRIPT_DIR/mdg-gsc-weekly.sh" "$BIN_DIR/mdg-gsc-weekly.sh"
install -m 700 "$SCRIPT_DIR/mdg-gsc-health-check.sh" "$BIN_DIR/mdg-gsc-health-check.sh"
echo "Installed fail-closed wrappers in $BIN_DIR for $REPO_ROOT"

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
echo "Privacy-safe health check: ~/.local/bin/mdg-gsc-health-check.sh"

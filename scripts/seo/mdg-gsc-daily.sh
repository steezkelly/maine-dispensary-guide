#!/bin/bash
set -uo pipefail

export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-$HOME/.hermes/secrets/gcp-mdg-reader.json}"
CONFIGURED_REPO_ROOT=""
[ ! -r "$HOME/.config/mdg-gsc/repo-root" ] || IFS= read -r CONFIGURED_REPO_ROOT < "$HOME/.config/mdg-gsc/repo-root"
REPO_ROOT="${MDG_REPO_ROOT:-${CONFIGURED_REPO_ROOT:-$HOME/projects/maine-dispensary-guide}}"
DATA_ROOT="${MDG_GSC_DATA_ROOT:-$HOME/.hermes/data/mdg-gsc}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
ROOT_VALIDATOR="$REPO_ROOT/apps/maine-cannabis/scripts/seo/gsc-private-data-root.cjs"
[ -f "$ROOT_VALIDATOR" ] || { echo "Missing GSC root validator: $ROOT_VALIDATOR" >&2; exit 1; }
DATA_ROOT="$("$NODE_BIN" -e 'const {privateDataRoot}=require(process.argv[1]);process.stdout.write(privateDataRoot(process.argv[2]));' "$ROOT_VALIDATOR" "$DATA_ROOT")" || exit $?
LOG="$DATA_ROOT/cron.log"
mkdir -p "$DATA_ROOT"
chmod 700 "$DATA_ROOT"

rc=0
{
  echo "=== [$(date -Is)] mdg-gsc-daily start ==="
  cd "$REPO_ROOT/apps/maine-cannabis" || rc=$?
  if [ "$rc" -eq 0 ]; then
    "$NODE_BIN" ./scripts/seo/gsc-search-analytics-daily.cjs || rc=$?
  fi
  echo "=== [$(date -Is)] mdg-gsc-daily end (exit $rc) ==="
} >> "$LOG" 2>&1
chmod 600 "$LOG" || exit $?
exit "$rc"

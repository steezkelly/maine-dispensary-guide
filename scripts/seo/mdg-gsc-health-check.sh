#!/bin/bash
set -uo pipefail

CONFIGURED_REPO_ROOT=""
[ ! -r "$HOME/.config/mdg-gsc/repo-root" ] || IFS= read -r CONFIGURED_REPO_ROOT < "$HOME/.config/mdg-gsc/repo-root"
REPO_ROOT="${MDG_REPO_ROOT:-${CONFIGURED_REPO_ROOT:-$HOME/projects/maine-dispensary-guide}}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
cd "$REPO_ROOT/apps/maine-cannabis" || exit $?
exec "$NODE_BIN" ./scripts/seo/gsc-ledger-health.cjs

#!/usr/bin/env bash
# Switches the site back to an earlier release (no build needed).
#
#   bash ~/podkast-src/deploy/cpanel/rollback.sh          # list releases
#   bash ~/podkast-src/deploy/cpanel/rollback.sh <id>     # activate releases/<id>
#
# Database migrations are not undone; they are written to be backwards compatible.
set -euo pipefail

APP="${APP_DIR:-$HOME/podkast-app}"
ACTIVE="$(basename "$(readlink -f "$APP/current")")"

if [ $# -eq 0 ]; then
  for r in $(ls -1t "$APP/releases"); do
    [ "$r" = "$ACTIVE" ] && echo "* $r (active)" || echo "  $r"
  done
  exit 0
fi

REL="$APP/releases/$1"
[ -f "$REL/server.js" ] || { echo "No such release: $1"; exit 1; }
ln -sfn "$REL" "$APP/current.next"
mv -Tf "$APP/current.next" "$APP/current"
touch "$APP/tmp/restart.txt"
if command -v cloudlinux-selector >/dev/null 2>&1; then
  cloudlinux-selector restart --json --interpreter nodejs --app-root "${APP#"$HOME"/}" >/dev/null || true
fi
echo "✓ live: $1 (was $ACTIVE)"

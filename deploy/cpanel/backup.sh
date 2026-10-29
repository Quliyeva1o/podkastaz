#!/usr/bin/env bash
# Daily backup for cPanel → Cron Jobs (e.g. every night at 03:15):
#   15 3 * * *  bash $HOME/podkast-src/deploy/cpanel/backup.sh >/dev/null 2>&1
#
# Database every day (kept 14 days), uploaded media every Sunday (kept 5 weeks).
# Files land in ~/backups/podkast — outside the web root; JetBackup copies them off-server too.
set -euo pipefail

APP="${APP_DIR:-$HOME/podkast-app}"
DEST="${BACKUP_DIR:-$HOME/backups/podkast}"
mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M)"

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP/shared/.env" | head -1 | cut -d= -f2- | tr -d '"'"'")"
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$DEST/db-$STAMP.sql.gz"

if [ "$(date +%u)" = 7 ]; then
  tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$APP/shared" uploads
fi

find "$DEST" -name 'db-*.sql.gz' -mtime +14 -delete
find "$DEST" -name 'uploads-*.tar.gz' -mtime +35 -delete

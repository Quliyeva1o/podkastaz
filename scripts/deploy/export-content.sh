#!/usr/bin/env bash
# First deploy only: packs this computer's content for the server — the database (pages,
# sections, media records, collections, studios, decors, booking rules, redirects) and the
# uploaded files (web renditions).
#
#   bash scripts/deploy/export-content.sh      → deploy-bundle/db.sql.gz, deploy-bundle/uploads.tar.gz.part-*
#
# Left out (data only, the tables are created by the migrations): admin users and sessions (the
# real admin is created on the server), section history, test bookings, package requests and
# contact messages, cache bookkeeping.
# pg_dump runs inside the local Docker Postgres (docker-compose.dev.yml), so nothing needs
# installing on Windows.
set -euo pipefail
cd "$(dirname "$0")/../.."

OUT=deploy-bundle
mkdir -p "$OUT"

# Plain SQL so the server's older psql (13) can load a dump from pg_dump 16. Newer pg_dump
# versions also write \restrict / \unrestrict lines that psql 13 rejects. The migrations table
# travels too, so `db:migrate` on the server knows the schema is already there.
docker compose -f docker-compose.dev.yml exec -T db pg_dump -U podkast -d podkast --no-owner --no-privileges \
  --exclude-table-data=users --exclude-table-data=sessions \
  --exclude-table-data=section_versions --exclude-table-data=submissions \
  --exclude-table-data=bookings --exclude-table-data=booking_events --exclude-table-data=package_requests \
  --exclude-table-data=cache_tags \
  | sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' \
  | gzip > "$OUT/db.sql.gz"

# Only what the site serves: web renditions. Raster/video originals stay on this computer
# (pages never request them), which keeps the bundle small enough to upload.
tar -czf "$OUT/uploads.tar.gz" \
  --exclude='original.jpg' --exclude='original.png' --exclude='original.webp' \
  --exclude='original.avif' --exclude='original.gif' --exclude='original.mp4' \
  --exclude='original.webm' --exclude='original.mov' \
  uploads

# The browser upload in cPanel's File Manager takes ≤ 10 MB per file: split, then on the server
#   cat uploads.tar.gz.part-* > uploads.tar.gz
rm -f "$OUT"/uploads.tar.gz.part-*
split -b 9m "$OUT/uploads.tar.gz" "$OUT/uploads.tar.gz.part-"
rm "$OUT/uploads.tar.gz"

ls -lh "$OUT"

#!/usr/bin/env bash
# Builds and activates a new release on the cPanel account (run it in cPanel → Terminal).
#
#   bash ~/podkast-src/deploy/cpanel/deploy.sh            # latest origin/main
#   bash ~/podkast-src/deploy/cpanel/deploy.sh <commit>   # a specific commit or tag
#
# Layout (see README.md):
#   ~/podkast-src             git checkout, used only to build
#   ~/podkast-app/app.js      startup file registered in "Setup Node.js App"
#   ~/podkast-app/current     → releases/<id>, the running build
#   ~/podkast-app/shared/     .env and uploads/, kept across releases
#
# The build prerenders pages from the live database, so it runs here, next to it.
# The running site is untouched until the very last step switches `current`.
set -euo pipefail

# Everything runs inside main(): bash reads the whole function before executing it, so the
# `git checkout` below can safely replace this very file.
main() {

  APP="${APP_DIR:-$HOME/podkast-app}"
  SRC="${SRC_DIR:-$HOME/podkast-src}"
  NODE_BIN="${NODE_BIN:-/opt/alt/alt-nodejs22/root/usr/bin}"
  KEEP="${KEEP_RELEASES:-3}"
  REF="${1:-origin/main}"
  export PATH="$NODE_BIN:$PATH" NEXT_TELEMETRY_DISABLED=1
  # The account may run at most 150 processes, and CloudLinux counts every thread. Node,
  # libuv, Turbopack (Rust) and V8 each size their thread pools from the host's 32 CPUs, so
  # the build hit the limit and its worker aborted (SIGABRT) — keep every pool small.
  # Measured: peak ~115 threads with these settings vs. failure at the limit without.
  export UV_THREADPOOL_SIZE=2 RAYON_NUM_THREADS=2 TOKIO_WORKER_THREADS=2
  export NODE_OPTIONS="--max-old-space-size=${NODE_HEAP_MB:-1536} --v8-pool-size=2"

  [ -f "$APP/shared/.env" ] || { echo "Missing $APP/shared/.env (see README.md)"; exit 1; }
  echo "→ node $(node -v), building $REF"

  cd "$SRC"
  git fetch --quiet origin
  git checkout --quiet --force --detach "$REF"
  COMMIT="$(git rev-parse --short HEAD)"

  # Next.js (build), drizzle-kit and the npm scripts all read .env.local from the project root.
  ln -sfn "$APP/shared/.env" .env.local

  echo "→ installing dependencies"
  npm ci --no-audit --no-fund --loglevel=error

  echo "→ database migrations"
  npm run --silent db:migrate

  echo "→ building (one CPU — takes a few minutes)"
  # Always from scratch: a reused .next (Turbopack cache) once shipped new HTML pointing at the
  # previous build's CSS file — the site rendered with stale styles.
  rm -rf .next
  NEXT_BUILD_CPUS=1 npm run --silent build

  # Uploaded media straight from the web server: /media in the document root is a link to
  # shared/uploads, so LiteSpeed serves images and videos itself and Node never reads them.
  PUB="${PUBLIC_DIR:-$HOME/podkast-public}"
  if [ -d "$PUB" ]; then
    echo "→ media served from $PUB/media"
    mkdir -p "$APP/shared/uploads"
    cp "$SRC/deploy/cpanel/media.htaccess" "$APP/shared/uploads/.htaccess"
    ln -sfn "$APP/shared/uploads" "$PUB/media"
  fi

  REL="$APP/releases/$(date +%Y%m%d-%H%M%S)-$COMMIT"
  echo "→ assembling $REL"
  mkdir -p "$APP/releases" "$APP/tmp"
  cp -a .next/standalone "$REL"
  cp -a .next/static "$REL/.next/static"
  cp -a public "$REL/public"

  # Atomic switch, then restart the app.
  ln -sfn "$REL" "$APP/current.next"
  mv -Tf "$APP/current.next" "$APP/current"
  touch "$APP/tmp/restart.txt"
  if command -v cloudlinux-selector >/dev/null 2>&1; then
    cloudlinux-selector restart --json --interpreter nodejs --app-root "${APP#"$HOME"/}" >/dev/null || true
  fi

  # Keep the newest $KEEP releases (rollback.sh can switch back to any of them), never the active one.
  ACTIVE="$(readlink -f "$APP/current")"
  ls -1dt "$APP"/releases/*/ | tail -n +"$((KEEP + 1))" | while read -r old; do
    [ "$(readlink -f "$old")" = "$ACTIVE" ] || rm -rf "$old"
  done

  echo "✓ live: $COMMIT ($REL)"
}

main "$@"

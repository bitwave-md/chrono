#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." 2>/dev/null && pwd || pwd)
if [ -f "$ROOT/compose.yaml" ]; then COMPOSE_ROOT=$ROOT; else COMPOSE_ROOT=$(pwd); fi
ENV_FILE=${CHRONO_ENV_FILE:-$COMPOSE_ROOT/.env}
[ -f "$ENV_FILE" ] || { printf 'Missing %s\n' "$ENV_FILE" >&2; exit 1; }
VERSION=${1:-}
[ -n "$VERSION" ] || { printf 'Usage: %s <release-version>\n' "$0" >&2; exit 1; }

cd "$COMPOSE_ROOT"
if [ -x "$COMPOSE_ROOT/backup.sh" ]; then "$COMPOSE_ROOT/backup.sh"; else "$ROOT/scripts/backup.sh"; fi

TMP=$ENV_FILE.tmp
awk -v version="$VERSION" 'BEGIN { found=0 } /^CHRONO_VERSION=/ { print "CHRONO_VERSION=" version; found=1; next } { print } END { if (!found) print "CHRONO_VERSION=" version }' "$ENV_FILE" > "$TMP"
chmod 600 "$TMP"
mv "$TMP" "$ENV_FILE"

docker compose pull app migrate
docker compose run --rm migrate
docker compose up -d --remove-orphans

ATTEMPTS=0
until [ "$(docker compose ps --status running --format json app | grep -c 'healthy' || true)" -gt 0 ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ "$ATTEMPTS" -lt 30 ] || { docker compose logs --tail=100 app; exit 1; }
  sleep 2
done
printf 'Chrono updated to %s and is healthy.\n' "$VERSION"

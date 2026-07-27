#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." 2>/dev/null && pwd || pwd)
if [ -f "$ROOT/compose.yaml" ]; then COMPOSE_ROOT=$ROOT; else COMPOSE_ROOT=$(pwd); fi
ENV_FILE=${CHRONO_ENV_FILE:-$COMPOSE_ROOT/.env}
[ -f "$ENV_FILE" ] || { printf 'Missing %s\n' "$ENV_FILE" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a

[ "${CHRONO_INSTALL_MODE:-source}" = "image" ] || {
  printf 'Automatic updates require an image installation. Run the documented one-time bootstrap first.\n' >&2
  exit 1
}

VERSION=""
if [ "$#" -gt 0 ]; then
  [ "$#" -eq 2 ] && [ "$1" = "--version" ] || { printf 'Usage: %s [--version vYY.M.N]\n' "$0" >&2; exit 1; }
  VERSION=$2
  printf '%s' "$VERSION" | grep -Eq '^v[0-9]{2}\.([1-9]|1[0-2])\.[1-9][0-9]*$' || { printf 'Invalid Chrono version: %s\n' "$VERSION" >&2; exit 1; }
fi

cd "$COMPOSE_ROOT"
docker compose up -d updater >/dev/null
if [ -n "$VERSION" ]; then
  JOB_ID=$(docker compose exec -T updater node /opt/chrono/scripts/updater.mjs enqueue "$VERSION")
else
  JOB_ID=$(docker compose exec -T updater node /opt/chrono/scripts/updater.mjs enqueue)
fi
printf 'Chrono update queued (%s). The updater will back up and verify the installation.\n' "$JOB_ID"

STATUS_DIR=${CHRONO_STATUS_DIR:-$COMPOSE_ROOT/data/status}
ATTEMPTS=0
while [ "$ATTEMPTS" -lt 900 ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ -f "$STATUS_DIR/update-status.json" ] && grep -q "\"id\":\"$JOB_ID\"" "$STATUS_DIR/update-status.json"; then
    if grep -q '"stage":"completed"' "$STATUS_DIR/update-status.json"; then
      printf 'Chrono update completed successfully.\n'
      exit 0
    fi
    if grep -q '"stage":"failed"' "$STATUS_DIR/update-status.json"; then
      printf 'Chrono update failed. Inspect %s/update.log and Docker logs.\n' "$STATUS_DIR" >&2
      exit 1
    fi
  fi
  sleep 2
done

printf 'Timed out waiting for the updater. Inspect %s/update.log and Docker logs.\n' "$STATUS_DIR" >&2
exit 1

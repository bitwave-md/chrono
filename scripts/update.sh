#!/bin/sh

set -eu

fail() { printf 'Chrono update: %s\n' "$*" >&2; exit 1; }
checksum() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi; }

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || pwd)
if [ -f "$SCRIPT_DIR/compose.yaml" ]; then
  COMPOSE_ROOT=$SCRIPT_DIR
elif [ -f "$SCRIPT_DIR/../compose.yaml" ]; then
  COMPOSE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
else
  COMPOSE_ROOT=$(pwd)
fi
ENV_FILE=${CHRONO_ENV_FILE:-$COMPOSE_ROOT/.env}
[ -f "$ENV_FILE" ] || fail "Missing $ENV_FILE."
set -a
. "$ENV_FILE"
set +a

[ "${CHRONO_INSTALL_MODE:-source}" = "image" ] || {
  fail "Automatic updates require an image installation. Run the documented one-time bootstrap first."
}

VERSION=""
if [ "$#" -gt 0 ]; then
  [ "$#" -eq 2 ] && [ "$1" = "--version" ] || { printf 'Usage: %s [--version vYY.M.N]\n' "$0" >&2; exit 1; }
  VERSION=$2
  printf '%s' "$VERSION" | grep -Eq '^v[0-9]{2}\.([1-9]|1[0-2])\.[1-9][0-9]*$' || { printf 'Invalid Chrono version: %s\n' "$VERSION" >&2; exit 1; }
fi

updater_healthy() {
  docker compose config --services 2>/dev/null | grep -qx updater || return 1
  docker compose up -d --no-deps updater >/dev/null 2>&1 || return 1
  attempts=0
  while [ "$attempts" -lt 15 ]; do
    attempts=$((attempts + 1))
    if docker compose exec -T updater node /opt/chrono/scripts/updater.mjs doctor >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

repair_updater() {
  command -v curl >/dev/null 2>&1 || fail "curl is required to repair the updater."
  temporary=$(mktemp -d)
  trap 'rm -rf "${temporary:-}"' EXIT INT TERM
  BASE=https://github.com/bitwave-md/chrono/releases/latest/download
  printf 'Updater service is missing or unhealthy; repairing the update control plane...\n'
  curl -fsSL "$BASE/bootstrap-update.sh" -o "$temporary/bootstrap-update.sh" || fail "Could not download the official repair helper."
  curl -fsSL "$BASE/checksums.sha256" -o "$temporary/checksums.sha256" || fail "Could not download release checksums."
  expected=$(awk '$2 == "bootstrap-update.sh" { print $1 }' "$temporary/checksums.sha256")
  [ -n "$expected" ] && [ "$(checksum "$temporary/bootstrap-update.sh")" = "$expected" ] || fail "Repair helper checksum verification failed."
  chmod 700 "$temporary/bootstrap-update.sh"
  CHRONO_BOOTSTRAP_REPAIR_ONLY=1 CHRONO_INSTALL_DIR="$COMPOSE_ROOT" "$temporary/bootstrap-update.sh"
  rm -rf "$temporary"
  trap - EXIT INT TERM
  set -a
  . "$ENV_FILE"
  set +a
}

cd "$COMPOSE_ROOT"
if ! updater_healthy; then
  repair_updater
  updater_healthy || fail "The updater remains unavailable after repair. Run 'docker compose logs updater' for details."
fi
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

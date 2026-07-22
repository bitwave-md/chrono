#!/bin/sh

set -eu

[ "$#" -eq 1 ] || { printf 'Usage: %s /path/to/chrono-backup\n' "$0" >&2; exit 1; }
[ "${CHRONO_RESTORE_CONFIRM:-}" = "restore" ] || { printf 'Set CHRONO_RESTORE_CONFIRM=restore to confirm this destructive operation.\n' >&2; exit 1; }
SOURCE=$1
case "$SOURCE" in
  /*) ;;
  *) SOURCE=$(CDPATH= cd -- "$(dirname -- "$SOURCE")" && pwd)/$(basename -- "$SOURCE") ;;
esac
[ -f "$SOURCE/postgres.dump" ] && [ -d "$SOURCE/objects" ] && [ -f "$SOURCE/checksums.sha256" ] || { printf 'Invalid backup directory.\n' >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$SOURCE" && sha256sum -c checksums.sha256)
else
  (cd "$SOURCE" && shasum -a 256 -c checksums.sha256)
fi

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." 2>/dev/null && pwd || pwd)
if [ -f "$ROOT/compose.yaml" ]; then COMPOSE_ROOT=$ROOT; else COMPOSE_ROOT=$(pwd); fi
ENV_FILE=${CHRONO_ENV_FILE:-$COMPOSE_ROOT/.env}
set -a
. "$ENV_FILE"
set +a
cd "$COMPOSE_ROOT"

docker compose stop app
if ! docker compose ps --status running --services | grep -qx db; then docker compose up -d db; fi
docker compose exec -T db pg_restore -U "${POSTGRES_USER:-chrono}" -d "${POSTGRES_DB:-chrono}" --clean --if-exists --no-owner --exit-on-error < "$SOURCE/postgres.dump"
docker compose run --rm --no-deps -v "$SOURCE:/restore:ro" --entrypoint /bin/sh storage-init -c '
  mc alias set restore "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" &&
  mc mirror --overwrite --remove /restore/objects "restore/$S3_BUCKET"
'
docker compose up -d
printf 'Restore completed from %s\n' "$SOURCE"

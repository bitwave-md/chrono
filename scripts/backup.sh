#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." 2>/dev/null && pwd || pwd)
if [ -f "$ROOT/compose.yaml" ]; then COMPOSE_ROOT=$ROOT; else COMPOSE_ROOT=$(pwd); fi
ENV_FILE=${CHRONO_ENV_FILE:-$COMPOSE_ROOT/.env}
[ -f "$ENV_FILE" ] || { printf 'Missing %s\n' "$ENV_FILE" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
COMPLETED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BACKUP_ROOT=${CHRONO_BACKUP_DIR:-$COMPOSE_ROOT/backups}
DEST=$BACKUP_ROOT/chrono-$STAMP
STATUS_DIR=${CHRONO_STATUS_DIR:-$COMPOSE_ROOT/data/status}
mkdir -p "$DEST/objects" "$STATUS_DIR"

cd "$COMPOSE_ROOT"
if ! docker compose ps --status running --services | grep -qx db; then docker compose up -d db; fi
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-chrono}" -d "${POSTGRES_DB:-chrono}" -Fc > "$DEST/postgres.dump"
docker compose run --rm --no-deps -v "$DEST:/backup" --entrypoint /bin/sh storage-init -c '
  mc alias set backup "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" &&
  mc mirror --overwrite "backup/$S3_BUCKET" /backup/objects
'

VERSION=${CHRONO_VERSION:-development}
cat > "$DEST/manifest.json" <<EOF
{"createdAt":"$STAMP","version":"$VERSION","database":"${POSTGRES_DB:-chrono}","bucket":"${S3_BUCKET:-chrono}"}
EOF
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$DEST" && find . -type f ! -name checksums.sha256 -print | sort | xargs sha256sum > checksums.sha256)
else
  (cd "$DEST" && find . -type f ! -name checksums.sha256 -print | sort | xargs shasum -a 256 > checksums.sha256)
fi
cat > "$STATUS_DIR/last-backup.json.tmp" <<EOF
{"completedAt":"$COMPLETED_AT","version":"$VERSION","path":"$DEST"}
EOF
mv "$STATUS_DIR/last-backup.json.tmp" "$STATUS_DIR/last-backup.json"
printf 'Backup completed: %s\n' "$DEST"

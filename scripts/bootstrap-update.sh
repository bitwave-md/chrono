#!/bin/sh

set -eu

fail() { printf 'Chrono bootstrap: %s\n' "$*" >&2; exit 1; }
checksum() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi; }
docker_socket_path() {
  if [ "$(uname -s)" = Linux ]; then
    endpoint=$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)
    case "$endpoint" in
      unix:///*) socket=${endpoint#unix://}; [ -S "$socket" ] && { printf '%s' "$socket"; return; } ;;
    esac
  fi
  printf '%s' /var/run/docker.sock
}
set_value() {
  key=$1 value=$2 file=$3 temporary=$3.tmp
  awk -v key="$key" -v value="$value" 'BEGIN { found=0 } index($0, key "=") == 1 { print key "=" value; found=1; next } { print } END { if (!found) print key "=" value }' "$file" > "$temporary"
  chmod 600 "$temporary" && mv "$temporary" "$file"
}

command -v curl >/dev/null 2>&1 || fail "curl is required."
command -v docker >/dev/null 2>&1 || fail "Docker is required."
docker compose version >/dev/null 2>&1 || fail "The Docker Compose plugin is required."
docker info >/dev/null 2>&1 || fail "The Docker daemon is not running."

INSTALL_DIR=${CHRONO_INSTALL_DIR:-"$HOME/chrono"}
[ -f "$INSTALL_DIR/.env" ] || fail "No Chrono installation was found at $INSTALL_DIR."
INSTALL_DIR=$(CDPATH= cd -- "$INSTALL_DIR" && pwd)
ENV_FILE=$INSTALL_DIR/.env
set -a; . "$ENV_FILE"; set +a

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM
BASE=https://github.com/bitwave-md/chrono/releases/latest/download
for asset in chrono-version.txt chrono-release.env chrono-appliance.tar.gz checksums.sha256; do curl -fsSL "$BASE/$asset" -o "$TMP_DIR/$asset" || fail "Could not download $asset from the latest official release."; done
for asset in chrono-version.txt chrono-release.env chrono-appliance.tar.gz; do
  expected=$(awk -v name="$asset" '$2 == name { print $1 }' "$TMP_DIR/checksums.sha256")
  [ -n "$expected" ] && [ "$(checksum "$TMP_DIR/$asset")" = "$expected" ] || fail "Checksum verification failed for $asset."
done

VERSION=$(cat "$TMP_DIR/chrono-version.txt")
printf '%s' "$VERSION" | grep -Eq '^v[0-9]{2}\.([1-9]|1[0-2])\.[1-9][0-9]*$' || fail "The release version is invalid."
APP_REF=$(sed -n 's/^CHRONO_APP_REF=//p' "$TMP_DIR/chrono-release.env")
MIGRATOR_REF=$(sed -n 's/^CHRONO_MIGRATOR_REF=//p' "$TMP_DIR/chrono-release.env")
UPDATER_REF=$(sed -n 's/^CHRONO_UPDATER_REF=//p' "$TMP_DIR/chrono-release.env")
printf '%s' "$APP_REF" | grep -Eq '^ghcr\.io/bitwave-md/chrono@sha256:[a-f0-9]{64}$' || fail "The application image reference is invalid."
printf '%s' "$MIGRATOR_REF" | grep -Eq '^ghcr\.io/bitwave-md/chrono-migrator@sha256:[a-f0-9]{64}$' || fail "The migrator image reference is invalid."
printf '%s' "$UPDATER_REF" | grep -Eq '^ghcr\.io/bitwave-md/chrono-updater@sha256:[a-f0-9]{64}$' || fail "The updater image reference is invalid."

mkdir -p "$TMP_DIR/appliance"
tar -xzf "$TMP_DIR/chrono-appliance.tar.gz" -C "$TMP_DIR/appliance"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
CONTROL_BACKUP=$INSTALL_DIR/backups/control-plane-$STAMP
mkdir -p "$CONTROL_BACKUP"
for managed in .env compose.yaml compose.external-storage.yaml backup.sh restore.sh update.sh; do
  [ ! -f "$INSTALL_DIR/$managed" ] || cp "$INSTALL_DIR/$managed" "$CONTROL_BACKUP/$managed"
done
chmod 700 "$CONTROL_BACKUP"
[ ! -f "$CONTROL_BACKUP/.env" ] || chmod 600 "$CONTROL_BACKUP/.env"

install_control_plane() {
  cp "$TMP_DIR/appliance/compose.yaml" "$INSTALL_DIR/compose.yaml"
  [ ! -f "$TMP_DIR/appliance/compose.external-storage.yaml" ] || cp "$TMP_DIR/appliance/compose.external-storage.yaml" "$INSTALL_DIR/compose.external-storage.yaml"
  for helper in backup.sh restore.sh update.sh; do cp "$TMP_DIR/appliance/scripts/$helper" "$INSTALL_DIR/$helper"; chmod 700 "$INSTALL_DIR/$helper"; done
}

mkdir -p "$INSTALL_DIR/data/status" "$INSTALL_DIR/data/update-requests"
chmod 755 "$INSTALL_DIR/data/status"
chmod 733 "$INSTALL_DIR/data/update-requests"
DOCKER_SOCKET=${CHRONO_DOCKER_SOCKET:-$(docker_socket_path)}
case "$DOCKER_SOCKET" in /*) ;; *) fail "CHRONO_DOCKER_SOCKET must be an absolute path." ;; esac

if [ "${CHRONO_BOOTSTRAP_REPAIR_ONLY:-0}" = "1" ]; then
  install_control_plane
  set_value CHRONO_UPDATER_REF "$UPDATER_REF" "$ENV_FILE"
  set_value CHRONO_UPDATER_IMAGE ghcr.io/bitwave-md/chrono-updater "$ENV_FILE"
  set_value CHRONO_INSTALL_MODE image "$ENV_FILE"
  set_value CHRONO_INSTALL_DIR "$INSTALL_DIR" "$ENV_FILE"
  set_value CHRONO_STATUS_DIR ./data/status "$ENV_FILE"
  set_value CHRONO_UPDATE_REQUEST_DIR ./data/update-requests "$ENV_FILE"
  set_value CHRONO_DOCKER_SOCKET "$DOCKER_SOCKET" "$ENV_FILE"
  export CHRONO_UPDATER_REF=$UPDATER_REF CHRONO_INSTALL_MODE=image CHRONO_INSTALL_DIR=$INSTALL_DIR CHRONO_STATUS_DIR=./data/status CHRONO_UPDATE_REQUEST_DIR=./data/update-requests CHRONO_DOCKER_SOCKET=$DOCKER_SOCKET
  cd "$INSTALL_DIR"
  docker pull "$UPDATER_REF"
  docker compose up -d --no-deps updater
  ATTEMPTS=0
  until docker compose exec -T updater node /opt/chrono/scripts/updater.mjs doctor >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    [ "$ATTEMPTS" -lt 30 ] || fail "The repaired updater did not become healthy. Inspect 'docker compose logs updater'."
    sleep 2
  done
  printf 'Chrono updater repaired. Managed-file backup: %s\n' "$CONTROL_BACKUP"
  exit 0
fi

printf 'Creating a pre-bootstrap backup...\n'
if [ -x "$INSTALL_DIR/backup.sh" ]; then (cd "$INSTALL_DIR" && ./backup.sh); else fail "The existing backup helper is missing."; fi
install_control_plane
export CHRONO_VERSION=$VERSION CHRONO_APP_REF=$APP_REF CHRONO_MIGRATOR_REF=$MIGRATOR_REF CHRONO_UPDATER_REF=$UPDATER_REF CHRONO_INSTALL_MODE=image CHRONO_INSTALL_DIR=$INSTALL_DIR CHRONO_PULL_POLICY=always CHRONO_DOCKER_SOCKET=$DOCKER_SOCKET
cd "$INSTALL_DIR"
# Pull immutable references directly. Compose's `missing` policy can treat a
# different local tag from the same repository as cached and skip the digest.
docker pull "$APP_REF"
docker pull "$MIGRATOR_REF"
docker pull "$UPDATER_REF"
docker compose run --rm --no-deps migrate

set_value CHRONO_VERSION "$VERSION" "$ENV_FILE"
set_value CHRONO_APP_REF "$APP_REF" "$ENV_FILE"
set_value CHRONO_MIGRATOR_REF "$MIGRATOR_REF" "$ENV_FILE"
set_value CHRONO_UPDATER_REF "$UPDATER_REF" "$ENV_FILE"
set_value CHRONO_UPDATER_IMAGE ghcr.io/bitwave-md/chrono-updater "$ENV_FILE"
set_value CHRONO_INSTALL_MODE image "$ENV_FILE"
set_value CHRONO_PULL_POLICY always "$ENV_FILE"
set_value CHRONO_INSTALL_DIR "$INSTALL_DIR" "$ENV_FILE"
set_value CHRONO_STATUS_DIR ./data/status "$ENV_FILE"
set_value CHRONO_UPDATE_REQUEST_DIR ./data/update-requests "$ENV_FILE"
set_value CHRONO_DOCKER_SOCKET "$DOCKER_SOCKET" "$ENV_FILE"
docker compose up -d

ATTEMPTS=0
until curl -fsS "http://127.0.0.1:${CHRONO_PORT:-3000}/api/health" >/dev/null 2>&1; do ATTEMPTS=$((ATTEMPTS + 1)); [ "$ATTEMPTS" -lt 60 ] || fail "The application did not become healthy. Inspect Docker logs and the backup before restoring."; sleep 2; done
docker compose exec -T updater node /opt/chrono/scripts/updater.mjs doctor >/dev/null 2>&1 || fail "Chrono is healthy, but the updater cannot reach Docker. Inspect 'docker compose logs updater'."
printf 'Chrono bootstrapped to %s. Future official releases can be installed from Settings.\n' "$VERSION"

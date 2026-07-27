#!/bin/sh

set -eu

fail() { printf 'Chrono bootstrap: %s\n' "$*" >&2; exit 1; }
checksum() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi; }
set_value() {
  key=$1 value=$2 file=$3 temporary=$3.tmp
  awk -v key="$key" -v value="$value" 'BEGIN { found=0 } index($0, key "=") == 1 { print key "=" value; found=1; next } { print } END { if (!found) print key "=" value }' "$file" > "$temporary"
  chmod 600 "$temporary" && mv "$temporary" "$file"
}
add_profile() {
  current=$1 wanted=$2
  case ",$current," in *",$wanted,"*) printf '%s' "$current";; *) if [ -n "$current" ]; then printf '%s,%s' "$current" "$wanted"; else printf '%s' "$wanted"; fi;; esac
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

printf 'Creating a pre-bootstrap backup...\n'
if [ -x "$INSTALL_DIR/backup.sh" ]; then (cd "$INSTALL_DIR" && ./backup.sh); else fail "The existing backup helper is missing."; fi
mkdir -p "$TMP_DIR/appliance"
tar -xzf "$TMP_DIR/chrono-appliance.tar.gz" -C "$TMP_DIR/appliance"
cp "$TMP_DIR/appliance/compose.yaml" "$INSTALL_DIR/compose.yaml"
[ ! -f "$TMP_DIR/appliance/compose.external-storage.yaml" ] || cp "$TMP_DIR/appliance/compose.external-storage.yaml" "$INSTALL_DIR/compose.external-storage.yaml"
for helper in backup.sh restore.sh update.sh; do cp "$TMP_DIR/appliance/scripts/$helper" "$INSTALL_DIR/$helper"; chmod 700 "$INSTALL_DIR/$helper"; done

mkdir -p "$INSTALL_DIR/data/status" "$INSTALL_DIR/data/update-requests"
chmod 733 "$INSTALL_DIR/data/update-requests"
PROFILES=$(add_profile "${COMPOSE_PROFILES:-}" updates)
export CHRONO_VERSION=$VERSION CHRONO_APP_REF=$APP_REF CHRONO_MIGRATOR_REF=$MIGRATOR_REF CHRONO_UPDATER_REF=$UPDATER_REF CHRONO_INSTALL_DIR=$INSTALL_DIR COMPOSE_PROFILES=$PROFILES
cd "$INSTALL_DIR"
docker compose pull app migrate updater
docker compose run --rm --no-deps migrate

set_value CHRONO_VERSION "$VERSION" "$ENV_FILE"
set_value CHRONO_APP_REF "$APP_REF" "$ENV_FILE"
set_value CHRONO_MIGRATOR_REF "$MIGRATOR_REF" "$ENV_FILE"
set_value CHRONO_UPDATER_REF "$UPDATER_REF" "$ENV_FILE"
set_value CHRONO_UPDATER_IMAGE ghcr.io/bitwave-md/chrono-updater "$ENV_FILE"
set_value CHRONO_INSTALL_MODE image "$ENV_FILE"
set_value CHRONO_INSTALL_DIR "$INSTALL_DIR" "$ENV_FILE"
set_value CHRONO_UPDATE_REQUEST_DIR ./data/update-requests "$ENV_FILE"
set_value COMPOSE_PROFILES "$PROFILES" "$ENV_FILE"
docker compose up -d --remove-orphans

ATTEMPTS=0
until curl -fsS "http://127.0.0.1:${CHRONO_PORT:-3000}/api/health" >/dev/null 2>&1; do ATTEMPTS=$((ATTEMPTS + 1)); [ "$ATTEMPTS" -lt 60 ] || fail "The application did not become healthy. Inspect Docker logs and the backup before restoring."; sleep 2; done
printf 'Chrono bootstrapped to %s. Future official releases can be installed from Settings.\n' "$VERSION"

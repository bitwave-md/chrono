#!/bin/sh

set -eu

say() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Chrono installer: %s\n' "$*" >&2
  exit 1
}

prompt() {
  label=$1
  default=$2
  if [ "${CHRONO_NONINTERACTIVE:-0}" = "1" ]; then
    printf '%s' "$default"
    return
  fi
  printf '%s [%s]: ' "$label" "$default" >/dev/tty
  IFS= read -r answer </dev/tty || answer=""
  printf '%s' "${answer:-$default}"
}

random_hex() {
  od -An -N "$1" -tx1 /dev/urandom | tr -d ' \n'
}

slugify() {
  printf '%s' "$1" |
    tr '[:upper:]' '[:lower:]' |
    sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-//; s/-$//'
}

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi
}

docker_socket_path() {
  if [ "$(uname -s)" = Linux ]; then
    endpoint=$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)
    case "$endpoint" in
      unix:///*) socket=${endpoint#unix://}; [ -S "$socket" ] && { printf '%s' "$socket"; return; } ;;
    esac
  fi
  printf '%s' /var/run/docker.sock
}

command -v docker >/dev/null 2>&1 || fail "Docker is required. Install Docker Engine or Docker Desktop first."
docker compose version >/dev/null 2>&1 || fail "The Docker Compose plugin is required."

if [ "${CHRONO_SKIP_DOCKER_CHECK:-0}" != "1" ]; then
  docker info >/dev/null 2>&1 || fail "The Docker daemon is not running."
fi

INSTALL_DIR=${CHRONO_INSTALL_DIR:-"$HOME/chrono"}
SOURCE_REF=${CHRONO_SOURCE_REF:-main}
VERSION=${CHRONO_VERSION:-}
PUBLIC_URL=${NEXTAUTH_URL:-$(prompt "Public Chrono URL" "http://localhost:3000")}
WORKSPACE_NAME=${AUTH_SETUP_WORKSPACE_NAME:-$(prompt "Workspace name" "Chrono Workspace")}
WORKSPACE_SLUG=${AUTH_SETUP_WORKSPACE_SLUG:-$(slugify "$WORKSPACE_NAME")}

[ -n "$WORKSPACE_SLUG" ] || fail "The workspace name must produce a valid slug."

COMPOSE_PROFILES_VALUE=${COMPOSE_PROFILES:-}
CHRONO_DOMAIN_VALUE=${CHRONO_DOMAIN:-}
CHRONO_BIND_ADDRESS_VALUE=${CHRONO_BIND_ADDRESS:-127.0.0.1}
case "$PUBLIC_URL" in
  https://*)
    COMPOSE_PROFILES_VALUE=https
    CHRONO_DOMAIN_VALUE=${PUBLIC_URL#https://}
    CHRONO_DOMAIN_VALUE=${CHRONO_DOMAIN_VALUE%%/*}
    ;;
  http://localhost*|http://127.0.0.1*) ;;
  http://*) CHRONO_BIND_ADDRESS_VALUE=0.0.0.0 ;;
esac

POSTGRES_PASSWORD_VALUE=${POSTGRES_PASSWORD:-$(random_hex 24)}
NEXTAUTH_SECRET_VALUE=${NEXTAUTH_SECRET:-$(random_hex 32)}
SETUP_TOKEN_VALUE=${AUTH_SETUP_TOKEN:-$(random_hex 32)}
MINIO_ROOT_PASSWORD_VALUE=${MINIO_ROOT_PASSWORD:-$(random_hex 24)}
S3_SECRET_KEY_VALUE=${S3_SECRET_KEY:-$(random_hex 24)}
DOCKER_SOCKET_VALUE=${CHRONO_DOCKER_SOCKET:-$(docker_socket_path)}
case "$DOCKER_SOCKET_VALUE" in /*) ;; *) fail "CHRONO_DOCKER_SOCKET must be an absolute path." ;; esac

umask 077
mkdir -p "$INSTALL_DIR"
INSTALL_DIR=$(CDPATH= cd -- "$INSTALL_DIR" && pwd)
mkdir -p "$INSTALL_DIR/data/status" "$INSTALL_DIR/data/update-requests"
chmod 755 "$INSTALL_DIR/data/status"
chmod 733 "$INSTALL_DIR/data/update-requests"

if [ -e "$INSTALL_DIR/.env" ] && [ "${CHRONO_FORCE:-0}" != "1" ]; then
  fail "$INSTALL_DIR/.env already exists. Set CHRONO_FORCE=1 only when intentionally replacing this installation configuration."
fi

if [ -n "${CHRONO_COMPOSE_SOURCE:-}" ]; then
  cp "$CHRONO_COMPOSE_SOURCE" "$INSTALL_DIR/compose.yaml"
else
  command -v curl >/dev/null 2>&1 || fail "curl is required to download compose.yaml."
  curl -fsSL "https://raw.githubusercontent.com/bitwave-md/chrono/$SOURCE_REF/compose.yaml" -o "$INSTALL_DIR/compose.yaml"
fi

install_helper() {
  name=$1
  if [ -n "${CHRONO_COMPOSE_SOURCE:-}" ]; then
    cp "$(dirname "$CHRONO_COMPOSE_SOURCE")/scripts/$name" "$INSTALL_DIR/$name"
  else
    curl -fsSL "https://raw.githubusercontent.com/bitwave-md/chrono/$SOURCE_REF/scripts/$name" -o "$INSTALL_DIR/$name"
  fi
  chmod 700 "$INSTALL_DIR/$name"
}

install_helper backup.sh
install_helper restore.sh
install_helper update.sh

APP_REF_VALUE=""
MIGRATOR_REF_VALUE=""
UPDATER_REF_VALUE=""
RELEASE_AVAILABLE=0
if [ -z "${CHRONO_COMPOSE_SOURCE:-}" ]; then
  RELEASE_URL=https://github.com/bitwave-md/chrono/releases
  if [ -z "$VERSION" ]; then
    VERSION=$(curl -fsSL "$RELEASE_URL/latest/download/chrono-version.txt" 2>/dev/null || true)
  fi
  if printf '%s' "$VERSION" | grep -Eq '^v[0-9]{2}\.([1-9]|1[0-2])\.[1-9][0-9]*$'; then
    RELEASE_FILES=$(mktemp -d)
    RELEASE_BASE=$RELEASE_URL/download/$VERSION
    if curl -fsSL "$RELEASE_BASE/chrono-release.env" -o "$RELEASE_FILES/chrono-release.env" \
      && curl -fsSL "$RELEASE_BASE/chrono-appliance.tar.gz" -o "$RELEASE_FILES/chrono-appliance.tar.gz" \
      && curl -fsSL "$RELEASE_BASE/checksums.sha256" -o "$RELEASE_FILES/checksums.sha256"; then
      ENV_EXPECTED=$(awk '$2 == "chrono-release.env" { print $1 }' "$RELEASE_FILES/checksums.sha256")
      APPLIANCE_EXPECTED=$(awk '$2 == "chrono-appliance.tar.gz" { print $1 }' "$RELEASE_FILES/checksums.sha256")
      if [ -n "$ENV_EXPECTED" ] && [ -n "$APPLIANCE_EXPECTED" ] \
        && [ "$(checksum "$RELEASE_FILES/chrono-release.env")" = "$ENV_EXPECTED" ] \
        && [ "$(checksum "$RELEASE_FILES/chrono-appliance.tar.gz")" = "$APPLIANCE_EXPECTED" ]; then
        APP_REF_VALUE=$(sed -n 's/^CHRONO_APP_REF=//p' "$RELEASE_FILES/chrono-release.env")
        MIGRATOR_REF_VALUE=$(sed -n 's/^CHRONO_MIGRATOR_REF=//p' "$RELEASE_FILES/chrono-release.env")
        UPDATER_REF_VALUE=$(sed -n 's/^CHRONO_UPDATER_REF=//p' "$RELEASE_FILES/chrono-release.env")
        ENV_VERSION=$(sed -n 's/^CHRONO_VERSION=//p' "$RELEASE_FILES/chrono-release.env")
        if [ "$ENV_VERSION" = "$VERSION" ] && ! printf '%s\n%s\n%s\n' "$APP_REF_VALUE" "$MIGRATOR_REF_VALUE" "$UPDATER_REF_VALUE" | grep -Eqv '^ghcr\.io/bitwave-md/chrono(|-migrator|-updater)@sha256:[a-f0-9]{64}$'; then
          command -v tar >/dev/null 2>&1 || fail "tar is required to install the release appliance."
          tar -xzf "$RELEASE_FILES/chrono-appliance.tar.gz" -C "$RELEASE_FILES"
          cp "$RELEASE_FILES/compose.yaml" "$INSTALL_DIR/compose.yaml"
          [ ! -f "$RELEASE_FILES/compose.external-storage.yaml" ] || cp "$RELEASE_FILES/compose.external-storage.yaml" "$INSTALL_DIR/compose.external-storage.yaml"
          for helper in backup.sh restore.sh update.sh; do cp "$RELEASE_FILES/scripts/$helper" "$INSTALL_DIR/$helper"; chmod 700 "$INSTALL_DIR/$helper"; done
          RELEASE_AVAILABLE=1
        fi
      fi
    fi
    rm -rf "$RELEASE_FILES"
  fi
fi
[ -n "$VERSION" ] || VERSION=latest

write_environment() {
  pull_policy=$1
  install_mode=$2
  cat >"$INSTALL_DIR/.env" <<EOF
CHRONO_VERSION=$VERSION
CHRONO_APP_IMAGE=ghcr.io/bitwave-md/chrono
CHRONO_MIGRATOR_IMAGE=ghcr.io/bitwave-md/chrono-migrator
CHRONO_UPDATER_IMAGE=ghcr.io/bitwave-md/chrono-updater
CHRONO_APP_REF=$APP_REF_VALUE
CHRONO_MIGRATOR_REF=$MIGRATOR_REF_VALUE
CHRONO_UPDATER_REF=$UPDATER_REF_VALUE
CHRONO_PULL_POLICY=$pull_policy
CHRONO_BUILD_CONTEXT=./source
CHRONO_INSTALL_MODE=$install_mode
CHRONO_INSTALL_DIR=$INSTALL_DIR
CHRONO_RELEASE_REPOSITORY=bitwave-md/chrono
CHRONO_GITHUB_TOKEN=${CHRONO_GITHUB_TOKEN:-}
CHRONO_STATUS_DIR=./data/status
CHRONO_UPDATE_REQUEST_DIR=./data/update-requests
CHRONO_DOCKER_SOCKET=$DOCKER_SOCKET_VALUE
CHRONO_BIND_ADDRESS=$CHRONO_BIND_ADDRESS_VALUE
CHRONO_PORT=3000
COMPOSE_PROFILES=$COMPOSE_PROFILES_VALUE
CHRONO_DOMAIN=$CHRONO_DOMAIN_VALUE
MINIO_ROOT_USER=chrono-root
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD_VALUE
S3_ENDPOINT=http://storage:9000
S3_REGION=us-east-1
S3_BUCKET=chrono
S3_ACCESS_KEY=chrono-app
S3_SECRET_KEY=$S3_SECRET_KEY_VALUE
S3_FORCE_PATH_STYLE=true
STORAGE_WORKSPACE_QUOTA_GB=10
STORAGE_PERSONAL_QUOTA_MB=100
POSTGRES_DB=chrono
POSTGRES_USER=chrono
POSTGRES_PASSWORD=$POSTGRES_PASSWORD_VALUE
NEXTAUTH_URL=$PUBLIC_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET_VALUE
AUTH_SETUP_TOKEN=$SETUP_TOKEN_VALUE
AUTH_SETUP_WORKSPACE_NAME=$WORKSPACE_NAME
AUTH_SETUP_WORKSPACE_SLUG=$WORKSPACE_SLUG
EOF
  chmod 600 "$INSTALL_DIR/.env"
}

write_environment always image

if [ "${CHRONO_SKIP_START:-0}" != "1" ]; then
  if [ "$RELEASE_AVAILABLE" = "1" ] && (cd "$INSTALL_DIR" && docker compose pull); then
    (cd "$INSTALL_DIR" && docker compose up -d)
  else
    say "Prebuilt images are unavailable; falling back to a Docker source build."
    command -v tar >/dev/null 2>&1 || fail "tar is required for the source-build fallback."
    rm -rf "$INSTALL_DIR/source"
    mkdir -p "$INSTALL_DIR/source"
    curl -fsSL "https://github.com/bitwave-md/chrono/archive/$SOURCE_REF.tar.gz" |
      tar -xz --strip-components=1 -C "$INSTALL_DIR/source"
    cp "$INSTALL_DIR/source/compose.build.yaml" "$INSTALL_DIR/compose.build.yaml"
    APP_REF_VALUE=""
    MIGRATOR_REF_VALUE=""
    UPDATER_REF_VALUE=""
    write_environment never source
    (cd "$INSTALL_DIR" && docker compose -f compose.yaml -f compose.build.yaml up --build -d)
  fi
fi

say ""
say "Chrono is installed in $INSTALL_DIR"
say "URL: $PUBLIC_URL"
say "Initial setup URL: $PUBLIC_URL/auth/setup"
say "Installer setup code: $SETUP_TOKEN_VALUE"
say ""
say "Keep the setup code and $INSTALL_DIR/.env private. It can recover the initial Workspace owner."
say "Run 'cd $INSTALL_DIR && docker compose ps' to inspect the stack."

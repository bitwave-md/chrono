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

command -v docker >/dev/null 2>&1 || fail "Docker is required. Install Docker Engine or Docker Desktop first."
docker compose version >/dev/null 2>&1 || fail "The Docker Compose plugin is required."

if [ "${CHRONO_SKIP_DOCKER_CHECK:-0}" != "1" ]; then
  docker info >/dev/null 2>&1 || fail "The Docker daemon is not running."
fi

INSTALL_DIR=${CHRONO_INSTALL_DIR:-"$HOME/chrono"}
SOURCE_REF=${CHRONO_SOURCE_REF:-main}
VERSION=${CHRONO_VERSION:-latest}
PUBLIC_URL=${NEXTAUTH_URL:-$(prompt "Public Chrono URL" "http://localhost:3000")}
OWNER_EMAIL=${AUTH_BOOTSTRAP_EMAIL:-$(prompt "Bootstrap owner email" "owner@example.com")}
WORKSPACE_NAME=${AUTH_BOOTSTRAP_WORKSPACE_NAME:-$(prompt "Workspace name" "Chrono Workspace")}
WORKSPACE_SLUG=${AUTH_BOOTSTRAP_WORKSPACE_SLUG:-$(slugify "$WORKSPACE_NAME")}
SMTP_URL=${EMAIL_SERVER:-$(prompt "SMTP URL (optional)" "")}

case "$OWNER_EMAIL" in
  *@*.*) ;;
  *) fail "AUTH_BOOTSTRAP_EMAIL must be a valid email address." ;;
esac

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
BOOTSTRAP_TOKEN_VALUE=${AUTH_BOOTSTRAP_TOKEN:-$(random_hex 24)}
MINIO_ROOT_PASSWORD_VALUE=${MINIO_ROOT_PASSWORD:-$(random_hex 24)}
S3_SECRET_KEY_VALUE=${S3_SECRET_KEY:-$(random_hex 24)}

umask 077
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/data/status"

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

write_environment() {
  pull_policy=$1
  install_mode=$2
  cat >"$INSTALL_DIR/.env" <<EOF
CHRONO_VERSION=$VERSION
CHRONO_APP_IMAGE=ghcr.io/bitwave-md/chrono
CHRONO_MIGRATOR_IMAGE=ghcr.io/bitwave-md/chrono-migrator
CHRONO_PULL_POLICY=$pull_policy
CHRONO_BUILD_CONTEXT=./source
CHRONO_INSTALL_MODE=$install_mode
CHRONO_RELEASE_REPOSITORY=bitwave-md/chrono
CHRONO_STATUS_DIR=./data/status
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
EMAIL_SERVER=$SMTP_URL
EMAIL_FROM="Chrono <chrono@localhost>"
AUTH_BOOTSTRAP_EMAIL=$OWNER_EMAIL
AUTH_BOOTSTRAP_TOKEN=$BOOTSTRAP_TOKEN_VALUE
AUTH_BOOTSTRAP_WORKSPACE_NAME=$WORKSPACE_NAME
AUTH_BOOTSTRAP_WORKSPACE_SLUG=$WORKSPACE_SLUG
EOF
  chmod 600 "$INSTALL_DIR/.env"
}

write_environment always image

if [ "${CHRONO_SKIP_START:-0}" != "1" ]; then
  if (cd "$INSTALL_DIR" && docker compose pull); then
    (cd "$INSTALL_DIR" && docker compose up -d)
  else
    say "Prebuilt images are unavailable; falling back to a Docker source build."
    command -v tar >/dev/null 2>&1 || fail "tar is required for the source-build fallback."
    rm -rf "$INSTALL_DIR/source"
    mkdir -p "$INSTALL_DIR/source"
    curl -fsSL "https://github.com/bitwave-md/chrono/archive/$SOURCE_REF.tar.gz" |
      tar -xz --strip-components=1 -C "$INSTALL_DIR/source"
    cp "$INSTALL_DIR/source/compose.build.yaml" "$INSTALL_DIR/compose.build.yaml"
    write_environment never source
    (cd "$INSTALL_DIR" && docker compose -f compose.yaml -f compose.build.yaml up --build -d)
  fi
fi

say ""
say "Chrono is installed in $INSTALL_DIR"
say "URL: $PUBLIC_URL"
say "Owner email: $OWNER_EMAIL"
say "Owner setup key: $BOOTSTRAP_TOKEN_VALUE"
say ""
say "Keep the setup key and $INSTALL_DIR/.env private."
say "Run 'cd $INSTALL_DIR && docker compose ps' to inspect the stack."

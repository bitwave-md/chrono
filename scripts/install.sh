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

umask 077
mkdir -p "$INSTALL_DIR"

if [ -e "$INSTALL_DIR/.env" ] && [ "${CHRONO_FORCE:-0}" != "1" ]; then
  fail "$INSTALL_DIR/.env already exists. Set CHRONO_FORCE=1 only when intentionally replacing this installation configuration."
fi

if [ -n "${CHRONO_COMPOSE_SOURCE:-}" ]; then
  cp "$CHRONO_COMPOSE_SOURCE" "$INSTALL_DIR/compose.yaml"
else
  command -v curl >/dev/null 2>&1 || fail "curl is required to download compose.yaml."
  curl -fsSL "https://raw.githubusercontent.com/bitwave-md/chrono/$SOURCE_REF/compose.yaml" -o "$INSTALL_DIR/compose.yaml"
fi

cat >"$INSTALL_DIR/.env" <<EOF
CHRONO_VERSION=$VERSION
CHRONO_APP_IMAGE=ghcr.io/bitwave-md/chrono
CHRONO_MIGRATOR_IMAGE=ghcr.io/bitwave-md/chrono-migrator
CHRONO_PULL_POLICY=always
CHRONO_BIND_ADDRESS=$CHRONO_BIND_ADDRESS_VALUE
CHRONO_PORT=3000
COMPOSE_PROFILES=$COMPOSE_PROFILES_VALUE
CHRONO_DOMAIN=$CHRONO_DOMAIN_VALUE
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

if [ "${CHRONO_SKIP_START:-0}" != "1" ]; then
  (cd "$INSTALL_DIR" && docker compose pull && docker compose up -d)
fi

say ""
say "Chrono is installed in $INSTALL_DIR"
say "URL: $PUBLIC_URL"
say "Owner email: $OWNER_EMAIL"
say "Owner setup key: $BOOTSTRAP_TOKEN_VALUE"
say ""
say "Keep the setup key and $INSTALL_DIR/.env private."
say "Run 'cd $INSTALL_DIR && docker compose ps' to inspect the stack."

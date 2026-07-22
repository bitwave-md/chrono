# Self-Hosted Operations

## Deployment model

The supported production package is one Compose project containing:

- `app`: the versioned standalone Next.js image.
- `migrate`: the matching one-shot Drizzle migration image.
- `db`: PostgreSQL 17 with a persistent named volume.
- `caddy`: optional automatic HTTPS under the `https` profile.

The host needs Docker and the Compose plugin only. PostgreSQL is not published
to the host. The app waits for a healthy database and a successful migration
job before starting.

## Guided and unattended installation

Interactive installation:

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh | sh
```

For unattended installation, provide the required identity and URL values:

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh |
  CHRONO_NONINTERACTIVE=1 \
  NEXTAUTH_URL=https://chrono.example.com \
  AUTH_BOOTSTRAP_EMAIL=owner@example.com \
  AUTH_BOOTSTRAP_WORKSPACE_NAME=Example \
  sh
```

Optional installer variables include `CHRONO_INSTALL_DIR`, `CHRONO_VERSION`,
`AUTH_BOOTSTRAP_WORKSPACE_SLUG`, `EMAIL_SERVER`, and pre-generated
`POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, or `AUTH_BOOTSTRAP_TOKEN` values.

The installer refuses to overwrite an existing `.env`. `CHRONO_FORCE=1` is for
intentional configuration replacement, not upgrades.

The installer first pulls matching GHCR images. If the package is not public or
the selected tag is unavailable, it downloads the selected source archive and
builds the same runner and migrator targets inside Docker. Source-mode installs
record `CHRONO_INSTALL_MODE=source` and retain `compose.build.yaml` plus the
source directory; they still require no host Node.js or PostgreSQL.

## Authentication and SMTP

The installer creates an owner setup key. It authenticates only the configured
`AUTH_BOOTSTRAP_EMAIL` and should be stored like a password. SMTP is optional;
when `EMAIL_SERVER` is present, approved users may also request magic links.

Changing `NEXTAUTH_SECRET` invalidates all signed sessions. Removing
`AUTH_BOOTSTRAP_TOKEN` disables setup-key sign-in; configure and verify SMTP
first if it is the only other login method.

## HTTPS and reverse proxies

An `https://` installer URL writes `COMPOSE_PROFILES=https` and starts Caddy.
DNS must resolve to the host and inbound TCP 80/443 plus UDP 443 should be
allowed. Certificate state persists in `chrono_caddy_data`.

For an existing reverse proxy, leave the profile empty, set the exact external
`NEXTAUTH_URL`, and proxy to `${CHRONO_BIND_ADDRESS}:${CHRONO_PORT}`. Preserve
the original `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` headers.

## Status and logs

```sh
cd ~/chrono
docker compose ps
docker compose logs --tail=200 app migrate db
curl --fail http://127.0.0.1:3000/api/health
```

PostgreSQL uses `pg_isready`; the app exposes `/api/health`; the migrator must
exit with status zero. If Docker reports a missing daemon socket, start Docker
Desktop or `colima start`, then verify with `docker info`.

## Backup and restore

Create a custom-format backup outside the volume:

```sh
docker compose exec -T db pg_dump -U chrono -d chrono -Fc > chrono.dump
```

Test restoration into an isolated database:

```sh
docker compose exec -T db createdb -U chrono chrono_restore_test
docker compose exec -T db pg_restore -U chrono -d chrono_restore_test --exit-on-error < chrono.dump
```

Keep encrypted, off-host backups with retention. A named volume protects
against container replacement, not disk loss, deletion, or database corruption.

## Upgrade and rollback

1. Back up and verify the backup file.
2. Change `CHRONO_VERSION` to a published release; avoid floating `latest` when
   deterministic rollbacks matter.
3. Run `docker compose pull` and `docker compose up -d`.
4. Confirm the migration job exited successfully and the app is healthy.

To move a source-fallback installation onto published images, set
`CHRONO_INSTALL_MODE=image`, `CHRONO_PULL_POLICY=always`, and the desired
`CHRONO_VERSION` in `.env`, then use the standard pull and startup commands
without `compose.build.yaml`. Until images are available, replace the retained
`source` directory with the desired release archive and run:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d
```

Application rollback uses the previous matching image tag. Database rollback
is not automatic: restore the pre-upgrade backup if a migration is not backward
compatible. Never mix app and migrator versions.

## Local development stack

```sh
docker compose -f compose.yaml -f compose.build.yaml -f compose.dev.yaml up --build -d
```

The override builds repository Dockerfile targets, publishes PostgreSQL on
`127.0.0.1:5432`, and adds Mailpit on ports 1025 and 8025. It must not be used
as the public production mail service.

After the owner has signed in, demo data can be added idempotently with:

```sh
npm run db:seed:demo
```

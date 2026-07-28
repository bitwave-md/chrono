# Self-Hosted Operations

## Deployment model

The supported production package is one Compose project containing:

- `app`: the versioned standalone Next.js image.
- `migrate`: the matching one-shot Drizzle migration image.
- `db`: PostgreSQL 17 with a persistent named volume.
- `storage`: pinned MinIO with a persistent named volume and no production port.
- `storage-init`: one-shot private bucket, application user, and policy setup.
- `updater`: isolated official-release installer under the `updates` profile.
- `caddy`: optional automatic HTTPS under the `https` profile.

The host needs Docker and the Compose plugin only. PostgreSQL and MinIO are not
published to the host. The app waits for healthy persistence plus successful
migration and bucket initialization jobs. The app never mounts the Docker
socket; only the updater does, and it accepts structured official-release jobs
through a shared request directory rather than arbitrary commands.

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
  AUTH_SETUP_WORKSPACE_NAME=Example \
  sh
```

Optional installer variables include `CHRONO_INSTALL_DIR`, `CHRONO_VERSION`,
`AUTH_SETUP_WORKSPACE_SLUG`, and pre-generated `POSTGRES_PASSWORD`,
`NEXTAUTH_SECRET`, or `AUTH_SETUP_TOKEN` values.

The installer refuses to overwrite an existing `.env`. `CHRONO_FORCE=1` is for
intentional configuration replacement, not upgrades.

The installer resolves the latest published stable `vYY.M.N` release, verifies
its manifest, and pins exact GHCR image digests. If no release is available, it
downloads the selected source archive and
builds the same runner and migrator targets inside Docker. Source-mode installs
record `CHRONO_INSTALL_MODE=source` and retain `compose.build.yaml` plus the
source directory; they still require no host Node.js or PostgreSQL.

## Authentication and bearer links

The installer creates an `AUTH_SETUP_TOKEN`. Open `/auth/setup` after the first
start to choose the initial owner email and password. The email is not verified
and is used only as a login identifier. Invitations and administrator password
resets are one-time bearer URLs shown once for copy/paste; transfer them only
through a trusted channel. Changing a password increments its credential
version and invalidates existing sessions.

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
docker compose logs --tail=200 app migrate db storage storage-init
curl --fail http://127.0.0.1:3000/api/health
```

PostgreSQL uses `pg_isready`; the app exposes `/api/health`; the migrator must
exit with status zero. If Docker reports a missing daemon socket, start Docker
Desktop or `colima start`, then verify with `docker info`.

## Backup and restore

Create a coordinated database and object backup:

```sh
cd ~/chrono
./backup.sh
```

The helper writes `postgres.dump`, `objects/`, `manifest.json`, and
`checksums.sha256` under `~/chrono/backups`. Copy it off-host and encrypt it.
To restore after verifying checksums:

```sh
CHRONO_RESTORE_CONFIRM=restore ./restore.sh ~/chrono/backups/chrono-<timestamp>
```

Never mix the database from one backup with objects from another. Named volumes
protect only against container replacement.

## One-time updater bootstrap

Installations created before `v26.7.1` have no updater service in their copied
Compose file. Perform this transition once on the Docker host:

```sh
cd /tmp
curl -fsSLO https://github.com/bitwave-md/chrono/releases/latest/download/bootstrap-update.sh
curl -fsSLO https://github.com/bitwave-md/chrono/releases/latest/download/checksums.sha256
EXPECTED=$(awk '$2 == "bootstrap-update.sh" { print $1 }' checksums.sha256)
ACTUAL=$(sha256sum bootstrap-update.sh 2>/dev/null | awk '{print $1}' || shasum -a 256 bootstrap-update.sh | awk '{print $1}')
test "$EXPECTED" = "$ACTUAL" && CHRONO_INSTALL_DIR="$HOME/chrono" ./bootstrap-update.sh
```

The helper creates a full backup before replacing managed Compose/helper files.
It preserves `.env`, named volumes, `COMPOSE_FILE`, Caddy or Cloudflare Tunnel
configuration, external-storage settings, and secrets. It pins the latest
digest manifest, enables the `updates` profile, and records the Docker socket
group ID required by the isolated updater. Operators with a nonstandard socket
may set `CHRONO_DOCKER_GID` explicitly before running the helper.

## Upgrade and rollback

The instance operator receives a once-per-version toast and Settings badge for
new official releases. Settings → Updates confirms and queues a one-click job.
The updater validates the release independently, creates a full backup, pulls
digest-pinned app, migrator, and updater images, migrates, restarts, and verifies
health. Live progress survives an app or host restart.

If the UI is unavailable, run `./update.sh` to enqueue the latest release and
wait for completion. `./update.sh --version vYY.M.N` is an advanced recovery
option for another published non-downgrade release.

Release checks use `CHRONO_RELEASE_REPOSITORY` in `owner/repository` form. For
a private repository, set `CHRONO_GITHUB_TOKEN` to a fine-grained, read-only
token with repository metadata/content access, then recreate the app service.
The token is sent only to `api.github.com` and is never returned to the browser.
A public commit or tag is not a production release. Only stable published
GitHub Releases with canonical calendar tags and valid digest manifests are
offered. A repository without one is reported separately from network or
rate-limit failure.

Source-development installations intentionally disable automatic updates. To
move an existing source fallback onto official images, use the one-time updater
bootstrap after a release is published. Until then, replace the retained
`source` directory with the desired release archive and run:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d
```

Migration failure leaves the current app and configuration active. If the new
app fails health verification, the updater restores the previous image
references. Database restore is never automatic: releases use one-version
expand/contract compatibility, and an operator must restore the coordinated
pre-update backup when database rollback is required. Never mix app and
migrator versions.

## External S3-compatible storage

Set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`,
`S3_SECRET_KEY`, and `S3_FORCE_PATH_STYLE` for AWS S3, R2, B2, Garage, or
another compatible private bucket. Disable bundled MinIO with:

```sh
printf '%s\n' 'COMPOSE_FILE=compose.yaml:compose.external-storage.yaml' >> .env
docker compose -f compose.yaml -f compose.external-storage.yaml up -d
```

The supplied credentials require list/location access on the bucket and
get/put/delete access on its objects. Downloads still flow through Chrono;
bucket URLs are never public. Persisting `COMPOSE_FILE` ensures the backup,
restore, and update helpers use the same external-storage topology.

## Local development stack

```sh
docker compose -f compose.yaml -f compose.build.yaml -f compose.dev.yaml up --build -d
```

The override builds repository Dockerfile targets and publishes PostgreSQL and
the MinIO console only on loopback.

After the owner has signed in, demo data can be added idempotently with:

```sh
npm run db:seed:demo
```

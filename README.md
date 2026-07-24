# Chrono

Chrono is Bitwave’s self-hosted, keyboard-first workspace for Clients,
Projects, Issues, native timers, manual time entries, and reporting.

## Self-host in one command

Chrono’s supported appliance installation requires only Docker Engine (or
Docker Desktop) with the Docker Compose plugin. Node.js, PostgreSQL, npm, and
Email delivery is not required on the host; email addresses are unverified login identifiers.

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh | sh
```

The installer downloads `compose.yaml` into `~/chrono`, generates the database
password, NextAuth secret, and high-entropy setup code, runs every migration, and starts
Chrono at `http://localhost:3000`. It prefers versioned GHCR images and
automatically falls back to a Docker source build when a public image is not
available; neither path installs build tools on the host.

Open `/auth/setup` and enter the setup code printed by the installer to claim the
first owner. Choose the email and password used for later sign-ins. The code is
also stored in `~/chrono/.env`, which is created with mode `0600`.

### Domain and automatic HTTPS

Pass an HTTPS public URL to enable the bundled Caddy profile. The domain must
resolve to the Docker host, and ports 80 and 443 must be reachable.

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh |
  NEXTAUTH_URL=https://chrono.example.com sh
```

Caddy obtains and renews the certificate automatically. Existing Nginx,
Traefik, Caddy, Coolify, or hosting-panel users can leave the profile disabled,
set `NEXTAUTH_URL`, and proxy to the configured local Chrono port.

Invitations and password recovery use one-time bearer URLs that administrators
copy manually. Chrono does not send email or verify email ownership.

## Manual Compose installation

Experienced operators can download `compose.yaml`, copy `.env.example` to
`.env`, replace every placeholder secret, and run:

```sh
docker compose pull
docker compose up -d
docker compose ps
```

The default stack contains PostgreSQL, private MinIO object storage, one-shot
database and bucket initialization jobs, and the standalone Next.js
application. PostgreSQL and MinIO are internal-only in production and persist
in `chrono_postgres_data` and `chrono_object_data`. The application starts only
after both persistence services are ready.

From a source checkout, use the build overlay instead of GHCR:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d
```

## Upgrade and backup

The installer provides coordinated backup, restore, and update helpers. A
backup contains the PostgreSQL dump, a byte-for-byte bucket mirror, manifest,
and checksums:

```sh
cd ~/chrono
./backup.sh
```

Restore only from a matching database-and-object snapshot:

```sh
CHRONO_RESTORE_CONFIRM=restore ./restore.sh ~/chrono/backups/chrono-<timestamp>
```

The update helper backs up first, locks the app and migrator to one release,
runs migrations, restarts Compose, and verifies health:

```sh
./update.sh v0.2.0
```

Never treat either Docker volume as a backup. Keep encrypted backup copies
outside the Docker host and test restores. The operator-only Settings → Storage
and Updates pages report health and guide these host commands; the web
application never receives Docker socket access.

## Source development

Copy `.env.example` to `.env`, replace the secrets, and start the source-built
stack with PostgreSQL and private MinIO:

```sh
npm run stack:up
```

Open Chrono at `http://localhost:3000` and the development-only MinIO console at
`http://localhost:9001`. The development
override builds local Dockerfile targets and exposes persistence only on
loopback.

For a host-run Next.js process:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d db storage storage-init
npm ci
npm run db:migrate
npm run dev
```

For an empty database, open `/auth/setup` and use the setup code from `.env`.

## Documentation

- `docs/ARCHITECTURE.md` — system boundaries and data model
- `docs/OPERATIONS.md` — installation, upgrades, backup, and recovery
- `docs/SECURITY.md` — authentication and deployment requirements
- `docs/API.md` — HTTP endpoints
- `docs/PERFORMANCE.md` — measured performance notes
- `docs/UX.md` — interaction and layout conventions
- `docs/UI_STANDARDS.md` — canonical list and creation-dialog patterns
- `roadmap.md` — completed implementation tracer bullets

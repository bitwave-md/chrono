# Chrono

Chrono is Bitwave’s self-hosted, keyboard-first workspace for Clients,
Projects, Issues, native timers, manual time entries, and reporting.

## Self-host in one command

Chrono’s supported appliance installation requires only Docker Engine (or
Docker Desktop) with the Docker Compose plugin. Node.js, PostgreSQL, npm, and
SMTP are not required on the host.

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh | sh
```

The installer downloads `compose.yaml` into `~/chrono`, generates the database
password, NextAuth secret, and owner setup key, runs every migration, and starts
Chrono at `http://localhost:3000`. It prefers versioned GHCR images and
automatically falls back to a Docker source build when a public image is not
available; neither path installs build tools on the host.

Sign in using the owner email and setup key printed by the installer. The same
values are stored in `~/chrono/.env`, which is created with mode `0600`.

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

### Optional email sign-in

SMTP is optional. Owner setup-key sign-in works without it. To enable magic
links for approved members, set `EMAIL_SERVER` and `EMAIL_FROM` in
`~/chrono/.env`, then apply the configuration:

```sh
cd ~/chrono
docker compose up -d
```

Use an `smtp://` or `smtps://` URL and percent-encode special characters in
credentials.

## Manual Compose installation

Experienced operators can download `compose.yaml`, copy `.env.example` to
`.env`, replace every placeholder secret, and run:

```sh
docker compose pull
docker compose up -d
docker compose ps
```

The default stack contains PostgreSQL, a one-shot Drizzle migrator, and the
standalone Next.js application. PostgreSQL is internal-only and persists in the
`chrono_postgres_data` named volume. The application starts only after the
database is healthy and migrations complete successfully.

From a source checkout, use the build overlay instead of GHCR:

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d
```

## Upgrade and backup

Back up before every upgrade:

```sh
cd ~/chrono
docker compose exec -T db pg_dump -U chrono -d chrono -Fc > chrono.dump
```

Set `CHRONO_VERSION` in `.env` to the desired release, then deploy both matching
images:

```sh
docker compose pull
docker compose up -d
docker compose ps
```

Never treat the Docker volume as a backup. Keep encrypted backup copies outside
the Docker host and test restores. See `docs/OPERATIONS.md` for the complete
upgrade, restore, HTTPS, and troubleshooting procedures.

## Source development

Copy `.env.example` to `.env`, replace the secrets, and start the source-built
stack with PostgreSQL and Mailpit:

```sh
npm run stack:up
```

Open Chrono at `http://localhost:3000` and Mailpit at
`http://localhost:8025`. The development override builds the local Dockerfile
targets instead of pulling GHCR images.

For a host-run Next.js process:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d db mailpit
npm ci
npm run db:migrate
npm run dev
```

Use `EMAIL_SERVER=smtp://localhost:1025` only for a host-run process. The Docker
application uses the internal address `smtp://mailpit:1025` from the override.

## Documentation

- `docs/ARCHITECTURE.md` — system boundaries and data model
- `docs/OPERATIONS.md` — installation, upgrades, backup, and recovery
- `docs/SECURITY.md` — authentication and deployment requirements
- `docs/API.md` — HTTP endpoints
- `docs/PERFORMANCE.md` — measured performance notes
- `docs/UX.md` — interaction and layout conventions
- `roadmap.md` — completed implementation tracer bullets

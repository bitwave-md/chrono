# Self-Hosted Operations

## Local development stack

Run the production image with local PostgreSQL and Mailpit overrides:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up --build -d
```

The application is available at `http://localhost:3000`; Mailpit is available
at `http://localhost:8025`.

## Backup

Create a PostgreSQL custom-format backup outside the Docker volume:

```sh
docker compose -f compose.yaml -f compose.dev.yaml exec -T db \
  pg_dump -U chrono -d chrono -Fc > chrono.dump
```

Store backups on operator-controlled storage with retention, encryption, and
off-host replication. A Docker volume alone is not a backup.

## Restore drill

Create an empty database and restore with failure-on-error behavior:

```sh
docker compose -f compose.yaml -f compose.dev.yaml exec -T db \
  createdb -U chrono chrono_restore_test
docker compose -f compose.yaml -f compose.dev.yaml exec -T db \
  pg_restore -U chrono -d chrono_restore_test --exit-on-error < chrono.dump
```

Verify migration history and critical entity counts before switching traffic.
The Phase 5 drill restored one Workspace, one Client, three Projects, four
Issues, three TimeLogs, and four migration records successfully.

## Upgrade and migration drill

Before deploying a new image:

1. Back up the database.
2. Replay every committed migration against an isolated empty database.
3. Restore a recent production-format backup into another isolated database.
4. Run typecheck, lint, tests, production build, health checks, and API tracers.
5. Deploy the migrator before the application container.

Phase 5 replayed all four migrations into an empty database and produced 20
public tables. The Compose dependency chain kept the application behind the
successful one-shot migrator.

## Health and recovery

- PostgreSQL health uses `pg_isready`.
- The application health endpoint is `/api/health`.
- The application waits for a successful migration service.
- Restarting or rebuilding containers preserves data in
  `chrono_postgres_data`.
- After changing local Compose overrides, run the full two-file command above
  so SMTP resolves to the `mailpit` service rather than container-localhost.

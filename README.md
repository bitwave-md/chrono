# Chrono

Chrono is Bitwave's self-hosted, keyboard-first client project workspace with
native issue tracking, time tracking, and reporting.

## Phase 1 stack

- Next.js App Router
- PostgreSQL and Drizzle ORM
- Stable NextAuth with email magic links and database sessions
- Tailwind CSS
- Docker Compose with one-shot migrations

## Local setup

1. Copy `.env.example` to `.env` and replace the example secret and owner email.
2. Start PostgreSQL and Mailpit:

   ```sh
   docker compose -f compose.yaml -f compose.dev.yaml up db mailpit
   ```

3. Install and migrate:

   ```sh
   npm ci
   npm run db:migrate
   npm run dev
   ```

4. Open `http://localhost:3000/app`, request a link for the configured bootstrap
   email, and read the message at `http://localhost:8025`.

For the complete application in Docker, use the local override so the app
resolves SMTP through the `mailpit` service:

```sh
npm run stack:up
```

Do not use the production-only Compose command with
`EMAIL_SERVER=smtp://localhost:1025`; inside a container, `localhost` refers to
that container rather than Mailpit.

The first successful bootstrap login creates the configured workspace and owner
membership. Other addresses require an active membership or unexpired invite.

## Production Compose

Provide real PostgreSQL, SMTP, authentication, and bootstrap values in `.env`,
then run:

```sh
docker compose up --build -d
```

The `migrate` service must complete successfully before the application starts.
The PostgreSQL volume provides persistence, but operators must configure external
backups separately.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/OPERATIONS.md`
- `docs/PERFORMANCE.md`
- `docs/SECURITY.md`
- `docs/UX.md`
- `roadmap.md`

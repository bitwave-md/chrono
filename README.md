# Chrono

Chrono is a self-hosted workspace for agencies and small teams that bill by the
hour. Keep your clients, projects, and tasks in one place, track the time spent
on them, and send clients a clear report when it's time to invoice.

It runs on your own server, so your data stays with you. It's free to host
yourself.

## What you can do with Chrono

- **Organize work by client.** Each client has projects, and each project has
  issues (tasks) with assignees, labels, comments, and file attachments.
- **Track time.** Start a timer on any issue or add time by hand, with
  billable and non-billable entries and your own time-entry types.
- **Report and export.** Filter by project, person, and entry type to see where
  the hours went, then export a PDF report for a client in English or Romanian.
- **Work with your team and your clients.** Invite teammates as owners, admins,
  or members, or give clients limited guest access to only what they should see.
- **Stay in the loop.** An inbox shows assignments, status changes, and
  comments addressed to you.
- **Move fast.** Chrono is built to be used from the keyboard, with a light
  and dark theme and a compact layout.

## Install

You need a computer or server that can run [Docker](https://docs.docker.com/get-docker/)
(Docker Desktop works too). Nothing else needs to be installed.

**1. Run the installer**

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh | sh
```

It sets everything up in a `chrono` folder in your home directory, generates
the passwords it needs, and starts Chrono at `http://localhost:3000`.

**2. Create your account**

Open `http://localhost:3000/auth/setup` and enter the setup code the installer
printed. (It's also saved in `~/chrono/.env` if you need it again.) Choose the
email and password you'll use to sign in. You become the first owner.

**3. Invite your team**

Add teammates from the workspace settings. Chrono doesn't send emails, so
invitation links are copied and shared by you directly.

## Put it on your own domain

To make Chrono available at an address like `https://chrono.example.com`, point
that domain at your server and run the installer with your address. Chrono sets
up and renews the HTTPS certificate automatically (ports 80 and 443 need to be
open).

```sh
curl -fsSL https://raw.githubusercontent.com/bitwave-md/chrono/main/scripts/install.sh |
  NEXTAUTH_URL=https://chrono.example.com sh
```

Already have a reverse proxy such as Nginx, Traefik, or Caddy? Skip the
built-in HTTPS, set `NEXTAUTH_URL` to your address, and proxy to Chrono's local
port.

## Updates and backups

**Updating.** When a new version is available, Chrono tells whoever
administers the installation. Open **Settings → Updates** and click one
button: Chrono makes a backup, installs the new version, and checks that
everything works. If something goes wrong, it rolls back to the version you
had.

**Backing up.** Run this on your server whenever you like:

```sh
cd ~/chrono
./backup.sh
```

A backup includes your database and all uploaded files. Keep copies somewhere
other than the server itself, and try a restore now and then so you know it
works. Restoring is covered in the [operations guide](docs/OPERATIONS.md).

## Good to know

- Chrono doesn't send email. Sign-in uses an email address and password, and
  invitation and password-reset links are copied by an admin.
- Your data lives in two places on your server: a PostgreSQL database and a
  private file store. Both stay on your machine.
- Settings → Storage and Updates (for the installation's administrator) show
  the health of your installation.

## For advanced setups and developers

- Manual Docker Compose setup, external S3 storage, and recovery steps:
  [docs/OPERATIONS.md](docs/OPERATIONS.md)
- Running Chrono from source for development:

  ```sh
  cp .env.example .env   # then replace the placeholder secrets
  npm run stack:up
  ```

  Chrono opens at `http://localhost:3000`. See
  [docs/OPERATIONS.md](docs/OPERATIONS.md#local-development-stack) for details.

More documentation:

- [Architecture](docs/ARCHITECTURE.md): how Chrono is put together
- [Operations](docs/OPERATIONS.md): installing, updating, backing up, and recovering
- [Releases](docs/RELEASES.md): how versions are published
- [Security](docs/SECURITY.md): authentication and deployment notes
- [API](docs/API.md): HTTP endpoints
- [Performance](docs/PERFORMANCE.md): measured performance notes
- [UX](docs/UX.md) and [UI standards](docs/UI_STANDARDS.md): interface conventions
- [Roadmap](roadmap.md): what has been built so far

## License

Chrono is made by [Bitwave Software](https://github.com/bitwave-md) and is free
to use, read, and modify for non-commercial purposes, as long as you credit
Bitwave Software. Commercial use, redistribution, and selling it need written
permission. See [LICENSE](LICENSE) for the full terms, or contact
daniil@btw.md for commercial licensing.

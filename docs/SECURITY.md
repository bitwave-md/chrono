# Security Notes

## Authentication baseline

Phase 1 uses stable NextAuth 4, the current Auth.js Drizzle adapter, database
sessions, and email magic links. Auth.js v5 is not used because it is still
published under a beta tag.

Only the configured bootstrap email, an active workspace member, or an address
with an unexpired invitation may request a sign-in link. Resource authorization
continues to resolve active WorkspaceMembership records on the server; a valid
session alone does not grant tenant access.

## Dependency advisory review

Reviewed on 2026-07-15. `npm audit` reports advisories that currently have no
compatible non-breaking resolution in the selected stable stack.

### Nodemailer

Stable NextAuth declares Nodemailer 7 as its supported peer while the advisory
database recommends a newer major release. The reported vulnerable options are
not exposed by Chrono's use of the built-in email provider:

- Chrono does not supply raw messages, arbitrary headers, attachments, URLs, or
  file paths.
- The SMTP transport configuration is operator-controlled, not user-controlled.
- User input is limited to the normalized recipient address.

This is a documented temporary mitigation, not a claim that the package is
patched. Upgrade the mail transport as soon as stable NextAuth supports a fixed
Nodemailer release, or replace the provider with a separately reviewed transport.

### Next.js PostCSS dependency

The reported PostCSS path is used while processing repository-owned CSS during
the production build. Chrono does not compile user-provided CSS. Track the next
compatible Next.js release carrying the patched PostCSS dependency.

### Drizzle migration tooling

The reported esbuild version is nested under Drizzle's development-only CLI.
The migration image runs the CLI as a one-shot process and does not expose its
development server. It is not included in the final application runner image.

## Operational requirements

- Use a long, random `NEXTAUTH_SECRET`.
- Use a trusted SMTP server with TLS in production.
- Terminate HTTPS at a trusted reverse proxy.
- Do not expose PostgreSQL publicly.
- Back up PostgreSQL outside the Docker volume and test restores.
- Re-run production and full dependency audits during each dependency upgrade.

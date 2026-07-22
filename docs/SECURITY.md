# Security Notes

## Authentication baseline

Chrono uses stable NextAuth 4, the Auth.js Drizzle adapter, and signed JWT
sessions. JWT sessions are required because the self-hosting appliance supports
the NextAuth Credentials provider for bootstrap-owner access. Users,
memberships, invitations, and tenant authorization remain database-backed.

The optional owner setup key is compared through a constant-time SHA-256 digest
and is accepted only with the configured bootstrap email. The installer
generates a high-entropy key and stores it in a mode-`0600` environment file.
It is an operator credential: do not publish it in Compose files, logs, shell
history, tickets, or screenshots.

Only the configured bootstrap email, an active workspace member, or an address
with an unexpired invitation may request a sign-in link. Resource authorization
continues to resolve active WorkspaceMembership records on the server; a valid
session alone does not grant tenant access.

## Dependency advisory review

Reviewed again after Phase 5 on 2026-07-15. `npm audit --omit=dev` reports six
production advisories (five moderate and one high); the full audit reports ten
(nine moderate and one high). The Phase 5 TanStack Query, Zustand, GSAP, Radix,
and Lucide dependencies add no advisory chain. Existing advisories currently
have no compatible non-breaking resolution in the selected stable stack.

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
- Keep `AUTH_BOOTSTRAP_TOKEN`, `POSTGRES_PASSWORD`, and `NEXTAUTH_SECRET` random
  and private; rotating `NEXTAUTH_SECRET` signs every user out.
- When email sign-in is enabled, use a trusted SMTP server with TLS.
- Terminate HTTPS through the optional Caddy profile or another trusted proxy.
- Do not expose PostgreSQL publicly.
- Back up PostgreSQL outside the Docker volume and test restores.
- Re-run production and full dependency audits during each dependency upgrade.

## Phase 5 authorization probes

An isolated guest session and hidden Client fixture verified that Guests:

- Receive only Clients linked through their ClientMembership.
- Receive only Client-shared or directly assigned Issues.
- Do not receive internal Projects.
- Receive only their own TimeLogs.
- Cannot access Workspace reports.
- Cannot create Issues or timers without contribution permission.

The fixtures were removed after verification. Tenant-safe foreign keys and
server-side principal resolution remain the enforcement boundary; UI hiding is
not treated as authorization.

Inbox notifications are scoped to one recipient Workspace membership through
tenant-safe foreign keys and every list/mutation predicate repeats both the
Workspace and recipient IDs. Feed reads also reapply current guest Client and
Issue visibility; notification delivery never acts as a durable access grant.
Actors do not receive notifications for their own mutations.

## Upgrade review

React and React DOM were advanced to the current compatible 19.2.7 patch, and
Node type definitions now match the Node 24 runtime. Next.js and the new UI
dependencies are current. ESLint 10 and TypeScript 7 are deferred as major
toolchain upgrades pending Next.js compatibility review. Nodemailer 9 remains
incompatible with stable NextAuth's supported peer range.

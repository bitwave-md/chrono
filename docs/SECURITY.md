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
- Use a trusted SMTP server with TLS in production.
- Terminate HTTPS at a trusted reverse proxy.
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

## Upgrade review

React and React DOM were advanced to the current compatible 19.2.7 patch, and
Node type definitions now match the Node 24 runtime. Next.js and the new UI
dependencies are current. ESLint 10 and TypeScript 7 are deferred as major
toolchain upgrades pending Next.js compatibility review. Nodemailer 9 remains
incompatible with stable NextAuth's supported peer range.

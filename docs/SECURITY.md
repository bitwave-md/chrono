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

Reviewed again on 2026-07-22. `npm audit --omit=dev` reports five production
advisories (two moderate and three high); the full audit reports nine (six
moderate and three high). The Auth.js Drizzle adapter was advanced to its fixed
1.11.3 patch. Remaining automated fixes propose incompatible historical major
versions rather than a safe upgrade for the selected Next.js/NextAuth stack.

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

### Next.js image dependency

The audit also reports the Sharp version nested under Next.js image tooling.
Chrono does not accept arbitrary image transformations through Next Image;
identity uploads use the separately installed patched Sharp 0.35 line, strict
PNG/JPEG/WebP decoding, fixed 256px output, and a 5 MB source limit. Continue to
track a Next.js release carrying a patched nested image dependency.

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
- Back up PostgreSQL and the private object bucket as one snapshot and test restores.
- Re-run production and full dependency audits during each dependency upgrade.

## Guest authorization boundary

Guests are external Client collaborators with fixed capabilities. A
`client_memberships` row grants Client and direct-backlog access. A separate
`project_memberships` row grants access to one current Project and all of its
Issues. New Projects do not inherit existing Guest access. Direct Issue
assignment is a deliberate single-Issue exception and never grants Project
navigation or list access.

Guests may create Issues in accessible scopes, comment and reply, publish
Project updates, and upload safe attachments. Guest-created Issues are forced
to `client_shared`. They may edit only text they authored and may delete or
share only files they uploaded. Client/Project/workflow properties, assignments,
labels, dates, member administration, timers, time logs, categories, reports,
and Workspace settings remain forbidden at the service layer. Legacy Client
permission values cannot unlock these operations. Tenant-safe foreign keys and
server-side principal resolution remain the enforcement boundary; UI hiding is
not treated as authorization.

Inbox notifications are scoped to one recipient Workspace membership through
tenant-safe foreign keys and every list/mutation predicate repeats both the
Workspace and recipient IDs. Feed reads also reapply current Guest Client,
Project-membership, and direct-assignment visibility; notification delivery
never acts as a durable access grant.
Actors do not receive notifications for their own mutations.

## File storage boundary

MinIO uses separate randomly generated root and bucket-scoped application
credentials. Production publishes neither its API nor console. Application
objects use opaque UUID keys, private buckets, tenant-safe metadata, and
authenticated streaming downloads. HTML, SVG, scripts, executables, MIME
spoofing, declared/actual size mismatches, and quota overages are rejected.

Anonymous share tokens contain 256 bits of entropy; PostgreSQL stores only
their digest. Links expire within 30 days, are revocable, stop working when the
creator loses access or the target is archived, and expose no visitor IP
history. Public responses are attachment-only with `nosniff`, `no-referrer`,
`noindex`, no-store caching, and rate limiting. The app has no Docker socket,
and application updates remain host-side operations.

Private GitHub release checks may use `CHRONO_GITHUB_TOKEN`. Use a fine-grained
read-only token limited to the Chrono repository, keep it in the mode-`0600`
installation environment, and rotate it independently of application secrets.

## Upgrade review

React and React DOM were advanced to the current compatible 19.2.7 patch, and
Node type definitions now match the Node 24 runtime. Next.js and the new UI
dependencies are current. ESLint 10 and TypeScript 7 are deferred as major
toolchain upgrades pending Next.js compatibility review. Nodemailer 9 remains
incompatible with stable NextAuth's supported peer range.

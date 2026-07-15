# Chrono Roadmap

## Phase 1: Database and authentication setup

Tracer bullet: boot the Docker stack, authenticate an owner, create or load a
Workspace membership, and render a protected workspace page.

- [x] Scaffold the Next.js App Router application.
- [x] Configure PostgreSQL, Drizzle ORM, and a committed initial migration.
- [x] Configure stable NextAuth with database sessions and the Drizzle adapter.
- [x] Model User, Account, AuthSession, VerificationToken, Workspace,
  WorkspaceMembership, and Invitation.
- [x] Add owner bootstrap and tenant-aware principal resolution.
- [x] Add Docker production build, migration service, and health checks.
- [x] Add foundational domain tests and static tenant-scope verification.
- [x] Run the migration and magic-link tracer bullet against PostgreSQL.
- [x] Validate the complete Compose stack on a Docker/Colima host.

Phase 1 runtime verification completed on 2026-07-15 with PostgreSQL 17,
Colima, Docker Compose, Mailpit, and the PostgreSQL 18 client. The tracer created
the Bitwave owner membership, persisted a database session, and rendered the
tenant-protected workspace page.

## Phase 2: Clients and nested projects

- [x] Add Client and ClientMembership.
- [x] Add Project with a nullable self-referencing parent.
- [x] Add Project kinds for project, subproject, and sprint.
- [x] Add Client-owned and Project-owned IssueNamespace records.
- [x] Add Project-owned workflows and workflow statuses.
- [x] Support inherited and custom child-project workflows.
- [x] Add cycle-safe hierarchy commands and access policies.

Phase 2 runtime verification completed on 2026-07-15. The authenticated tracer
created DaCredit, Main CRM, a nested API subproject, and a nested sprint. It
verified inherited and overridden issue namespaces, inherited and owned
workflows, default workflow statuses, mutation-origin protection, duplicate-key
conflicts, and transactional cycle rejection.

## Phase 3: Flexible issue engine

- [x] Add Issue with required Workspace and Client relations.
- [x] Keep Project, Team, and assignee relations nullable and independent.
- [x] Allocate stable issue keys from the effective Client or Project namespace.
- [x] Require workflow status only when a Project is assigned.
- [x] Add workspace-scoped Client issue lists with Project, Team, and assignee
  filters.
- [x] Add optimistic issue mutations with version conflict handling.

Phase 3 runtime verification completed on 2026-07-15. The authenticated tracer
created Team-assigned, individually assigned, combined, and unassigned issues.
It verified atomic namespace counters, stable issue keys, Project workflow
defaults, Client-backlog status clearing, cross-workflow category mapping,
Team/workflow independence, guest visibility boundaries, and stale-version
conflicts.

## Phase 4: Time tracking and reporting foundations

Tracer bullet: create a work category, start one authoritative timer on an
Issue, retrieve it from a separate request, stop it into a finalized time log,
add a manual log, and aggregate both entries through snapshotted dimensions.

- [x] Add customizable time categories.
- [x] Add authoritative timer sessions and manual time logs.
- [x] Enforce one active timer per user at the database boundary.
- [x] Snapshot Client, exact Project, root Project, Team, and worker dimensions.
- [x] Aggregate time by Issue, Project subtree, Client, Team, category, and
  worker.
- [x] Provide authoritative timer epochs and server clock values for cross-tab
  and multi-device synchronization without per-tick database writes.

Phase 4 runtime verification completed on 2026-07-15. The authenticated tracer
created a billable Development category, started and retrieved an API-1 timer,
rejected a concurrent second timer, stopped it into a finalized log, and added a
manual Client-backlog log. Reports returned correct totals for Issue, exact
Project, root Project, recursive Project subtree, Client, Team, category, and
worker dimensions.

## Phase 5: Keyboard UX and production hardening

Tracer bullet: open the authenticated Workspace shell, select a Client and
Project from the tree, create and optimistically update an Issue in list/board
views, inspect it in an animated peek pane, and start/stop its authoritative
timer through keyboard-first controls.

- [x] Add TanStack Query server-state and per-workspace Zustand UI-state
  providers.
- [x] Add command menu and contextual shortcut registry.
- [x] Add collapsible navigation, Client/Project tree, issue list, and board.
- [x] Add rapid issue creation, optimistic movement, and issue peek pane.
- [x] Add visual timer controls backed by authoritative Phase 4 epochs.
- [x] Complete guest/client visibility and audit coverage.
- [x] Profile hierarchy and reporting queries before adding derived structures.
- [x] Validate backups, restores, upgrades, security, and container operations.

Phase 5 runtime verification completed on 2026-07-15. Authenticated desktop and
mobile browser tracers exercised the nested tree, list/board switching, command
menu, rapid-create dialog, optimistic status movement, animated Issue pane, and
visual timer start/stop. Temporary guest fixtures verified Client, Project,
Issue, report, time-log, and contribution boundaries and were removed. Query
profiles remained below one millisecond on the current dataset; custom-format
backup/restore and all four migrations replayed successfully in isolated
databases.

## UI system refactor: shadcn/ui

Tracer bullet: retain the existing workspace state and server-data boundaries
while replacing native controls and direct primitive usage with an owned,
themeable shadcn/ui component layer. Verify the complete keyboard-first flow in
both desktop and mobile layouts before removing redundant control styling.

- [x] Add shadcn/ui configuration, semantic theme tokens, and shared utilities.
- [x] Add only the focused shadcn/ui primitives required by Chrono surfaces.
- [x] Refactor navigation, headers, issue list/board, dialogs, sheet, and timer.
- [x] Refactor public and access-state surfaces to use the same component system.
- [x] Re-run static, unit, production, responsive, keyboard, and timer tracers.

The shadcn/ui refactor was completed and runtime-verified on 2026-07-15. The
owned component layer now covers buttons, inputs, textareas, selects, dialogs,
sheets, commands, cards, badges, alerts, avatars, scrolling, tooltips, toggles,
separators, skeletons, and keyboard hints. Authenticated Chrome tracers verified
desktop and mobile shells, the workflow board, portalled Select menus, command
navigation, rapid create, and the Issue detail sheet against the rebuilt Docker
stack without changing TanStack Query, Zustand, GSAP, or API boundaries. The
built-in NextAuth screens were also replaced with branded shadcn sign-in,
verification, and error states, while sign-in and sign-out remain encapsulated
as TanStack Query mutations.

## Vanilla Tailwind and shadcn styling cleanup

Tracer bullet: preserve the verified Chrono workflows while deleting the
project-specific workspace stylesheet layer. Every remaining visual rule must
be expressed through Tailwind utilities or an owned shadcn component variant,
with only semantic theme tokens and global browser defaults left in globals.css.

- [x] Replace workspace shell, navigation, list, board, dialog, sheet, and timer
  selectors with local Tailwind composition.
- [x] Replace public, access, and authentication legacy classes.
- [x] Delete the custom workspace CSS files and their imports.
- [x] Verify responsive, keyboard, portal, optimistic, and timer behavior.

The cleanup was completed and runtime-verified on 2026-07-15. All four custom
workspace stylesheets were deleted, globals.css now contains only the standard
shadcn dark token map and Tailwind base rules, and component layout is expressed
locally with Tailwind utilities and shadcn variants. Authenticated desktop and
mobile tracers re-verified the list, command palette, rapid-create dialog, Issue
sheet, responsive navigation, and production Docker build.

## Authentication SMTP maintenance

- [x] Parse `EMAIL_SERVER` with the WHATWG URL API before creating the
  Nodemailer transport.
- [x] Publish Mailpit SMTP for host development and retain `mailpit:1025` for
  the Docker application network.
- [x] Add explicit local stack commands and document the loopback boundary.
- [x] Re-run the magic-link tracer and confirm delivery in Mailpit.

The SMTP fix was runtime-verified on 2026-07-15. The application resolved
`smtp://mailpit:1025`, the bootstrap magic-link request increased Mailpit's
message count from zero to one, and application logs contained neither
`SIGNIN_EMAIL_ERROR` nor the Node `url.parse()` deprecation warning.

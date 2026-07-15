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
- [ ] Run the migration and magic-link tracer bullet against PostgreSQL.
- [ ] Validate the complete Compose stack on a host with Docker available.

## Phase 2: Clients and nested projects

- Add Client and ClientMembership.
- Add Project with a nullable self-referencing parent.
- Add Project kinds for project, subproject, and sprint.
- Add Client-owned and Project-owned IssueNamespace records.
- Add Project-owned workflows and workflow statuses.
- Support inherited and custom child-project workflows.
- Add cycle-safe hierarchy commands and access policies.

## Phase 3: Flexible issue engine

- Add Issue with required Workspace and Client relations.
- Keep Project, Team, and assignee relations nullable and independent.
- Allocate stable issue keys from the effective Client or Project namespace.
- Require workflow status only when a Project is assigned.
- Add workspace, client, project, team, and assignee views.
- Add optimistic issue mutations with version conflict handling.

## Phase 4: Time tracking and reporting foundations

- Add timer sessions, manual time logs, and time categories.
- Enforce one active timer per user.
- Snapshot Client, Project, root Project, Team, and worker dimensions.
- Aggregate time by Issue, Project subtree, Client, Team, category, and worker.
- Synchronize timers across tabs and devices without per-tick database writes.

## Phase 5: Keyboard UX and production hardening

- Add command menu and contextual shortcut registry.
- Add project tree, list, board, and issue peek-pane experiences.
- Complete guest/client visibility and audit coverage.
- Profile hierarchy and reporting queries before adding derived structures.
- Validate backups, restores, upgrades, security, and container operations.

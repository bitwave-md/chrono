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

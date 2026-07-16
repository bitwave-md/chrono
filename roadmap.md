# Chrono Roadmap

## Unified semantic property pickers

Tracer bullet: change status and priority from an Issue row, full Issue page,
create dialog, Project overview, or Project directory and always see the same
semantic icon, color, option order, and searchable picker behavior.

- [x] Share the exact Issue-list priority and status picker content everywhere.
- [x] Match grouped-list headers to row status icons and add status-tinted gradients.
- [x] Teach the shared property picker to render option-specific Lucide icons.
- [x] Replace legacy Issue detail and creation priority/status options.
- [x] Align Project and Branch state and priority controls.
- [x] Verify type safety, lint rules, tests, build, and file-size limits.

## Linear-style Client workspace

Tracer bullet: open a Client through one persistent Overview, Issues, Projects,
and Members shell; change its searchable icon and color; pin a resource; and
manage the explicit Client roster without leaving the Client context.

- [x] Add persisted Client identity fields, resources, and roster APIs.
- [x] Build the shared route-backed Client header and pill tab switcher.
- [x] Rebuild Overview with editable identity, resources, and compact aside.
- [x] Add the Members tab and membership management.
- [x] Reuse the existing Issue and Project directories inside the Client shell.
- [x] Verify tenant isolation, responsive behavior, build, and Docker runtime.

The Client workspace was completed and runtime-verified on 2026-07-16 against
the supplied Linear Overview and icon-picker references. Migration 0007 added
searchable icon/emoji identity, pinned resources, and owner/admin roster
backfill. Authenticated tracers changed and restored appearance and membership
permissions, created and removed a resource, verified all four tabs and the
legacy Home redirect, and confirmed the rebuilt Docker stack. A headless Chrome
audit covered the desktop Overview and full icon picker.

## Interactive Linear-style work-item lists

Tracer bullet: change an Issue's priority, workflow status, labels, and
assignees directly from one grouped Linear-style row, reuse that row in every
Issue list route, and edit Project priority, lead, target date, and state from
the Project directory without opening the detail page.

- [x] Build one shared status-grouped Issue list with no empty groups.
- [x] Add compact clickable priority, status, label, and assignee triggers.
- [x] Reuse the shared list across Project, Client, Inbox, and My Issues views.
- [x] Add inline Project directory property triggers.
- [x] Verify optimistic rollback, row navigation, keyboard behavior, and build.

The shared list was completed and runtime-verified on 2026-07-16 against the
supplied Linear Issues reference (`03.26.42`). Its rounded inset status groups,
borderless dense rows, property order, right-aligned labels, and assignee
control now define every Issue list surface. Authenticated tracers edited and
restored Issue priority, status, labels, and assignees plus Project priority,
lead, target date, and state. All four list routes, 19 unit tests, the production
build, and the rebuilt Docker stack passed.

## Navigation and Project directory refinement

Tracer bullet: create a Client from the sidebar, follow clickable breadcrumbs,
open the workspace-wide Linear-style Project table, edit Project priority and
lead, and switch Project Issues between Main, All branches, and a named Branch
through one route-backed select.

- [x] Make breadcrumb ancestors canonical links.
- [x] Add authorized sidebar Client creation with optimistic cache updates.
- [x] Add Project priority and singular lead fields.
- [x] Build the flat Linear-style Project directory with health and progress.
- [x] Replace Branch scope tabs with a compact select defaulting to Main.
- [x] Verify migrations, permissions, responsive UX, APIs, and production build.

The refinement was completed and runtime-verified on 2026-07-16. Clean
migration replay created all 29 tables with the tenant-safe Project lead
constraint. Authenticated tracers verified Workspace-wide Project metadata,
priority and lead updates, authorized Client creation, Main/All/named Branch
routes, the production build, and the healthy rebuilt Docker stack. Disposable
verification data was removed afterward.

## Project Branches model

Tracer bullet: keep Projects as direct Client children, introduce project-local
Branches for features, sprints, refactors, and releases, then verify Main and
named Branch issue flows with historically stable time attribution.

- [x] Remove disposable nested Project fixtures.
- [x] Remove Project parent, kind, and workflow-inheritance fields.
- [x] Add Branch schema, services, APIs, Issue assignment, and reports.
- [x] Add Main, named Branch, and All-Issues Project views.
- [x] Add Branch creation, lifecycle controls, and Issue property triggers.
- [x] Update documentation, runtime fixtures, and migration coverage.
- [x] Re-run static checks, unit tests, production build, and Docker verification.

The Project Branches model was completed and runtime-verified on 2026-07-16.
Clean migration replay produced flat Client-owned Projects and tenant-safe
feature, sprint, refactor, release, and other Branches. Authenticated tracers
verified multiple active Branches, Main/named/All issue scopes, cross-Project
rejection, automatic Branch clearing on Project moves, Branch time snapshots,
Main reporting fallback, and desktop route rendering.

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

## Phase 2: Clients and projects

- [x] Add Client and ClientMembership.
- [x] Add flat Client-owned Projects.
- [x] Add Client-owned and Project-owned IssueNamespace records.
- [x] Add Project-owned workflows and workflow statuses.
- [x] Give every Project an independent workflow.
- [x] Add tenant-safe Project access policies.

Phase 2 runtime verification completed on 2026-07-15. The authenticated tracer
created DaCredit and multiple Projects. It verified Client and Project issue
namespaces, Project-owned workflows, default workflow statuses,
mutation-origin protection, and duplicate-key conflicts.

## Phase 3: Flexible issue engine

- [x] Add Issue with required Workspace and Client relations.
- [x] Keep Project and assignee relations nullable and independent.
- [x] Allocate stable issue keys from the effective Client or Project namespace.
- [x] Require workflow status only when a Project is assigned.
- [x] Add workspace-scoped Client issue lists with Project and assignee filters.
- [x] Add optimistic issue mutations with version conflict handling.

Phase 3 runtime verification completed on 2026-07-15. The authenticated tracer
created individually assigned and unassigned issues.
It verified atomic namespace counters, stable issue keys, Project workflow
defaults, Client-backlog status clearing, cross-workflow category mapping,
assignment/workflow independence, guest visibility boundaries, and stale-version
conflicts.

## Phase 4: Time tracking and reporting foundations

Tracer bullet: create a work category, start one authoritative timer on an
Issue, retrieve it from a separate request, stop it into a finalized time log,
add a manual log, and aggregate both entries through snapshotted dimensions.

- [x] Add customizable time categories.
- [x] Add authoritative timer sessions and manual time logs.
- [x] Enforce one active timer per user at the database boundary.
- [x] Snapshot Client, Project, and worker dimensions.
- [x] Aggregate time by Issue, Project, Client, category, and worker.
- [x] Provide authoritative timer epochs and server clock values for cross-tab
  and multi-device synchronization without per-tick database writes.

Phase 4 runtime verification completed on 2026-07-15. The authenticated tracer
created a billable Development category, started and retrieved an API-1 timer,
rejected a concurrent second timer, stopped it into a finalized log, and added a
manual Client-backlog log. Reports returned correct totals for Issue, Project,
Client, category, and worker dimensions.

## Phase 5: Keyboard UX and production hardening

Tracer bullet: open the authenticated Workspace shell, select a Client and
Project from the tree, create and optimistically update an Issue in list/board
views, inspect it in an animated peek pane, and start/stop its authoritative
timer through keyboard-first controls.

- [x] Add TanStack Query server-state and per-workspace Zustand UI-state
  providers.
- [x] Add command menu and contextual shortcut registry.
- [x] Add collapsible navigation, Client/Project lists, issue list, and board.
- [x] Add rapid issue creation, optimistic movement, and issue peek pane.
- [x] Add visual timer controls backed by authoritative Phase 4 epochs.
- [x] Complete guest/client visibility and audit coverage.
- [x] Profile Project and reporting queries before adding derived structures.
- [x] Validate backups, restores, upgrades, security, and container operations.

Phase 5 runtime verification completed on 2026-07-15. Authenticated desktop and
mobile browser tracers exercised Project navigation, list/board switching, command
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

## shadcn Sidebar migration

Tracer bullet: replace the workspace's native sidebar shell with the official
shadcn Sidebar provider, icon-collapse layout, menu primitives, inset content,
and mobile Sheet while keeping workspace selection state authoritative in the
existing per-workspace Zustand store.

- [x] Add the owned shadcn Sidebar primitive and mobile breakpoint hook.
- [x] Bridge controlled desktop open state to the workspace view store.
- [x] Recompose Client, Project, and account navigation as Sidebar menus.
- [x] Re-verify keyboard toggles, icon mode, mobile drawer, and workspace flows.

The Sidebar migration was completed and runtime-verified on 2026-07-15. The
workspace now uses shadcn SidebarProvider, SidebarInset, icon collapse, rail,
groups, menus, collapsible submenus, tooltips, and the automatic mobile Sheet.
Authenticated browser tracers verified expanded and collapsed desktop states as
well as closed and open mobile drawer states against the rebuilt Docker stack.

## Linear-inspired workspace navigation and work items

Tracer bullet: replace the selection-driven workspace shell with canonical
Workspace, Client, Project, and Issue routes; preserve an existing Issue's user
assignment through a multi-assignee migration; and navigate from the exact
approved sidebar hierarchy into a Project overview and full Issue page.

- [x] Remove the deprecated grouping domain, schema, API, filters, reporting
  dimensions, and UI.
- [x] Replace single Issue assignees with tenant-safe Issue and Project assignee
  collections.
- [x] Add the Workspace switcher and exact Inbox, My Issues, Workspace, and Your
  clients sidebar hierarchy.
- [x] Add canonical Workspace, Client, Project, and Issue routes.
- [x] Add Linear-style Project Overview, Activity, and Issues surfaces.
- [x] Add compact property triggers, multi-user assignment, labels, types,
  resources, milestones, updates, audit events, and Issue comments.
- [x] Re-run migrations, static checks, unit tests, production build, and
  authenticated desktop/mobile browser tracers.

Server data and mutations remain encapsulated in TanStack Query hooks. Zustand
is limited to sidebar disclosure, overlays, filters, and focus state. Shared
domain services own authorization and tenant invariants, and UI modules remain
below 500 lines.

The route and work-item refactor was completed and runtime-verified on
2026-07-16. Migration 0004 preserved existing individual assignments while
normalizing Issue and Project assignees, added Project/Issue activity metadata,
and removed the deprecated grouping and report dimensions. Authenticated Chrome
tracers verified the exact approved sidebar hierarchy, Workspace switcher,
Client submenus, Project tabs, property popovers, grouped Issues, full Issue
detail, and mobile drawer against the rebuilt Compose stack.

# Chrono Roadmap

## Entity header and deletion refinement

Tracer bullet: navigate Client → Project → Issue through a compact Linear-like
header, then archive an authorized entity from its trailing actions menu and
return to the nearest valid parent without losing historical time data.

- [x] Rebuild the shared header hierarchy with icons, chevrons, and stronger typography.
- [x] Add authorized soft deletion for Clients, Projects, and Issues.
- [x] Add reusable confirmation UI and TanStack cache invalidation.
- [x] Reject deletion while an affected Issue timer is active.
- [x] Verify descendant archival, redirects, favorites, builds, and Docker runtime.

The entity header and deletion refinement was completed and runtime-verified on
2026-07-18 against the supplied Linear header reference. Temporary fixtures
confirmed Issue, Project-descendant, and Client-descendant archival plus active
timer rejection. Authenticated HTTP tracers returned `200` for all three DELETE
routes, cleanup removed every tracer fixture, and the 30-test suite, production
build, and rebuilt Compose stack passed.

## Client time reports

Tracer bullet: open a Client-level Time tab, review the current month by
default, change the reporting period and dimensions through route-backed
filters, and reconcile summary totals with the underlying Issue entries.

- [x] Add the Time route and Client header tab after Projects.
- [x] Authorize Client-scoped time-entry reporting with role-aware visibility.
- [x] Add current-month presets and a custom shadcn date-range picker.
- [x] Add summary, trend, category, Project, contributor, and entry-detail views.
- [x] Verify filter URLs, aggregation accuracy, responsive UX, and Docker runtime.

The Client Time report was completed and runtime-verified on 2026-07-18. A
reversible service tracer reconciled Client-wide and Project-filtered totals,
and an authenticated HTTP tracer returned `200` for both the report API and
canonical Time page. The current-month default, preset/custom ranges, URL
filters, 29-test suite, production build, and rebuilt Compose stack passed.

## Issue time tracking experience

Tracer bullet: classify Issue work with Workspace-wide time entry types, start
or manually record work directly below the comment composer, see finalized
entries in the shared Activity stream, and understand effort through compact
Issue-level charts in the property rail.

- [x] Provision Planning, Documenting, Developing, Testing, and Other for every Workspace.
- [x] Add searchable time-entry type selection and authorized inline type creation.
- [x] Add an explicit work-date picker to manual time entries.
- [x] Move timer and manual-entry controls beneath the Issue comment composer.
- [x] Merge finalized timer and manual entries into Issue Activity.
- [x] Add gradient time history and stacked radial type-distribution charts.
- [x] Verify authorization, timer recovery, responsive UX, build, and Docker runtime.

The Issue time tracking experience was completed and runtime-verified on
2026-07-17. Migration 0010 provisioned the five standard Workspace types while
preserving custom categories. A reversible service tracer recorded and removed
a categorized Issue entry, confirmed category color/name projection into
Activity, and retained authoritative timer behavior. TypeScript, ESLint, 26
unit tests, the production build, and the rebuilt development Compose stack
all passed; the application, PostgreSQL, and Mailpit are healthy.

On 2026-07-18, manual logging gained a shadcn Calendar work-date picker. A
reversible historical-entry tracer confirmed the selected local date survives
server validation and persistence; the expanded 27-test suite, production
build, and rebuilt Compose stack remained green.

## Linear-style Issue detail

Tracer bullet: open an Issue through a compact Client → Issues breadcrumb,
edit its title and description in a centered reading column, update grouped
properties from the right rail, comment in-place, and retain time tracking.

- [x] Add the compact identifier/title route header and Issue actions.
- [x] Center the Issue body with a whitespace-separated property rail.
- [x] Group status, labels, Project, details, and time controls semantically.
- [x] Rebuild Activity around an integrated comment composer.
- [x] Preserve optimistic properties, comments, timers, and manual logging.

## Linear-style Project issue creation

Tracer bullet: choose Branch scope from the Project tab row, click a status
group’s add button, and create an Issue through a wide Linear-style composer
with Project, Branch, and workflow status already selected.

- [x] Move the compact Branch selector into the rounded Project tab row.
- [x] Remove the separate Branch/New Issue toolbar.
- [x] Add per-status-group Issue creation actions.
- [x] Persist the selected workflow status during Issue creation.
- [x] Rebuild the composer with property pills, expand, and Create more.

## Linear-style application chrome

Tracer bullet: navigate the full Workspace inside near-black application chrome,
with a gray inset content canvas, rounded desktop separation, dense navigation
typography, and icon-complete Client navigation.

- [x] Retune shared shadcn tokens for black sidebar chrome and gray content.
- [x] Add the rounded, bordered, shadowed desktop content inset.
- [x] Refine Sidebar typography, density, active states, and icon proportions.
- [x] Render persisted Client icons and icons for every Client subroute.
- [x] Keep Project identity in Overview and use rounded Project tabs.
- [x] Verify responsive behavior, static checks, tests, build, and Docker health.

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
- [x] Remove the redundant embedded Client Issues view-mode toolbar.
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
- [x] Add Client-owned and Project-owned workflows and workflow statuses.
- [x] Give every Client and Project an independent workflow.
- [x] Add tenant-safe Project access policies.

Phase 2 runtime verification completed on 2026-07-15. The authenticated tracer
created DaCredit and multiple Projects. It verified Client and Project issue
namespaces, Client-owned and Project-owned workflows, default workflow statuses,
mutation-origin protection, and duplicate-key conflicts.

## Phase 3: Flexible issue engine

- [x] Add Issue with required Workspace and Client relations.
- [x] Keep Project and assignee relations nullable and independent.
- [x] Allocate stable issue keys from the effective Client or Project namespace.
- [x] Require a workflow status for every Issue.
- [x] Add workspace-scoped Client issue lists with Project and assignee filters.
- [x] Add optimistic issue mutations with version conflict handling.

Phase 3 runtime verification completed on 2026-07-15. The authenticated tracer
created individually assigned and unassigned issues.
It verified atomic namespace counters, stable issue keys, Project workflow
defaults, direct Client Issue statuses, cross-workflow category mapping,
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

## Demo workspace fixtures

Tracer bullet: seed a realistic agency portfolio through the existing Client,
Project, Branch, and Issue application services without replacing or deleting
any current workspace data.

- [x] Add an idempotent demo fixture catalog with varied Clients and Projects.
- [x] Populate Project workflows with Main and Branch Issues across statuses.
- [x] Include Project priority, lead, target date, health, and assignment data.
- [x] Add a reusable `db:seed:demo` command with Workspace selection.
- [x] Replay the command twice and verify database counts and application health.

The fixture command only creates entities missing by stable Client key, Project
slug, Branch slug, or Project-scoped Issue title. Existing records and user
changes are left intact.

Runtime verification on 2026-07-17 created three Clients, seven Projects,
eight Branches, and forty Issues on the first replay. The second replay created
zero records. Together with the existing DaCredit fixtures, the demo Workspace
contains four Clients, eight Projects, eight Branches, and forty-two Issues.

## First-class Client Issues

Tracer bullet: replace the implicit null-status Client backlog with a real
Client-owned workflow, then render Project context as a compact navigation chip
in aggregate Client Issue lists.

- [x] Give every Client a default workflow and migrate direct Issues to Backlog.
- [x] Reuse status creation, mapping, authorization, and pickers for Client and Project workflows.
- [x] Enable status changes in Client Issue rows, creation, and full Issue detail.
- [x] Add clickable Project chips and tighten identifier-to-status spacing.
- [x] Replay migrations and verify static checks, tests, production build, and Docker health.

Migration 0008 was replayed through the complete migration chain and applied to
the demo Workspace on 2026-07-17. A reversible service tracer moved a direct
Client Issue from Backlog to In Progress and restored it, while database checks
confirmed that no Issue retains a null status. The shared aggregate list now
merges equivalent Client and Project status groups and links Project chips to
their canonical Issue routes.

## Client Issue aggregation context

Tracer bullet: prove that the Client Issue surface retains direct, Project
Main, and named-Branch Issues in one aggregate list, then expose the missing
Project/Branch context and status-scoped creation controls.

- [x] Guard aggregate grouping across direct, Main, and named-Branch Issues.
- [x] Show `Project / Branch` in the Project chip for named Branch Issues.
- [x] Add status-group creation controls to Client Issue views.
- [x] Verify aggregate counts, static checks, production build, and Docker health.

Runtime verification on 2026-07-17 confirmed that the application service and
shared grouping retain every Client Issue across all three scopes. Demo Client
counts ranged from ten to twelve Issues, including four named-Branch Issues per
Client. The production Compose build and application health check remained green.

## Issue creation confirmation

Tracer bullet: surface the authoritative created Issue identity in a single
workspace-level toast with selected-status context and canonical navigation.

- [x] Add the owned react-hot-toast primitive and Workspace Toaster.
- [x] Type the Issue creation API response and emit a status-aware success toast.
- [x] Link the toast to the canonical Client or Project Issue route.
- [x] Verify repeated creation, static checks, production build, and Docker health.

The workspace-level Toaster and status-aware confirmation were completed on
2026-07-17. The creation callback uses the server-returned Issue ID and
identifier, while the route helper is covered for both direct Client and
Project Issue destinations. Static checks, twenty-four tests, the production
Compose build, and container health remained green.

## Shared entity headers and favorites

Tracer bullet: favorite one Client, Project, and Issue from a shared header and
navigate to all three through a conditional membership-scoped sidebar section.

- [x] Add tenant-safe membership favorites and Project icon identity.
- [x] Add authorized list/toggle APIs with optimistic TanStack Query hooks.
- [x] Recompose Client, Project, and Issue headers from one shared standard.
- [x] Make the entity actions popover functional and context-aware.
- [x] Render Favorites conditionally with Client, Project, and Issue icons.
- [x] Replay migrations and verify tests, production build, and Docker health.

Migration 0009 and the shared entity header were completed on 2026-07-17. A
reversible service tracer favorited and resolved one Client, Project, and Issue,
then removed all three. All existing Projects received icon identity, favorites
remained membership-scoped, and the section stayed absent after cleanup.
Twenty-five tests, the production Compose build, and container health passed.

# Chrono Architecture

## Product boundary

Chrono is a self-hosted agency workspace. A Workspace represents the operating
company, Clients represent customers, and work is organized through Projects
and Issues. Every Project is a direct child of one Client.

The system is a modular monolith: one Next.js App Router application, one
PostgreSQL database, and independently testable domain services behind thin API
route handlers. Authentication uses NextAuth database sessions and email magic
links.

## Entity hierarchy

```text
Workspace
├── Workspace memberships
│   └── Client, Project, and Issue favorites
└── Clients
    ├── Icon or emoji identity
    ├── Default issue namespace
    ├── Default workflow
    ├── Explicit Client roster
    ├── Pinned resources
    └── Projects
        ├── Optional issue namespace override
        ├── Icon or emoji identity
        ├── Owned workflow
        ├── Branches
        ├── Priority and one optional lead
        ├── User assignees
        ├── Updates, activity, resources, and milestones
        └── Issues
            ├── User assignees
            ├── Labels and issue type
            ├── Comments
            └── Time entries
```

An Issue always belongs to a Workspace and Client. Its Project is nullable, so
direct Client Issues use the Client workflow without requiring a Project.
Project Issues live on virtual Main when `branchId` is null or on one named
Project Branch. User responsibility is modeled
through `issue_assignees` and `project_assignees`, allowing zero, one, or many
active Workspace members without duplicating columns on the work item.

Clients store an independent icon-or-emoji identity with a validated hex color.
Projects use the same owned icon identity model, with an independently editable
icon or emoji and color.
`client_memberships` is both the guest access boundary and the explicit roster
shown in the Client workspace. `client_resources` stores ordered, tenant-safe
HTTP/HTTPS links authored by Workspace memberships.

## Identity and workflows

Workspace-level issue prefixes are prohibited. Every Client owns one default
`IssueNamespace`; a Project may override it. Issues use their Project namespace
when present and otherwise fall back to the Client namespace. The allocated
namespace and number remain stable when an Issue moves.

Every Client owns one default workflow and every Project owns one workflow under
that Client. A direct Client Issue must use a status from the Client workflow;
a Project Issue must use a status from its Project workflow. Backlog is a real,
switchable workflow status rather than a null-state presentation fallback.

Branches are one-level Project workstreams, not nested Projects or version-control
forks. Feature, sprint, refactor, release, and other Branches share their
Project's workflow, issue namespace, visibility, permissions, and assignees.
Projects also store a delivery priority and one optional lead membership. The
lead is a singular coordination role and does not replace the Project's
multi-user assignee collection.

Project and Issue creation run in serializable transactions. Issue updates
require `expectedVersion`, increment the stored version atomically, and return
a controlled conflict for stale mutations.

## Project and Issue activity

`project_updates` stores authored progress updates with optional health and
progress snapshots. `project_activity_events` stores immutable automated audit
events with structured JSON payloads. Project resources and milestones use
ordered child tables.

Issue comments are authored records with soft-deletion timestamps. Labels and
issue types are Workspace metadata connected through tenant-safe foreign keys.
Every cross-entity reference includes Workspace scope where PostgreSQL permits
it, preventing cross-tenant relationships at the database boundary.

## Time attribution

Time is recorded only against Issues. `TimerSession` is the authoritative live
clock record and stores raw `startedAt` and optional `stoppedAt` epochs. Browser
clients derive elapsed display time locally, so no database write occurs on a
visual tick. A partial unique index permits one active timer per user across
devices.

Stopping a timer creates one finalized `TimeLog`. Timer and manual entries
snapshot Client, Project, worker, category, and billable dimensions. Reports
also snapshot the Branch active when work begins. Reports aggregate by Issue,
Project, Branch, Client, category, or worker while remaining
historically stable after Issue movement.

Time categories are Workspace-owned metadata. A data migration and the
Workspace provisioner establish Planning, Documenting, Developing, Testing,
and Other without removing custom categories. Issue detail loads finalized
logs through an Issue-authorized query; the same TanStack cache drives Activity,
the cumulative area chart, and the stacked radial category distribution.

Client reporting is exposed through a dedicated application service layered
over the authoritative time-log service. It reuses Client visibility, worker
scope, date validation, and snapshotted dimensions rather than duplicating
report SQL. Client-wide queries are capped at 1,000 finalized entries and use
completion-date boundaries so manual work dates match report periods.

## Authorization

`WorkspaceMembership` is the tenant principal. Resource services enforce:

- Workspace membership and role.
- Client access and contribution permission.
- Project and Issue visibility.
- Assignment to active memberships from the same Workspace.
- Workflow/status compatibility.
- Optimistic mutation versions.

Route handlers and Server Components resolve the principal and delegate to
these services. Coarse authentication is never treated as resource-level
authorization.

## Frontend boundaries

Canonical App Router URLs own navigation state. The shared Workspace layout
renders the shadcn Sidebar and route content; active menu state comes from the
pathname rather than duplicated selection state.

Each Client renders through one persistent route shell with Overview, Issues,
Projects, and Members pill tabs. The Overview owns editable Client identity,
searchable lazy-loaded Lucide icons, emojis, pinned resources, roster avatars,
and Issues/Projects shortcuts. Existing Issue and Project directories render
inside this shell without duplicate route headers.

TanStack Query owns all asynchronous data, cache invalidation, optimistic
updates, and server mutations through custom hooks. Zustand owns synchronous
UI state only: sidebar disclosure, Client submenu expansion, overlays, view
mode, focus, and the command menu. Components never fetch server data through
effects.

Issue timer and manual-entry controls live below the comment composer rather
than in the property rail. Starting a timer persists only its authoritative
epoch; the browser derives the live counter. Stopping or manually logging work
invalidates the Issue time-log query, which updates Activity and both charts
without duplicated component state.

The Client `Time` tab keeps its period and dimension filters in canonical URL
search parameters. TanStack Query keys include the complete filter object;
pure report utilities derive summary cards, daily trend points, and category,
Project, and contributor breakdowns from the returned entries.

`workspace_favorites` stores membership-scoped Client, Project, and Issue
references with tenant-safe composite foreign keys and an exact-target check.
Favorite target authorization is re-evaluated when listing and mutating; stale
or inaccessible targets are not exposed. The conditional sidebar section is a
projection of this TanStack-owned server state.

Project and Issue properties are compact icon/value triggers. Each trigger
opens an appropriate shadcn/Radix popover or command list only after activation.
Every Issue list route uses one shared Linear-style row implementation grouped
by non-empty workflow status. Priority, status, labels, and assignees mutate
inline with optimistic TanStack Query updates; aggregate views resolve status
options through deduplicated queries for each represented Client or Project workflow.
Aggregate Client lists retain direct, Project Main, and named-Branch Issues.
Project Issues show a compact Project navigation chip; named-Branch Issues add
the Branch name and route directly to that Branch scope.
Project directory rows expose the same inline model for priority, lead, target
date, and Project state while preserving row-level keyboard navigation.
The workspace and Client Project directories use one flat Linear-style table
with latest-update health, priority, lead, target date, Issue count, and derived
completion progress. Project Issue Branch scope is URL-backed: no query means
Main, `branch=all` means all Branches, and `branch=:branchId` selects one named
Branch through a compact Select.
Animations use `@gsap/react` and compositor-friendly transform/opacity values.

## Deployment and constraints

- Compose runs PostgreSQL, a one-shot Drizzle migrator, Next.js, and Mailpit in
  local development.
- PostgreSQL data persists in a named volume.
- Source files stay below 500 lines.
- Route handlers remain thin and domain services encapsulate invariants.
- Architectural and migration changes are committed atomically.

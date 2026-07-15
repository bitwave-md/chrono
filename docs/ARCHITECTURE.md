# Chrono Architecture

## Product boundary

Chrono is a self-hosted agency workspace. A workspace represents the operating
company, such as Bitwave. Clients, projects, functional teams, issues, and time
records live inside that workspace.

The application is designed as a modular monolith: one Next.js application,
one PostgreSQL database, and independently testable domain modules behind thin
transport boundaries.

Phase 1 pins stable NextAuth 4 with its compatible Drizzle adapter. Auth.js v5
remains published under a beta tag, so it is not the production baseline. The
initial provider is email magic-link authentication backed by database sessions.

## Approved hierarchy

```text
Workspace
├── Clients
│   ├── Issue namespace
│   └── Projects
│       ├── Optional issue namespace override
│       ├── Project-owned workflow
│       └── Child projects / subprojects / sprints
├── Functional teams
└── Workspace memberships

Issue
├── Workspace: required
├── Client: required
├── Project or subproject: optional
├── Team: optional
├── Assignee: optional
├── Issue namespace: required
└── Workflow status: required only when a project is assigned
```

Projects and teams are independent. Multiple teams can work in the same project
through different issues. A team never owns a project or workflow.

## Issue identity

Workspace-level issue prefixes are prohibited. Human-readable issue keys are
allocated by an `IssueNamespace` owned by either a Client or a Project node.

An issue namespace contains:

- An immutable identifier.
- Its owning workspace.
- Exactly one owning Client or Project.
- A prefix unique within the workspace.
- The next sequence number.

Every Client has one default namespace. A Project or Subproject may define an
override namespace. If it does not, its issues inherit the nearest ancestor
Project namespace, falling back to the Client namespace.

An Issue stores its allocated namespace and sequence number. Moving an issue
does not silently change its key. Re-keying, if ever supported, must be an
explicit audited operation.

Because Workspace cannot allocate an issue key, every persisted Issue belongs
to a Client. A nullable `projectId` therefore represents a Client backlog item,
not a clientless workspace item.

## Project hierarchy

`Project.parentId` is a nullable self-reference. The same table represents root
projects, subprojects, and sprints. A `kind` field distinguishes their product
meaning without creating parallel tables.

A child Project must belong to the same Workspace and Client as its parent.
Project commands must reject self-parenting and descendant cycles inside a
transaction. Recursive PostgreSQL queries provide breadcrumbs and subtree
queries. A closure table is deferred until measurements justify it.

The implemented PostgreSQL model uses composite foreign keys so a child Project
cannot reference a parent from another Workspace or Client. Root nodes must use
the `project` kind and own a Workflow; child nodes use `subproject` or `sprint`
and may own or inherit a Workflow. Cyclic moves are rejected inside a serializable
transaction using a recursive descendant query.

## Workflows

Workspace and Team do not own workflow statuses.

A Workflow is owned by a Project. WorkflowStatus records belong to that
Workflow. A root Project receives a default workflow when it is created. A child
Project may either inherit the nearest ancestor workflow or own a custom one.

When an Issue has a Project, its status must belong to the Project's effective
workflow. When an Issue is moved to a Project with a different workflow, the
IssueService maps the status by semantic category or uses the destination
workflow's default status.

A Client-backlog Issue with no Project has no workflow status. Assigning it to a
Project atomically assigns that Project's default status. Removing it from a
Project clears its workflow status.

Team changes never affect workflow status.

Each owned Workflow is created with Backlog, Todo, In Progress, Done, and
Canceled statuses. A partial unique index enforces one active default status per
Workflow. An inherited Project stores no duplicate Workflow or statuses.

## Flexible issue engine

An Issue always stores its Workspace and Client. Project, Team, and assignee are
independent nullable relations, allowing Project backlog items, functional-Team
work, direct individual assignments, combined Team/individual assignments, and
unassigned Client backlog items without parallel issue models.

Issue creation runs in a serializable transaction. It resolves the effective
namespace and workflow, atomically advances the namespace counter, and persists
the allocated namespace and number on the Issue. Concurrent creation therefore
cannot allocate the same human-readable key.

Issue updates use an integer `version`. Callers submit the version they loaded;
the update predicate matches both Issue ID and version, then increments the
version atomically. A missing match returns a controlled conflict instead of
overwriting another user's mutation. Project moves preserve the allocated issue
key. Moving between different effective workflows maps status by semantic
category, while moves inside the same workflow preserve the exact status.

## Time attribution

Time is logged only against Issues. Timer sessions and finalized time logs
snapshot the Issue's Client, exact Project node, root Project, and Team at the
time the entry begins or is manually created. The worker dimension is the user
who recorded the time, not necessarily the current Issue assignee.

These snapshots preserve historical reports when an Issue is later moved.

`TimerSession` is the authoritative running-clock record. It stores one raw
`startedAt` epoch and is read with a server-clock value; browser clients derive
the visual elapsed time locally and never write database ticks. A partial unique
index on the worker user ID enforces one active timer across all Workspaces and
devices. Starting a second timer returns a conflict.

Stopping a timer atomically stamps `stoppedAt` and creates exactly one
`TimeLog`. The finalized duration is derived from the stored start and stop
epochs. A unique TimerSession relation prevents duplicate finalization. Manual
logs use the same snapshot resolver and reporting table, so reports do not need
separate timer/manual query paths.

`TimeCategory` belongs to a Workspace and provides a stable reporting key,
display name, color, and default billable flag. A time entry may remain
uncategorized; its billable value is always snapshotted on the session/log.

Workspace owners and admins can aggregate finalized logs by Issue, exact
Project, snapshotted root Project, current recursive Project subtree, Client,
Team, category, or worker. Members and guests can list only their own time logs.
Guests can start or manually log time only on Client-shared or directly assigned
Issues where their ClientMembership grants contribution.

## Authorization boundary

WorkspaceMembership is the tenant principal. An Issue assignee must be an
active member of the same Workspace but does not need to belong to the Issue's
Team. Route handlers, server actions, and server-rendered loaders delegate to a
shared authorization service and tenant-scoped repositories.

Middleware performs coarse authentication only; it is never the resource-level
authorization boundary.

## Frontend state boundary

TanStack Query owns asynchronous server state, cache invalidation, and
optimistic mutations. Zustand owns synchronous UI state such as the sidebar,
command menu, and peek pane, and is consumed through selectors.

The root App Router layout creates one browser QueryClient with bounded stale
and garbage-collection windows. Feature-specific hooks encapsulate every query
and mutation; components never fetch through effects. Issue creation and updates
cancel the active list query, snapshot it, apply an optimistic record or patch,
roll back on failure, and invalidate the Workspace Issue prefix on settlement.

Each authenticated Workspace shell creates separate vanilla Zustand stores for
navigation/view state, overlays, and the command menu. React providers scope the
stores to the rendered Workspace request, and components always subscribe with
selectors. Server records are never copied into a store.

Active timer state remains in TanStack Query. Mutations notify other tabs with a
BroadcastChannel and every tab invalidates the authoritative timer query. The
visual clock derives elapsed seconds from `startedAt` and `serverNow` locally.

Animations use GSAP through `@gsap/react` and `useGSAP`. Only compositor-friendly
properties are animated.

## Implementation constraints

- Feature modules encapsulate data access and domain invariants.
- Route handlers and components remain thin.
- Source files stay below 500 lines.
- Database-specific constraints may use explicit SQL migrations.
- Private data is never cached without tenant and principal scoping.
- Architectural changes and migrations are committed atomically.

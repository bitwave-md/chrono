# Chrono Architecture

## Product boundary

Chrono is a self-hosted agency workspace. A Workspace represents the operating
company, Clients represent customers, and work is organized through Projects
and Issues. Every Project is a direct child of one Client.

The system is a modular monolith: one Next.js App Router application, one
PostgreSQL database, and independently testable domain services behind thin API
route handlers. Authentication uses signed NextAuth JWT sessions and separate
Argon2id credentials. Email is an unverified login identifier; invitation and
recovery URLs are one-time bearer credentials. User and membership identity
remains authoritative in PostgreSQL.

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
            ├── Comments and immutable activity events
            ├── Private attachments and expiring share links
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
`client_memberships` grants a Guest access to a Client and its direct backlog.
`project_memberships` is the distinct Project access roster; it is never
inferred from `project_assignees`. Both boundaries are required for Guest
Project access. Direct Issue assignment grants access to only that Issue and
does not expose its Project. Invitation access snapshots store selected Clients
and excluded current Projects until acceptance provisions both rosters.
`client_resources` stores ordered, tenant-safe HTTP/HTTPS links authored by
Workspace memberships.

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
events with structured JSON payloads. Guests with Project membership may
publish updates and edit only their own update text; they cannot alter Project
properties. Project resources and milestones use ordered child tables.

Issue comments are authored records with soft-deletion timestamps and a
tenant-safe, same-Issue parent reference for one-level reply threads. Labels
and issue types are Workspace metadata connected through tenant-safe foreign
keys. Immutable `issue_activity_events` record Issue creation and property
transitions, including label-set differences, independently from authored
comments. Comment authors may update their own text; authors and Workspace
administrators may soft-delete comments through the centralized comment
service, which also retires files attached directly to the deleted record.
Every cross-entity reference includes Workspace scope where PostgreSQL permits
it, preventing cross-tenant relationships at the database boundary.

## Private object storage

`stored_objects` is the lifecycle and quota authority for opaque S3 object
keys. `attachments` connects one ready object to exactly one Client, Project,
or Issue. Issue attachments optionally reference a comment in the same
Workspace and Issue; a null comment denotes a description attachment. Comment
creation validates ownership and links uploaded files in one transaction.
Personal avatars and Workspace images reference separately processed
identity objects. Raw bucket keys and credentials never reach the browser.

Uploads reserve quota as `pending`, stream through an authenticated same-origin
route, enforce declared and actual size, inspect magic bytes and unsafe active
content, calculate SHA-256, and become `ready` only after S3 succeeds. Failed,
canceled, and abandoned uploads transition to `deleted`; opportunistic cleanup
removes reservations older than 24 hours. Identity images are decoded, cropped,
stripped of metadata, and re-encoded as 256px WebP with Sharp.

`attachment_share_links` stores only SHA-256 token digests. Anonymous access is
limited to one attachment, expires within 30 days, rechecks creator and target
state, increments aggregate access counters without IP retention, and responds
with download-only security headers plus per-token rate limiting.

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

Finalized time-entry edits are versioned transactions. They preserve `endedAt`
and `billable`, derive a new `startedAt` from the requested exact duration, and
validate the replacement category inside the same Workspace. Owners and admins
may edit visible entries; members are constrained to their own worker ID and
Guests remain read-only. Report and Issue time-log caches are invalidated after
the authoritative mutation succeeds.

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

One domain aggregator is authoritative for browser and printable Client/Project
reports. It derives daily totals, dimension breakdowns, and Issue-grouped entry
sets from authorized logs. A separate document model applies presentation-only
whole-hour rounding before the PDF renderer creates a Unicode-capable landscape
A4 document. Exact persisted durations and browser totals are never rounded or
mutated by export formatting.

PDF calendar presentation uses the exporter's validated IANA timezone. Query
boundaries remain exact timestamps, while a dedicated report-calendar domain
object assigns entries to local date keys and enumerates the selected calendar
days without assuming every day contains exactly 24 hours. This prevents
positive-offset and daylight-saving ranges from losing or inventing edge days.

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

Settings replaces the normal application sidebar with searchable Personal,
Workspace, and operator-only Administration categories. Its narrow content
column and divided cards reuse the same shadcn primitives. TanStack Query owns
every profile, preference, membership, storage, and update request; local form
and upload-progress state stays component-scoped.

Official application updates preserve the same state boundary. TanStack Query
polls operator-only release and job state and performs the enqueue mutation; a
small UI bridge derives the once-per-version toast and badge. Next.js can write
only a structured `install_latest` request directory and read host-produced
status. The isolated updater alone mounts the Docker socket and installation
directory, validates GitHub release manifests, executes fixed backup and
Compose stages, and persists resumable status. Agent mount paths use a separate
environment namespace so they cannot override child Compose interpolation.
Post-migration startup or health failures restore the previous image references
and app before reporting their recovery outcome. No Docker command or image
reference is accepted from browser input.

Issue timer and manual-entry controls live below the comment composer rather
than in the property rail. Starting a timer persists only its authoritative
epoch; the browser derives the live counter. Stopping or manually logging work
invalidates the Issue time-log query, which updates Activity and both charts
without duplicated component state.

The Client and Project `Time` tabs keep period and dimension filters in
canonical URL search parameters. Project views lock the Project dimension.
Guest reports include only direct Client work and explicitly accessible
Projects. TanStack Query keys include the complete filter object;
pure report utilities derive summary cards, daily trend points, and category,
Project, and contributor breakdowns from the returned entries.

`workspace_favorites` stores membership-scoped Client, Project, and Issue
references with tenant-safe composite foreign keys and an exact-target check.
Favorite target authorization is re-evaluated when listing and mutating; stale
or inaccessible targets are not exposed. The conditional sidebar section is a
projection of this TanStack-owned server state.

`inbox_notifications` is a recipient-owned projection of relevant Issue
events. Assignment, status-change, and comment mutations emit notifications to
the Issue creator and current assignees, excluding the actor. Each row keeps
tenant-safe references to its recipient, actor, and Issue plus independent read
and dismissed timestamps. Listing rechecks current Issue visibility, so a
notification never restores access that the recipient has since lost.

Client, Project, and Issue deletion uses domain-owned soft-archive operations.
Client and Project archival atomically archives active descendants while
retaining immutable time attribution. Active timers are checked before the
transaction and block deletion with a conflict. TanStack invalidates entity
directories, Issue collections, and favorites before navigation returns to the
nearest surviving parent route.

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
date, and Project state while preserving row-level keyboard navigation. The
workspace and Client directories group non-empty Project states beneath shared
gradient-tinted, collapsible headers. Their compact rows retain latest-update
health and derived completion progress; context chips link to the owning Client
and Project Issues without triggering row navigation. Project Issue Branch
scope is URL-backed: no query means
Main, `branch=all` means all Branches, and `branch=:branchId` selects one named
Branch through a compact Select.
Animations use `@gsap/react` and compositor-friendly transform/opacity values.

## Deployment and constraints

- Production Compose pulls matching versioned Next.js and Drizzle migrator
  images from GHCR, runs PostgreSQL and private MinIO internally, and optionally
  enables Caddy. External S3-compatible storage uses an override without MinIO.
- The development override builds source targets and exposes MinIO only on loopback.
- PostgreSQL data persists in a named volume.
- Source files stay below 500 lines.
- Route handlers remain thin and domain services encapsulate invariants.
- Architectural and migration changes are committed atomically.

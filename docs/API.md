# Chrono API

The API is an internal browser-session boundary. Mutations require an active
database session, an accessible WorkspaceMembership, and an `Origin` matching
`NEXTAUTH_URL`.

## Clients

### List clients

`GET /api/workspaces/:workspaceSlug/clients`

Owners, admins, and members receive active clients in the workspace. Guests
receive only clients connected to their ClientMembership.

### Create a client

`POST /api/workspaces/:workspaceSlug/clients`

Owner or admin only.

```json
{
  "name": "DaCredit",
  "key": "DAC",
  "issuePrefix": "DAC",
  "description": "Digital lending client"
}
```

Creation is transactional: the Client and its default IssueNamespace either
both exist or neither exists.

## Projects

### List a project tree

`GET /api/workspaces/:workspaceSlug/projects?clientId=:clientId`

Returns nested active Projects with both owned and effective namespace/workflow
values.

### Create a project node

`POST /api/workspaces/:workspaceSlug/projects`

```json
{
  "clientId": "uuid",
  "parentId": null,
  "name": "Main CRM",
  "slug": "main-crm",
  "kind": "project",
  "workflowMode": "own",
  "visibility": "internal",
  "namespacePrefix": null
}
```

Root nodes must use `project` and `own`. Child nodes use `subproject` or `sprint`
and may use `own` or `inherit`. Namespace overrides are optional.

### Move a project node

`POST /api/workspaces/:workspaceSlug/projects/:projectId/move`

```json
{
  "parentId": "uuid"
}
```

The destination must belong to the same Workspace and Client. Self-parenting and
moving a node beneath one of its descendants are rejected.

## Teams

### List teams

`GET /api/workspaces/:workspaceSlug/teams`

Returns active functional Teams in the Workspace. Teams do not own Projects or
workflows.

### Create a team

`POST /api/workspaces/:workspaceSlug/teams`

Owner or admin only.

```json
{
  "name": "Backend Team",
  "key": "BE",
  "description": "Backend engineering"
}
```

## Issues

### List issues

`GET /api/workspaces/:workspaceSlug/issues?clientId=:clientId`

`clientId` is required. `projectId`, `teamId`, and `assigneeId` are optional
filters. Guests receive only Client-shared issues or issues assigned directly to
them.

### Create an issue

`POST /api/workspaces/:workspaceSlug/issues`

```json
{
  "clientId": "uuid",
  "projectId": "uuid",
  "teamId": null,
  "assigneeId": "user-uuid",
  "statusId": null,
  "parentIssueId": null,
  "title": "Implement partner API client",
  "description": null,
  "priority": "high",
  "visibility": "internal"
}
```

Project, Team, and assignee are independent. A Project issue receives its
effective workflow's default status when `statusId` is omitted. A Client-backlog
issue uses `projectId: null` and must have no status. Issue identity is allocated
from the effective Client or Project namespace in a serializable transaction.

### Update an issue

`PATCH /api/workspaces/:workspaceSlug/issues/:issueId`

Only fields present in the request are changed. Nullable relations can be
cleared explicitly with `null`. `expectedVersion` is required for optimistic
concurrency.

```json
{
  "expectedVersion": 4,
  "projectId": "uuid",
  "teamId": null,
  "assigneeId": "user-uuid",
  "statusId": "uuid",
  "title": "Implement signed partner API client",
  "priority": "urgent",
  "visibility": "client_shared"
}
```

Moving between Projects preserves the issue key. The exact status is retained
when both Projects use the same effective workflow; otherwise it is mapped by
workflow category or falls back to the destination default. Moving to the
Client backlog clears the status. Team-only changes never alter workflow state.
A stale `expectedVersion` returns `409 conflict`.

### List workflow statuses

`GET /api/workspaces/:workspaceSlug/workflows/:workflowId/statuses`

Returns active statuses ordered by position for a tenant-accessible effective
Project workflow. The board uses these IDs for optimistic movement.

## Time categories

### List categories

`GET /api/workspaces/:workspaceSlug/time-categories`

Returns active Workspace categories.

### Create a category

`POST /api/workspaces/:workspaceSlug/time-categories`

Owner or admin only.

```json
{
  "name": "Development",
  "key": "development",
  "color": "#5E6AD2",
  "defaultBillable": true
}
```

## Active timer

### Read the current timer

`GET /api/workspaces/:workspaceSlug/timers/active`

Returns the current user's active timer or `null`, plus `serverNow`. Clients
render elapsed time from `startedAt` and the server clock offset without sending
per-tick writes.

### Start a timer

`POST /api/workspaces/:workspaceSlug/timers/active`

```json
{
  "issueId": "uuid",
  "categoryId": "uuid",
  "note": "Implement partner API client",
  "billable": true
}
```

`categoryId`, `note`, and `billable` are optional. When `billable` is omitted,
the category default is snapshotted. A partial unique index permits only one
active timer per user across Workspaces and devices; another start returns
`409 conflict`.

### Stop the current timer

`DELETE /api/workspaces/:workspaceSlug/timers/active`

Atomically stops the timer and creates one finalized TimeLog containing the
timer's original attribution snapshots.

## Time logs

### List logs

`GET /api/workspaces/:workspaceSlug/time-logs`

Optional filters are `issueId`, `clientId`, `projectId`, `teamId`, `categoryId`,
`workerUserId`, `from`, and `to`. Owners and admins may view Workspace logs;
members and guests are restricted to their own worker dimension.

### Create a manual log

`POST /api/workspaces/:workspaceSlug/time-logs`

```json
{
  "issueId": "uuid",
  "categoryId": "uuid",
  "startedAt": "2026-07-15T17:00:00.000Z",
  "durationSeconds": 3600,
  "note": "Manual implementation work",
  "billable": true
}
```

Manual entries must end in the past and may contain at most 31 days. Client,
Project, root Project, Team, and worker dimensions are captured from the Issue
and authenticated principal when the log is created.

## Time reports

`GET /api/workspaces/:workspaceSlug/time-reports?groupBy=:dimension`

Owner or admin only. `groupBy` accepts `issue`, `project`, `root_project`,
`client`, `team`, `category`, or `worker`. Each row returns total seconds,
billable seconds, and entry count.

The endpoint accepts the TimeLog filters plus `rootProjectId` and
`projectScopeId`. `projectScopeId` recursively includes the selected Project and
its descendants; `rootProjectId` uses the immutable root Project snapshot.

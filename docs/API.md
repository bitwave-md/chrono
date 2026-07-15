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

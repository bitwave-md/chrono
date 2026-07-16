# Chrono API

The API is an internal browser-session boundary. Mutations require an active
database session, an accessible Workspace membership, and a trusted `Origin`.

## Clients and members

- `GET /api/workspaces/:workspaceSlug/clients` lists accessible Clients.
- `POST /api/workspaces/:workspaceSlug/clients` creates a Client and default
  issue namespace for an owner or admin.
- `GET /api/workspaces/:workspaceSlug/members` lists assignable active
  Workspace members. Guest results are limited to the current membership.

## Projects

- `GET /api/workspaces/:workspaceSlug/projects?clientId=:clientId` returns the
  nested Project tree with effective namespace and workflow IDs.
- `POST /api/workspaces/:workspaceSlug/projects` creates a root Project,
  Subproject, or Sprint.
- `POST /api/workspaces/:workspaceSlug/projects/:projectId/move` moves a node
  while rejecting cycles and cross-Client parents.
- `GET /api/workspaces/:workspaceSlug/projects/:projectId` returns Project
  overview data, assignees, progress, latest update, resources, and milestones.
- `PATCH /api/workspaces/:workspaceSlug/projects/:projectId` updates state,
  summary, description, visibility, dates, or the atomic assignee collection.
- `GET|POST /api/workspaces/:workspaceSlug/projects/:projectId/activity`
  reads activity or publishes an authored update.
- `POST /api/workspaces/:workspaceSlug/projects/:projectId/resources` adds a
  validated HTTP/HTTPS resource.
- `POST /api/workspaces/:workspaceSlug/projects/:projectId/milestones` adds a
  Project milestone.

Project assignees are supplied as membership IDs:

```json
{
  "assigneeMembershipIds": ["membership-uuid"]
}
```

## Issues

- `GET /api/workspaces/:workspaceSlug/issues` lists accessible Issues across
  Clients. Optional filters are `clientId`, `projectId`,
  `assigneeMembershipId`, and `mine=true`.
- `POST /api/workspaces/:workspaceSlug/issues` creates an Issue.
- `GET /api/workspaces/:workspaceSlug/issues/:issueId` returns full Issue
  detail, including assignees and labels.
- `PATCH /api/workspaces/:workspaceSlug/issues/:issueId` updates present fields
  and requires `expectedVersion`.
- `GET|POST /api/workspaces/:workspaceSlug/issues/:issueId/comments` lists or
  creates comments.
- `PUT /api/workspaces/:workspaceSlug/issues/:issueId/labels` atomically
  replaces labels.
- `GET /api/workspaces/:workspaceSlug/issue-metadata` returns active issue
  types and labels.

Create example:

```json
{
  "clientId": "uuid",
  "projectId": "uuid",
  "assigneeMembershipIds": ["membership-uuid"],
  "statusId": null,
  "parentIssueId": null,
  "title": "Implement partner API client",
  "description": null,
  "priority": "high",
  "visibility": "internal"
}
```

A Project Issue receives its effective workflow default when `statusId` is
omitted. A Client-backlog Issue uses `projectId: null` and has no persisted
workflow status. Moving between workflows maps status by category. Moving to
the Client backlog clears status. A stale version returns `409 conflict`.

## Workflow statuses

`GET /api/workspaces/:workspaceSlug/workflows/:workflowId/statuses` returns
active statuses ordered by position for an accessible Project workflow.

## Time tracking

- `GET|POST|DELETE /api/workspaces/:workspaceSlug/timers/active` reads, starts,
  or stops the current user's authoritative timer.
- `GET|POST /api/workspaces/:workspaceSlug/time-logs` lists finalized logs or
  creates a manual entry.
- `GET|POST /api/workspaces/:workspaceSlug/time-categories` lists or manages
  reporting categories.
- `GET /api/workspaces/:workspaceSlug/time-reports?groupBy=:dimension`
  aggregates for owners and admins.

Time-log filters are `issueId`, `clientId`, `projectId`, `categoryId`,
`workerUserId`, `from`, and `to`. Report grouping accepts `issue`, `project`,
`root_project`, `client`, `category`, or `worker`; `projectScopeId` includes a
recursive Project subtree.

# Chrono API

The API is an internal browser-session boundary. Mutations require an active
database session, an accessible Workspace membership, and a trusted `Origin`.

## Clients and members

- `GET /api/workspaces/:workspaceSlug/clients` lists accessible Clients.
- `POST /api/workspaces/:workspaceSlug/clients` creates a Client and default
  issue namespace for an owner or admin.
- `PATCH /api/workspaces/:workspaceSlug/clients/:clientId` updates Client name,
  description, icon-or-emoji key, and validated icon color.
- `GET|POST /api/workspaces/:workspaceSlug/clients/:clientId/resources` lists
  or creates pinned Client resources.
- `PATCH|DELETE /api/workspaces/:workspaceSlug/clients/:clientId/resources/:resourceId`
  updates, reorders, or archives a pinned resource.
- `GET|POST /api/workspaces/:workspaceSlug/clients/:clientId/members` lists the
  explicit Client roster or adds an active Workspace membership.
- `PATCH|DELETE /api/workspaces/:workspaceSlug/clients/:clientId/members/:membershipId`
  changes Client permission or removes a roster member.
- `GET /api/workspaces/:workspaceSlug/members` lists assignable active
  Workspace members. Guest results are limited to the current membership.

## Projects

- `GET /api/workspaces/:workspaceSlug/projects` returns the accessible
  Workspace-wide flat Project directory. Optional `clientId` limits it to one
  Client. Records include namespace and workflow IDs, latest-update health,
  priority, lead, target date, Issue counts, and derived completion progress.
- `POST /api/workspaces/:workspaceSlug/projects` creates a Project directly
  under its Client and provisions its workflow.
- `GET|POST /api/workspaces/:workspaceSlug/projects/:projectId/branches` lists
  or creates feature, sprint, refactor, release, and other Branches.
- `PATCH /api/workspaces/:workspaceSlug/projects/:projectId/branches/:branchId`
  updates or archives a Branch. Branches never fork or merge data.
- `GET /api/workspaces/:workspaceSlug/projects/:projectId` returns Project
  overview data, assignees, progress, latest update, resources, and milestones.
- `PATCH /api/workspaces/:workspaceSlug/projects/:projectId` updates state,
  priority, singular `leadMembershipId`, summary, description, visibility,
  dates, icon identity, or the atomic assignee collection.
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
  `branchId`, `branch=main`, `assigneeMembershipId`, and `mine=true`.
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
  "branchId": "uuid-or-null",
  "assigneeMembershipIds": ["membership-uuid"],
  "statusId": null,
  "parentIssueId": null,
  "title": "Implement partner API client",
  "description": null,
  "priority": "high",
  "visibility": "internal"
}
```

An Issue receives the selected Project workflow default, or the Client workflow
default when `projectId` is null, if `statusId` is omitted. Every Issue persists
a workflow status. Moving between Client and Project workflows maps status by
category and clears an incompatible Branch. Moving to another Project also
clears Branch unless a valid destination `branchId` is supplied. A stale
version returns `409 conflict`.

## Workflow statuses

`GET /api/workspaces/:workspaceSlug/workflows/:workflowId/statuses` returns
active statuses ordered by position for an accessible Client or Project workflow.

## Favorites

- `GET /api/workspaces/:workspaceSlug/favorites` lists the current membership's
  accessible Client, Project, and Issue favorites.
- `PUT /api/workspaces/:workspaceSlug/favorites` idempotently sets favorite
  state with `targetType`, `targetId`, and `favorite`.

Favorites are membership-scoped and reapply normal target visibility rules.
The response includes current labels, context IDs, and entity icon metadata for
sidebar rendering.

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
`branchId`, `workerUserId`, `from`, and `to`. Report grouping accepts `issue`,
`project`, `branch`, `client`, `category`, or `worker`; null Branch attribution
is returned as `Main`.

Every Workspace is provisioned with Planning, Documenting, Developing, Testing,
and Other. Owners and admins may add further categories; category keys remain
unique within the Workspace. Issue-scoped log requests first authorize the
Issue and then return its visible activity entries. Non-Issue report/list
requests retain worker-level restrictions for regular members.

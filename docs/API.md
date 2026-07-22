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
- `GET /api/workspaces/:workspaceSlug/issues/:issueId/activity` lists immutable
  automated events, including attachment uploads.
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

## Inbox

- `GET /api/workspaces/:workspaceSlug/inbox` lists up to 100 non-dismissed
  notifications for the current membership. `unread=true` limits the feed.
- `POST /api/workspaces/:workspaceSlug/inbox` marks every notification read for
  the current membership.
- `PATCH /api/workspaces/:workspaceSlug/inbox/:notificationId` accepts `read`,
  `unread`, or `dismiss` as its `action`.

Assignment, workflow-status, and comment mutations notify the Issue creator and
current assignees other than the actor. Notification access is recipient-scoped
and current Issue visibility is rechecked when listing.

## Favorites

- `GET /api/workspaces/:workspaceSlug/favorites` lists the current membership's
  accessible Client, Project, and Issue favorites.
- `PUT /api/workspaces/:workspaceSlug/favorites` idempotently sets favorite
  state with `targetType`, `targetId`, and `favorite`.

Favorites are membership-scoped and reapply normal target visibility rules.
The response includes current labels, context IDs, and entity icon metadata for
sidebar rendering.

## Entity deletion

- `DELETE /api/workspaces/:workspaceSlug/clients/:clientId` archives the Client,
  its Projects, Branches, and Issues. Owners and admins only.
- `DELETE /api/workspaces/:workspaceSlug/projects/:projectId` archives the
  Project, its Branches, and its Issues. Owners and admins only.
- `DELETE /api/workspaces/:workspaceSlug/issues/:issueId` archives one Issue
  for an authorized Client contributor.

Deletion is soft: historical time logs remain queryable. Any active timer in
the affected scope returns `409 conflict` until it is stopped.

## Time tracking

- `GET|POST|DELETE /api/workspaces/:workspaceSlug/timers/active` reads, starts,
  or stops the current user's authoritative timer.
- `GET|POST /api/workspaces/:workspaceSlug/time-logs` lists finalized logs or
  creates a manual entry.
- `GET|POST /api/workspaces/:workspaceSlug/time-categories` lists or manages
  reporting categories.
- `GET /api/workspaces/:workspaceSlug/time-reports?groupBy=:dimension`
  aggregates for owners and admins.
- `GET /api/workspaces/:workspaceSlug/clients/:clientId/time-report` returns up
  to 1,000 Client-scoped finalized entries for a required `from`/`to` period,
  with optional `projectId`, `categoryId`, and `workerUserId` filters.

Time-log filters are `issueId`, `clientId`, `projectId`, `categoryId`,
`branchId`, `workerUserId`, `from`, and `to`. Report grouping accepts `issue`,
`project`, `branch`, `client`, `category`, or `worker`; null Branch attribution
is returned as `Main`.

Every Workspace is provisioned with Planning, Documenting, Developing, Testing,
and Other. Owners and admins may add further categories; category keys remain
unique within the Workspace. Issue-scoped log requests first authorize the
Issue and then return its visible activity entries. Non-Issue report/list
requests retain worker-level restrictions for regular members.

Client time reports authorize Client visibility before querying. Owners and
admins receive the Client-wide scope; members and guests receive only their
own entries. The response declares `scope` and whether the 1,000-entry result
was truncated.

Manual time-log creation accepts an explicit `startedAt` epoch. The Issue UI
derives it from the selected local work date and duration so the finalized
entry ends on that date while the server continues to reject future periods.

## Settings and identity assets

- `GET|PATCH /api/account/profile` reads or updates the signed-in profile.
- `GET|PATCH /api/account/preferences` manages theme, density, Issue view, and
  sidebar defaults.
- `POST|DELETE /api/account/avatar` creates an image upload or removes it.
- `GET|PATCH /api/workspaces/:workspaceSlug/settings/general` manages Workspace
  name and icon identity.
- `GET|PATCH /api/workspaces/:workspaceSlug/settings/notifications` manages the
  current membership's Inbox event preferences.
- `GET|POST /api/workspaces/:workspaceSlug/settings/members` lists members and
  invitations or creates an invitation.
- `PATCH /api/workspaces/:workspaceSlug/settings/members/:membershipId` changes
  role or active, suspended, and removed state with last-owner protection.
- `GET /api/workspaces/:workspaceSlug/settings/storage` and `/updates` expose
  operator-only health and release metadata.
- `PATCH /api/workspaces/:workspaceSlug/time-categories/:categoryId` renames,
  recolors, reorders, changes billing default, or archives a time entry type.

Identity uploads use a two-step intent and raw-body PUT. PNG, JPEG, and WebP
inputs are normalized to 256px WebP. Avatar and Workspace icon content remains
authenticated and uses private no-store caching.

## Attachments and sharing

- `GET|POST /api/workspaces/:workspaceSlug/attachments` lists one target's
  files or reserves an upload intent.
- `PUT /api/workspaces/:workspaceSlug/attachments/uploads/:uploadId/content`
  streams and finalizes the declared file.
- `DELETE /api/workspaces/:workspaceSlug/attachments/uploads/:uploadId`
  cancels a pending reservation.
- `GET|DELETE /api/workspaces/:workspaceSlug/attachments/:attachmentId`
  returns metadata or removes a file.
- `GET /api/workspaces/:workspaceSlug/attachments/:attachmentId/content`
  streams an authorized download.
- `GET|POST /api/workspaces/:workspaceSlug/attachments/:attachmentId/share-links`
  lists or creates links lasting one hour through 30 days.
- `DELETE /api/workspaces/:workspaceSlug/attachments/:attachmentId/share-links/:linkId`
  revokes a link.
- `GET /share/files/:token` anonymously downloads exactly one unexpired file.

Attachment intents accept `targetType` (`client`, `project`, or `issue`),
`targetId`, `filename`, `contentType`, and `sizeBytes`. General files are capped
at 10 MB. Browser code never receives S3 credentials or bucket object keys.

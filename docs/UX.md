# Chrono Workspace UX

Chrono is a dense, keyboard-first Workspace using Tailwind, owned shadcn
components, Lucide icons, and original assets.

The normative list and creation-dialog patterns are tracked in
`docs/UI_STANDARDS.md`; this document describes the broader product experience.

## Navigation

The sidebar contains exactly:

```text
[Workspace switcher]
Inbox
My Issues
Workspace
  Clients
  Projects
Your clients
  [Client]
    Home
    Issues
    Projects
    Time
```

The Workspace switcher is searchable. Sidebar and Client disclosure state are
ephemeral Zustand state; active items derive from canonical routes.

The Favorites section appears only when the current membership has at least one
favorite. It links Clients with their owned icons, Projects with their owned
icons, and Issues with the standard Issue icon. Favorite state is optimistic
TanStack Query server state rather than sidebar disclosure state.

Inbox is a recipient-specific notification feed rather than a general Issue
directory. Its compact left pane shows unread state, actor, Issue identity,
event summary, relative time, filters, and dismiss controls. Selecting an event
marks it read and opens the shared Issue detail in the right pane; mobile shows
the feed and detail as separate steps. The sidebar badge reflects unread
assignment, status-change, and comment events performed by other members on
Issues the current member created or is assigned to.

Settings replaces the normal app sidebar with searchable Personal, Workspace,
and operator-only Administration groups. Each functional page uses a centered
700–760px column, restrained title, short section descriptions, and rounded
divided cards. Mobile navigation uses the shared off-canvas Sidebar. Profile,
preferences, notifications, Workspace identity, members, time entry types,
storage, and updates never appear as decorative placeholders.
An available official release adds an amber Updates navigation dot and one
operator toast per browser and version. The Updates page uses a confirmation
dialog and a persisted progress surface with percentage, current-stage context,
restart/reconnect state, timestamps, and plain-language completion or recovery
outcomes. While a job is active, a global modal blurs and blocks the application,
shows the server stage and percentage, and remains mounted through temporary
reconnect failures. The authoritative completed or failed state releases the
interface and triggers a toast. Technical failure output stays available in a
collapsed detail.

## Project experience

Projects expose Overview, Activity, and Issues tabs. Overview contains summary,
a compact property row, derived progress, latest update, description,
resources, and milestones. Activity contains an update composer and immutable
events. Issues are grouped by workflow status.

Workspace-wide and Client Project directories use the same dense list language
as Issue collections. Projects are grouped by non-empty delivery state under
collapsible, softly tinted headers with semantic icons and counts. Compact rows
keep the Project identity visually dominant while exposing health, priority,
lead, target date, state, Issue count, and completion progress as contextual
controls. Property controls mutate inline; changing state optimistically moves
the row to its new group. Workspace-wide rows add an owned-icon Client chip,
and every row has an Issue-count/progress chip that opens the Project's Issues.

Properties are icon/value triggers with semantic colors. They open a popover or
searchable command list only when clicked. Assignees support zero, one, or many
Workspace users and display overlapping avatars.

Client, Project, and Issue pages use one shared entity header standard with
clickable icon-bearing breadcrumbs, chevrons, stronger inline typography,
entity icon/title, favorite toggle, and trailing actions menu. The menu copies
the canonical link, opens it in a new tab, or exposes authorized deletion.
Deletion requires confirmation, preserves historical time entries, and returns
to the nearest surviving Client/Project list. Project icons are editable from
Project Overview using the shared icon/emoji picker.

Client pages expose Overview, Issues, Projects, Time, and Members tabs. Time
defaults to the current calendar month and offers previous-month, rolling
30-day, and custom two-month range selection. Project, time-entry type, and
authorized contributor filters are URL-backed. The report combines total and
billable summaries, labeled daily bars, a time-entry-type pie chart, Project
breakdowns, and a dense entry table grouped by Issue with task totals and links
to Issue and Project/Branch context. The top-right export action downloads the
same filtered report as a landscape A4 PDF. Printable durations round to the
nearest whole hour with half-hours rounding up; the browser retains exact time.
PDF periods and daily columns use the exporting browser's timezone, so monthly
reports always begin and end on the dates selected in the report controls.
Editable rows expose a restrained pencil action. Its canonical composer dialog
edits exact hours, minutes, seconds, time-entry type, and note while keeping the
entry's completion time and billing state unchanged.

Guest navigation contains only accessible Clients and Projects, includes their
read-only Time reports, and omits time mutation plus Workspace administration.
Guest invitation expands Client selections into
their current Projects, permits explicit Project exclusions, and explains that
future Projects require a Project Members grant. Project Members is a
route-backed tab with a searchable add control for authorized administrators
or the Project lead. Guests see read-only work-item properties while retaining
Issue creation, comments, attachments, and Project update composition.

## Issue experience

Issue detail is a full page with breadcrumbs, editable title and description,
comments, a right-side property column, labels, type, dates, and estimate.
Direct attachments sit inline beneath the description as independent file
surfaces instead of forming a shared list section. Image files show inline
previews and open the shared fullscreen zoom, download, copy-image, and
copy-link viewer. Activity renders immutable system and time events, including
label changes, as compact rows while authored comments use distinct cards with
inline files, image previews, one-level replies, and attachment-enabled
single-row reply composers. A restrained top-right actions menu lets authors
edit or delete their comments and lets Workspace administrators moderate them;
edited comments are identified without changing their original activity time.
Timer and manual-entry controls sit directly below the comment composer and
require a Workspace time entry type. Manual entries include a shadcn Calendar
picker for the work date and prevent future-date selection. Finalized entries
appear chronologically in Activity alongside comments with worker, duration,
source, type, date, and note.

Client and Project Overview contain the shared Attachments section. Issue
description uploads use the same private rows in an inline variant, while
comment uploads render inside Activity cards. Uploads show progress and retain
permission-aware download, share, and delete controls. Share popovers create links from one hour
through 30 days and list/revoke existing links without exposing bucket URLs.

The lowest property-rail section summarizes finalized work with shadcn charts:
a gradient area chart shows cumulative time and a stacked radial chart sizes
each segment by time entry type with total duration centered in the ring.
Owners and admins can add a new Workspace-wide type from the searchable type
popover. Direct Client Issues and Project Issues both persist real, switchable
workflow statuses.

The Client Issues tab is an aggregate of direct Client Issues, Project Main
Issues, and named-Branch Issues. Project Issues display a compact navigation
chip; named-Branch chips render `Project / Branch` and open that Branch scope.
Every non-empty status group exposes a `+` action that creates a direct Client
Issue in the equivalent Client workflow status.

Successful Issue creation emits a bottom-right `react-hot-toast` confirmation
with the selected workflow-status icon, authoritative Issue identifier, title,
dismiss control, and a link to the canonical full Issue route. Create-more
flows emit one confirmation per successfully persisted Issue.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + K` | Toggle command menu |
| `C` | Create Issue |
| `[` | Toggle navigation |
| `1` | List view |
| `2` | Board view |
| `J` / `K` | Move Issue focus |
| `Enter` | Open focused Issue |
| `Escape` | Close the active popover or dialog |

Shortcuts do not fire while typing. Radix primitives manage focus and Escape
behavior for overlays.

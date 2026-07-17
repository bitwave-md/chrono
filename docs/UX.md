# Chrono Workspace UX

Chrono is a dense, keyboard-first Workspace using Tailwind, owned shadcn
components, Lucide icons, and original assets.

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
```

The Workspace switcher is searchable. Sidebar and Client disclosure state are
ephemeral Zustand state; active items derive from canonical routes.

The Favorites section appears only when the current membership has at least one
favorite. It links Clients with their owned icons, Projects with their owned
icons, and Issues with the standard Issue icon. Favorite state is optimistic
TanStack Query server state rather than sidebar disclosure state.

## Project experience

Projects expose Overview, Activity, and Issues tabs. Overview contains summary,
a compact property row, derived progress, latest update, description,
resources, and milestones. Activity contains an update composer and immutable
events. Issues are grouped by workflow status.

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
billable summaries, daily trend, category and Project breakdowns, and a dense
entry table linking back to its Issue and Project/Branch context.

## Issue experience

Issue detail is a full page with breadcrumbs, editable title and description,
comments, a right-side property column, labels, type, dates, and estimate.
Timer and manual-entry controls sit directly below the comment composer and
require a Workspace time entry type. Manual entries include a shadcn Calendar
picker for the work date and prevent future-date selection. Finalized entries
appear chronologically in Activity alongside comments with worker, duration,
source, type, date, and note.

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

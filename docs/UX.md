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

## Project experience

Projects expose Overview, Activity, and Issues tabs. Overview contains summary,
a compact property row, derived progress, latest update, description,
resources, and milestones. Activity contains an update composer and immutable
events. Issues are grouped by workflow status.

Properties are icon/value triggers with semantic colors. They open a popover or
searchable command list only when clicked. Assignees support zero, one, or many
Workspace users and display overlapping avatars.

## Issue experience

Issue detail is a full page with breadcrumbs, editable title and description,
comments, a right-side property column, labels, type, dates, estimate, timer,
and manual logging. Direct Client Issues and Project Issues both persist real,
switchable workflow statuses.

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

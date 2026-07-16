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
and manual logging. Client-backlog Issues display Backlog without a persisted
workflow status.

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

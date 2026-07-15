# Chrono Workspace UX

The authenticated Workspace is a dense, keyboard-first surface with an
independent Bitwave visual identity. It uses original CSS, system fonts, Lucide
icons, Radix accessibility primitives, and GSAP transform/opacity motion.

## Primary views

- The sidebar selects a Client, nested Project/Subproject/Sprint, or functional
  Team.
- List view optimizes scanning and keyboard traversal.
- Board view is enabled for one selected Project workflow and supports
  optimistic status movement.
- Selecting an Issue opens a non-blocking detail pane with editable title,
  status, priority, Project, Team, and authoritative timer controls.
- Rapid create defaults to the current Project and Team context.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + K` | Toggle command menu |
| `C` | Create Issue |
| `[` | Toggle navigation |
| `1` | List view |
| `2` | Board view |
| `J` / `K` | Move Issue focus down/up |
| `Enter` | Open focused Issue |
| `Escape` | Close the active Radix dialog/pane |

Shortcuts do not fire while typing in inputs, textareas, selects, or editable
content. Radix handles focus trapping and Escape behavior for modal surfaces.

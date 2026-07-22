# Chrono UI/UX Standards

This document records the authoritative interaction patterns for Chrono. New
work should extend these patterns instead of introducing parallel list or form
designs. Linear is a quality reference for density and interaction speed;
Chrono uses its own components, styles, icons, and agency-oriented hierarchy.

## Collection lists

The shared Issue list is the canonical work-item list. The grouped Project
directory adapts the same language to Project-specific information.

Authoritative implementations:

- `issue-list.tsx` for Issue grouping and rows.
- `project-directory-table.tsx` for Project grouping and rows.
- `group-header-gradient.ts` for shared semantic header tinting.

Every work-item list should:

- Group by a meaningful state and omit empty groups.
- Use collapsible, subtly gradient-tinted headers with an icon, label, and count.
- Keep rows compact, rounded, keyboard-focusable, and visually quiet at rest.
- Put identity first: icon/priority, identifier where applicable, state, then title.
- Place contextual chips and editable properties at the trailing edge.
- Open property popovers without triggering the row's navigation action.
- Use semantic icons and colors consistently in triggers, menus, and groups.
- Apply optimistic TanStack Query mutations and restore prior data on failure.
- Preserve a useful mobile hierarchy by hiding secondary metadata before identity.
- Use the shared empty state when a filtered or aggregate collection has no rows.

Issue rows expose priority, identifier, status, title, labels, assignees, and
Client/Project/Branch context as applicable. Project rows expose Project
identity, health, priority, lead, target date, Issue progress, state, and Client
context in workspace-wide directories.

## Creation dialogs

Issue and Project creation are the canonical creation experience. Client
creation uses the same structure. `creation-dialog-frame.tsx` owns the shared
surface, header, expand control, close control, and entrance animation;
`creation-text-property.tsx` owns compact text-property editing.

Every primary entity creation dialog should:

- Use the large rounded composer rather than a stacked settings form.
- Show parent context, a chevron, and `New …` in the compact header.
- Keep the entity title as the first, borderless, auto-focused field.
- Put the optional description directly below on the open writing surface.
- Render secondary metadata as compact property pills near the footer.
- Reveal property inputs only after their trigger is activated.
- Keep validation and server errors adjacent to the footer controls.
- Submit with the rounded primary action or `Cmd/Ctrl + Enter`.
- Disable submission until required values are valid and while pending.
- Offer expand and close actions in consistent positions.
- Use the shared GSAP frame animation; do not add per-dialog entrance effects.
- Keep remote creation in a custom TanStack Query mutation hook.

Entity-specific controls remain orthogonal: Issues own workflow and assignment,
Projects own Client context and namespace overrides, and Clients own their key
and default Issue prefix. Optional settings should not turn the composer back
into an always-visible configuration grid.

## Change checklist

Before introducing a new list or creation flow:

1. Reuse the authoritative components or extract the smallest shared primitive.
2. Confirm keyboard, focus, loading, error, empty, and responsive states.
3. Keep server state in TanStack Query and ephemeral UI state local or in a
   granular Zustand store.
4. Verify semantic icon/color parity with existing property metadata.
5. Update this document when an approved pattern intentionally changes.

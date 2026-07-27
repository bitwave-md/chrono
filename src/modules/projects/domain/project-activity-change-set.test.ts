import assert from "node:assert/strict";
import test from "node:test";

import { ProjectActivityChangeSet, type ProjectActivitySnapshot } from "./project-activity-change-set.ts";

const current: ProjectActivitySnapshot = {
  state: "planned",
  priority: "none",
  leadMembershipId: null,
  summary: null,
  description: null,
  visibility: "internal",
  startDate: null,
  targetDate: new Date("2026-07-31T12:00:00.000Z"),
  assigneeMembershipIds: ["member-b", "member-a"],
  iconType: "icon",
  iconKey: "folder",
  iconColor: "#64748b",
};

test("ProjectActivityChangeSet ignores equivalent values and assignee order", () => {
  const changes = ProjectActivityChangeSet.between(current, {
    state: "planned",
    targetDate: "2026-07-31T12:00:00.000Z",
    assigneeMembershipIds: ["member-a", "member-b"],
  });

  assert.equal(changes.hasChanges, false);
  assert.deepEqual(changes.payload(), { changes: [] });
});

test("ProjectActivityChangeSet records useful values without copying long text", () => {
  const changes = ProjectActivityChangeSet.between(current, {
    state: "active",
    description: "A long description that should not be copied into audit metadata.",
    targetDate: null,
  });

  assert.equal(changes.has("state"), true);
  assert.equal(changes.has("description"), true);
  assert.deepEqual(changes.payload(), {
    changes: [
      { field: "state", from: "planned", to: "active" },
      { field: "description" },
      { field: "targetDate", from: "2026-07-31T12:00:00.000Z", to: null },
    ],
  });
});

test("ProjectActivityChangeSet treats icon properties as one logical change", () => {
  const changes = ProjectActivityChangeSet.between(current, {
    iconType: "emoji",
    iconKey: "ship",
    iconColor: "#22c55e",
  });

  assert.deepEqual(changes.payload(), { changes: [{ field: "icon" }] });
});

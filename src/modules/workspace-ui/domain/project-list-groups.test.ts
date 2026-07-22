import assert from "node:assert/strict";
import test from "node:test";

import { buildProjectListGroups } from "./project-list-groups.ts";

test("Project list groups follow delivery order and omit empty states", () => {
  const groups = buildProjectListGroups([
    { id: "planned", state: "planned" as const },
    { id: "done", state: "completed" as const },
    { id: "active", state: "active" as const },
  ]);

  assert.deepEqual(groups.map((group) => group.state), ["active", "planned", "completed"]);
  assert.deepEqual(groups.map((group) => group.projects.map((project) => project.id)), [
    ["active"],
    ["planned"],
    ["done"],
  ]);
});

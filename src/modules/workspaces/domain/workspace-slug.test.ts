import assert from "node:assert/strict";
import test from "node:test";

import { WorkspaceSlug } from "./workspace-slug.ts";

test("WorkspaceSlug normalizes a valid slug", () => {
  const slug = new WorkspaceSlug(" Bitwave-Chrono ");

  assert.equal(slug.value, "bitwave-chrono");
});

test("WorkspaceSlug rejects paths and repeated separators", () => {
  assert.throws(() => new WorkspaceSlug("bitwave/chrono"));
  assert.throws(() => new WorkspaceSlug("bitwave--chrono"));
});

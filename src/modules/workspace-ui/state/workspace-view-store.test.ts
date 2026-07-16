import assert from "node:assert/strict";
import test from "node:test";

import { createWorkspaceViewStore } from "./workspace-view-store.ts";

test("WorkspaceViewStore keeps client disclosure independent", () => {
  const store = createWorkspaceViewStore();

  store.getState().setClientExpanded("client-a", true);
  store.getState().setClientExpanded("client-b", false);

  assert.deepEqual(store.getState().expandedClientIds, {
    "client-a": true,
    "client-b": false,
  });
});

test("WorkspaceViewStore keeps view controls independent", () => {
  const store = createWorkspaceViewStore();

  store.getState().setViewMode("board");
  store.getState().toggleSidebar();

  assert.equal(store.getState().viewMode, "board");
  assert.equal(store.getState().sidebarCollapsed, true);

  store.getState().setSidebarCollapsed(false);
  assert.equal(store.getState().sidebarCollapsed, false);
});

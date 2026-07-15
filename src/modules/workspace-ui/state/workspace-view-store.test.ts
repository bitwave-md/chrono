import assert from "node:assert/strict";
import test from "node:test";

import { createWorkspaceViewStore } from "./workspace-view-store.ts";

test("WorkspaceViewStore resets dependent filters when Client changes", () => {
  const store = createWorkspaceViewStore();

  store.getState().selectProject("project-a");
  store.getState().selectTeam("team-a");
  store.getState().focusIssue("issue-a");
  store.getState().selectClient("client-b");

  assert.deepEqual(
    {
      client: store.getState().selectedClientId,
      project: store.getState().selectedProjectId,
      team: store.getState().selectedTeamId,
      issue: store.getState().focusedIssueId,
    },
    { client: "client-b", project: null, team: null, issue: null },
  );
});

test("WorkspaceViewStore keeps view controls independent", () => {
  const store = createWorkspaceViewStore();

  store.getState().setViewMode("board");
  store.getState().toggleSidebar();

  assert.equal(store.getState().viewMode, "board");
  assert.equal(store.getState().sidebarCollapsed, true);
});

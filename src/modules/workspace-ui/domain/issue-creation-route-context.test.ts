import assert from "node:assert/strict";
import test from "node:test";

import { IssueCreationRouteContext } from "./issue-creation-route-context.ts";

test("Issue creation keeps direct Client context", () => {
  const context = IssueCreationRouteContext.from("/app/bitwave/clients/client-1/issues", null);
  assert.equal(context.clientId, "client-1");
  assert.equal(context.projectId, null);
  assert.deepEqual(context.filters, {});
});

test("Issue creation defaults Project routes to Main", () => {
  const context = IssueCreationRouteContext.from("/app/bitwave/projects/project-1/issues", null);
  assert.equal(context.projectId, "project-1");
  assert.equal(context.branchId, null);
  assert.deepEqual(context.filters, { projectId: "project-1", mainBranch: true });
});

test("Issue creation retains named Branch context", () => {
  const context = IssueCreationRouteContext.from("/app/bitwave/projects/project-1/issues", "branch-1");
  assert.equal(context.branchId, "branch-1");
  assert.deepEqual(context.filters, { projectId: "project-1", branchId: "branch-1" });
});

test("Issue creation treats All branches as unscoped Project context", () => {
  const context = IssueCreationRouteContext.from("/app/bitwave/projects/project-1/issues", "all");
  assert.equal(context.branchId, null);
  assert.deepEqual(context.filters, { projectId: "project-1" });
});

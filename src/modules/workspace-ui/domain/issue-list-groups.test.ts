import assert from "node:assert/strict";
import test from "node:test";

import { buildIssueGroups } from "./issue-list-groups.ts";
import type { IssueRecord, WorkflowStatusRecord } from "./workspace-types.ts";

const statuses: WorkflowStatusRecord[] = [
  { id: "todo", name: "Todo", slug: "todo", category: "unstarted", color: "#fff", position: 0, isDefault: true },
  { id: "done", name: "Done", slug: "done", category: "completed", color: "#0f0", position: 1, isDefault: false },
  { id: "canceled", name: "Canceled", slug: "canceled", category: "canceled", color: "#999", position: 2, isDefault: false },
];

test("Issue list groups follow workflow order and omit empty statuses", () => {
  const groups = buildIssueGroups([
    issue("one", "todo", "Todo"),
    issue("two", "done", "Done"),
  ], statuses);

  assert.deepEqual(groups.map((group) => group.name), ["Todo", "Done"]);
  assert.equal(groups.some((group) => group.name === "Canceled"), false);
});

test("aggregate Issue lists merge same-named statuses across workflows", () => {
  const projectStatuses = new Map<string, WorkflowStatusRecord>([
    ["client-backlog", { id: "client-backlog", name: "Backlog", slug: "backlog", category: "backlog", color: "#777", position: 0, isDefault: true }],
    ["project-a-done", { ...statuses[1], id: "project-a-done" }],
    ["project-b-done", { ...statuses[1], id: "project-b-done" }],
  ]);
  const groups = buildIssueGroups([
    issue("one", "project-a-done", "Done"),
    issue("two", "project-b-done", "Done"),
    issue("three", "client-backlog", "Backlog"),
  ], [], projectStatuses);

  assert.deepEqual(groups.map((group) => [group.name, group.issues.length]), [
    ["Backlog", 1],
    ["Done", 2],
  ]);
  assert.equal(groups[0].category, "backlog");
  assert.equal(groups[1].category, "completed");
  assert.equal(groups[1].color, "#0f0");
});

function issue(id: string, statusId: string | null, statusName: string | null): IssueRecord {
  return {
    id,
    clientId: "client",
    clientName: "Client",
    identifier: id.toUpperCase(),
    title: id,
    description: null,
    priority: "none",
    visibility: "internal",
    projectId: "project",
    projectName: "Project",
    branchId: null,
    branchName: null,
    assignees: [],
    labels: [],
    issueTypeId: null,
    issueTypeName: null,
    issueTypeColor: null,
    statusId,
    statusName,
    statusColor: null,
    estimateMinutes: null,
    dueAt: null,
    version: 1,
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  ProjectTreeBuilder,
  type ProjectRecord,
} from "./project-tree-builder.ts";

const projects: ProjectRecord[] = [
  {
    id: "root",
    parentId: null,
    name: "Main CRM",
    slug: "main-crm",
    kind: "project",
    workflowMode: "own",
    visibility: "internal",
    position: 0,
    namespacePrefix: null,
    workflowId: "workflow-root",
  },
  {
    id: "child",
    parentId: "root",
    name: "API Implementation",
    slug: "api-implementation",
    kind: "subproject",
    workflowMode: "inherit",
    visibility: "internal",
    position: 0,
    namespacePrefix: "API",
    workflowId: null,
  },
];

test("ProjectTreeBuilder resolves inherited workflow and namespace overrides", () => {
  const [root] = new ProjectTreeBuilder().build(projects, "DAC");
  const [child] = root.children;

  assert.equal(root.effectiveNamespacePrefix, "DAC");
  assert.equal(child.effectiveNamespacePrefix, "API");
  assert.equal(child.effectiveWorkflowId, "workflow-root");
});

test("ProjectTreeBuilder rejects cycles", () => {
  const cyclic = projects.map((project) => ({ ...project }));
  cyclic[0].parentId = "child";

  assert.throws(() => new ProjectTreeBuilder().build(cyclic, "DAC"));
});

import assert from "node:assert/strict";
import test from "node:test";

import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ForbiddenError } from "@/modules/shared/application/application-error";

const guest: Principal = {
  userId: "user",
  email: "guest@example.com",
  membershipId: "membership",
  workspaceId: "workspace",
  workspaceName: "Workspace",
  workspaceSlug: "workspace",
  role: "guest",
};

test("WorkspacePolicy keeps Guest time mutations and Workspace reports disabled", () => {
  const policy = new WorkspacePolicy();
  const operations = [
    () => policy.assertCanContribute(guest),
    () => policy.assertCanManageClients(guest),
    () => policy.assertCanManageProjects(guest),
    () => policy.assertCanManageTimeCategories(guest),
    () => policy.assertCanUseTimeTracking(guest),
    () => policy.assertCanViewTimeReports(guest),
  ];

  for (const operation of operations) {
    assert.throws(operation, ForbiddenError);
  }
});

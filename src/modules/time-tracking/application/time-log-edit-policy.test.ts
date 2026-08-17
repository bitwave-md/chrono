import assert from "node:assert/strict";
import test from "node:test";

import type { Principal, WorkspaceRole } from "@/modules/authorization/domain/principal";

import { TimeLogEditPolicy } from "./time-log-edit-policy.ts";

const policy = new TimeLogEditPolicy();

test("owners and admins may edit another worker's time entry", () => {
  assert.doesNotThrow(() => policy.assertCanEdit(principal("owner"), "other-user"));
  assert.doesNotThrow(() => policy.assertCanEdit(principal("admin"), "other-user"));
});

test("members may edit only their own time entries", () => {
  assert.doesNotThrow(() => policy.assertCanEdit(principal("member"), "user"));
  assert.throws(
    () => policy.assertCanEdit(principal("member"), "other-user"),
    /only edit their own/i,
  );
});

test("Guests cannot edit time entries", () => {
  assert.throws(
    () => policy.assertCanEdit(principal("guest"), "user"),
    /Guests cannot edit/i,
  );
});

function principal(role: WorkspaceRole): Principal {
  return {
    userId: "user",
    email: "user@example.com",
    membershipId: "membership",
    workspaceId: "workspace",
    workspaceName: "Chrono",
    workspaceSlug: "chrono",
    role,
  };
}

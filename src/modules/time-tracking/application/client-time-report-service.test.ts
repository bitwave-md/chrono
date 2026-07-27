import assert from "node:assert/strict";
import test from "node:test";

import type { Principal, WorkspaceRole } from "@/modules/authorization/domain/principal";
import { clientTimeReportScope } from "./client-time-report-service";

test("Guests receive scoped Client-wide reports without changing member scope", () => {
  assert.equal(clientTimeReportScope(principal("guest")), "client");
  assert.equal(clientTimeReportScope(principal("member")), "personal");
  assert.equal(clientTimeReportScope(principal("owner")), "client");
});

function principal(role: WorkspaceRole): Principal {
  return { role, userId: "user", email: "user@example.com", membershipId: "membership", workspaceId: "workspace", workspaceName: "Workspace", workspaceSlug: "workspace" };
}

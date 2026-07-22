import assert from "node:assert/strict";
import test from "node:test";

import { issueDetailPath } from "./issue-route.ts";

test("Issue routes use their canonical Client or Project detail path", () => {
  assert.equal(
    issueDetailPath("bitwave", "issue-id", null),
    "/app/bitwave/issues/issue-id",
  );
  assert.equal(
    issueDetailPath("bitwave", "issue-id", "project-id"),
    "/app/bitwave/projects/project-id/issues/issue-id",
  );
});

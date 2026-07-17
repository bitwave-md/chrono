import assert from "node:assert/strict";
import test from "node:test";

import { deletedEntityParentPath, favoritePath } from "./favorite-target.ts";
import type { FavoriteRecord } from "./workspace-types.ts";

const base: FavoriteRecord = {
  id: "favorite",
  targetType: "client",
  targetId: "client-id",
  title: "Target",
  clientId: "client-id",
  projectId: null,
  identifier: null,
  iconType: "icon",
  iconKey: "hash",
  iconColor: "#6366f1",
};

test("favorite routes are canonical for each supported target", () => {
  assert.equal(favoritePath("bitwave", base), "/app/bitwave/clients/client-id/overview");
  assert.equal(
    favoritePath("bitwave", { ...base, targetType: "project", targetId: "project-id", projectId: "project-id" }),
    "/app/bitwave/projects/project-id/overview",
  );
  assert.equal(
    favoritePath("bitwave", { ...base, targetType: "issue", targetId: "issue-id", projectId: "project-id" }),
    "/app/bitwave/projects/project-id/issues/issue-id",
  );
  assert.equal(
    favoritePath("bitwave", { ...base, targetType: "issue", targetId: "issue-id" }),
    "/app/bitwave/issues/issue-id",
  );
});

test("deleted entities return to their nearest surviving parent", () => {
  assert.equal(deletedEntityParentPath("bitwave", base), "/app/bitwave/clients");
  assert.equal(deletedEntityParentPath("bitwave", { ...base, targetType: "project", targetId: "project-id", projectId: "project-id" }), "/app/bitwave/clients/client-id/projects");
  assert.equal(deletedEntityParentPath("bitwave", { ...base, targetType: "issue", targetId: "issue-id", projectId: "project-id" }), "/app/bitwave/projects/project-id/issues");
});

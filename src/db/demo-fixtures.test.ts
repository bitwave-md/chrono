import assert from "node:assert/strict";
import test from "node:test";

import { demoClients } from "./demo-fixtures.ts";

function assertUnique(values: string[], label: string): void {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

test("demo fixtures use stable unique identifiers", () => {
  assertUnique(demoClients.map((client) => client.key), "Client keys");
  assertUnique(demoClients.map((client) => client.issuePrefix), "Client prefixes");

  for (const client of demoClients) {
    assertUnique(client.projects.map((project) => project.slug), `${client.name} Project slugs`);

    for (const project of client.projects) {
      assertUnique(project.issues.map((issue) => issue.title), `${project.name} Issue titles`);
      assert.ok(project.issues.some((issue) => issue.branchSlug === project.branch.slug));
      assert.ok(project.issues.some((issue) => issue.branchSlug === undefined));
    }
  }
});

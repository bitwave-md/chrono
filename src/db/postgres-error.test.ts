import assert from "node:assert/strict";
import test from "node:test";

import { isUniqueViolation } from "./postgres-error.ts";

test("isUniqueViolation walks wrapped database causes", () => {
  const error = {
    cause: {
      cause: {
        code: "23505",
        constraint: "clients_workspace_key_unique",
      },
    },
  };

  assert.equal(isUniqueViolation(error), true);
  assert.equal(
    isUniqueViolation(error, "clients_workspace_key_unique"),
    true,
  );
  assert.equal(isUniqueViolation(error, "another_constraint"), false);
});

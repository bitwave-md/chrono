import assert from "node:assert/strict";
import test from "node:test";

import { ClientKey } from "../../clients/domain/client-key.ts";
import { IssuePrefix } from "../../projects/domain/issue-prefix.ts";

test("Uppercase codes normalize product identifiers", () => {
  assert.equal(new ClientKey(" dac ").value, "DAC");
  assert.equal(new IssuePrefix(" api ").value, "API");
});

test("Uppercase codes reject punctuation and leading numbers", () => {
  assert.throws(() => new ClientKey("1client"));
  assert.throws(() => new IssuePrefix("API-1"));
});

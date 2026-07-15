import assert from "node:assert/strict";
import test from "node:test";

import { TimeCategoryKey } from "./time-category-key.ts";

test("TimeCategoryKey normalizes a reporting key", () => {
  assert.equal(new TimeCategoryKey(" Development ").value, "development");
});

test("TimeCategoryKey rejects paths and repeated separators", () => {
  assert.throws(() => new TimeCategoryKey("client/work"));
  assert.throws(() => new TimeCategoryKey("client--work"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { ClientIcon } from "./client-icon.ts";

test("ClientIcon normalizes stored icon appearance", () => {
  const icon = new ClientIcon("icon", "  building-2 ", " #6366F1 ");
  assert.equal(icon.type, "icon");
  assert.equal(icon.key, "building-2");
  assert.equal(icon.color, "#6366f1");
});

test("ClientIcon rejects unsafe names and colors", () => {
  assert.throws(() => new ClientIcon("icon", "../../icon", "#6366f1"));
  assert.throws(() => new ClientIcon("emoji", "", "#6366f1"));
  assert.throws(() => new ClientIcon("icon", "hash", "indigo"));
});

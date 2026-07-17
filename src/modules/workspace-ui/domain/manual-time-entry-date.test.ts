import assert from "node:assert/strict";
import test from "node:test";

import { manualTimeStartedAt } from "./manual-time-entry-date.ts";

test("manual time uses the selected local date as its completion date", () => {
  const selected = new Date(2026, 6, 10);
  const now = new Date(2026, 6, 18, 15, 30, 0, 0);
  const startedAt = new Date(manualTimeStartedAt(selected, 5_400, now));
  const endedAt = new Date(startedAt.getTime() + 5_400_000);

  assert.equal(endedAt.getFullYear(), 2026);
  assert.equal(endedAt.getMonth(), 6);
  assert.equal(endedAt.getDate(), 10);
  assert.equal(endedAt.getHours(), 15);
  assert.equal(endedAt.getMinutes(), 30);
});

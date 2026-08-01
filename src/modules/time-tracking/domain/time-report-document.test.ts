import assert from "node:assert/strict";
import test from "node:test";

import { roundHours } from "@/modules/time-tracking/domain/time-report-document";

test("PDF hours use mathematical half-up rounding", () => {
  assert.equal(roundHours(50 * 60), 1);
  assert.equal(roundHours(70 * 60), 1);
  assert.equal(roundHours((2 * 60 + 29) * 60), 2);
  assert.equal(roundHours((2 * 60 + 30) * 60), 3);
});

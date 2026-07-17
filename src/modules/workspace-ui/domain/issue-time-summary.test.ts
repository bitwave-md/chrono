import assert from "node:assert/strict";
import test from "node:test";

import {
  dailyCumulativeTime,
  formatLoggedDuration,
  timeByCategory,
  totalLoggedSeconds,
  type TimeSummaryEntry,
} from "./issue-time-summary.ts";

const logs: TimeSummaryEntry[] = [
  { categoryId: "development", categoryName: "Developing", categoryColor: "#10B981", durationSeconds: 3_600, endedAt: "2026-07-16T10:00:00Z" },
  { categoryId: "testing", categoryName: "Testing", categoryColor: "#F59E0B", durationSeconds: 1_800, endedAt: "2026-07-17T10:00:00Z" },
  { categoryId: "development", categoryName: "Developing", categoryColor: "#10B981", durationSeconds: 900, endedAt: "2026-07-17T11:00:00Z" },
];

test("Issue time summary builds cumulative history and category proportions", () => {
  assert.equal(totalLoggedSeconds(logs), 6_300);
  assert.deepEqual(dailyCumulativeTime(logs).map((point) => point.seconds), [3_600, 6_300]);
  assert.deepEqual(timeByCategory(logs).map((slice) => [slice.name, slice.seconds]), [
    ["Developing", 4_500],
    ["Testing", 1_800],
  ]);
  assert.equal(formatLoggedDuration(5_400), "1h 30m");
});

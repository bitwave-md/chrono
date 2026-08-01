import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateClientTimeReport,
  parseClientReportRange,
  reportPresetForRange,
  reportRangeForPreset,
  reportRangeParams,
} from "./client-time-report.ts";
import type { TimeLogRecord } from "./workspace-types.ts";

test("Client report defaults to the current month and round-trips custom ranges", () => {
  const now = new Date(2026, 6, 18, 12);
  const current = parseClientReportRange(null, null, now);
  assert.equal(reportPresetForRange(current, now), "this_month");
  assert.deepEqual(reportRangeParams(current), { from: "2026-07-01", to: "2026-07-31" });
  assert.equal(reportPresetForRange(parseClientReportRange("2026-06-03", "2026-06-12", now), now), "custom");
  assert.equal(reportPresetForRange(reportRangeForPreset("previous_month", now), now), "previous_month");
});

test("Client report totals entries across categories, projects, and workers", () => {
  const entries = [
    entry({ id: "1", durationSeconds: 3_600, billable: true, categoryId: "dev", categoryName: "Developing", projectId: "p1", projectName: "CRM", workerUserId: "u1", workerName: "Ana" }),
    entry({ id: "2", durationSeconds: 1_800, billable: false, categoryId: "test", categoryName: "Testing", projectId: "p1", projectName: "CRM", workerUserId: "u2", workerName: "Mihai" }),
  ];
  const report = aggregateClientTimeReport(entries, {
    from: new Date(2026, 6, 1),
    to: new Date(2026, 7, 1),
  });
  assert.equal(report.totalSeconds, 5_400);
  assert.equal(report.billableSeconds, 3_600);
  assert.equal(report.contributors, 2);
  assert.equal(report.projects[0]?.seconds, 5_400);
  assert.deepEqual(report.categories.map((row) => row.name), ["Developing", "Testing"]);
  assert.equal(report.tasks.length, 1);
  assert.equal(report.tasks[0]?.totalSeconds, 5_400);
  assert.equal(report.tasks[0]?.entries.length, 2);
});

function entry(overrides: Partial<TimeLogRecord>): TimeLogRecord {
  return {
    id: "entry",
    source: "manual",
    issueId: "issue",
    identifier: "DACR-1",
    issueTitle: "Build report",
    clientId: "client",
    clientName: "DaCredit",
    projectId: null,
    projectName: null,
    branchId: null,
    branchName: null,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    workerUserId: "worker",
    workerName: null,
    workerEmail: "worker@example.com",
    workerAvatarUrl: null,
    note: null,
    billable: false,
    startedAt: "2026-07-10T08:00:00.000Z",
    endedAt: "2026-07-10T09:00:00.000Z",
    durationSeconds: 3_600,
    version: 1,
    ...overrides,
  };
}

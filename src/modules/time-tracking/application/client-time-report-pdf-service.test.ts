import assert from "node:assert/strict";
import test from "node:test";

import { ClientTimeReportPdfService } from "@/modules/time-tracking/application/client-time-report-pdf-service";
import { aggregateTimeReport } from "@/modules/time-tracking/domain/time-report-summary";
import type { TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

test("PDF service renders a landscape A4 report with Unicode content", async () => {
  const range = { from: new Date("2026-07-01T00:00:00.000Z"), to: new Date("2026-08-01T00:00:00.000Z") };
  const report = aggregateTimeReport([entry()], range);
  const pdf = await new ClientTimeReportPdfService().generate({ subjectName: "Proiect Chișinău", subjectType: "Project", scope: "client", range, report, generatedAt: new Date("2026-08-01T10:00:00.000Z") });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 10_000);
  assert.match(pdf.toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/);
});

function entry(): TimeLogRecord {
  return {
    id: "entry", source: "manual", issueId: "issue", identifier: "CHR-1", issueTitle: "Raport lunar",
    clientId: "client", clientName: "Client", projectId: "project", projectName: "Aplicatie", branchId: null, branchName: null,
    categoryId: "development", categoryName: "Dezvoltare", categoryColor: "#3B82F6", workerUserId: "worker",
    workerName: "Ion Popescu", workerEmail: "ion@example.com", workerAvatarUrl: null, note: "Implementare și проверка",
    billable: true, startedAt: "2026-07-10T08:00:00.000Z", endedAt: "2026-07-10T09:10:00.000Z", durationSeconds: 4_200, version: 1,
  };
}

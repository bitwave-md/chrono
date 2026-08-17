import assert from "node:assert/strict";
import test from "node:test";

import { TimeReportDocument, roundHours } from "@/modules/time-tracking/domain/time-report-document";
import { aggregateTimeReport } from "@/modules/time-tracking/domain/time-report-summary";

test("PDF hours use mathematical half-up rounding", () => {
  assert.equal(roundHours(50 * 60), 1);
  assert.equal(roundHours(70 * 60), 1);
  assert.equal(roundHours((2 * 60 + 29) * 60), 2);
  assert.equal(roundHours((2 * 60 + 30) * 60), 3);
});

test("PDF document uses the selected timezone for the complete month", () => {
  const range = {
    from: new Date("2026-07-31T21:00:00.000Z"),
    to: new Date("2026-08-31T21:00:00.000Z"),
    timeZone: "Europe/Chisinau",
  };
  const report = aggregateTimeReport([], range);
  const document = new TimeReportDocument({
    subjectName: "Bitwave",
    subjectType: "Client",
    scope: "client",
    range,
    report,
    generatedAt: new Date("2026-08-17T09:00:00.000Z"),
  });

  assert.equal(document.daily.length, 31);
  assert.equal(document.daily[0]?.date, "2026-08-01");
  assert.equal(document.daily.at(-1)?.date, "2026-08-31");
  assert.equal(document.periodLabel, "Aug 1, 2026 - Aug 31, 2026");
});

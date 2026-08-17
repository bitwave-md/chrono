import assert from "node:assert/strict";
import test from "node:test";

import { ReportCalendar } from "./report-calendar.ts";

test("ReportCalendar preserves a positive-offset monthly range", () => {
  const calendar = new ReportCalendar("Europe/Chisinau");
  const days = calendar.days(
    new Date("2026-07-31T21:00:00.000Z"),
    new Date("2026-08-31T21:00:00.000Z"),
  );

  assert.equal(days.length, 31);
  assert.equal(days[0], "2026-08-01");
  assert.equal(days.at(-1), "2026-08-31");
  assert.equal(calendar.dateKey(new Date("2026-08-30T21:30:00.000Z")), "2026-08-31");
});

test("ReportCalendar enumerates every day across a daylight-saving change", () => {
  const calendar = new ReportCalendar("Europe/Chisinau");
  const days = calendar.days(
    new Date("2026-09-30T21:00:00.000Z"),
    new Date("2026-10-31T22:00:00.000Z"),
  );

  assert.equal(days.length, 31);
  assert.equal(days[0], "2026-10-01");
  assert.equal(days.at(-1), "2026-10-31");
});

test("ReportCalendar rejects invalid IANA timezones", () => {
  assert.throws(() => new ReportCalendar("Chrono/Invalid"), /valid IANA timezone/i);
});

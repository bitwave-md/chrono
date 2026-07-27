import assert from "node:assert/strict";
import test from "node:test";

import { CalendarVersion } from "./calendar-version.ts";

test("CalendarVersion accepts only canonical production versions", () => {
  assert.equal(CalendarVersion.parse("v26.7.1")?.toString(), "v26.7.1");
  for (const value of ["26.7.1", "v26.07.1", "v2026.7.1", "v26.13.1", "v26.7.0", "latest"]) {
    assert.equal(CalendarVersion.parse(value), null, value);
  }
});

test("CalendarVersion compares numerically", () => {
  const installed = CalendarVersion.parse("v26.7.9")!;
  assert.equal(CalendarVersion.parse("v26.7.10")!.isNewerThan(installed), true);
  assert.equal(CalendarVersion.parse("v26.6.99")!.isNewerThan(installed), false);
  assert.equal(CalendarVersion.parse("v27.1.1")!.isNewerThan(installed), true);
});

test("CalendarVersion increments the UTC monthly sequence", () => {
  const existing = ["v26.7.1", "v26.7.4", "v26.6.20"].map((value) => CalendarVersion.parse(value)!);
  assert.equal(CalendarVersion.next(new Date("2026-07-31T23:59:59Z"), existing).toString(), "v26.7.5");
  assert.equal(CalendarVersion.next(new Date("2026-08-01T00:00:00Z"), existing).toString(), "v26.8.1");
});

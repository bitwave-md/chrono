import assert from "node:assert/strict";
import test from "node:test";

import { TimeEntryValidator } from "./time-entry-validator.ts";

const validator = new TimeEntryValidator();

test("TimeEntryValidator derives a completed manual period", () => {
  const startedAt = new Date(Date.now() - 3_600_000);
  const period = validator.manualPeriod(startedAt, 1_800);

  assert.equal(period.durationSeconds, 1_800);
  assert.equal(period.endedAt.getTime(), startedAt.getTime() + 1_800_000);
});

test("TimeEntryValidator rejects future and excessive manual entries", () => {
  assert.throws(() => validator.manualPeriod(new Date(), 60));
  assert.throws(() => validator.manualPeriod(new Date(0), 31 * 86_400 + 1));
});

test("TimeEntryValidator preserves completion time when editing duration", () => {
  const endedAt = new Date("2026-08-17T12:00:00.000Z");
  const period = validator.editedPeriod(endedAt, 5_437);

  assert.equal(period.endedAt, endedAt);
  assert.equal(period.durationSeconds, 5_437);
  assert.equal(period.startedAt.toISOString(), "2026-08-17T10:29:23.000Z");
  assert.throws(() => validator.editedPeriod(endedAt, 0));
});

test("TimeEntryValidator uses category billing and timer epochs", () => {
  assert.equal(
    validator.resolveBillable(null, { id: "category", defaultBillable: true }),
    true,
  );
  assert.deepEqual(
    validator.timerPeriod(
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-01T00:00:00.000Z"),
    ),
    {
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      endedAt: new Date("2026-01-01T00:00:01.000Z"),
      durationSeconds: 1,
    },
  );
});

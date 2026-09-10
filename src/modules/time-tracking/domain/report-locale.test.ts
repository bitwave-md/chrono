import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_LOCALES, reportMessages, resolveReportLocale } from "@/modules/time-tracking/domain/report-locale";

test("every locale catalog exposes the same keys as English", () => {
  const reference = Object.keys(reportMessages.en).sort();
  for (const locale of REPORT_LOCALES) {
    assert.deepEqual(Object.keys(reportMessages[locale]).sort(), reference, `locale ${locale} key mismatch`);
  }
});

test("resolveReportLocale falls back to English for unknown or missing values", () => {
  assert.equal(resolveReportLocale("ro"), "ro");
  assert.equal(resolveReportLocale("RO"), "ro");
  assert.equal(resolveReportLocale(" en "), "en");
  assert.equal(resolveReportLocale("fr"), "en");
  assert.equal(resolveReportLocale(null), "en");
  assert.equal(resolveReportLocale(undefined), "en");
});

test("Romanian entry counts use CLDR plural categories", () => {
  const { entriesCount } = reportMessages.ro;
  assert.equal(entriesCount(1), "1 înregistrare");
  assert.equal(entriesCount(3), "3 înregistrări");
  assert.equal(entriesCount(20), "20 de înregistrări");
  assert.equal(entriesCount(0), "0 înregistrări");
});

test("segment suffix only renders when a chart spans multiple pages", () => {
  assert.equal(reportMessages.en.segmentSuffix(1, 1), "");
  assert.equal(reportMessages.en.segmentSuffix(2, 3), " (2 of 3)");
  assert.equal(reportMessages.ro.segmentSuffix(2, 3), " (2 din 3)");
});

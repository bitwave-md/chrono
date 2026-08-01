import {
  addDays,
  addMonths,
  format,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

import { aggregateTimeReport } from "@/modules/time-tracking/domain/time-report-summary";
export type { TaskTimeGroup, TimeBreakdown } from "@/modules/time-tracking/domain/time-report-summary";

export type ReportPreset = "this_month" | "previous_month" | "last_30_days" | "custom";

export interface ClientReportRange {
  from: Date;
  to: Date;
}

export function reportRangeForPreset(
  preset: Exclude<ReportPreset, "custom">,
  now = new Date(),
): ClientReportRange {
  if (preset === "previous_month") {
    const from = startOfMonth(subMonths(now, 1));
    return { from, to: addMonths(from, 1) };
  }
  if (preset === "last_30_days") {
    return { from: startOfDay(subDays(now, 29)), to: addDays(startOfDay(now), 1) };
  }
  const from = startOfMonth(now);
  return { from, to: addMonths(from, 1) };
}

export function parseClientReportRange(
  fromValue: string | null,
  toValue: string | null,
  now = new Date(),
): ClientReportRange {
  const from = parseDateOnly(fromValue);
  const inclusiveTo = parseDateOnly(toValue);
  if (!from || !inclusiveTo || from > inclusiveTo) return reportRangeForPreset("this_month", now);
  return { from, to: addDays(inclusiveTo, 1) };
}

export function reportRangeParams(range: ClientReportRange) {
  return {
    from: format(range.from, "yyyy-MM-dd"),
    to: format(addDays(range.to, -1), "yyyy-MM-dd"),
  };
}

export function reportPresetForRange(
  range: ClientReportRange,
  now = new Date(),
): ReportPreset {
  for (const preset of ["this_month", "previous_month", "last_30_days"] as const) {
    const candidate = reportRangeForPreset(preset, now);
    if (candidate.from.getTime() === range.from.getTime() && candidate.to.getTime() === range.to.getTime()) return preset;
  }
  return "custom";
}

export const aggregateClientTimeReport = aggregateTimeReport;

function parseDateOnly(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parse(value, "yyyy-MM-dd", new Date());
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? startOfDay(date) : null;
}

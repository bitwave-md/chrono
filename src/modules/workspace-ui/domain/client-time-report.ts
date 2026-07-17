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

import type { TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

export type ReportPreset = "this_month" | "previous_month" | "last_30_days" | "custom";

export interface ClientReportRange {
  from: Date;
  to: Date;
}

export interface TimeBreakdown {
  id: string;
  name: string;
  color?: string;
  seconds: number;
  entryCount: number;
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

export function aggregateClientTimeReport(
  entries: TimeLogRecord[],
  range: ClientReportRange,
) {
  const totalSeconds = entries.reduce((total, entry) => total + entry.durationSeconds, 0);
  const billableSeconds = entries.reduce((total, entry) => total + (entry.billable ? entry.durationSeconds : 0), 0);
  const contributors = new Set(entries.map((entry) => entry.workerUserId)).size;
  const dailyTotals = new Map<string, number>();

  for (const entry of entries) {
    const key = format(new Date(entry.endedAt), "yyyy-MM-dd");
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + entry.durationSeconds);
  }

  const daily: Array<{ date: string; label: string; seconds: number }> = [];
  for (let date = range.from; date < range.to; date = addDays(date, 1)) {
    const key = format(date, "yyyy-MM-dd");
    daily.push({ date: key, label: format(date, "MMM d"), seconds: dailyTotals.get(key) ?? 0 });
  }

  return {
    totalSeconds,
    billableSeconds,
    entryCount: entries.length,
    contributors,
    daily,
    categories: breakdown(entries, (entry) => ({
      id: entry.categoryId ?? "uncategorized",
      name: entry.categoryName ?? "Uncategorized",
      color: entry.categoryColor ?? "#6B7280",
    })),
    projects: breakdown(entries, (entry) => ({
      id: entry.projectId ?? "no-project",
      name: entry.projectName ?? "No project",
    })),
    workers: breakdown(entries, (entry) => ({
      id: entry.workerUserId,
      name: entry.workerName ?? entry.workerEmail,
    })),
  };
}

function breakdown(
  entries: TimeLogRecord[],
  dimension: (entry: TimeLogRecord) => { id: string; name: string; color?: string },
): TimeBreakdown[] {
  const rows = new Map<string, TimeBreakdown>();
  for (const entry of entries) {
    const value = dimension(entry);
    const row = rows.get(value.id) ?? { ...value, seconds: 0, entryCount: 0 };
    row.seconds += entry.durationSeconds;
    row.entryCount += 1;
    rows.set(value.id, row);
  }
  return [...rows.values()].sort((left, right) => right.seconds - left.seconds || left.name.localeCompare(right.name));
}

function parseDateOnly(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parse(value, "yyyy-MM-dd", new Date());
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? startOfDay(date) : null;
}

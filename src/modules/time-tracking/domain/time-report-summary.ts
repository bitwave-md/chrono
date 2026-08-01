import { addDays, format } from "date-fns";

import type { TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

export interface TimeReportRange {
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

export interface TaskTimeGroup {
  issueId: string;
  identifier: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  branchId: string | null;
  branchName: string | null;
  totalSeconds: number;
  billableSeconds: number;
  latestEndedAt: string;
  entries: TimeLogRecord[];
}

export function aggregateTimeReport(entries: TimeLogRecord[], range: TimeReportRange) {
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
    tasks: groupTasks(entries),
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

function groupTasks(entries: TimeLogRecord[]): TaskTimeGroup[] {
  const groups = new Map<string, TaskTimeGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.issueId) ?? {
      issueId: entry.issueId,
      identifier: entry.identifier,
      title: entry.issueTitle,
      projectId: entry.projectId,
      projectName: entry.projectName,
      branchId: entry.branchId,
      branchName: entry.branchName,
      totalSeconds: 0,
      billableSeconds: 0,
      latestEndedAt: entry.endedAt,
      entries: [],
    };
    group.totalSeconds += entry.durationSeconds;
    if (entry.billable) group.billableSeconds += entry.durationSeconds;
    if (entry.endedAt > group.latestEndedAt) group.latestEndedAt = entry.endedAt;
    group.entries.push(entry);
    groups.set(entry.issueId, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, entries: group.entries.toSorted((left, right) => right.endedAt.localeCompare(left.endedAt)) }))
    .sort((left, right) => right.latestEndedAt.localeCompare(left.latestEndedAt));
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

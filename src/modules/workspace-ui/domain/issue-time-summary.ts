import type { TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

export type TimeSummaryEntry = Pick<
  TimeLogRecord,
  | "categoryId"
  | "categoryName"
  | "categoryColor"
  | "durationSeconds"
  | "endedAt"
>;

export interface DailyTimePoint {
  date: string;
  label: string;
  seconds: number;
}

export interface CategoryTimeSlice {
  id: string;
  name: string;
  color: string;
  seconds: number;
}

export function totalLoggedSeconds(logs: TimeSummaryEntry[]): number {
  return logs.reduce((total, log) => total + log.durationSeconds, 0);
}

export function dailyCumulativeTime(logs: TimeSummaryEntry[]): DailyTimePoint[] {
  const totals = new Map<string, number>();
  for (const log of logs) {
    const date = new Date(log.endedAt).toISOString().slice(0, 10);
    totals.set(date, (totals.get(date) ?? 0) + log.durationSeconds);
  }

  let cumulative = 0;
  const points = [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, seconds]) => {
      cumulative += seconds;
      return {
        date,
        label: new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        seconds: cumulative,
      };
    });

  return points.slice(-14);
}

export function timeByCategory(logs: TimeSummaryEntry[]): CategoryTimeSlice[] {
  const slices = new Map<string, CategoryTimeSlice>();
  for (const log of logs) {
    const id = log.categoryId ?? "uncategorized";
    const current = slices.get(id) ?? {
      id,
      name: log.categoryName ?? "Uncategorized",
      color: log.categoryColor ?? "#6B7280",
      seconds: 0,
    };
    current.seconds += log.durationSeconds;
    slices.set(id, current);
  }
  return [...slices.values()].sort((left, right) => right.seconds - left.seconds);
}

export function formatLoggedDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (!hours) return `${Math.max(minutes, 1)}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

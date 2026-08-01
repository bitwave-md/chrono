import { addDays, format } from "date-fns";

import type { aggregateTimeReport } from "@/modules/time-tracking/domain/time-report-summary";

type TimeReportSummary = ReturnType<typeof aggregateTimeReport>;

export interface TimeReportDocumentInput {
  subjectName: string;
  subjectType: "Client" | "Project";
  scope: "client" | "personal";
  range: { from: Date; to: Date };
  report: TimeReportSummary;
  truncated?: boolean;
  generatedAt?: Date;
}

export class TimeReportDocument {
  readonly subjectName: string;
  readonly subjectType: "Client" | "Project";
  readonly scopeLabel: string;
  readonly periodLabel: string;
  readonly generatedLabel: string;
  readonly totalHours: number;
  readonly billableHours: number;
  readonly entryCount: number;
  readonly contributorCount: number;
  readonly projectCount: number;
  readonly truncated: boolean;
  readonly daily: Array<{ date: string; label: string; hours: number }>;
  readonly categories: Array<{ id: string; name: string; color: string; hours: number; share: number }>;
  readonly projects: Array<{ id: string; name: string; hours: number; entryCount: number }>;
  readonly tasks: Array<{
    issueId: string;
    identifier: string;
    title: string;
    project: string;
    hours: number;
    entries: Array<{ date: string; person: string; type: string; note: string; billable: boolean; hours: number }>;
  }>;

  constructor(input: TimeReportDocumentInput) {
    const totalCategorySeconds = input.report.categories.reduce((sum, row) => sum + row.seconds, 0);
    this.subjectName = input.subjectName;
    this.subjectType = input.subjectType;
    this.scopeLabel = input.scope === "personal" ? "Personal visibility" : "Client-wide visibility";
    this.periodLabel = `${format(input.range.from, "MMM d, yyyy")} - ${format(addDays(input.range.to, -1), "MMM d, yyyy")}`;
    this.generatedLabel = format(input.generatedAt ?? new Date(), "MMM d, yyyy HH:mm");
    this.totalHours = roundHours(input.report.totalSeconds);
    this.billableHours = roundHours(input.report.billableSeconds);
    this.entryCount = input.report.entryCount;
    this.contributorCount = input.report.contributors;
    this.projectCount = input.report.projects.filter((row) => row.id !== "no-project").length;
    this.truncated = Boolean(input.truncated);
    this.daily = input.report.daily.map((row) => ({ date: row.date, label: row.label, hours: roundHours(row.seconds) }));
    this.categories = input.report.categories.map((row) => ({
      id: row.id,
      name: row.name,
      color: normalizeColor(row.color),
      hours: roundHours(row.seconds),
      share: totalCategorySeconds ? row.seconds / totalCategorySeconds : 0,
    }));
    this.projects = input.report.projects.map((row) => ({ id: row.id, name: row.name, hours: roundHours(row.seconds), entryCount: row.entryCount }));
    this.tasks = input.report.tasks.map((task) => ({
      issueId: task.issueId,
      identifier: task.identifier,
      title: task.title,
      project: task.projectName ? `${task.projectName}${task.branchName ? ` / ${task.branchName}` : ""}` : "Client work",
      hours: roundHours(task.totalSeconds),
      entries: task.entries.map((entry) => ({
        date: format(new Date(entry.endedAt), "MMM d, yyyy"),
        person: entry.workerName ?? entry.workerEmail,
        type: entry.categoryName ?? "Uncategorized",
        note: entry.note ?? "No note",
        billable: entry.billable,
        hours: roundHours(entry.durationSeconds),
      })),
    }));
  }
}

export function roundHours(seconds: number): number {
  return Math.round(seconds / 3600);
}

function normalizeColor(color?: string): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#6B7280";
}

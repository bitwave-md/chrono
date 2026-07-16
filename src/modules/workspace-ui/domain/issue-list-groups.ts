import type { IssueRecord, WorkflowStatusRecord } from "./workspace-types";

export interface IssueGroupRecord {
  key: string;
  name: string;
  color: string | null;
  category?: WorkflowStatusRecord["category"];
  issues: IssueRecord[];
}

export function buildIssueGroups(
  issues: IssueRecord[],
  statuses: WorkflowStatusRecord[] = [],
): IssueGroupRecord[] {
  if (statuses.length) {
    const backlog = issues.filter((issue) => !issue.statusId);
    return [
      ...(backlog.length ? [{
        key: "backlog",
        name: "Backlog",
        color: null,
        category: "backlog" as const,
        issues: backlog,
      }] : []),
      ...statuses.map((status) => ({
        key: status.id,
        name: status.name,
        color: status.color,
        category: status.category,
        issues: issues.filter((issue) => issue.statusId === status.id),
      })).filter((group) => group.issues.length),
    ];
  }

  const groups = new Map<string, IssueGroupRecord>();
  for (const issue of issues) {
    const name = issue.statusName ?? "Backlog";
    const key = name.toLowerCase();
    const group = groups.get(key) ?? {
      key,
      name,
      color: issue.statusColor,
      issues: [],
    };
    group.issues.push(issue);
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) =>
    statusRank(left.name) - statusRank(right.name) || left.name.localeCompare(right.name),
  );
}

function statusRank(name: string) {
  const value = name.toLowerCase();
  if (value.includes("backlog")) return 0;
  if (value.includes("todo") || value.includes("planned")) return 1;
  if (value.includes("progress") || value.includes("started")) return 2;
  if (value.includes("done") || value.includes("complete")) return 3;
  if (value.includes("cancel")) return 4;
  return 2;
}

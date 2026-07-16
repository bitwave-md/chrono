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
  statusById: ReadonlyMap<string, WorkflowStatusRecord> = new Map(),
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
    const status = issue.statusId ? statusById.get(issue.statusId) : undefined;
    const group = groups.get(key) ?? {
      key,
      name,
      color: issue.statusColor ?? status?.color ?? null,
      category: status?.category ?? inferStatusCategory(name, Boolean(issue.statusId)),
      issues: [],
    };
    group.color ??= issue.statusColor ?? status?.color ?? null;
    group.category ??= status?.category ?? inferStatusCategory(name, Boolean(issue.statusId));
    group.issues.push(issue);
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) =>
    statusRank(left) - statusRank(right) || left.name.localeCompare(right.name),
  );
}

function inferStatusCategory(
  name: string,
  hasStatus: boolean,
): WorkflowStatusRecord["category"] | undefined {
  if (!hasStatus) return "backlog";
  const value = name.toLowerCase();
  if (value.includes("backlog")) return "backlog";
  if (value.includes("todo") || value.includes("planned") || value.includes("open")) return "unstarted";
  if (value.includes("progress") || value.includes("started") || value.includes("review")) return "started";
  if (value.includes("done") || value.includes("complete")) return "completed";
  if (value.includes("cancel")) return "canceled";
  return undefined;
}

function statusRank(group: IssueGroupRecord) {
  const category = group.category ?? inferStatusCategory(group.name, true);
  if (category === "backlog") return 0;
  if (category === "unstarted") return 1;
  if (category === "started") return 2;
  if (category === "completed") return 3;
  if (category === "canceled") return 4;
  return 2;
}

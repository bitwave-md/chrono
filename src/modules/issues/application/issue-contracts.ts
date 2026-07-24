export const issuePriorities = ["none", "urgent", "high", "medium", "low"] as const;
export const issueVisibilities = ["internal", "client_shared", "restricted"] as const;
export type IssuePriority = (typeof issuePriorities)[number];
export type IssueVisibility = (typeof issueVisibilities)[number];

export interface CreateIssueInput {
  clientId: string;
  projectId: string | null;
  branchId: string | null;
  assigneeMembershipIds: string[];
  statusId: string | null;
  parentIssueId: string | null;
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
}

export interface IssueFilters {
  issueId?: string;
  projectId?: string;
  branchId?: string;
  mainBranch?: boolean;
  assigneeMembershipId?: string;
  mine?: boolean;
}

export interface UpdateIssueInput {
  expectedVersion: number;
  projectId?: string | null;
  branchId?: string | null;
  assigneeMembershipIds?: string[];
  statusId?: string | null;
  issueTypeId?: string | null;
  title?: string;
  description?: string | null;
  priority?: IssuePriority;
  visibility?: IssueVisibility;
  estimateMinutes?: number | null;
  dueAt?: Date | null;
}

export interface WorkspaceIdentity {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "guest";
  userEmail: string;
}

export type WorkspaceOption = WorkspaceIdentity;

export interface ClientRecord {
  id: string;
  name: string;
  key: string;
  description: string | null;
  issuePrefix: string;
  permission: "view" | "comment" | "contribute" | null;
}

export interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  visibility: "internal" | "client_shared" | "restricted";
  position: number;
  namespacePrefix: string | null;
  effectiveNamespacePrefix: string;
  workflowId: string;
}

export type ProjectBranchKind =
  | "feature"
  | "sprint"
  | "refactor"
  | "release"
  | "other";

export type ProjectBranchState =
  | "planned"
  | "active"
  | "completed"
  | "canceled";

export interface ProjectBranchRecord {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  kind: ProjectBranchKind;
  state: ProjectBranchState;
  summary: string | null;
  description: string | null;
  position: number;
  startDate: string | null;
  targetDate: string | null;
  totalIssues: number;
  completedIssues: number;
}

export interface MemberRecord {
  membershipId: string;
  userId: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  role?: WorkspaceIdentity["role"];
}

export type IssuePriority = "none" | "urgent" | "high" | "medium" | "low";
export type IssueVisibility = "internal" | "client_shared" | "restricted";

export interface IssueRecord {
  id: string;
  clientId: string;
  clientName: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
  projectId: string | null;
  projectName: string | null;
  branchId: string | null;
  branchName: string | null;
  assignees: MemberRecord[];
  labels: Array<{ id: string; name: string; color: string }>;
  issueTypeId: string | null;
  issueTypeName: string | null;
  issueTypeColor: string | null;
  statusId: string | null;
  statusName: string | null;
  statusColor: string | null;
  estimateMinutes: number | null;
  dueAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  optimistic?: boolean;
}

export interface WorkflowStatusRecord {
  id: string;
  name: string;
  slug: string;
  category: "backlog" | "unstarted" | "started" | "completed" | "canceled";
  color: string | null;
  position: number;
  isDefault: boolean;
}

export interface TimeCategoryRecord {
  id: string;
  name: string;
  key: string;
  color: string | null;
  defaultBillable: boolean;
  position: number;
}

export interface ActiveTimerRecord {
  id: string;
  issueId: string;
  identifier: string;
  issueTitle: string;
  clientId: string;
  projectId: string | null;
  branchId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  billable: boolean;
  startedAt: string;
}

export interface ProjectUpdateRecord {
  id: string;
  body: string;
  health: "on_track" | "at_risk" | "off_track" | null;
  progress: number | null;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
  authorAvatarUrl: string | null;
}

export interface ProjectDetailRecord {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  state: "planned" | "active" | "paused" | "completed" | "canceled";
  visibility: ProjectRecord["visibility"];
  startDate: string | null;
  targetDate: string | null;
  workflowId: string | null;
  assignees: MemberRecord[];
  progress: { total: number; completed: number; percentage: number };
  latestUpdate: ProjectUpdateRecord | null;
  resources: Array<{ id: string; title: string; url: string; description: string | null; position: number }>;
  milestones: Array<{ id: string; name: string; description: string | null; state: "planned" | "active" | "completed" | "canceled"; targetDate: string | null }>;
}

export interface ProjectActivityRecord {
  updates: ProjectUpdateRecord[];
  events: Array<{
    id: string;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
    actorName: string | null;
    actorEmail: string | null;
  }>;
}

export interface IssueCommentRecord {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorMembershipId: string;
  authorName: string | null;
  authorEmail: string;
  authorAvatarUrl: string | null;
}

export interface IssueMetadataRecord {
  issueTypes: Array<{ id: string; name: string; icon: string; color: string }>;
  labels: Array<{ id: string; name: string; color: string; description: string | null }>;
}

export interface ActiveTimerState {
  timer: ActiveTimerRecord | null;
  serverNow: string;
}

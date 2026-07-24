export interface WorkspaceIdentity {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "guest";
  userEmail: string;
  isOperator: boolean;
}

export type WorkspaceOption = WorkspaceIdentity;

export interface ClientRecord {
  id: string;
  name: string;
  key: string;
  description: string | null;
  iconType: "icon" | "emoji";
  iconKey: string;
  iconColor: string;
  issuePrefix: string;
  workflowId: string;
  permission: "view" | "comment" | "contribute" | null;
  canEdit: boolean;
  canManage: boolean;
}

export interface ClientResourceRecord {
  id: string;
  clientId: string;
  title: string;
  url: string;
  description: string | null;
  iconKey: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientMemberRecord extends MemberRecord {
  role: WorkspaceIdentity["role"];
  permission: "view" | "comment" | "contribute";
}

export type FavoriteTargetType = "client" | "project" | "issue";

export interface FavoriteRecord {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string;
  title: string;
  clientId: string;
  projectId: string | null;
  identifier: string | null;
  iconType: "icon" | "emoji" | null;
  iconKey: string | null;
  iconColor: string | null;
}

export interface ProjectRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientIconType: "icon" | "emoji";
  clientIconKey: string;
  clientIconColor: string;
  name: string;
  slug: string;
  iconType: "icon" | "emoji";
  iconKey: string;
  iconColor: string;
  visibility: "internal" | "client_shared" | "restricted";
  position: number;
  namespacePrefix: string | null;
  effectiveNamespacePrefix: string;
  workflowId: string;
  state: "planned" | "active" | "paused" | "completed" | "canceled";
  priority: ProjectPriority;
  targetDate: string | null;
  lead: MemberRecord | null;
  health: "on_track" | "at_risk" | "off_track" | null;
  healthUpdatedAt: string | null;
  issueCount: number;
  completedIssueCount: number;
  progressPercentage: number;
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
export type ProjectPriority = IssuePriority;
export type IssueVisibility = "internal" | "client_shared" | "restricted";

export interface IssueRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientIconType: "icon" | "emoji";
  clientIconKey: string;
  clientIconColor: string;
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

export interface InboxNotificationRecord {
  id: string;
  kind: "assigned" | "status_changed" | "commented";
  detail: string | null;
  createdAt: string;
  readAt: string | null;
  issueId: string;
  identifier: string;
  issueTitle: string;
  projectId: string | null;
  projectName: string | null;
  clientId: string;
  clientName: string;
  statusName: string;
  statusColor: string | null;
  statusCategory: WorkflowStatusRecord["category"];
  actorMembershipId: string;
  actorName: string | null;
  actorEmail: string;
  actorAvatarUrl: string | null;
}

export type AttachmentTargetType = "client" | "project" | "issue";

export interface AttachmentRecord {
  id: string;
  objectId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string | null;
  createdAt: string;
  uploaderMembershipId: string;
  uploaderName: string | null;
  uploaderEmail: string;
  uploaderAvatarUrl: string | null;
}

export interface AttachmentShareLinkRecord {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  createdByMembershipId: string;
}

export interface IssueActivityEventRecord {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  actorName: string | null;
  actorEmail: string;
  actorAvatarUrl: string | null;
}

export interface TimeCategoryRecord {
  id: string;
  name: string;
  key: string;
  color: string | null;
  defaultBillable: boolean;
  position: number;
}

export interface TimeLogRecord {
  id: string;
  source: "timer" | "manual";
  issueId: string;
  identifier: string;
  issueTitle: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  branchId: string | null;
  branchName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  workerUserId: string;
  workerName: string | null;
  workerEmail: string;
  workerAvatarUrl: string | null;
  note: string | null;
  billable: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  version: number;
}

export interface ClientTimeReportRecord {
  entries: TimeLogRecord[];
  scope: "client" | "personal";
  truncated: boolean;
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
  clientIconType: "icon" | "emoji";
  clientIconKey: string;
  clientIconColor: string;
  name: string;
  slug: string;
  iconType: "icon" | "emoji";
  iconKey: string;
  iconColor: string;
  summary: string | null;
  description: string | null;
  state: "planned" | "active" | "paused" | "completed" | "canceled";
  priority: ProjectPriority;
  lead: MemberRecord | null;
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
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorMembershipId: string;
  authorName: string | null;
  authorEmail: string;
  authorAvatarUrl: string | null;
  attachments: AttachmentRecord[];
}

export interface IssueMetadataRecord {
  issueTypes: Array<{ id: string; name: string; icon: string; color: string }>;
  labels: Array<{ id: string; name: string; color: string; description: string | null }>;
}

export interface ActiveTimerState {
  timer: ActiveTimerRecord | null;
  serverNow: string;
}

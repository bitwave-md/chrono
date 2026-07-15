export interface WorkspaceIdentity {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "guest";
  userEmail: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  key: string;
  description: string | null;
  issuePrefix: string;
  permission: "view" | "comment" | "contribute" | null;
}

export interface ProjectNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: "project" | "subproject" | "sprint";
  workflowMode: "own" | "inherit";
  visibility: "internal" | "client_shared" | "restricted";
  position: number;
  namespacePrefix: string | null;
  workflowId: string | null;
  effectiveNamespacePrefix: string;
  effectiveWorkflowId: string;
  children: ProjectNode[];
}

export interface TeamRecord {
  id: string;
  name: string;
  key: string;
  description: string | null;
}

export type IssuePriority = "none" | "urgent" | "high" | "medium" | "low";
export type IssueVisibility = "internal" | "client_shared" | "restricted";

export interface IssueRecord {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
  projectId: string | null;
  projectName: string | null;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  statusId: string | null;
  statusName: string | null;
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
  rootProjectId: string | null;
  teamId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  billable: boolean;
  startedAt: string;
}

export interface ActiveTimerState {
  timer: ActiveTimerRecord | null;
  serverNow: string;
}

export function flattenProjects(projects: ProjectNode[]): ProjectNode[] {
  return projects.flatMap((project) => [
    project,
    ...flattenProjects(project.children),
  ]);
}

import type { IssueQueryFilters } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export const workspaceQueryKeys = {
  clients: (workspaceSlug: string) => ["workspace", workspaceSlug, "clients"] as const,
  projects: (workspaceSlug: string, clientId: string | null) =>
    ["workspace", workspaceSlug, "projects", clientId] as const,
  members: (workspaceSlug: string) => ["workspace", workspaceSlug, "members"] as const,
  categories: (workspaceSlug: string) =>
    ["workspace", workspaceSlug, "time-categories"] as const,
  statuses: (workspaceSlug: string, workflowId: string | null) =>
    ["workspace", workspaceSlug, "workflow-statuses", workflowId] as const,
  issuesRoot: (workspaceSlug: string) =>
    ["workspace", workspaceSlug, "issues"] as const,
  issues: (
    workspaceSlug: string,
    clientId: string | null,
    filters: IssueQueryFilters,
  ) => ["workspace", workspaceSlug, "issues", clientId, filters] as const,
  activeTimer: (workspaceSlug: string) =>
    ["workspace", workspaceSlug, "active-timer"] as const,
  project: (workspaceSlug: string, projectId: string) =>
    ["workspace", workspaceSlug, "project", projectId] as const,
  projectBranches: (workspaceSlug: string, projectId: string) =>
    ["workspace", workspaceSlug, "project", projectId, "branches"] as const,
  projectActivity: (workspaceSlug: string, projectId: string) =>
    ["workspace", workspaceSlug, "project", projectId, "activity"] as const,
  issue: (workspaceSlug: string, issueId: string) =>
    ["workspace", workspaceSlug, "issue", issueId] as const,
  issueComments: (workspaceSlug: string, issueId: string) =>
    ["workspace", workspaceSlug, "issue", issueId, "comments"] as const,
  issueMetadata: (workspaceSlug: string) =>
    ["workspace", workspaceSlug, "issue-metadata"] as const,
};

import type { IssueQueryFilters } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export const workspaceQueryKeys = {
  clients: (workspaceSlug: string) => ["workspace", workspaceSlug, "clients"] as const,
  projects: (workspaceSlug: string, clientId: string | null) =>
    ["workspace", workspaceSlug, "projects", clientId] as const,
  teams: (workspaceSlug: string) => ["workspace", workspaceSlug, "teams"] as const,
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
};

"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useClientsQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.clients(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listClients(),
  });
}

export function useProjectsQuery(
  workspaceSlug: string,
  clientId: string | null,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.projects(workspaceSlug, clientId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listProjects(clientId!),
    enabled: Boolean(clientId),
  });
}

export function useMembersQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.members(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listMembers(),
  });
}

export function useTimeCategoriesQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.categories(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listCategories(),
  });
}

export function useWorkflowStatusesQuery(
  workspaceSlug: string,
  workflowId: string | null,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.statuses(workspaceSlug, workflowId),
    queryFn: () =>
      new WorkspaceApiClient(workspaceSlug).listWorkflowStatuses(workflowId!),
    enabled: Boolean(workflowId),
  });
}

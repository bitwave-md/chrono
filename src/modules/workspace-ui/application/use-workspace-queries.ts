"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { ClientRecord, TimeCategoryRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { type CreateProjectRequest, WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useClientsQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.clients(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listClients(),
  });
}

export function useCreateClientMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clients(workspaceSlug);

  return useMutation({
    mutationFn: (input: {
      name: string;
      key: string;
      issuePrefix: string;
      description: string | null;
    }) => new WorkspaceApiClient(workspaceSlug).createClient(input),
    onSuccess: (client) => {
      queryClient.setQueryData<ClientRecord[]>(queryKey, (current = []) =>
        [...current, client].sort((left, right) => left.name.localeCompare(right.name)),
      );
    },
  });
}

export function useProjectsQuery(
  workspaceSlug: string,
  clientId: string | null,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.projects(workspaceSlug, clientId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listProjects(clientId),
  });
}

export function useCreateProjectMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectRequest) =>
      new WorkspaceApiClient(workspaceSlug).createProject(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: workspaceQueryKeys.projectsRoot(workspaceSlug),
    }),
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

export function useCreateTimeCategoryMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.categories(workspaceSlug);

  return useMutation({
    mutationFn: (input: { name: string; key: string; color: string }) =>
      new WorkspaceApiClient(workspaceSlug).createCategory(input),
    onSuccess: (category) => {
      queryClient.setQueryData<TimeCategoryRecord[]>(queryKey, (current = []) =>
        [...current, category].sort((left, right) =>
          left.position - right.position || left.name.localeCompare(right.name),
        ),
      );
    },
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

export function useWorkflowStatusMapsQuery(
  workspaceSlug: string,
  workflowIds: string[],
) {
  const uniqueIds = [...new Set(workflowIds)].sort();
  const results = useQueries({
    queries: uniqueIds.map((workflowId) => ({
      queryKey: workspaceQueryKeys.statuses(workspaceSlug, workflowId),
      queryFn: () => new WorkspaceApiClient(workspaceSlug).listWorkflowStatuses(workflowId),
    })),
  });

  return new Map(uniqueIds.map((workflowId, index) => [
    workflowId,
    results[index]?.data ?? [],
  ]));
}

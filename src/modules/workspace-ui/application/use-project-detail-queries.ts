"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { ProjectDetailRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useProjectQuery(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.project(workspaceSlug, projectId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).getProject(projectId),
  });
}

export function useProjectActivityQuery(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.projectActivity(workspaceSlug, projectId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).projectActivity(projectId),
  });
}

export function useUpdateProjectMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.project(workspaceSlug, projectId);

  return useMutation({
    mutationFn: (variables: { request: Record<string, unknown>; optimistic: Partial<ProjectDetailRecord> }) =>
      new WorkspaceApiClient(workspaceSlug).updateProject(projectId, variables.request),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectDetailRecord>(queryKey);
      queryClient.setQueryData<ProjectDetailRecord>(queryKey, (current) =>
        current ? { ...current, ...variables.optimistic } : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function usePublishProjectUpdateMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; health: string | null; progress: number | null }) =>
      new WorkspaceApiClient(workspaceSlug).publishProjectUpdate(projectId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.project(workspaceSlug, projectId) }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.projectActivity(workspaceSlug, projectId) }),
      ]);
    },
  });
}

export function useAddProjectResourceMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; url: string; description: string | null }) =>
      new WorkspaceApiClient(workspaceSlug).addProjectResource(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.project(workspaceSlug, projectId) }),
  });
}

export function useAddProjectMilestoneMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; targetDate: string | null }) =>
      new WorkspaceApiClient(workspaceSlug).addProjectMilestone(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.project(workspaceSlug, projectId) }),
  });
}

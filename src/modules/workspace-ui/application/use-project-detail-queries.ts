"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { ProjectDetailRecord, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";
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

export function useProjectMembersQuery(workspaceSlug: string, projectId: string) {
  return useQuery({ queryKey: workspaceQueryKeys.projectMembers(workspaceSlug, projectId), queryFn: () => new WorkspaceApiClient(workspaceSlug).projectMembers(projectId) });
}

export function useAddProjectMemberMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (membershipId: string) => new WorkspaceApiClient(workspaceSlug).addProjectMember(projectId, membershipId), onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.projectMembers(workspaceSlug, projectId) }) });
}

export function useRemoveProjectMemberMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (membershipId: string) => new WorkspaceApiClient(workspaceSlug).removeProjectMember(projectId, membershipId), onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.projectMembers(workspaceSlug, projectId) }) });
}

export function useUpdateProjectMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.project(workspaceSlug, projectId);
  const listQueryKey = workspaceQueryKeys.projectsRoot(workspaceSlug);

  return useMutation({
    mutationFn: (variables: {
      request: Record<string, unknown>;
      optimistic: Partial<ProjectDetailRecord> & Partial<ProjectRecord>;
    }) =>
      new WorkspaceApiClient(workspaceSlug).updateProject(projectId, variables.request),
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: listQueryKey }),
      ]);
      const previous = queryClient.getQueryData<ProjectDetailRecord>(queryKey);
      const previousLists = queryClient.getQueriesData<ProjectRecord[]>({
        queryKey: listQueryKey,
      });
      queryClient.setQueryData<ProjectDetailRecord>(queryKey, (current) =>
        current ? { ...current, ...variables.optimistic } : current,
      );
      queryClient.setQueriesData<ProjectRecord[]>({ queryKey: listQueryKey }, (current = []) =>
        current.map((project) => project.id === projectId
          ? { ...project, ...variables.optimistic }
          : project),
      );
      return { previous, previousLists };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      for (const [listKey, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(listKey, data);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: listQueryKey }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.favorites(workspaceSlug) }),
      ]);
    },
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

export function useEditProjectUpdateMutation(workspaceSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ updateId, body }: { updateId: string; body: string }) =>
      new WorkspaceApiClient(workspaceSlug).editProjectUpdate(projectId, updateId, body),
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

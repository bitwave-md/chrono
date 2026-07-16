"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type {
  ProjectBranchKind,
  ProjectBranchRecord,
  ProjectBranchState,
} from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export interface CreateBranchVariables {
  name: string;
  slug: string;
  kind: ProjectBranchKind;
  state: ProjectBranchState;
  summary: string | null;
  description: string | null;
  startDate: string | null;
  targetDate: string | null;
}

export function useProjectBranchesQuery(
  workspaceSlug: string,
  projectId: string | null,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.projectBranches(workspaceSlug, projectId ?? "none"),
    queryFn: () =>
      new WorkspaceApiClient(workspaceSlug).listProjectBranches(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectBranchMutation(
  workspaceSlug: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.projectBranches(workspaceSlug, projectId);

  return useMutation({
    mutationFn: (input: CreateBranchVariables) =>
      new WorkspaceApiClient(workspaceSlug).createProjectBranch(projectId, input),
    onSuccess: (branch) => {
      queryClient.setQueryData<ProjectBranchRecord[]>(queryKey, (current = []) => [
        ...current,
        { ...branch, totalIssues: 0, completedIssues: 0 },
      ]);
    },
  });
}

export function useUpdateProjectBranchMutation(
  workspaceSlug: string,
  projectId: string,
) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.projectBranches(workspaceSlug, projectId);

  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: Record<string, unknown> }) =>
      new WorkspaceApiClient(workspaceSlug).updateProjectBranch(
        projectId,
        branchId,
        input,
      ),
    onMutate: async ({ branchId, input }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectBranchRecord[]>(queryKey);
      queryClient.setQueryData<ProjectBranchRecord[]>(queryKey, (current = []) =>
        current.map((branch) =>
          branch.id === branchId ? { ...branch, ...input } : branch,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

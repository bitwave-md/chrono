"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { FavoriteRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useDeleteEntityMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: FavoriteRecord) => {
      const client = new WorkspaceApiClient(workspaceSlug);
      if (target.targetType === "client") return client.deleteClient(target.targetId);
      if (target.targetType === "project") return client.deleteProject(target.targetId);
      return client.deleteIssue(target.targetId);
    },
    onSuccess: async (_data, target) => {
      queryClient.removeQueries({ queryKey: workspaceQueryKeys.issue(workspaceSlug, target.targetId) });
      queryClient.removeQueries({ queryKey: workspaceQueryKeys.project(workspaceSlug, target.targetId) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.clients(workspaceSlug) }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.projectsRoot(workspaceSlug) }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.issuesRoot(workspaceSlug) }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.favorites(workspaceSlug) }),
      ]);
    },
  });
}

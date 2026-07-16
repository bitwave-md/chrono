"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useIssueCommentsQuery(workspaceSlug: string, issueId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.issueComments(workspaceSlug, issueId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).issueComments(issueId),
  });
}

export function useAddIssueCommentMutation(workspaceSlug: string, issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => new WorkspaceApiClient(workspaceSlug).addIssueComment(issueId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.issueComments(workspaceSlug, issueId) }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import { attachmentQueryKey } from "@/modules/workspace-ui/application/use-attachment-queries";
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
    mutationFn: (input: { body: string; parentCommentId?: string | null; attachmentIds?: string[] }) => new WorkspaceApiClient(workspaceSlug).addIssueComment(issueId, input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.issueComments(workspaceSlug, issueId) }),
      queryClient.invalidateQueries({ queryKey: attachmentQueryKey(workspaceSlug, { targetType: "issue", targetId: issueId }) }),
    ]),
  });
}

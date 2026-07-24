"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import { attachmentQueryKey } from "@/modules/workspace-ui/application/use-attachment-queries";
import type { IssueCommentRecord } from "@/modules/workspace-ui/domain/workspace-types";
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

export function useUpdateIssueCommentMutation(workspaceSlug: string, issueId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issueComments(workspaceSlug, issueId);
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) => new WorkspaceApiClient(workspaceSlug).updateIssueComment(issueId, commentId, body),
    onMutate: async ({ commentId, body }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueCommentRecord[]>(queryKey);
      queryClient.setQueryData<IssueCommentRecord[]>(queryKey, (current = []) => current.map((comment) => comment.id === commentId ? { ...comment, body, updatedAt: new Date().toISOString() } : comment));
      return { previous };
    },
    onError: (_error, _input, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteIssueCommentMutation(workspaceSlug: string, issueId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issueComments(workspaceSlug, issueId);
  return useMutation({
    mutationFn: (commentId: string) => new WorkspaceApiClient(workspaceSlug).deleteIssueComment(issueId, commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueCommentRecord[]>(queryKey);
      queryClient.setQueryData<IssueCommentRecord[]>(queryKey, (current = []) => current.filter((comment) => comment.id !== commentId));
      return { previous };
    },
    onError: (_error, _commentId, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: attachmentQueryKey(workspaceSlug, { targetType: "issue", targetId: issueId }) }),
    ]),
  });
}

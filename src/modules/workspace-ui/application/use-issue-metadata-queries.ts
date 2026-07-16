"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useIssueMetadataQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.issueMetadata(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).issueMetadata(),
  });
}

export function useReplaceIssueLabelsMutation(workspaceSlug: string, issueId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issue(workspaceSlug, issueId);
  return useMutation({
    mutationFn: (variables: { labelIds: string[]; optimistic: IssueRecord["labels"] }) =>
      new WorkspaceApiClient(workspaceSlug).replaceIssueLabels(issueId, variables.labelIds),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueRecord>(queryKey);
      queryClient.setQueryData<IssueRecord>(queryKey, (current) => current ? { ...current, labels: variables.optimistic } : current);
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

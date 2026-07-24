"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";
import {
  type IssueQueryFilters,
  WorkspaceApiClient,
} from "@/modules/workspace-ui/infrastructure/workspace-api-client";

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
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.issueActivity(workspaceSlug, issueId) }),
    ]),
  });
}

export function useReplaceIssueListLabelsMutation(
  workspaceSlug: string,
  clientId: string | null,
  filters: IssueQueryFilters,
) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issues(workspaceSlug, clientId, filters);

  return useMutation({
    mutationFn: (variables: {
      issueId: string;
      labelIds: string[];
      optimistic: IssueRecord["labels"];
    }) => new WorkspaceApiClient(workspaceSlug).replaceIssueLabels(
      variables.issueId,
      variables.labelIds,
    ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueRecord[]>(queryKey);
      queryClient.setQueryData<IssueRecord[]>(queryKey, (current = []) =>
        current.map((issue) => issue.id === variables.issueId
          ? { ...issue, labels: variables.optimistic }
          : issue),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.issuesRoot(workspaceSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.issueActivity(workspaceSlug, variables.issueId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.issue(workspaceSlug, variables.issueId),
        }),
      ]);
    },
  });
}

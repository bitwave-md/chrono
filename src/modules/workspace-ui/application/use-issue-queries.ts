"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";
import {
  type CreateIssueRequest,
  type IssueQueryFilters,
  type UpdateIssueRequest,
  WorkspaceApiClient,
} from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export interface CreateIssueVariables extends CreateIssueRequest {
  projectName: string | null;
  branchName: string | null;
  assignees: IssueRecord["assignees"];
  statusId: string | null;
  statusName: string | null;
  statusColor: string | null;
}

export interface UpdateIssueVariables extends UpdateIssueRequest {
  optimistic: Partial<IssueRecord>;
}

export function useIssuesQuery(
  workspaceSlug: string,
  clientId: string | null,
  filters: IssueQueryFilters,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.issues(workspaceSlug, clientId, filters),
    queryFn: () =>
      new WorkspaceApiClient(workspaceSlug).listIssues(clientId, filters),
  });
}

export function useCreateIssueMutation(
  workspaceSlug: string,
  clientId: string | null,
  filters: IssueQueryFilters,
) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issues(workspaceSlug, clientId, filters);

  return useMutation({
    mutationFn: (variables: CreateIssueVariables) =>
      new WorkspaceApiClient(workspaceSlug).createIssue({
        clientId: variables.clientId,
        projectId: variables.projectId,
        branchId: variables.branchId,
        assigneeMembershipIds: variables.assigneeMembershipIds,
        statusId: variables.statusId,
        title: variables.title,
        description: variables.description,
        priority: variables.priority,
        visibility: variables.visibility,
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueRecord[]>(queryKey);
      const now = new Date().toISOString();
      const optimisticIssue: IssueRecord = {
        id: `optimistic-${crypto.randomUUID()}`,
        identifier: "NEW",
        title: variables.title,
        description: variables.description,
        priority: variables.priority,
        visibility: variables.visibility,
        projectId: variables.projectId,
        projectName: variables.projectName,
        branchId: variables.branchId,
        branchName: variables.branchName,
        clientId: variables.clientId,
        clientName: "",
        assignees: variables.assignees,
        labels: [],
        issueTypeId: null,
        issueTypeName: null,
        issueTypeColor: null,
        statusId: variables.statusId,
        statusName: variables.statusName,
        statusColor: variables.statusColor,
        estimateMinutes: null,
        dueAt: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        optimistic: true,
      };

      queryClient.setQueryData<IssueRecord[]>(queryKey, (current = []) => [
        optimisticIssue,
        ...current,
      ]);

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.issuesRoot(workspaceSlug),
      }),
  });
}

export function useUpdateIssueMutation(
  workspaceSlug: string,
  clientId: string | null,
  filters: IssueQueryFilters,
) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issues(workspaceSlug, clientId, filters);

  return useMutation({
    mutationFn: (variables: UpdateIssueVariables) => {
      const request: UpdateIssueRequest = {
        issueId: variables.issueId,
        expectedVersion: variables.expectedVersion,
        projectId: variables.projectId,
        branchId: variables.branchId,
        assigneeMembershipIds: variables.assigneeMembershipIds,
        statusId: variables.statusId,
        issueTypeId: variables.issueTypeId,
        title: variables.title,
        description: variables.description,
        priority: variables.priority,
        visibility: variables.visibility,
        estimateMinutes: variables.estimateMinutes,
        dueAt: variables.dueAt,
      };

      return new WorkspaceApiClient(workspaceSlug).updateIssue(request);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueRecord[]>(queryKey);

      queryClient.setQueryData<IssueRecord[]>(queryKey, (current = []) =>
        current.map((issue) =>
          issue.id === variables.issueId
            ? {
                ...issue,
                ...variables.optimistic,
                version: issue.version + 1,
                updatedAt: new Date().toISOString(),
              }
            : issue,
        ),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.issuesRoot(workspaceSlug),
      }),
  });
}

export function useIssueQuery(workspaceSlug: string, issueId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.issue(workspaceSlug, issueId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).getIssue(issueId),
  });
}

export function useUpdateIssueDetailMutation(workspaceSlug: string, issueId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.issue(workspaceSlug, issueId);
  return useMutation({
    mutationFn: (variables: UpdateIssueVariables) =>
      new WorkspaceApiClient(workspaceSlug).updateIssue(variables),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IssueRecord>(queryKey);
      queryClient.setQueryData<IssueRecord>(queryKey, (current) => current ? {
        ...current,
        ...variables.optimistic,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      } : current);
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.issuesRoot(workspaceSlug) }),
      ]);
    },
  });
}

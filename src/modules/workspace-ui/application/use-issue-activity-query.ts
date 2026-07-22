"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import { IssueActivityApiClient } from "@/modules/workspace-ui/infrastructure/issue-activity-api-client";

export function useIssueActivityQuery(workspaceSlug: string, issueId: string) {
  return useQuery({ queryKey: workspaceQueryKeys.issueActivity(workspaceSlug, issueId), queryFn: () => new IssueActivityApiClient(workspaceSlug).list(issueId) });
}

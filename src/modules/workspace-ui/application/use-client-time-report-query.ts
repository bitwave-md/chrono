"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import { ClientTimeReportExportClient } from "@/modules/workspace-ui/infrastructure/client-time-report-export-client";
import {
  type ClientTimeReportFilters,
  type UpdateTimeLogRequest,
  WorkspaceApiClient,
} from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useClientTimeReportQuery(
  workspaceSlug: string,
  clientId: string,
  filters: ClientTimeReportFilters,
) {
  return useQuery({
    queryKey: workspaceQueryKeys.clientTimeReport(workspaceSlug, clientId, filters),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).clientTimeReport(clientId, filters),
  });
}

export function useExportClientTimeReportMutation(workspaceSlug: string, clientId: string) {
  return useMutation({ mutationFn: (filters: ClientTimeReportFilters) => new ClientTimeReportExportClient(workspaceSlug).download(clientId, filters) });
}

export function useUpdateTimeLogMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTimeLogRequest) =>
      new WorkspaceApiClient(workspaceSlug).updateTimeLog(input),
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.clientTimeReportsRoot(workspaceSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.issueTimeLogs(workspaceSlug, input.issueId),
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.issueActivity(workspaceSlug, input.issueId),
        }),
      ]);
    },
  });
}

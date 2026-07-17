"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import {
  type ClientTimeReportFilters,
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

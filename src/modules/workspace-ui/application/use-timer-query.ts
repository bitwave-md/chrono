"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import {
  type StartTimerRequest,
  WorkspaceApiClient,
} from "@/modules/workspace-ui/infrastructure/workspace-api-client";

const timerChannelName = "chrono-active-timer";

function broadcastTimerChange(): void {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(timerChannelName);
  channel.postMessage("changed");
  channel.close();
}

export function useTimerSyncBridge(workspaceSlug: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(timerChannelName);
    channel.onmessage = () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.activeTimer(workspaceSlug),
      });
    };

    return () => channel.close();
  }, [queryClient, workspaceSlug]);
}

export function useActiveTimerQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.activeTimer(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).activeTimer(),
    refetchInterval: 30_000,
  });
}

export function useStartTimerMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartTimerRequest) =>
      new WorkspaceApiClient(workspaceSlug).startTimer(input),
    onSuccess: async () => {
      broadcastTimerChange();
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.activeTimer(workspaceSlug),
      });
    },
  });
}

export function useStopTimerMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => new WorkspaceApiClient(workspaceSlug).stopTimer(),
    onSuccess: async () => {
      broadcastTimerChange();
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.activeTimer(workspaceSlug),
      });
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.timeLogsRoot(workspaceSlug),
      });
    },
  });
}

export function useManualTimeMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      issueId: string;
      categoryId: string | null;
      durationSeconds: number;
      note: string | null;
      startedAt: string;
    }) =>
      new WorkspaceApiClient(workspaceSlug).addManualTime(input),
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.issueTimeLogs(workspaceSlug, input.issueId),
      });
    },
  });
}

export function useIssueTimeLogsQuery(workspaceSlug: string, issueId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.issueTimeLogs(workspaceSlug, issueId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listIssueTimeLogs(issueId),
  });
}

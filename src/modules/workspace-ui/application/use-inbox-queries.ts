"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { InboxNotificationRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

type NotificationAction = "read" | "unread" | "dismiss";
type InboxSnapshot = Array<[readonly unknown[], InboxNotificationRecord[] | undefined]>;

export function useInboxQuery(workspaceSlug: string, unreadOnly = false) {
  return useQuery({
    queryKey: workspaceQueryKeys.inbox(workspaceSlug, unreadOnly),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listInbox(unreadOnly),
  });
}

export function useUpdateInboxNotificationMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const root = workspaceQueryKeys.inboxRoot(workspaceSlug);
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: NotificationAction }) =>
      new WorkspaceApiClient(workspaceSlug).updateInboxNotification(id, action),
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: root });
      const snapshots = queryClient.getQueriesData<InboxNotificationRecord[]>({ queryKey: root }) as InboxSnapshot;
      for (const [key, current] of snapshots) {
        const unreadOnly = key.at(-1) === true;
        queryClient.setQueryData<InboxNotificationRecord[]>(key, () => updateRows(current ?? [], id, action, unreadOnly));
      }
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: root }),
  });
}

export function useMarkInboxReadMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const root = workspaceQueryKeys.inboxRoot(workspaceSlug);
  return useMutation({
    mutationFn: () => new WorkspaceApiClient(workspaceSlug).markInboxRead(),
    onSuccess: () => {
      queryClient.setQueryData(workspaceQueryKeys.inbox(workspaceSlug, true), []);
      queryClient.setQueryData<InboxNotificationRecord[]>(
        workspaceQueryKeys.inbox(workspaceSlug, false),
        (current = []) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: root }),
  });
}

function updateRows(
  rows: InboxNotificationRecord[],
  id: string,
  action: NotificationAction,
  unreadOnly: boolean,
): InboxNotificationRecord[] {
  if (action === "dismiss" || (action === "read" && unreadOnly)) {
    return rows.filter((item) => item.id !== id);
  }
  return rows.map((item) => item.id === id
    ? { ...item, readAt: action === "read" ? new Date().toISOString() : null }
    : item);
}

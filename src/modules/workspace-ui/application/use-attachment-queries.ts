"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AttachmentTargetType } from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceStorageApiClient, type AttachmentTargetInput } from "@/modules/workspace-ui/infrastructure/workspace-storage-api-client";
import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";

const key = (workspaceSlug: string, target: AttachmentTargetInput) => ["workspace", workspaceSlug, "attachments", target.targetType, target.targetId] as const;
const shareKey = (workspaceSlug: string, attachmentId: string) => ["workspace", workspaceSlug, "attachments", attachmentId, "share-links"] as const;

export function useAttachmentsQuery(workspaceSlug: string, target: AttachmentTargetInput) {
  return useQuery({ queryKey: key(workspaceSlug, target), queryFn: () => new WorkspaceStorageApiClient(workspaceSlug).listAttachments(target) });
}

export function useUploadAttachmentMutation(workspaceSlug: string, target: AttachmentTargetInput, onProgress: (value: number) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const client = new WorkspaceStorageApiClient(workspaceSlug);
      const intent = await client.createUpload(target, file);
      try { await client.uploadContent(intent.uploadUrl, file, onProgress); }
      catch (error) { await client.cancelUpload(intent.uploadId).catch(() => undefined); throw error; }
      return intent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(workspaceSlug, target) });
      if (target.targetType === "issue") queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.issueActivity(workspaceSlug, target.targetId) });
    },
  });
}

export function useDeleteAttachmentMutation(workspaceSlug: string, target: AttachmentTargetInput) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => new WorkspaceStorageApiClient(workspaceSlug).deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(workspaceSlug, target) }),
  });
}

export function useCreateAttachmentShareMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attachmentId, lifetimeSeconds }: { attachmentId: string; lifetimeSeconds: number }) =>
      new WorkspaceStorageApiClient(workspaceSlug).createShareLink(attachmentId, lifetimeSeconds),
    onSuccess: (_value, variables) => queryClient.invalidateQueries({ queryKey: shareKey(workspaceSlug, variables.attachmentId) }),
  });
}

export function useAttachmentShareLinksQuery(workspaceSlug: string, attachmentId: string, enabled: boolean) {
  return useQuery({ queryKey: shareKey(workspaceSlug, attachmentId), queryFn: () => new WorkspaceStorageApiClient(workspaceSlug).listShareLinks(attachmentId), enabled });
}

export function useRevokeAttachmentShareMutation(workspaceSlug: string, attachmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => new WorkspaceStorageApiClient(workspaceSlug).revokeShareLink(attachmentId, linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shareKey(workspaceSlug, attachmentId) }),
  });
}

export type { AttachmentTargetType };

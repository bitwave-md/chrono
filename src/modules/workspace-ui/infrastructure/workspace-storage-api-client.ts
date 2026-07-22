import type { AttachmentRecord, AttachmentShareLinkRecord, AttachmentTargetType } from "@/modules/workspace-ui/domain/workspace-types";
import { workspaceApiRequest, WorkspaceRequestError } from "@/modules/workspace-ui/infrastructure/workspace-api-request";

export interface AttachmentTargetInput { targetType: AttachmentTargetType; targetId: string }

export class WorkspaceStorageApiClient {
  readonly #basePath: string;

  constructor(workspaceSlug: string) {
    this.#basePath = `/api/workspaces/${encodeURIComponent(workspaceSlug)}`;
  }

  listAttachments(target: AttachmentTargetInput): Promise<AttachmentRecord[]> {
    const parameters = new URLSearchParams({ targetType: target.targetType, targetId: target.targetId });
    return workspaceApiRequest(this.#basePath, `/attachments?${parameters.toString()}`);
  }

  createUpload(target: AttachmentTargetInput, file: File): Promise<{ uploadId: string; attachmentId: string; uploadUrl: string }> {
    return workspaceApiRequest(this.#basePath, "/attachments", {
      method: "POST",
      body: JSON.stringify({ ...target, filename: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size }),
    });
  }

  deleteAttachment(attachmentId: string): Promise<unknown> {
    return workspaceApiRequest(this.#basePath, `/attachments/${encodeURIComponent(attachmentId)}`, { method: "DELETE" });
  }

  cancelUpload(uploadId: string): Promise<unknown> {
    return workspaceApiRequest(this.#basePath, `/attachments/uploads/${encodeURIComponent(uploadId)}`, { method: "DELETE" });
  }

  listShareLinks(attachmentId: string): Promise<AttachmentShareLinkRecord[]> {
    return workspaceApiRequest(this.#basePath, `/attachments/${encodeURIComponent(attachmentId)}/share-links`);
  }

  createShareLink(attachmentId: string, lifetimeSeconds: number): Promise<{ id: string; expiresAt: string; url: string }> {
    return workspaceApiRequest(this.#basePath, `/attachments/${encodeURIComponent(attachmentId)}/share-links`, {
      method: "POST",
      body: JSON.stringify({ lifetimeSeconds }),
    });
  }

  revokeShareLink(attachmentId: string, linkId: string): Promise<unknown> {
    return workspaceApiRequest(this.#basePath, `/attachments/${encodeURIComponent(attachmentId)}/share-links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
  }

  uploadContent(uploadUrl: string, file: File, onProgress: (percentage: number) => void): Promise<void> {
    return uploadRawFile(uploadUrl, file, onProgress);
  }
}

export function uploadRawFile(uploadUrl: string, file: File, onProgress: (percentage: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.withCredentials = true;
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    request.onerror = () => reject(new WorkspaceRequestError("The upload connection failed.", 0));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        try {
          const payload = JSON.parse(request.responseText) as { error?: { message?: string; code?: string } };
          reject(new WorkspaceRequestError(payload.error?.message ?? "The upload failed.", request.status, payload.error?.code));
        } catch { reject(new WorkspaceRequestError("The upload failed.", request.status)); }
      }
    };
    request.send(file);
  });
}

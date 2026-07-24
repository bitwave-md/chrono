import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import { fileTypeFromBuffer } from "file-type";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { attachments, attachmentShareLinks, storedObjects, users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";
import { AttachmentAccessService, type AttachmentTarget, targetColumns } from "@/modules/storage/application/attachment-access-service";
import { UploadPolicy } from "@/modules/storage/domain/upload-policy";
import { ObjectStorageRegistry } from "@/modules/storage/infrastructure/object-storage-registry";
import { StorageMaintenanceService } from "@/modules/storage/application/storage-maintenance-service";

export interface CreateAttachmentInput {
  target: AttachmentTarget;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export class AttachmentService {
  readonly #access = new AttachmentAccessService();
  readonly #policy = new UploadPolicy();
  readonly #maintenance = new StorageMaintenanceService();

  async list(principal: Principal, target: AttachmentTarget) {
    await this.#access.assertCanRead(principal, target);
    return db
      .select({
        id: attachments.id,
        objectId: storedObjects.id,
        filename: storedObjects.originalName,
        contentType: storedObjects.contentType,
        sizeBytes: storedObjects.sizeBytes,
        sha256: storedObjects.sha256,
        createdAt: attachments.createdAt,
        uploaderMembershipId: attachments.uploaderMembershipId,
        uploaderName: users.name,
        uploaderEmail: users.email,
        uploaderAvatarUrl: users.image,
      })
      .from(attachments)
      .innerJoin(storedObjects, eq(storedObjects.id, attachments.objectId))
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, attachments.uploaderMembershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(
        eq(attachments.workspaceId, principal.workspaceId),
        targetCondition(target),
        isNull(attachments.deletedAt),
        eq(storedObjects.state, "ready"),
      ))
      .orderBy(desc(attachments.createdAt));
  }

  async createIntent(principal: Principal, input: CreateAttachmentInput) {
    await this.#maintenance.cleanupAbandoned();
    await this.#access.assertCanContribute(principal, input.target);
    const metadata = this.#policy.attachment(input.filename, input.contentType, input.sizeBytes);
    const configuration = ObjectStorageRegistry.configuration();
    if (!configuration) throw new ConflictError("Object storage is not configured.");
    const [{ used }] = await db
      .select({ used: sql<number>`coalesce(sum(${storedObjects.sizeBytes}), 0)::int` })
      .from(storedObjects)
      .where(and(
        eq(storedObjects.workspaceId, principal.workspaceId),
        or(eq(storedObjects.state, "pending"), eq(storedObjects.state, "ready")),
      ));
    if ((used ?? 0) + metadata.sizeBytes > configuration.workspaceQuotaBytes) {
      throw new ConflictError("The Workspace storage quota has been reached.");
    }

    const objectId = randomUUID();
    const attachmentId = randomUUID();
    await db.transaction(async (transaction) => {
      await transaction.insert(storedObjects).values({
        id: objectId,
        scope: "workspace",
        workspaceId: principal.workspaceId,
        ownerUserId: principal.userId,
        objectKey: `workspaces/${principal.workspaceId}/${objectId}`,
        originalName: metadata.filename,
        contentType: metadata.contentType,
        sizeBytes: metadata.sizeBytes,
      });
      await transaction.insert(attachments).values({
        id: attachmentId,
        workspaceId: principal.workspaceId,
        objectId,
        uploaderMembershipId: principal.membershipId,
        ...targetColumns(input.target),
      });
    });
    return { uploadId: objectId, attachmentId, uploadUrl: `/api/workspaces/${principal.workspaceSlug}/attachments/uploads/${objectId}/content` };
  }

  async upload(principal: Principal, uploadId: string, body: ReadableStream<Uint8Array> | null) {
    if (!body) throw new ValidationError("An upload body is required.");
    const record = await this.#pendingUpload(principal, uploadId);
    const hash = createHash("sha256");
    const prefix: Buffer[] = [];
    let prefixSize = 0;
    let received = 0;
    const source = Readable.from(streamChunks(body, (chunk) => {
      received += chunk.byteLength;
      if (received > record.sizeBytes) throw new ValidationError("The upload exceeds its declared size.");
      hash.update(chunk);
      if (prefixSize < 4_100) {
        const part = chunk.subarray(0, 4_100 - prefixSize);
        prefix.push(Buffer.from(part));
        prefixSize += part.byteLength;
      }
    }));
    const storage = ObjectStorageRegistry.get();
    try {
      await storage.put(record.objectKey, source, record.sizeBytes, record.contentType);
      if (received !== record.sizeBytes) throw new ValidationError("The upload size does not match its declaration.");
      const detected = await fileTypeFromBuffer(Buffer.concat(prefix));
      this.#policy.assertSafePrefix(Buffer.concat(prefix));
      this.#policy.assertDetectedType(record.contentType, detected?.mime);
      const [ready] = await db.transaction(async (transaction) => {
        const updated = await transaction.update(storedObjects).set({
          contentType: detected?.mime ?? record.contentType,
          sha256: hash.digest("hex"),
          state: "ready",
          readyAt: new Date(),
        }).where(and(eq(storedObjects.id, uploadId), eq(storedObjects.state, "pending"))).returning();
        return updated;
      });
      if (!ready) throw new ConflictError("The upload is no longer pending.");
      return ready;
    } catch (error) {
      await storage.delete(record.objectKey).catch(() => undefined);
      await db.update(storedObjects).set({ state: "deleted", deletedAt: new Date() }).where(eq(storedObjects.id, uploadId));
      throw error;
    }
  }

  async content(principal: Principal, attachmentId: string) {
    const record = await this.#attachment(principal, attachmentId, false);
    return { record, body: await ObjectStorageRegistry.get().get(record.objectKey) };
  }

  async cancel(principal: Principal, uploadId: string) {
    const record = await this.#pendingUpload(principal, uploadId);
    const now = new Date();
    await db.transaction(async (transaction) => {
      await transaction.update(storedObjects).set({ state: "deleted", deletedAt: now }).where(eq(storedObjects.id, uploadId));
      await transaction.update(attachments).set({ deletedAt: now }).where(eq(attachments.objectId, uploadId));
    });
    await ObjectStorageRegistry.get().delete(record.objectKey).catch(() => undefined);
    return { id: uploadId };
  }

  async remove(principal: Principal, attachmentId: string) {
    const record = await this.#attachment(principal, attachmentId, true);
    if (principal.role !== "owner" && principal.role !== "admin" && record.uploaderMembershipId !== principal.membershipId) {
      throw new ForbiddenError("Only the uploader or a Workspace administrator can delete this attachment.");
    }
    const now = new Date();
    await db.transaction(async (transaction) => {
      await transaction.update(attachments).set({ deletedAt: now }).where(eq(attachments.id, attachmentId));
      await transaction.update(storedObjects).set({ state: "deleted", deletedAt: now }).where(eq(storedObjects.id, record.objectId));
      await transaction.update(attachmentShareLinks).set({ revokedAt: now }).where(and(eq(attachmentShareLinks.attachmentId, attachmentId), isNull(attachmentShareLinks.revokedAt)));
    });
    await ObjectStorageRegistry.get().delete(record.objectKey).catch(() => undefined);
    return { id: attachmentId };
  }

  async #pendingUpload(principal: Principal, uploadId: string) {
    const [record] = await db.select({
      id: storedObjects.id,
      objectKey: storedObjects.objectKey,
      contentType: storedObjects.contentType,
      sizeBytes: storedObjects.sizeBytes,
      issueId: attachments.issueId,
      attachmentId: attachments.id,
      filename: storedObjects.originalName,
    }).from(storedObjects).innerJoin(attachments, eq(attachments.objectId, storedObjects.id)).where(and(
      eq(storedObjects.id, uploadId),
      eq(storedObjects.workspaceId, principal.workspaceId),
      eq(storedObjects.ownerUserId, principal.userId),
      eq(storedObjects.state, "pending"),
      eq(attachments.uploaderMembershipId, principal.membershipId),
    )).limit(1);
    if (!record) throw new NotFoundError("Pending upload not found.");
    return record;
  }

  async #attachment(principal: Principal, attachmentId: string, contribute: boolean) {
    const [record] = await db.select({
      id: attachments.id,
      objectId: attachments.objectId,
      uploaderMembershipId: attachments.uploaderMembershipId,
      clientId: attachments.clientId,
      projectId: attachments.projectId,
      issueId: attachments.issueId,
      objectKey: storedObjects.objectKey,
      filename: storedObjects.originalName,
      contentType: storedObjects.contentType,
      sizeBytes: storedObjects.sizeBytes,
    }).from(attachments).innerJoin(storedObjects, eq(storedObjects.id, attachments.objectId)).where(and(
      eq(attachments.workspaceId, principal.workspaceId),
      eq(attachments.id, attachmentId),
      isNull(attachments.deletedAt),
      eq(storedObjects.state, "ready"),
    )).limit(1);
    if (!record) throw new NotFoundError("Attachment not found.");
    const target = record.clientId ? { type: "client" as const, id: record.clientId }
      : record.projectId ? { type: "project" as const, id: record.projectId }
        : { type: "issue" as const, id: record.issueId! };
    await (contribute ? this.#access.assertCanContribute(principal, target) : this.#access.assertCanRead(principal, target));
    return record;
  }
}

function targetCondition(target: AttachmentTarget) {
  if (target.type === "client") return eq(attachments.clientId, target.id);
  if (target.type === "project") return eq(attachments.projectId, target.id);
  return and(eq(attachments.issueId, target.id), isNull(attachments.commentId));
}

async function* streamChunks(stream: ReadableStream<Uint8Array>, inspect: (chunk: Uint8Array) => void) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      inspect(value);
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

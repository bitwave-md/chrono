import { randomUUID } from "node:crypto";

import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { storedObjects, userProfileAssets, users, workspaceAssets, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ConflictError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";
import { UploadPolicy } from "@/modules/storage/domain/upload-policy";
import { ObjectStorageRegistry } from "@/modules/storage/infrastructure/object-storage-registry";
import { StorageMaintenanceService } from "@/modules/storage/application/storage-maintenance-service";

export class IdentityAssetService {
  readonly #policy = new UploadPolicy();
  readonly #workspacePolicy = new WorkspacePolicy();
  readonly #maintenance = new StorageMaintenanceService();

  async createAvatarIntent(userId: string, input: { filename: string; contentType: string; sizeBytes: number }) {
    await this.#maintenance.cleanupAbandoned();
    const metadata = this.#policy.image(input.filename, input.contentType, input.sizeBytes);
    const configuration = ObjectStorageRegistry.configuration();
    if (!configuration) throw new ConflictError("Object storage is not configured.");
    const [{ used }] = await db.select({ used: sql<number>`coalesce(sum(${storedObjects.sizeBytes}), 0)::int` }).from(storedObjects).where(and(
      eq(storedObjects.ownerUserId, userId),
      eq(storedObjects.scope, "personal"),
      or(eq(storedObjects.state, "pending"), eq(storedObjects.state, "ready")),
    ));
    if ((used ?? 0) + metadata.sizeBytes > configuration.personalQuotaBytes) throw new ConflictError("Your personal storage quota has been reached.");
    return this.#insertIntent(userId, null, metadata);
  }

  async createWorkspaceIconIntent(principal: Principal, input: { filename: string; contentType: string; sizeBytes: number }) {
    await this.#maintenance.cleanupAbandoned();
    this.#workspacePolicy.assertCanManageClients(principal);
    const metadata = this.#policy.image(input.filename, input.contentType, input.sizeBytes);
    const configuration = ObjectStorageRegistry.configuration();
    if (!configuration) throw new ConflictError("Object storage is not configured.");
    const [{ used }] = await db.select({ used: sql<number>`coalesce(sum(${storedObjects.sizeBytes}), 0)::int` }).from(storedObjects).where(and(
      eq(storedObjects.workspaceId, principal.workspaceId),
      or(eq(storedObjects.state, "pending"), eq(storedObjects.state, "ready")),
    ));
    if ((used ?? 0) + metadata.sizeBytes > configuration.workspaceQuotaBytes) throw new ConflictError("The Workspace storage quota has been reached.");
    return this.#insertIntent(principal.userId, principal.workspaceId, metadata);
  }

  async uploadAvatar(userId: string, uploadId: string, body: ReadableStream<Uint8Array> | null) {
    const ready = await this.#uploadImage(userId, null, uploadId, body);
    const prior = await db.transaction(async (transaction) => {
      const [existing] = await transaction.select({ id: userProfileAssets.avatarObjectId }).from(userProfileAssets).where(eq(userProfileAssets.userId, userId)).limit(1);
      await transaction.insert(userProfileAssets).values({ userId, avatarObjectId: uploadId }).onConflictDoUpdate({ target: userProfileAssets.userId, set: { avatarObjectId: uploadId, updatedAt: new Date() } });
      await transaction.update(users).set({ image: `/api/users/${userId}/avatar`, updatedAt: new Date() }).where(eq(users.id, userId));
      return existing?.id ?? null;
    });
    await this.#deletePrior(prior);
    return ready;
  }

  async uploadWorkspaceIcon(principal: Principal, uploadId: string, body: ReadableStream<Uint8Array> | null) {
    this.#workspacePolicy.assertCanManageClients(principal);
    const ready = await this.#uploadImage(principal.userId, principal.workspaceId, uploadId, body);
    const prior = await db.transaction(async (transaction) => {
      const [existing] = await transaction.select({ id: workspaceAssets.imageObjectId }).from(workspaceAssets).where(eq(workspaceAssets.workspaceId, principal.workspaceId)).limit(1);
      await transaction.insert(workspaceAssets).values({ workspaceId: principal.workspaceId, imageObjectId: uploadId }).onConflictDoUpdate({ target: workspaceAssets.workspaceId, set: { imageObjectId: uploadId, updatedAt: new Date() } });
      return existing?.id ?? null;
    });
    await this.#deletePrior(prior);
    return ready;
  }

  async avatarContent(viewerUserId: string, targetUserId: string) {
    if (viewerUserId !== targetUserId) {
      const [viewer, target] = await Promise.all([
        db.select({ workspaceId: workspaceMemberships.workspaceId }).from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, viewerUserId), eq(workspaceMemberships.status, "active"))),
        db.select({ workspaceId: workspaceMemberships.workspaceId }).from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, targetUserId), eq(workspaceMemberships.status, "active"))),
      ]);
      const visible = new Set(viewer.map((item) => item.workspaceId));
      if (!target.some((item) => visible.has(item.workspaceId))) throw new NotFoundError("Avatar not found.");
    }
    const record = await this.#profileObject(targetUserId);
    return { record, body: await ObjectStorageRegistry.get().get(record.objectKey) };
  }

  async workspaceIconContent(principal: Principal) {
    const [record] = await db.select({ objectKey: storedObjects.objectKey, contentType: storedObjects.contentType, sizeBytes: storedObjects.sizeBytes }).from(workspaceAssets).innerJoin(storedObjects, eq(storedObjects.id, workspaceAssets.imageObjectId)).where(and(
      eq(workspaceAssets.workspaceId, principal.workspaceId), eq(storedObjects.state, "ready"), isNull(storedObjects.deletedAt),
    )).limit(1);
    if (!record) throw new NotFoundError("Workspace image not found.");
    return { record, body: await ObjectStorageRegistry.get().get(record.objectKey) };
  }

  async removeAvatar(userId: string) {
    const record = await this.#profileObject(userId).catch(() => null);
    await db.transaction(async (transaction) => {
      await transaction.update(userProfileAssets).set({ avatarObjectId: null, updatedAt: new Date() }).where(eq(userProfileAssets.userId, userId));
      await transaction.update(users).set({ image: null, updatedAt: new Date() }).where(eq(users.id, userId));
      if (record) await transaction.update(storedObjects).set({ state: "deleted", deletedAt: new Date() }).where(eq(storedObjects.objectKey, record.objectKey));
    });
    if (record) await ObjectStorageRegistry.get().delete(record.objectKey).catch(() => undefined);
  }

  async removeWorkspaceIcon(principal: Principal) {
    this.#workspacePolicy.assertCanManageClients(principal);
    const [record] = await db.select({ id: storedObjects.id, objectKey: storedObjects.objectKey }).from(workspaceAssets).innerJoin(storedObjects, eq(storedObjects.id, workspaceAssets.imageObjectId)).where(eq(workspaceAssets.workspaceId, principal.workspaceId)).limit(1);
    await db.transaction(async (transaction) => {
      await transaction.update(workspaceAssets).set({ imageObjectId: null, updatedAt: new Date() }).where(eq(workspaceAssets.workspaceId, principal.workspaceId));
      if (record) await transaction.update(storedObjects).set({ state: "deleted", deletedAt: new Date() }).where(eq(storedObjects.id, record.id));
    });
    if (record) await ObjectStorageRegistry.get().delete(record.objectKey).catch(() => undefined);
  }

  async #insertIntent(ownerUserId: string, workspaceId: string | null, metadata: { filename: string; contentType: string; sizeBytes: number }) {
    const id = randomUUID();
    await db.insert(storedObjects).values({ id, scope: workspaceId ? "workspace" : "personal", workspaceId, ownerUserId, objectKey: `${workspaceId ? `workspaces/${workspaceId}` : `users/${ownerUserId}`}/identity/${id}`, originalName: metadata.filename, contentType: metadata.contentType, sizeBytes: metadata.sizeBytes });
    return { uploadId: id };
  }

  async #uploadImage(ownerUserId: string, workspaceId: string | null, uploadId: string, body: ReadableStream<Uint8Array> | null) {
    if (!body) throw new ValidationError("An image body is required.");
    const [record] = await db.select().from(storedObjects).where(and(eq(storedObjects.id, uploadId), eq(storedObjects.ownerUserId, ownerUserId), workspaceId ? eq(storedObjects.workspaceId, workspaceId) : isNull(storedObjects.workspaceId), eq(storedObjects.state, "pending"))).limit(1);
    if (!record) throw new NotFoundError("Pending image upload not found.");
    const storage = ObjectStorageRegistry.get();
    try {
      const source = Buffer.from(await new Response(body).arrayBuffer());
      if (source.length !== record.sizeBytes) throw new ValidationError("The image size does not match its declaration.");
      const detected = await fileTypeFromBuffer(source);
      this.#policy.assertSafePrefix(source.subarray(0, 4_100));
      this.#policy.assertDetectedType(record.contentType, detected?.mime);
      if (!detected?.mime || !["image/png", "image/jpeg", "image/webp"].includes(detected.mime)) throw new ValidationError("The image content is invalid.");
      const output = await sharp(source).rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 88 }).toBuffer();
      await storage.put(record.objectKey, output, output.length, "image/webp");
      const [ready] = await db.update(storedObjects).set({ contentType: "image/webp", sizeBytes: output.length, sha256: await sha256(output), state: "ready", readyAt: new Date() }).where(eq(storedObjects.id, uploadId)).returning();
      return ready!;
    } catch (error) {
      await storage.delete(record.objectKey).catch(() => undefined);
      await db.update(storedObjects).set({ state: "deleted", deletedAt: new Date() }).where(eq(storedObjects.id, uploadId));
      throw error;
    }
  }

  async #profileObject(userId: string) {
    const [record] = await db.select({ objectKey: storedObjects.objectKey, contentType: storedObjects.contentType, sizeBytes: storedObjects.sizeBytes }).from(userProfileAssets).innerJoin(storedObjects, eq(storedObjects.id, userProfileAssets.avatarObjectId)).where(and(eq(userProfileAssets.userId, userId), eq(storedObjects.state, "ready"), isNull(storedObjects.deletedAt))).limit(1);
    if (!record) throw new NotFoundError("Avatar not found.");
    return record;
  }

  async #deletePrior(objectId: string | null) {
    if (!objectId) return;
    const [record] = await db.update(storedObjects).set({ state: "deleted", deletedAt: new Date() }).where(eq(storedObjects.id, objectId)).returning({ objectKey: storedObjects.objectKey });
    if (record) await ObjectStorageRegistry.get().delete(record.objectKey).catch(() => undefined);
  }
}

async function sha256(value: Buffer): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
}

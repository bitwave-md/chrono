import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { attachments, attachmentShareLinks, clients, issues, projects, storedObjects, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";
import { AttachmentAccessService } from "@/modules/storage/application/attachment-access-service";
import { PublicShareRateLimiter } from "@/modules/storage/application/public-share-rate-limiter";
import { ShareToken } from "@/modules/storage/domain/share-token";
import { ObjectStorageRegistry } from "@/modules/storage/infrastructure/object-storage-registry";

const maximumLifetimeSeconds = 30 * 24 * 60 * 60;

export class AttachmentShareService {
  readonly #access = new AttachmentAccessService();
  readonly #limiter = new PublicShareRateLimiter();

  async list(principal: Principal, attachmentId: string) {
    await this.#authorizedAttachment(principal, attachmentId);
    return db.select({
      id: attachmentShareLinks.id,
      expiresAt: attachmentShareLinks.expiresAt,
      revokedAt: attachmentShareLinks.revokedAt,
      accessCount: attachmentShareLinks.accessCount,
      lastAccessedAt: attachmentShareLinks.lastAccessedAt,
      createdAt: attachmentShareLinks.createdAt,
      createdByMembershipId: attachmentShareLinks.createdByMembershipId,
    }).from(attachmentShareLinks).where(and(
      eq(attachmentShareLinks.workspaceId, principal.workspaceId),
      eq(attachmentShareLinks.attachmentId, attachmentId),
    )).orderBy(desc(attachmentShareLinks.createdAt));
  }

  async create(principal: Principal, attachmentId: string, lifetimeSeconds: number) {
    await this.#authorizedAttachment(principal, attachmentId);
    if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds < 3_600 || lifetimeSeconds > maximumLifetimeSeconds) {
      throw new ValidationError("Share links must expire between one hour and 30 days.");
    }
    const token = ShareToken.create();
    const expiresAt = new Date(Date.now() + lifetimeSeconds * 1_000);
    const [record] = await db.insert(attachmentShareLinks).values({
      workspaceId: principal.workspaceId,
      attachmentId,
      createdByMembershipId: principal.membershipId,
      tokenHash: token.digest,
      expiresAt,
    }).returning({ id: attachmentShareLinks.id, expiresAt: attachmentShareLinks.expiresAt });
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return { ...record, url: new URL(`/share/files/${token.value}`, base).toString() };
  }

  async revoke(principal: Principal, attachmentId: string, linkId: string) {
    await this.#authorizedAttachment(principal, attachmentId);
    const [link] = await db.select({ creator: attachmentShareLinks.createdByMembershipId }).from(attachmentShareLinks).where(and(
      eq(attachmentShareLinks.workspaceId, principal.workspaceId),
      eq(attachmentShareLinks.attachmentId, attachmentId),
      eq(attachmentShareLinks.id, linkId),
    )).limit(1);
    if (!link) throw new NotFoundError("Share link not found.");
    if (principal.role !== "owner" && principal.role !== "admin" && link.creator !== principal.membershipId) {
      throw new ForbiddenError("Only the link creator or a Workspace administrator can revoke it.");
    }
    await db.update(attachmentShareLinks).set({ revokedAt: new Date() }).where(eq(attachmentShareLinks.id, linkId));
    return { id: linkId };
  }

  async publicContent(rawToken: string) {
    const digest = ShareToken.digest(rawToken);
    this.#limiter.assertAllowed(digest);
    const now = new Date();
    const [record] = await db.select({
      linkId: attachmentShareLinks.id,
      objectKey: storedObjects.objectKey,
      filename: storedObjects.originalName,
      contentType: storedObjects.contentType,
      sizeBytes: storedObjects.sizeBytes,
    }).from(attachmentShareLinks)
      .innerJoin(attachments, eq(attachments.id, attachmentShareLinks.attachmentId))
      .innerJoin(storedObjects, eq(storedObjects.id, attachments.objectId))
      .innerJoin(workspaceMemberships, and(
        eq(workspaceMemberships.workspaceId, attachmentShareLinks.workspaceId),
        eq(workspaceMemberships.id, attachmentShareLinks.createdByMembershipId),
      ))
      .leftJoin(clients, eq(clients.id, attachments.clientId))
      .leftJoin(projects, eq(projects.id, attachments.projectId))
      .leftJoin(issues, eq(issues.id, attachments.issueId))
      .where(and(
        eq(attachmentShareLinks.tokenHash, digest),
        isNull(attachmentShareLinks.revokedAt),
        gt(attachmentShareLinks.expiresAt, now),
        eq(workspaceMemberships.status, "active"),
        isNull(attachments.deletedAt),
        eq(storedObjects.state, "ready"),
        or(
          and(sql`${attachments.clientId} is not null`, isNull(clients.archivedAt)),
          and(sql`${attachments.projectId} is not null`, isNull(projects.archivedAt)),
          and(sql`${attachments.issueId} is not null`, isNull(issues.archivedAt)),
        ),
      )).limit(1);
    if (!record) throw new NotFoundError("Share link not found or expired.");
    await db.update(attachmentShareLinks).set({
      accessCount: sql`${attachmentShareLinks.accessCount} + 1`,
      lastAccessedAt: now,
    }).where(eq(attachmentShareLinks.id, record.linkId));
    return { record, body: await ObjectStorageRegistry.get().get(record.objectKey) };
  }

  async #authorizedAttachment(principal: Principal, attachmentId: string) {
    const [record] = await db.select({
      clientId: attachments.clientId,
      projectId: attachments.projectId,
      issueId: attachments.issueId,
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
    await this.#access.assertCanContribute(principal, target);
  }
}

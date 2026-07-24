import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { attachments, issueComments, storedObjects, users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueNotificationWriter } from "@/modules/inbox/application/issue-notification-writer";
import { IssueService } from "@/modules/issues/application/issue-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";
import { AttachmentService } from "@/modules/storage/application/attachment-service";

export class IssueCommentService {
  readonly #issueService = new IssueService();
  readonly #clientAccess = new ClientAccessService();
  readonly #notifications = new IssueNotificationWriter();
  readonly #attachments = new AttachmentService();

  async list(principal: Principal, issueId: string) {
    await this.#issueService.get(principal, issueId);
    const comments = await db
      .select({
        id: issueComments.id,
        parentCommentId: issueComments.parentCommentId,
        body: issueComments.body,
        createdAt: issueComments.createdAt,
        updatedAt: issueComments.updatedAt,
        authorMembershipId: issueComments.authorMembershipId,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.image,
      })
      .from(issueComments)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, issueComments.authorMembershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(
        eq(issueComments.workspaceId, principal.workspaceId),
        eq(issueComments.issueId, issueId),
        isNull(issueComments.deletedAt),
      ))
      .orderBy(asc(issueComments.createdAt));

    const files = await db
      .select({
        id: attachments.id,
        commentId: attachments.commentId,
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
        eq(attachments.issueId, issueId),
        isNotNull(attachments.commentId),
        isNull(attachments.deletedAt),
        eq(storedObjects.state, "ready"),
      ))
      .orderBy(asc(attachments.createdAt));

    return comments.map((comment) => ({
      ...comment,
      attachments: files.filter((file) => file.commentId === comment.id).map(({ commentId, ...file }) => {
        void commentId;
        return file;
      }),
    }));
  }

  async create(principal: Principal, issueId: string, input: { body: string; parentCommentId: string | null; attachmentIds: string[] }) {
    const issue = await this.#issueService.get(principal, issueId);
    await this.#clientAccess.assertCanContribute(principal, issue.clientId);
    const body = input.body.trim();
    if (!body && !input.attachmentIds.length) throw new ValidationError("A comment or attachment is required.");
    if (body.length > 20_000) throw new ValidationError("Comment must contain at most 20,000 characters.");
    return db.transaction(async (transaction) => {
      if (input.parentCommentId) {
        const [parent] = await transaction.select({ id: issueComments.id, parentCommentId: issueComments.parentCommentId }).from(issueComments).where(and(
          eq(issueComments.workspaceId, principal.workspaceId),
          eq(issueComments.issueId, issueId),
          eq(issueComments.id, input.parentCommentId),
          isNull(issueComments.deletedAt),
        )).limit(1);
        if (!parent) throw new ValidationError("The parent comment does not belong to this Issue.");
        if (parent.parentCommentId) throw new ValidationError("Replies can only target a top-level comment.");
      }

      if (input.attachmentIds.length) {
        const ownedFiles = await transaction.select({ id: attachments.id }).from(attachments)
          .innerJoin(storedObjects, eq(storedObjects.id, attachments.objectId))
          .where(and(
            eq(attachments.workspaceId, principal.workspaceId),
            eq(attachments.issueId, issueId),
            eq(attachments.uploaderMembershipId, principal.membershipId),
            inArray(attachments.id, input.attachmentIds),
            isNull(attachments.commentId),
            isNull(attachments.deletedAt),
            eq(storedObjects.state, "ready"),
          ));
        if (ownedFiles.length !== input.attachmentIds.length) {
          throw new ValidationError("One or more comment attachments are unavailable.");
        }
      }

      const [comment] = await transaction.insert(issueComments).values({
        workspaceId: principal.workspaceId,
        issueId,
        parentCommentId: input.parentCommentId,
        authorMembershipId: principal.membershipId,
        body,
      }).returning();
      if (input.attachmentIds.length) {
        const linked = await transaction.update(attachments).set({ commentId: comment.id }).where(and(
          eq(attachments.workspaceId, principal.workspaceId),
          eq(attachments.issueId, issueId),
          eq(attachments.uploaderMembershipId, principal.membershipId),
          inArray(attachments.id, input.attachmentIds),
          isNull(attachments.commentId),
          isNull(attachments.deletedAt),
        )).returning({ id: attachments.id });
        if (linked.length !== input.attachmentIds.length) {
          throw new ValidationError("One or more comment attachments were already used.");
        }
      }
      await this.#notifications.notifyInterested(
        transaction,
        principal,
        issueId,
        "commented",
        body.slice(0, 240) || `Attached ${input.attachmentIds.length} file${input.attachmentIds.length === 1 ? "" : "s"}`,
      );
      return comment;
    });
  }

  async update(principal: Principal, issueId: string, commentId: string, bodyValue: string) {
    const issue = await this.#issueService.get(principal, issueId);
    await this.#clientAccess.assertCanContribute(principal, issue.clientId);
    const body = bodyValue.trim();
    if (!body) throw new ValidationError("Comment text is required when editing.");
    if (body.length > 20_000) throw new ValidationError("Comment must contain at most 20,000 characters.");
    const comment = await this.#comment(principal, issueId, commentId);
    if (comment.authorMembershipId !== principal.membershipId) {
      throw new ForbiddenError("Only the comment author can edit this comment.");
    }
    const [updated] = await db.update(issueComments).set({ body, updatedAt: new Date() }).where(and(
      eq(issueComments.workspaceId, principal.workspaceId),
      eq(issueComments.issueId, issueId),
      eq(issueComments.id, commentId),
      isNull(issueComments.deletedAt),
    )).returning();
    if (!updated) throw new NotFoundError("Comment not found.");
    return updated;
  }

  async remove(principal: Principal, issueId: string, commentId: string) {
    const issue = await this.#issueService.get(principal, issueId);
    await this.#clientAccess.assertCanContribute(principal, issue.clientId);
    const comment = await this.#comment(principal, issueId, commentId);
    const canModerate = principal.role === "owner" || principal.role === "admin";
    if (!canModerate && comment.authorMembershipId !== principal.membershipId) {
      throw new ForbiddenError("Only the comment author or a Workspace administrator can delete this comment.");
    }
    const files = await db.select({ id: attachments.id }).from(attachments).where(and(
      eq(attachments.workspaceId, principal.workspaceId),
      eq(attachments.issueId, issueId),
      eq(attachments.commentId, commentId),
      isNull(attachments.deletedAt),
    ));
    const [removed] = await db.update(issueComments).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(issueComments.workspaceId, principal.workspaceId),
      eq(issueComments.issueId, issueId),
      eq(issueComments.id, commentId),
      isNull(issueComments.deletedAt),
    )).returning({ id: issueComments.id });
    if (!removed) throw new NotFoundError("Comment not found.");
    await Promise.all(files.map((file) => this.#attachments.remove(principal, file.id)));
    return removed;
  }

  async #comment(principal: Principal, issueId: string, commentId: string) {
    const [comment] = await db.select({ authorMembershipId: issueComments.authorMembershipId }).from(issueComments).where(and(
      eq(issueComments.workspaceId, principal.workspaceId),
      eq(issueComments.issueId, issueId),
      eq(issueComments.id, commentId),
      isNull(issueComments.deletedAt),
    )).limit(1);
    if (!comment) throw new NotFoundError("Comment not found.");
    return comment;
  }
}

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { issueComments, users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueService } from "@/modules/issues/application/issue-service";
import { ValidationError } from "@/modules/shared/application/application-error";

export class IssueCommentService {
  readonly #issueService = new IssueService();
  readonly #clientAccess = new ClientAccessService();

  async list(principal: Principal, issueId: string) {
    await this.#issueService.get(principal, issueId);
    return db
      .select({
        id: issueComments.id,
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
  }

  async create(principal: Principal, issueId: string, bodyValue: string) {
    const issue = await this.#issueService.get(principal, issueId);
    await this.#clientAccess.assertCanContribute(principal, issue.clientId);
    const body = bodyValue.trim();
    if (!body || body.length > 20_000) throw new ValidationError("Comment must contain 1-20,000 characters.");
    const [comment] = await db.insert(issueComments).values({
      workspaceId: principal.workspaceId,
      issueId,
      authorMembershipId: principal.membershipId,
      body,
    }).returning();
    return comment;
  }
}

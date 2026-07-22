import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { issueActivityEvents, users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { IssueService } from "@/modules/issues/application/issue-service";

export class IssueActivityService {
  readonly #issues = new IssueService();

  async list(principal: Principal, issueId: string) {
    await this.#issues.get(principal, issueId);
    return db.select({
      id: issueActivityEvents.id,
      eventType: issueActivityEvents.eventType,
      payload: issueActivityEvents.payload,
      createdAt: issueActivityEvents.createdAt,
      actorName: users.name,
      actorEmail: users.email,
      actorAvatarUrl: users.image,
    }).from(issueActivityEvents)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, issueActivityEvents.actorMembershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(eq(issueActivityEvents.workspaceId, principal.workspaceId), eq(issueActivityEvents.issueId, issueId)))
      .orderBy(asc(issueActivityEvents.createdAt));
  }
}

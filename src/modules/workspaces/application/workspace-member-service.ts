import { and, asc, eq, inArray } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import { users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { NotFoundError } from "@/modules/shared/application/application-error";

export class WorkspaceMemberService {
  async list(principal: Principal) {
    const conditions = [
      eq(workspaceMemberships.workspaceId, principal.workspaceId),
      eq(workspaceMemberships.status, "active" as const),
      eq(users.status, "active" as const),
    ];

    if (principal.role === "guest") {
      conditions.push(eq(workspaceMemberships.id, principal.membershipId));
    }

    return db
      .select({
        membershipId: workspaceMemberships.id,
        userId: users.id,
        displayName: users.name,
        email: users.email,
        avatarUrl: users.image,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(...conditions))
      .orderBy(asc(users.name), asc(users.email));
  }

  async assertActive(
    transaction: DatabaseTransaction,
    principal: Principal,
    membershipIds: string[],
  ): Promise<void> {
    if (!membershipIds.length) return;

    const rows = await transaction
      .select({ id: workspaceMemberships.id })
      .from(workspaceMemberships)
      .where(and(
        eq(workspaceMemberships.workspaceId, principal.workspaceId),
        inArray(workspaceMemberships.id, membershipIds),
        eq(workspaceMemberships.status, "active"),
      ));

    if (rows.length !== new Set(membershipIds).size) {
      throw new NotFoundError("One or more assignees are unavailable.");
    }
  }
}

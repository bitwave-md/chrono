import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { users, workspaceMemberships, workspaces } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";

export class PrincipalService {
  async listForUser(userId: string): Promise<Principal[]> {
    return db
      .select({
        userId: users.id,
        email: users.email,
        membershipId: workspaceMemberships.id,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(
        and(
          eq(workspaceMemberships.userId, userId),
          eq(workspaceMemberships.status, "active"),
          eq(users.status, "active"),
          isNull(workspaces.archivedAt),
        ),
      )
      .orderBy(asc(workspaces.name));
  }

  async requireWorkspace(
    userId: string,
    workspaceSlug: string,
  ): Promise<Principal | null> {
    const [principal] = await db
      .select({
        userId: users.id,
        email: users.email,
        membershipId: workspaceMemberships.id,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(
        and(
          eq(workspaceMemberships.userId, userId),
          eq(workspaceMemberships.status, "active"),
          eq(users.status, "active"),
          eq(workspaces.slug, workspaceSlug),
          isNull(workspaces.archivedAt),
        ),
      )
      .limit(1);

    return principal ?? null;
  }
}

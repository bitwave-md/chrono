import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { clientMemberships, users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { NotFoundError } from "@/modules/shared/application/application-error";
import { WorkspaceMemberService } from "@/modules/workspaces/application/workspace-member-service";

export const clientPermissions = ["view", "comment", "contribute"] as const;
export type ClientPermission = (typeof clientPermissions)[number];

export class ClientMemberService {
  readonly #access = new ClientAccessService();
  readonly #memberService = new WorkspaceMemberService();
  readonly #policy = new WorkspacePolicy();

  async list(principal: Principal, clientId: string) {
    await this.#access.assertCanRead(principal, clientId);
    return db
      .select({
        membershipId: workspaceMemberships.id,
        userId: users.id,
        displayName: users.name,
        email: users.email,
        avatarUrl: users.image,
        role: workspaceMemberships.role,
        permission: clientMemberships.permission,
      })
      .from(clientMemberships)
      .innerJoin(
        workspaceMemberships,
        eq(workspaceMemberships.id, clientMemberships.workspaceMembershipId),
      )
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(
        eq(clientMemberships.workspaceId, principal.workspaceId),
        eq(clientMemberships.clientId, clientId),
        eq(workspaceMemberships.status, "active"),
        eq(users.status, "active"),
      ))
      .orderBy(asc(users.name), asc(users.email));
  }

  async add(
    principal: Principal,
    clientId: string,
    membershipId: string,
    permission: ClientPermission,
  ) {
    this.#policy.assertCanManageClients(principal);
    await this.#access.assertCanRead(principal, clientId);
    await db.transaction(async (transaction) => {
      await this.#memberService.assertActive(transaction, principal, [membershipId]);
      await transaction
        .insert(clientMemberships)
        .values({
          workspaceId: principal.workspaceId,
          clientId,
          workspaceMembershipId: membershipId,
          permission,
        })
        .onConflictDoUpdate({
          target: [
            clientMemberships.clientId,
            clientMemberships.workspaceMembershipId,
          ],
          set: { permission },
        });
    });
    return this.#member(principal, clientId, membershipId);
  }

  async update(
    principal: Principal,
    clientId: string,
    membershipId: string,
    permission: ClientPermission,
  ) {
    this.#policy.assertCanManageClients(principal);
    const [membership] = await db
      .update(clientMemberships)
      .set({ permission })
      .where(and(
        eq(clientMemberships.workspaceId, principal.workspaceId),
        eq(clientMemberships.clientId, clientId),
        eq(clientMemberships.workspaceMembershipId, membershipId),
      ))
      .returning({ id: clientMemberships.workspaceMembershipId });
    if (!membership) throw new NotFoundError("Client member not found.");
    return this.#member(principal, clientId, membershipId);
  }

  async remove(principal: Principal, clientId: string, membershipId: string) {
    this.#policy.assertCanManageClients(principal);
    const [membership] = await db
      .delete(clientMemberships)
      .where(and(
        eq(clientMemberships.workspaceId, principal.workspaceId),
        eq(clientMemberships.clientId, clientId),
        eq(clientMemberships.workspaceMembershipId, membershipId),
      ))
      .returning({ id: clientMemberships.workspaceMembershipId });
    if (!membership) throw new NotFoundError("Client member not found.");
    return membership;
  }

  async #member(principal: Principal, clientId: string, membershipId: string) {
    const members = await this.list(principal, clientId);
    const member = members.find((candidate) => candidate.membershipId === membershipId);
    if (!member) throw new NotFoundError("Client member not found.");
    return member;
  }
}

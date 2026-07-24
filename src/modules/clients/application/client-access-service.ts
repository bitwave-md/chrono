import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { clientMemberships, clients } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import {
  ForbiddenError,
  NotFoundError,
} from "@/modules/shared/application/application-error";

export class ClientAccessService {
  async assertCanRead(principal: Principal, clientId: string): Promise<void> {
    const client = await this.#accessibleClient(principal, clientId, false);

    if (!client) {
      throw new NotFoundError("Client not found.");
    }
  }

  async assertCanContribute(
    principal: Principal,
    clientId: string,
  ): Promise<void> {
    if (principal.role === "guest") {
      throw new ForbiddenError("Guests cannot modify Client or work-item properties.");
    }
    const client = await this.#accessibleClient(principal, clientId, true);

    if (!client) {
      throw new ForbiddenError("The client does not allow contributions.");
    }
  }

  async assertCanParticipate(principal: Principal, clientId: string): Promise<void> {
    const client = await this.#accessibleClient(principal, clientId, false);
    if (!client) throw new ForbiddenError("You do not have access to this Client.");
  }

  async #accessibleClient(
    principal: Principal,
    clientId: string,
    requireContribution: boolean,
  ): Promise<{ id: string } | undefined> {
    if (principal.role !== "guest") {
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.workspaceId, principal.workspaceId),
            isNull(clients.archivedAt),
          ),
        )
        .limit(1);

      return client;
    }

    const conditions = [
      eq(clients.id, clientId),
      eq(clients.workspaceId, principal.workspaceId),
      eq(clientMemberships.workspaceMembershipId, principal.membershipId),
      isNull(clients.archivedAt),
    ];

    if (requireContribution) {
      conditions.push(eq(clientMemberships.permission, "contribute"));
    }

    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .innerJoin(clientMemberships, eq(clientMemberships.clientId, clients.id))
      .where(and(...conditions))
      .limit(1);

    return client;
  }
}

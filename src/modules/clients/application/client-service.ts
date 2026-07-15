import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import {
  clientMemberships,
  clients,
  issueNamespaces,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ClientKey } from "@/modules/clients/domain/client-key";
import { IssuePrefix } from "@/modules/projects/domain/issue-prefix";
import {
  ConflictError,
  ValidationError,
} from "@/modules/shared/application/application-error";

export interface CreateClientInput {
  name: string;
  key: string;
  issuePrefix: string;
  description: string | null;
}

export class ClientService {
  readonly #policy = new WorkspacePolicy();

  async list(principal: Principal) {
    if (principal.role === "guest") {
      return db
        .select({
          id: clients.id,
          name: clients.name,
          key: clients.key,
          description: clients.description,
          issuePrefix: issueNamespaces.prefix,
          permission: clientMemberships.permission,
        })
        .from(clients)
        .innerJoin(clientMemberships, eq(clientMemberships.clientId, clients.id))
        .innerJoin(
          issueNamespaces,
          and(
            eq(issueNamespaces.clientId, clients.id),
            isNull(issueNamespaces.projectId),
          ),
        )
        .where(
          and(
            eq(clients.workspaceId, principal.workspaceId),
            eq(
              clientMemberships.workspaceMembershipId,
              principal.membershipId,
            ),
            isNull(clients.archivedAt),
          ),
        )
        .orderBy(asc(clients.name));
    }

    return db
      .select({
        id: clients.id,
        name: clients.name,
        key: clients.key,
        description: clients.description,
        issuePrefix: issueNamespaces.prefix,
        permission: clientMemberships.permission,
      })
      .from(clients)
      .innerJoin(
        issueNamespaces,
        and(
          eq(issueNamespaces.clientId, clients.id),
          isNull(issueNamespaces.projectId),
        ),
      )
      .leftJoin(
        clientMemberships,
        and(
          eq(clientMemberships.clientId, clients.id),
          eq(clientMemberships.workspaceMembershipId, principal.membershipId),
        ),
      )
      .where(
        and(
          eq(clients.workspaceId, principal.workspaceId),
          isNull(clients.archivedAt),
        ),
      )
      .orderBy(asc(clients.name));
  }

  async create(principal: Principal, input: CreateClientInput) {
    this.#policy.assertCanManageClients(principal);

    const name = input.name.trim();
    const key = new ClientKey(input.key).value;
    const issuePrefix = new IssuePrefix(input.issuePrefix).value;

    if (name.length < 2 || name.length > 120) {
      throw new ValidationError("Client names must contain 2-120 characters.");
    }

    try {
      return await db.transaction(async (transaction) => {
        const [client] = await transaction
          .insert(clients)
          .values({
            workspaceId: principal.workspaceId,
            name,
            key,
            description: input.description,
          })
          .returning({
            id: clients.id,
            name: clients.name,
            key: clients.key,
            description: clients.description,
          });

        const [namespace] = await transaction
          .insert(issueNamespaces)
          .values({
            workspaceId: principal.workspaceId,
            clientId: client.id,
            prefix: issuePrefix,
          })
          .returning({
            id: issueNamespaces.id,
            prefix: issueNamespaces.prefix,
          });

        return { ...client, issueNamespace: namespace };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "The client key or issue prefix is already in use.",
        );
      }

      throw error;
    }
  }
}

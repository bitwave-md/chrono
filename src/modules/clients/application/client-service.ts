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
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { ClientKey } from "@/modules/clients/domain/client-key";
import { ClientIcon, type ClientIconType } from "@/modules/clients/domain/client-icon";
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
  iconType: ClientIconType;
  iconKey: string;
  iconColor: string;
}

export interface UpdateClientInput {
  name?: string;
  description?: string | null;
  iconType?: ClientIconType;
  iconKey?: string;
  iconColor?: string;
}

export class ClientService {
  readonly #access = new ClientAccessService();
  readonly #policy = new WorkspacePolicy();

  async list(principal: Principal) {
    const selection = {
      id: clients.id,
      name: clients.name,
      key: clients.key,
      description: clients.description,
      iconType: clients.iconType,
      iconKey: clients.iconKey,
      iconColor: clients.iconColor,
      issuePrefix: issueNamespaces.prefix,
      permission: clientMemberships.permission,
    };
    let records;

    if (principal.role === "guest") {
      records = await db
        .select(selection)
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
    } else {
      records = await db
        .select(selection)
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

    return records.map((record) => ({
      ...record,
      canEdit: principal.role !== "guest" || record.permission === "contribute",
      canManage: principal.role === "owner" || principal.role === "admin",
    }));
  }

  async create(principal: Principal, input: CreateClientInput) {
    this.#policy.assertCanManageClients(principal);

    const name = input.name.trim();
    const key = new ClientKey(input.key).value;
    const issuePrefix = new IssuePrefix(input.issuePrefix).value;
    const icon = new ClientIcon(input.iconType, input.iconKey, input.iconColor);

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
            iconType: icon.type,
            iconKey: icon.key,
            iconColor: icon.color,
          })
          .returning({
            id: clients.id,
            name: clients.name,
            key: clients.key,
            description: clients.description,
            iconType: clients.iconType,
            iconKey: clients.iconKey,
            iconColor: clients.iconColor,
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

        await transaction.insert(clientMemberships).values({
          workspaceId: principal.workspaceId,
          clientId: client.id,
          workspaceMembershipId: principal.membershipId,
          permission: "contribute",
        }).onConflictDoNothing();

        return {
          ...client,
          issuePrefix: namespace.prefix,
          permission: "contribute" as const,
          canEdit: true,
          canManage: true,
        };
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

  async update(principal: Principal, clientId: string, input: UpdateClientInput) {
    await this.#access.assertCanContribute(principal, clientId);
    const name = input.name?.trim();

    if (name !== undefined && (name.length < 2 || name.length > 120)) {
      throw new ValidationError("Client names must contain 2-120 characters.");
    }

    const iconFields = [input.iconType, input.iconKey, input.iconColor];
    const icon = iconFields.some((value) => value !== undefined)
      ? new ClientIcon(
          input.iconType ?? "icon",
          input.iconKey ?? "hash",
          input.iconColor ?? "#6366f1",
        )
      : null;

    const [client] = await db
      .update(clients)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(icon ? {
          iconType: icon.type,
          iconKey: icon.key,
          iconColor: icon.color,
        } : {}),
        updatedAt: new Date(),
      })
      .where(and(
        eq(clients.id, clientId),
        eq(clients.workspaceId, principal.workspaceId),
        isNull(clients.archivedAt),
      ))
      .returning();

    return client;
  }
}

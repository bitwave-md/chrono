import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { clientResources } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { NotFoundError, ValidationError } from "@/modules/shared/application/application-error";

export interface CreateClientResourceInput {
  title: string;
  url: string;
  description: string | null;
  iconKey: string | null;
}

export interface UpdateClientResourceInput {
  title?: string;
  url?: string;
  description?: string | null;
  iconKey?: string | null;
  position?: number;
}

export class ClientResourceService {
  readonly #access = new ClientAccessService();

  async list(principal: Principal, clientId: string) {
    await this.#access.assertCanRead(principal, clientId);
    return db
      .select()
      .from(clientResources)
      .where(and(
        eq(clientResources.workspaceId, principal.workspaceId),
        eq(clientResources.clientId, clientId),
        isNull(clientResources.archivedAt),
      ))
      .orderBy(asc(clientResources.position), asc(clientResources.createdAt));
  }

  async create(
    principal: Principal,
    clientId: string,
    input: CreateClientResourceInput,
  ) {
    await this.#access.assertCanContribute(principal, clientId);
    const title = this.#title(input.title);
    const url = this.#url(input.url);
    const [position] = await db
      .select({ value: sql<number>`coalesce(max(${clientResources.position}), -1)::int + 1` })
      .from(clientResources)
      .where(and(
        eq(clientResources.workspaceId, principal.workspaceId),
        eq(clientResources.clientId, clientId),
        isNull(clientResources.archivedAt),
      ));
    const [resource] = await db
      .insert(clientResources)
      .values({
        workspaceId: principal.workspaceId,
        clientId,
        createdByMembershipId: principal.membershipId,
        position: position?.value ?? 0,
        title,
        url,
        description: input.description,
        iconKey: input.iconKey,
      })
      .returning();
    return resource;
  }

  async update(
    principal: Principal,
    clientId: string,
    resourceId: string,
    input: UpdateClientResourceInput,
  ) {
    await this.#access.assertCanContribute(principal, clientId);
    const title = input.title !== undefined ? this.#title(input.title) : undefined;
    const url = input.url !== undefined ? this.#url(input.url) : undefined;
    if (input.position !== undefined && (!Number.isInteger(input.position) || input.position < 0)) {
      throw new ValidationError("Resource positions must be non-negative integers.");
    }
    const [resource] = await db
      .update(clientResources)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(url !== undefined ? { url } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.iconKey !== undefined ? { iconKey: input.iconKey } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        updatedAt: new Date(),
      })
      .where(and(
        eq(clientResources.id, resourceId),
        eq(clientResources.workspaceId, principal.workspaceId),
        eq(clientResources.clientId, clientId),
        isNull(clientResources.archivedAt),
      ))
      .returning();
    if (!resource) throw new NotFoundError("Client resource not found.");
    return resource;
  }

  async archive(principal: Principal, clientId: string, resourceId: string) {
    await this.#access.assertCanContribute(principal, clientId);
    const [resource] = await db
      .update(clientResources)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(clientResources.id, resourceId),
        eq(clientResources.workspaceId, principal.workspaceId),
        eq(clientResources.clientId, clientId),
        isNull(clientResources.archivedAt),
      ))
      .returning({ id: clientResources.id });
    if (!resource) throw new NotFoundError("Client resource not found.");
    return resource;
  }

  #title(value: string) {
    const title = value.trim();
    if (title.length < 1 || title.length > 160) {
      throw new ValidationError("Resource titles must contain 1-160 characters.");
    }
    return title;
  }

  #url(value: string) {
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      return parsed.toString();
    } catch {
      throw new ValidationError("Resource URLs must use HTTP or HTTPS.");
    }
  }
}

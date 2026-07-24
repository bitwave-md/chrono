import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { clients, workspaceFavorites } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueService } from "@/modules/issues/application/issue-service";
import { ProjectDetailService } from "@/modules/projects/application/project-detail-service";
import { ApplicationError, NotFoundError } from "@/modules/shared/application/application-error";

export const favoriteTargetTypes = ["client", "project", "issue"] as const;
export type FavoriteTargetType = (typeof favoriteTargetTypes)[number];

export interface FavoriteRecord {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string;
  title: string;
  clientId: string;
  projectId: string | null;
  identifier: string | null;
  iconType: "icon" | "emoji" | null;
  iconKey: string | null;
  iconColor: string | null;
}

interface FavoriteTarget {
  targetType: FavoriteTargetType;
  targetId: string;
}

export class FavoriteService {
  readonly #clientAccess = new ClientAccessService();
  readonly #issues = new IssueService();
  readonly #projects = new ProjectDetailService();

  async list(principal: Principal): Promise<FavoriteRecord[]> {
    const rows = await db
      .select()
      .from(workspaceFavorites)
      .where(and(
        eq(workspaceFavorites.workspaceId, principal.workspaceId),
        eq(workspaceFavorites.membershipId, principal.membershipId),
      ))
      .orderBy(asc(workspaceFavorites.createdAt));

    const favorites = await Promise.all(rows.map(async (row) => {
      const target = this.#target(row);
      try {
        return await this.#resolve(principal, target, row.id);
      } catch (error) {
        if (error instanceof ApplicationError && [403, 404].includes(error.status)) {
          return null;
        }
        throw error;
      }
    }));

    return favorites.filter((favorite): favorite is FavoriteRecord => Boolean(favorite));
  }

  async set(
    principal: Principal,
    target: FavoriteTarget,
    favorite: boolean,
  ): Promise<FavoriteRecord | null> {
    const condition = this.#targetCondition(target);
    if (!favorite) {
      await db.delete(workspaceFavorites).where(and(
        eq(workspaceFavorites.workspaceId, principal.workspaceId),
        eq(workspaceFavorites.membershipId, principal.membershipId),
        condition,
      ));
      return null;
    }

    const resolved = await this.#resolve(principal, target, "pending");
    const [created] = await db
      .insert(workspaceFavorites)
      .values({
        workspaceId: principal.workspaceId,
        membershipId: principal.membershipId,
        targetType: target.targetType,
        ...(target.targetType === "client" ? { clientId: target.targetId } : {}),
        ...(target.targetType === "project" ? { projectId: target.targetId } : {}),
        ...(target.targetType === "issue" ? { issueId: target.targetId } : {}),
      })
      .onConflictDoNothing()
      .returning({ id: workspaceFavorites.id });

    if (created) return { ...resolved, id: created.id };

    const [existing] = await db
      .select({ id: workspaceFavorites.id })
      .from(workspaceFavorites)
      .where(and(
        eq(workspaceFavorites.workspaceId, principal.workspaceId),
        eq(workspaceFavorites.membershipId, principal.membershipId),
        condition,
      ))
      .limit(1);

    return { ...resolved, id: existing.id };
  }

  async #resolve(
    principal: Principal,
    target: FavoriteTarget,
    favoriteId: string,
  ): Promise<FavoriteRecord> {
    if (target.targetType === "client") {
      await this.#clientAccess.assertCanRead(principal, target.targetId);
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          iconType: clients.iconType,
          iconKey: clients.iconKey,
          iconColor: clients.iconColor,
        })
        .from(clients)
        .where(and(
          eq(clients.workspaceId, principal.workspaceId),
          eq(clients.id, target.targetId),
        ))
        .limit(1);
      if (!client) throw new NotFoundError("Client not found.");
      return {
        id: favoriteId,
        targetType: "client",
        targetId: client.id,
        title: client.name,
        clientId: client.id,
        projectId: null,
        identifier: null,
        iconType: client.iconType,
        iconKey: client.iconKey,
        iconColor: client.iconColor,
      };
    }

    if (target.targetType === "project") {
      const project = await this.#projects.get(principal, target.targetId);
      return {
        id: favoriteId,
        targetType: "project",
        targetId: project.id,
        title: project.name,
        clientId: project.clientId,
        projectId: project.id,
        identifier: null,
        iconType: project.iconType,
        iconKey: project.iconKey,
        iconColor: project.iconColor,
      };
    }

    const issue = await this.#issues.get(principal, target.targetId);
    const projectId = await this.#accessibleProjectId(principal, issue.projectId);
    return {
      id: favoriteId,
      targetType: "issue",
      targetId: issue.id,
      title: issue.title,
      clientId: issue.clientId,
      projectId,
      identifier: issue.identifier,
      iconType: null,
      iconKey: null,
      iconColor: issue.statusColor,
    };
  }

  async #accessibleProjectId(principal: Principal, projectId: string | null): Promise<string | null> {
    if (!projectId || principal.role !== "guest") return projectId;
    try {
      await this.#projects.get(principal, projectId);
      return projectId;
    } catch (error) {
      if (error instanceof ApplicationError && [403, 404].includes(error.status)) return null;
      throw error;
    }
  }

  #target(row: typeof workspaceFavorites.$inferSelect): FavoriteTarget {
    if (row.targetType === "client" && row.clientId) return { targetType: "client", targetId: row.clientId };
    if (row.targetType === "project" && row.projectId) return { targetType: "project", targetId: row.projectId };
    if (row.targetType === "issue" && row.issueId) return { targetType: "issue", targetId: row.issueId };
    throw new NotFoundError("Favorite target not found.");
  }

  #targetCondition(target: FavoriteTarget) {
    if (target.targetType === "client") return eq(workspaceFavorites.clientId, target.targetId);
    if (target.targetType === "project") return eq(workspaceFavorites.projectId, target.targetId);
    return eq(workspaceFavorites.issueId, target.targetId);
  }
}

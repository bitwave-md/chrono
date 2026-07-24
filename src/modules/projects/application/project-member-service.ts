import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { clientMemberships, clients, projectMemberships, projects, users, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { GuestAccessService } from "@/modules/authorization/application/guest-access-service";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";

export class ProjectMemberService {
  readonly #clients = new ClientAccessService();
  readonly #guests = new GuestAccessService();

  async list(principal: Principal, projectId: string) {
    await this.#project(principal, projectId);
    const rows = await db.select({
      membershipId: workspaceMemberships.id,
      userId: users.id,
      displayName: users.name,
      email: users.email,
      avatarUrl: users.image,
      role: workspaceMemberships.role,
      clientId: projectMemberships.clientId,
      clientName: clients.name,
    }).from(projectMemberships)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, projectMemberships.workspaceMembershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .innerJoin(clients, eq(clients.id, projectMemberships.clientId))
      .where(and(eq(projectMemberships.workspaceId, principal.workspaceId), eq(projectMemberships.projectId, projectId), eq(workspaceMemberships.status, "active")))
      .orderBy(asc(users.name), asc(users.email));
    return rows;
  }

  async add(principal: Principal, projectId: string, membershipId: string) {
    const project = await this.#project(principal, projectId);
    await this.#assertCanManage(principal, project);
    const [member] = await db.select({ id: workspaceMemberships.id, role: workspaceMemberships.role }).from(workspaceMemberships).where(and(
      eq(workspaceMemberships.workspaceId, principal.workspaceId), eq(workspaceMemberships.id, membershipId), eq(workspaceMemberships.status, "active"),
    )).limit(1);
    if (!member) throw new NotFoundError("Workspace member not found.");
    if (member.role === "guest") {
      const [clientAccess] = await db.select({ id: clientMemberships.clientId }).from(clientMemberships).where(and(
        eq(clientMemberships.workspaceId, principal.workspaceId), eq(clientMemberships.clientId, project.clientId), eq(clientMemberships.workspaceMembershipId, membershipId),
      )).limit(1);
      if (!clientAccess) throw new ValidationError("Add the Guest to the Client before granting Project access.");
    }
    const [added] = await db.insert(projectMemberships).values({
      workspaceId: principal.workspaceId,
      clientId: project.clientId,
      projectId,
      workspaceMembershipId: membershipId,
      addedByMembershipId: principal.membershipId,
    }).onConflictDoNothing().returning();
    return added ?? { projectId, membershipId };
  }

  async remove(principal: Principal, projectId: string, membershipId: string) {
    const project = await this.#project(principal, projectId);
    await this.#assertCanManage(principal, project);
    const [removed] = await db.delete(projectMemberships).where(and(
      eq(projectMemberships.workspaceId, principal.workspaceId), eq(projectMemberships.projectId, projectId), eq(projectMemberships.workspaceMembershipId, membershipId),
    )).returning({ membershipId: projectMemberships.workspaceMembershipId });
    if (!removed) throw new NotFoundError("Project member not found.");
    return removed;
  }

  async #project(principal: Principal, projectId: string) {
    const [project] = await db.select({ id: projects.id, clientId: projects.clientId, leadMembershipId: projects.leadMembershipId }).from(projects).where(and(
      eq(projects.workspaceId, principal.workspaceId), eq(projects.id, projectId), isNull(projects.archivedAt),
    )).limit(1);
    if (!project) throw new NotFoundError("Project not found.");
    await this.#guests.assertCanReadProject(principal, projectId);
    await this.#clients.assertCanRead(principal, project.clientId);
    return project;
  }

  async #assertCanManage(principal: Principal, project: { leadMembershipId: string | null }) {
    if (principal.role === "owner" || principal.role === "admin" || project.leadMembershipId === principal.membershipId) return;
    throw new ForbiddenError("Only Workspace administrators or the Project lead can manage members.");
  }
}

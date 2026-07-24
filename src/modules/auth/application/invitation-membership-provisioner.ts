import { and, eq, inArray, isNull } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { clientMemberships, invitationClientAccess, invitationProjectExclusions, projectMemberships, projects, workspaceMemberships } from "@/db/schema";
import type { WorkspaceRole } from "@/modules/authorization/domain/principal";

export class InvitationMembershipProvisioner {
  async provision(transaction: DatabaseTransaction, invitation: { id: string; workspaceId: string; role: WorkspaceRole }, userId: string) {
    const [membership] = await transaction.insert(workspaceMemberships).values({ workspaceId: invitation.workspaceId, userId, role: invitation.role, status: "active" }).onConflictDoUpdate({ target: [workspaceMemberships.workspaceId, workspaceMemberships.userId], set: { role: invitation.role, status: "active", updatedAt: new Date() } }).returning({ id: workspaceMemberships.id });
    if (!membership) throw new Error("Workspace membership could not be created.");
    if (invitation.role !== "guest") return membership;
    const access = await transaction.select({ clientId: invitationClientAccess.clientId }).from(invitationClientAccess).where(and(eq(invitationClientAccess.workspaceId, invitation.workspaceId), eq(invitationClientAccess.invitationId, invitation.id)));
    if (!access.length) return membership;
    await transaction.insert(clientMemberships).values(access.map((item) => ({ workspaceId: invitation.workspaceId, clientId: item.clientId, workspaceMembershipId: membership.id, permission: "view" as const }))).onConflictDoNothing();
    const exclusions = await transaction.select({ projectId: invitationProjectExclusions.projectId }).from(invitationProjectExclusions).where(and(eq(invitationProjectExclusions.workspaceId, invitation.workspaceId), eq(invitationProjectExclusions.invitationId, invitation.id)));
    const selectedProjects = await transaction.select({ id: projects.id, clientId: projects.clientId }).from(projects).where(and(eq(projects.workspaceId, invitation.workspaceId), inArray(projects.clientId, access.map((item) => item.clientId)), isNull(projects.archivedAt)));
    const excluded = new Set(exclusions.map((item) => item.projectId));
    const memberships = selectedProjects.filter((project) => !excluded.has(project.id)).map((project) => ({ workspaceId: invitation.workspaceId, clientId: project.clientId, projectId: project.id, workspaceMembershipId: membership.id, addedByMembershipId: membership.id }));
    if (memberships.length) await transaction.insert(projectMemberships).values(memberships).onConflictDoNothing();
    return membership;
  }
}

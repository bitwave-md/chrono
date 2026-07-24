import { createHash, randomBytes } from "node:crypto";

import { and, asc, count, eq, gt, inArray, isNull, ne } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import { attachmentShareLinks, clients, invitationClientAccess, invitationProjectExclusions, invitations, projects, users, workspaceMemberships } from "@/db/schema";
import type { Principal, WorkspaceRole } from "@/modules/authorization/domain/principal";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";
import { EntityId } from "@/modules/shared/domain/entity-id";

type MembershipStatus = "active" | "suspended" | "removed";

export interface GuestAccessInput {
  clients: Array<{ clientId: string; excludedProjectIds: string[] }>;
}

export class WorkspaceAdministrationService {
  async overview(principal: Principal) {
    this.#assertAdministrator(principal);
    const now = new Date();
    const [members, pendingInvitations] = await Promise.all([
      db.select({
        membershipId: workspaceMemberships.id,
        userId: users.id,
        displayName: users.name,
        email: users.email,
        avatarUrl: users.image,
        role: workspaceMemberships.role,
        status: workspaceMemberships.status,
        joinedAt: workspaceMemberships.joinedAt,
      }).from(workspaceMemberships).innerJoin(users, eq(users.id, workspaceMemberships.userId)).where(eq(workspaceMemberships.workspaceId, principal.workspaceId)).orderBy(asc(users.name), asc(users.email)),
      db.select({ id: invitations.id, email: invitations.emailNormalized, role: invitations.role, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt })
        .from(invitations).where(and(
          eq(invitations.workspaceId, principal.workspaceId),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, now),
        )).orderBy(asc(invitations.emailNormalized)),
    ]);
    return { members, invitations: pendingInvitations };
  }

  async invite(principal: Principal, emailValue: string, role: WorkspaceRole, guestAccess: GuestAccessInput | null = null) {
    this.#assertAdministrator(principal);
    this.#assertRoleGrant(principal, role);
    const email = new EmailAddress(emailValue).value;
    const [existing] = await db.select({ id: workspaceMemberships.id }).from(workspaceMemberships).innerJoin(users, eq(users.id, workspaceMemberships.userId)).where(and(
      eq(workspaceMemberships.workspaceId, principal.workspaceId),
      eq(users.email, email),
      ne(workspaceMemberships.status, "suspended"),
    )).limit(1);
    if (existing) throw new ConflictError("This person already belongs to the Workspace.");
    const access = role === "guest" ? normalizeGuestAccess(guestAccess) : null;
    if (role === "guest" && !access?.clients.length) throw new ValidationError("A Guest must have access to at least one Client.");
    return db.transaction(async (transaction) => {
      await transaction.delete(invitations).where(and(eq(invitations.workspaceId, principal.workspaceId), eq(invitations.emailNormalized, email), isNull(invitations.acceptedAt)));
      const [invitation] = await transaction.insert(invitations).values({
        workspaceId: principal.workspaceId,
        emailNormalized: email,
        role,
        tokenHash: digest(randomBytes(32).toString("base64url")),
        createdByUserId: principal.userId,
        expiresAt: expiry(),
      }).returning({ id: invitations.id, email: invitations.emailNormalized, role: invitations.role, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt });
      if (!invitation) throw new ConflictError("The invitation could not be created.");
      if (access) await this.#storeGuestAccess(transaction, principal.workspaceId, invitation.id, access);
      return invitation;
    });
  }

  async #storeGuestAccess(transaction: DatabaseTransaction, workspaceId: string, invitationId: string, access: GuestAccessInput) {
    const clientIds = access.clients.map((item) => item.clientId);
    const clientRows = await transaction.select({ id: clients.id }).from(clients).where(and(eq(clients.workspaceId, workspaceId), inArray(clients.id, clientIds), isNull(clients.archivedAt)));
    if (clientRows.length !== new Set(clientIds).size) throw new ValidationError("One or more selected Clients are unavailable.");
    const projectsByClient = await transaction.select({ id: projects.id, clientId: projects.clientId }).from(projects).where(and(eq(projects.workspaceId, workspaceId), inArray(projects.clientId, clientIds), isNull(projects.archivedAt)));
    for (const item of access.clients) {
      const clientProjects = projectsByClient.filter((project) => project.clientId === item.clientId).map((project) => project.id);
      if (item.excludedProjectIds.some((id) => !clientProjects.includes(id))) throw new ValidationError("One or more excluded Projects do not belong to the selected Client.");
    }
    await transaction.insert(invitationClientAccess).values(access.clients.map((item) => ({ workspaceId, invitationId, clientId: item.clientId })));
    const exclusions = access.clients.flatMap((item) => item.excludedProjectIds.map((projectId) => ({ workspaceId, invitationId, clientId: item.clientId, projectId })));
    if (exclusions.length) await transaction.insert(invitationProjectExclusions).values(exclusions);
  }

  async refreshInvitation(principal: Principal, invitationId: string) {
    this.#assertAdministrator(principal);
    const [invitation] = await db.update(invitations).set({
      tokenHash: digest(randomBytes(32).toString("base64url")),
      expiresAt: expiry(),
    }).where(and(eq(invitations.workspaceId, principal.workspaceId), eq(invitations.id, invitationId), isNull(invitations.acceptedAt))).returning({
      id: invitations.id, email: invitations.emailNormalized, role: invitations.role, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt,
    });
    if (!invitation) throw new NotFoundError("Invitation not found.");
    return invitation;
  }

  async revokeInvitation(principal: Principal, invitationId: string) {
    this.#assertAdministrator(principal);
    const [removed] = await db.delete(invitations).where(and(eq(invitations.workspaceId, principal.workspaceId), eq(invitations.id, invitationId), isNull(invitations.acceptedAt))).returning({ id: invitations.id });
    if (!removed) throw new NotFoundError("Invitation not found.");
    return removed;
  }

  async updateMember(principal: Principal, membershipId: string, input: { role?: WorkspaceRole; status?: MembershipStatus }) {
    this.#assertAdministrator(principal);
    const [target] = await db.select({ id: workspaceMemberships.id, role: workspaceMemberships.role, status: workspaceMemberships.status }).from(workspaceMemberships).where(and(
      eq(workspaceMemberships.workspaceId, principal.workspaceId), eq(workspaceMemberships.id, membershipId),
    )).limit(1);
    if (!target) throw new NotFoundError("Workspace member not found.");
    if (principal.role === "admin" && (target.role === "owner" || target.role === "admin")) throw new ForbiddenError("Admins cannot modify owners or other admins.");
    if (input.role) this.#assertRoleGrant(principal, input.role);
    if (membershipId === principal.membershipId && input.status && input.status !== "active") throw new ValidationError("You cannot disable your own membership.");
    if (target.role === "owner" && (input.role && input.role !== "owner" || input.status && input.status !== "active")) await this.#assertAnotherOwner(principal.workspaceId, membershipId);
    return db.transaction(async (transaction) => {
      const [updated] = await transaction.update(workspaceMemberships).set({ ...input, updatedAt: new Date() }).where(and(
        eq(workspaceMemberships.workspaceId, principal.workspaceId), eq(workspaceMemberships.id, membershipId),
      )).returning({ membershipId: workspaceMemberships.id, role: workspaceMemberships.role, status: workspaceMemberships.status });
      if (input.status && input.status !== "active") await transaction.update(attachmentShareLinks).set({ revokedAt: new Date() }).where(and(
        eq(attachmentShareLinks.workspaceId, principal.workspaceId),
        eq(attachmentShareLinks.createdByMembershipId, membershipId),
        isNull(attachmentShareLinks.revokedAt),
      ));
      return updated!;
    });
  }

  #assertAdministrator(principal: Principal) {
    if (principal.role !== "owner" && principal.role !== "admin") throw new ForbiddenError("Only Workspace owners and admins manage members.");
  }

  #assertRoleGrant(principal: Principal, role: WorkspaceRole) {
    if (principal.role !== "owner" && (role === "owner" || role === "admin")) throw new ForbiddenError("Only owners may grant owner or admin access.");
  }

  async #assertAnotherOwner(workspaceId: string, excludedMembershipId: string) {
    const [{ value }] = await db.select({ value: count() }).from(workspaceMemberships).where(and(
      eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.role, "owner"), eq(workspaceMemberships.status, "active"), ne(workspaceMemberships.id, excludedMembershipId),
    ));
    if (!value) throw new ConflictError("A Workspace must retain at least one active owner.");
  }
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function expiry() { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000); }

function normalizeGuestAccess(input: GuestAccessInput | null): GuestAccessInput {
  if (!input || !Array.isArray(input.clients) || input.clients.length > 100) throw new ValidationError("Guest Client access must contain up to 100 Clients.");
  return { clients: input.clients.map((item, index) => {
    if (!item || typeof item !== "object" || typeof item.clientId !== "string" || !Array.isArray(item.excludedProjectIds)) throw new ValidationError(`guestAccess.clients[${index}] is invalid.`);
    return { clientId: new EntityId(item.clientId, `guestAccess.clients[${index}].clientId`).value, excludedProjectIds: [...new Set(item.excludedProjectIds.map((id, projectIndex) => new EntityId(id, `guestAccess.clients[${index}].excludedProjectIds[${projectIndex}]`).value))] };
  }) };
}

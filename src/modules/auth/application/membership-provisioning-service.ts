import { and, eq, gt, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  clientMemberships,
  invitations,
  invitationClientAccess,
  invitationProjectExclusions,
  projectMemberships,
  projects,
  workspaceMemberships,
  workspaces,
} from "@/db/schema";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { TimeCategoryProvisioner } from "@/modules/time-tracking/application/time-category-provisioner";
import { WorkspaceSlug } from "@/modules/workspaces/domain/workspace-slug";

interface BootstrapWorkspace {
  email: string;
  name: string;
  slug: string;
}

export class MembershipProvisioningService {
  readonly #timeCategories = new TimeCategoryProvisioner();

  async provision(userId: string, inputEmail: string): Promise<void> {
    const email = new EmailAddress(inputEmail).value;

    await db.transaction(async (transaction) => {
      const bootstrap = this.#bootstrapWorkspace();

      if (bootstrap && bootstrap.email === email) {
        let [workspace] = await transaction
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, bootstrap.slug))
          .limit(1);

        if (!workspace) {
          await transaction
            .insert(workspaces)
            .values({
              name: bootstrap.name,
              slug: bootstrap.slug,
              createdByUserId: userId,
            })
            .onConflictDoNothing();

          [workspace] = await transaction
            .select({ id: workspaces.id })
            .from(workspaces)
            .where(eq(workspaces.slug, bootstrap.slug))
            .limit(1);
        }

        if (!workspace) {
          throw new Error("The bootstrap workspace could not be provisioned.");
        }

        await this.#timeCategories.ensureDefaults(transaction, workspace.id);

        await transaction
          .insert(workspaceMemberships)
          .values({
            workspaceId: workspace.id,
            userId,
            role: "owner",
            status: "active",
          })
          .onConflictDoUpdate({
            target: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
            set: { role: "owner", status: "active", updatedAt: new Date() },
          });
      }

      const pendingInvitations = await transaction
        .select({
          id: invitations.id,
          workspaceId: invitations.workspaceId,
          role: invitations.role,
        })
        .from(invitations)
        .innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId))
        .where(
          and(
            eq(invitations.emailNormalized, email),
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date()),
            isNull(workspaces.archivedAt),
          ),
        );

      for (const invitation of pendingInvitations) {
        const [membership] = await transaction
          .insert(workspaceMemberships)
          .values({
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
            status: "active",
          })
          .onConflictDoUpdate({
            target: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
            set: { role: invitation.role, status: "active", updatedAt: new Date() },
          }).returning({ id: workspaceMemberships.id });

        if (invitation.role === "guest" && membership) {
          const access = await transaction.select({ clientId: invitationClientAccess.clientId }).from(invitationClientAccess).where(and(
            eq(invitationClientAccess.workspaceId, invitation.workspaceId),
            eq(invitationClientAccess.invitationId, invitation.id),
          ));
          const exclusions = await transaction.select({ projectId: invitationProjectExclusions.projectId }).from(invitationProjectExclusions).where(and(
            eq(invitationProjectExclusions.workspaceId, invitation.workspaceId),
            eq(invitationProjectExclusions.invitationId, invitation.id),
          ));
          if (access.length) {
            await transaction.insert(clientMemberships).values(access.map((item) => ({
              workspaceId: invitation.workspaceId,
              clientId: item.clientId,
              workspaceMembershipId: membership.id,
              permission: "view" as const,
            }))).onConflictDoNothing();
            const clientIds = access.map((item) => item.clientId);
            const selectedProjects = await transaction.select({ id: projects.id, clientId: projects.clientId }).from(projects).where(and(
              eq(projects.workspaceId, invitation.workspaceId),
              inArray(projects.clientId, clientIds),
              isNull(projects.archivedAt),
            ));
            const excluded = new Set(exclusions.map((item) => item.projectId));
            const memberships = selectedProjects.filter((project) => !excluded.has(project.id)).map((project) => ({
              workspaceId: invitation.workspaceId,
              clientId: project.clientId,
              projectId: project.id,
              workspaceMembershipId: membership.id,
              addedByMembershipId: membership.id,
            }));
            if (memberships.length) await transaction.insert(projectMemberships).values(memberships).onConflictDoNothing();
          }
        }

        await transaction
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, invitation.id));
      }
    });
  }

  #bootstrapWorkspace(): BootstrapWorkspace | null {
    const email = process.env.AUTH_BOOTSTRAP_EMAIL;

    if (!email) {
      return null;
    }

    return {
      email: new EmailAddress(email).value,
      name: process.env.AUTH_BOOTSTRAP_WORKSPACE_NAME?.trim() || "Bitwave",
      slug: new WorkspaceSlug(
        process.env.AUTH_BOOTSTRAP_WORKSPACE_SLUG || "bitwave",
      ).value,
    };
  }
}

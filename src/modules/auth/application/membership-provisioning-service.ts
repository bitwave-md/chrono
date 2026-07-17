import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  invitations,
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
          .onConflictDoNothing();
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
        await transaction
          .insert(workspaceMemberships)
          .values({
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
            status: "active",
          })
          .onConflictDoNothing();

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

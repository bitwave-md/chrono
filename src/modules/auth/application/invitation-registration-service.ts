import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import { invitations, userPasswordCredentials, users, workspaces } from "@/db/schema";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";
import { PasswordHasher } from "@/modules/auth/infrastructure/password-hasher";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";
import { InvitationMembershipProvisioner } from "./invitation-membership-provisioner";

export class InvitationRegistrationService {
  readonly #hasher = new PasswordHasher();
  readonly #memberships = new InvitationMembershipProvisioner();

  async inspect(token: string) {
    const invitation = await this.#find(db, token);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, invitation.email)).limit(1);
    return { email: invitation.email, role: invitation.role, workspaceName: invitation.workspaceName, existingAccount: Boolean(existing), expiresAt: invitation.expiresAt };
  }

  async register(token: string, input: { name: string; password: string }) {
    const name = input.name.trim();
    if (!name || name.length > 160) throw new ValidationError("Full name is required.");
    if (PasswordPolicy.requirements(input.password).some((item) => !item.valid)) throw new ValidationError("Password must be 12–128 characters and include uppercase, lowercase, a number, and a special symbol.");
    const passwordHash = await this.#hasher.hash(input.password);
    return db.transaction(async (transaction) => {
      const invitation = await this.#find(transaction, token, true);
      const [existing] = await transaction.select({ id: users.id }).from(users).where(eq(users.email, invitation.email)).limit(1);
      if (existing) throw new ConflictError("This email already has a Chrono account. Sign in to join the Workspace.");
      const [user] = await transaction.insert(users).values({ name, email: invitation.email, status: "active" }).returning({ id: users.id, email: users.email });
      if (!user) throw new ConflictError("Account registration could not be completed.");
      await transaction.insert(userPasswordCredentials).values({ userId: user.id, passwordHash });
      await this.#memberships.provision(transaction, invitation, user.id);
      await transaction.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invitation.id));
      return user;
    });
  }

  async accept(token: string, userId: string) {
    return db.transaction(async (transaction) => {
      const invitation = await this.#find(transaction, token, true);
      const [user] = await transaction.select({ id: users.id, email: users.email, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
      if (!user || user.status !== "active" || new EmailAddress(user.email).value !== invitation.email) throw new ForbiddenError("Sign in as the invited email to join this Workspace.");
      const membership = await this.#memberships.provision(transaction, invitation, user.id);
      await transaction.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invitation.id));
      return { workspaceSlug: invitation.workspaceSlug, membershipId: membership.id };
    });
  }

  async #find(executor: typeof db | DatabaseTransaction, token: string, lock = false) {
    if (!token || token.length > 512) throw new NotFoundError("Invitation not found.");
    const query = executor.select({ id: invitations.id, workspaceId: invitations.workspaceId, email: invitations.emailNormalized, role: invitations.role, expiresAt: invitations.expiresAt, workspaceName: workspaces.name, workspaceSlug: workspaces.slug }).from(invitations).innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId)).where(and(eq(invitations.tokenHash, digest(token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date()), isNull(workspaces.archivedAt))).limit(1);
    const [record] = lock ? await query.for("update") : await query;
    if (!record) throw new NotFoundError("Invitation not found or no longer valid.");
    return record;
  }
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }

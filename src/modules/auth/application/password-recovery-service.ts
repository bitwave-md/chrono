import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { passwordResetLinks, userPasswordCredentials, users, workspaceMemberships, workspaces } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";
import { PasswordHasher } from "@/modules/auth/infrastructure/password-hasher";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/modules/shared/application/application-error";

export class PasswordRecoveryService {
  readonly #hasher = new PasswordHasher();

  async change(userId: string, currentPassword: string, nextPassword: string) {
    this.#assertPassword(nextPassword);
    const [credential] = await db.select({ passwordHash: userPasswordCredentials.passwordHash }).from(userPasswordCredentials).where(eq(userPasswordCredentials.userId, userId)).limit(1);
    if (!credential || !(await this.#hasher.verify(credential.passwordHash, currentPassword))) throw new ForbiddenError("Current password is incorrect.");
    await this.#replacePassword(userId, nextPassword);
    return { changed: true };
  }

  async createReset(principal: Principal, targetMembershipId: string) {
    if (principal.role !== "owner" && principal.role !== "admin") throw new ForbiddenError("Only Workspace administrators can create reset links.");
    const [target] = await db.select({ userId: workspaceMemberships.userId, role: workspaceMemberships.role, status: workspaceMemberships.status }).from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceId, principal.workspaceId), eq(workspaceMemberships.id, targetMembershipId))).limit(1);
    if (!target || target.status !== "active") throw new NotFoundError("Active Workspace member not found.");
    if (principal.role === "admin" && target.role !== "member" && target.role !== "guest") throw new ForbiddenError("Admins may reset only members and Guests.");
    const token = randomBytes(32).toString("base64url"); const now = new Date();
    await db.transaction(async (transaction) => {
      await transaction.update(passwordResetLinks).set({ revokedAt: now }).where(and(eq(passwordResetLinks.targetUserId, target.userId), isNull(passwordResetLinks.usedAt), isNull(passwordResetLinks.revokedAt)));
      await transaction.insert(passwordResetLinks).values({ workspaceId: principal.workspaceId, targetMembershipId, targetUserId: target.userId, createdByMembershipId: principal.membershipId, tokenHash: digest(token), expiresAt: new Date(now.getTime() + 60 * 60_000) });
    });
    return { resetUrl: publicUrl(`/auth/reset/${token}`), expiresAt: new Date(now.getTime() + 60 * 60_000) };
  }

  async inspect(token: string) {
    const record = await this.#resetRecord(token);
    return { email: record.email, expiresAt: record.expiresAt };
  }

  async reset(token: string, password: string) {
    this.#assertPassword(password); const passwordHash = await this.#hasher.hash(password);
    return db.transaction(async (transaction) => {
      const [record] = await transaction.select({ id: passwordResetLinks.id, userId: passwordResetLinks.targetUserId }).from(passwordResetLinks).innerJoin(workspaceMemberships, and(eq(workspaceMemberships.workspaceId, passwordResetLinks.workspaceId), eq(workspaceMemberships.id, passwordResetLinks.targetMembershipId), eq(workspaceMemberships.status, "active"))).where(and(eq(passwordResetLinks.tokenHash, digest(token)), gt(passwordResetLinks.expiresAt, new Date()), isNull(passwordResetLinks.usedAt), isNull(passwordResetLinks.revokedAt))).limit(1).for("update");
      if (!record) throw new NotFoundError("Password reset link is invalid or expired.");
      await transaction.update(userPasswordCredentials).set({ passwordHash, credentialVersion: sql`${userPasswordCredentials.credentialVersion} + 1`, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(userPasswordCredentials.userId, record.userId));
      await transaction.update(passwordResetLinks).set({ revokedAt: new Date() }).where(and(eq(passwordResetLinks.targetUserId, record.userId), ne(passwordResetLinks.id, record.id), isNull(passwordResetLinks.usedAt), isNull(passwordResetLinks.revokedAt)));
      await transaction.update(passwordResetLinks).set({ usedAt: new Date() }).where(eq(passwordResetLinks.id, record.id));
      return { email: (await transaction.select({ email: users.email }).from(users).where(eq(users.id, record.userId)).limit(1))[0]?.email };
    });
  }

  async emergencyOwnerReset(input: { setupToken: string; email: string; password: string }) {
    if (!matchesSecret(input.setupToken, process.env.AUTH_SETUP_TOKEN)) throw new ForbiddenError("Recovery details are invalid.");
    this.#assertPassword(input.password); const email = new EmailAddress(input.email).value; const slug = process.env.AUTH_SETUP_WORKSPACE_SLUG || "bitwave";
    const [owner] = await db.select({ userId: users.id }).from(users).innerJoin(workspaceMemberships, eq(workspaceMemberships.userId, users.id)).innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId)).where(and(eq(users.email, email), eq(users.status, "active"), eq(workspaces.slug, slug), eq(workspaceMemberships.role, "owner"), eq(workspaceMemberships.status, "active"), isNull(workspaces.archivedAt))).limit(1);
    if (!owner) throw new ForbiddenError("Recovery details are invalid.");
    await this.#replacePassword(owner.userId, input.password);
    return { email };
  }

  async #replacePassword(userId: string, password: string) {
    const passwordHash = await this.#hasher.hash(password);
    const [updated] = await db.update(userPasswordCredentials).set({ passwordHash, credentialVersion: sql`${userPasswordCredentials.credentialVersion} + 1`, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(userPasswordCredentials.userId, userId)).returning({ userId: userPasswordCredentials.userId });
    if (!updated) throw new ConflictError("Password credential was not found.");
  }

  async #resetRecord(token: string) {
    const [record] = await db.select({ email: users.email, expiresAt: passwordResetLinks.expiresAt }).from(passwordResetLinks).innerJoin(users, eq(users.id, passwordResetLinks.targetUserId)).innerJoin(workspaceMemberships, and(eq(workspaceMemberships.workspaceId, passwordResetLinks.workspaceId), eq(workspaceMemberships.id, passwordResetLinks.targetMembershipId), eq(workspaceMemberships.status, "active"))).where(and(eq(passwordResetLinks.tokenHash, digest(token)), gt(passwordResetLinks.expiresAt, new Date()), isNull(passwordResetLinks.usedAt), isNull(passwordResetLinks.revokedAt))).limit(1);
    if (!record) throw new NotFoundError("Password reset link is invalid or expired.");
    return record;
  }

  #assertPassword(password: string) { if (PasswordPolicy.requirements(password).some((item) => !item.valid)) throw new ValidationError("Password must be 12–128 characters and include uppercase, lowercase, a number, and a special symbol."); }
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function publicUrl(path: string) { return `${(process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`; }
function matchesSecret(input: string, configured?: string) { return Boolean(configured && input.length === configured.length && timingSafeEqual(Buffer.from(input), Buffer.from(configured))); }

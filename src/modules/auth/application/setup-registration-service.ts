import { timingSafeEqual } from "node:crypto";
import { count, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { userPasswordCredentials, users, workspaceMemberships, workspaces } from "@/db/schema";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";
import { PasswordHasher } from "@/modules/auth/infrastructure/password-hasher";
import { TimeCategoryProvisioner } from "@/modules/time-tracking/application/time-category-provisioner";
import { WorkspaceSlug } from "@/modules/workspaces/domain/workspace-slug";
import { ConflictError, ForbiddenError, ValidationError } from "@/modules/shared/application/application-error";

export class SetupRegistrationService {
  readonly #hasher = new PasswordHasher();
  readonly #timeCategories = new TimeCategoryProvisioner();

  async status() {
    const [{ value }] = await db.select({ value: count() }).from(users);
    return { available: value === 0 };
  }

  async register(input: { setupToken: string; name: string; email: string; password: string }) {
    if (!this.#matchesSetupToken(input.setupToken)) throw new ForbiddenError("The setup code is invalid.");
    const name = input.name.trim();
    if (!name || name.length > 160) throw new ValidationError("Full name is required.");
    const email = new EmailAddress(input.email).value;
    if (PasswordPolicy.requirements(input.password).some((item) => !item.valid)) throw new ValidationError("Password must be 12–128 characters and include uppercase, lowercase, a number, and a special symbol.");
    const passwordHash = await this.#hasher.hash(input.password);

    return db.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtext('chrono:first-owner'))`);
      const [{ value }] = await transaction.select({ value: count() }).from(users);
      if (value !== 0) throw new ConflictError("Initial setup is already complete.");
      const [user] = await transaction.insert(users).values({ name, email, status: "active" }).returning({ id: users.id, email: users.email, name: users.name });
      if (!user) throw new ConflictError("The owner account could not be created.");
      await transaction.insert(userPasswordCredentials).values({ userId: user.id, passwordHash });
      const workspaceName = process.env.AUTH_SETUP_WORKSPACE_NAME?.trim() || "Bitwave";
      const workspaceSlug = new WorkspaceSlug(process.env.AUTH_SETUP_WORKSPACE_SLUG || "bitwave").value;
      const [workspace] = await transaction.insert(workspaces).values({ name: workspaceName, slug: workspaceSlug, createdByUserId: user.id }).returning({ id: workspaces.id });
      if (!workspace) throw new ConflictError("The initial Workspace could not be created.");
      await transaction.insert(workspaceMemberships).values({ workspaceId: workspace.id, userId: user.id, role: "owner", status: "active" });
      await this.#timeCategories.ensureDefaults(transaction, workspace.id);
      return user;
    });
  }

  #matchesSetupToken(input: string): boolean {
    const configured = process.env.AUTH_SETUP_TOKEN;
    if (!configured || !input || input.length !== configured.length) return false;
    return timingSafeEqual(Buffer.from(input), Buffer.from(configured));
  }
}

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { MembershipProvisioningService } from "@/modules/auth/application/membership-provisioning-service";
import { BootstrapCredentials } from "@/modules/auth/domain/bootstrap-credentials";

export class BootstrapUserService {
  readonly #credentials: BootstrapCredentials;
  readonly #membershipProvisioning = new MembershipProvisioningService();

  constructor(credentials: BootstrapCredentials) {
    this.#credentials = credentials;
  }

  async authenticate(email: string, token: string) {
    if (!this.#credentials.matches(email, token)) return null;

    await db
      .insert(users)
      .values({ email: this.#credentials.email, emailVerified: new Date() })
      .onConflictDoNothing();

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image, status: users.status })
      .from(users)
      .where(eq(users.email, this.#credentials.email))
      .limit(1);

    if (!user || user.status !== "active") return null;
    await this.#membershipProvisioning.provision(user.id, user.email);
    return { id: user.id, name: user.name, email: user.email, image: user.image };
  }
}

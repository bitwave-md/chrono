import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  invitations,
  users,
  workspaceMemberships,
  workspaces,
} from "@/db/schema";
import { EmailAddress } from "@/modules/auth/domain/email-address";

export class AuthAccessService {
  async canRequestMagicLink(input: string): Promise<boolean> {
    const email = new EmailAddress(input).value;

    if (email === this.#bootstrapEmail()) {
      return true;
    }

    const [membership] = await db
      .select({ id: workspaceMemberships.id })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(
        and(
          eq(users.email, email),
          eq(users.status, "active"),
          eq(workspaceMemberships.status, "active"),
          isNull(workspaces.archivedAt),
        ),
      )
      .limit(1);

    if (membership) {
      return true;
    }

    const [invitation] = await db
      .select({ id: invitations.id })
      .from(invitations)
      .innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId))
      .where(
        and(
          eq(invitations.emailNormalized, email),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, new Date()),
          isNull(workspaces.archivedAt),
        ),
      )
      .limit(1);

    return Boolean(invitation);
  }

  #bootstrapEmail(): string | null {
    const configuredEmail = process.env.AUTH_BOOTSTRAP_EMAIL;
    return configuredEmail ? new EmailAddress(configuredEmail).value : null;
  }
}

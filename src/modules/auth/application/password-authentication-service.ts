import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userPasswordCredentials, users } from "@/db/schema";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { PasswordHasher } from "@/modules/auth/infrastructure/password-hasher";

const genericError = "Email or password is incorrect.";
const attempts = new Map<string, { count: number; resetAt: number }>();

export class PasswordAuthenticationService {
  readonly #hasher = new PasswordHasher();

  async authenticate(inputEmail: string, password: string) {
    const email = new EmailAddress(inputEmail).value;
    const now = Date.now();
    const state = attempts.get(email);
    if (state && state.resetAt > now && state.count >= 10) return null;
    const [record] = await db.select({ id: users.id, email: users.email, name: users.name, image: users.image, status: users.status, passwordHash: userPasswordCredentials.passwordHash, credentialVersion: userPasswordCredentials.credentialVersion })
      .from(users).leftJoin(userPasswordCredentials, eq(userPasswordCredentials.userId, users.id)).where(eq(users.email, email)).limit(1);
    const valid = await this.#hasher.verify(record?.passwordHash ?? PasswordHasher.dummyHash, password);
    if (!record || !record.passwordHash || !valid || record.status !== "active") {
      this.#recordFailure(email, now);
      return null;
    }
    attempts.delete(email);
    return { id: record.id, email: record.email, name: record.name, image: record.image, credentialVersion: record.credentialVersion };
  }

  async currentCredential(userId: string) {
    const [record] = await db.select({ status: users.status, credentialVersion: userPasswordCredentials.credentialVersion }).from(users).innerJoin(userPasswordCredentials, eq(userPasswordCredentials.userId, users.id)).where(and(eq(users.id, userId))).limit(1);
    return record;
  }

  #recordFailure(email: string, now: number) {
    const current = attempts.get(email);
    if (!current || current.resetAt <= now) attempts.set(email, { count: 1, resetAt: now + 15 * 60_000 });
    else attempts.set(email, { count: current.count + 1, resetAt: current.resetAt });
  }
}

export { genericError };

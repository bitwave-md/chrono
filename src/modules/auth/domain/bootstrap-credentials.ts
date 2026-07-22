import { createHash, timingSafeEqual } from "node:crypto";

import { EmailAddress } from "./email-address.ts";

interface BootstrapEnvironment {
  AUTH_BOOTSTRAP_EMAIL?: string;
  AUTH_BOOTSTRAP_TOKEN?: string;
}

export class BootstrapCredentials {
  readonly email: string;
  readonly #tokenDigest: Buffer;

  private constructor(email: string, token: string) {
    this.email = new EmailAddress(email).value;
    if (token.length < 32) {
      throw new Error("AUTH_BOOTSTRAP_TOKEN must contain at least 32 characters.");
    }
    this.#tokenDigest = BootstrapCredentials.#digest(token);
  }

  static fromEnvironment(environment?: BootstrapEnvironment): BootstrapCredentials | null {
    const source = environment ?? {
      AUTH_BOOTSTRAP_EMAIL: process.env.AUTH_BOOTSTRAP_EMAIL,
      AUTH_BOOTSTRAP_TOKEN: process.env.AUTH_BOOTSTRAP_TOKEN,
    };
    const email = source.AUTH_BOOTSTRAP_EMAIL?.trim();
    const token = source.AUTH_BOOTSTRAP_TOKEN?.trim();
    if (!token) return null;
    if (!email) throw new Error("AUTH_BOOTSTRAP_EMAIL is required when AUTH_BOOTSTRAP_TOKEN is configured.");
    return new BootstrapCredentials(email, token);
  }

  matches(email: string, token: string): boolean {
    try {
      const normalizedEmail = new EmailAddress(email).value;
      const candidateDigest = BootstrapCredentials.#digest(token);
      return normalizedEmail === this.email && timingSafeEqual(candidateDigest, this.#tokenDigest);
    } catch {
      return false;
    }
  }

  static #digest(value: string): Buffer {
    return createHash("sha256").update(value, "utf8").digest();
  }
}

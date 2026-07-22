import { RateLimitError } from "@/modules/shared/application/application-error";

export class PublicShareRateLimiter {
  static readonly #windows = new Map<string, { count: number; resetAt: number }>();

  assertAllowed(tokenDigest: string, now = Date.now()): void {
    const current = PublicShareRateLimiter.#windows.get(tokenDigest);
    if (!current || current.resetAt <= now) {
      PublicShareRateLimiter.#windows.set(tokenDigest, { count: 1, resetAt: now + 60_000 });
      return;
    }
    if (current.count >= 30) throw new RateLimitError("This share link is being accessed too frequently.");
    current.count += 1;
    if (PublicShareRateLimiter.#windows.size > 2_000) this.#prune(now);
  }

  #prune(now: number) {
    for (const [key, value] of PublicShareRateLimiter.#windows) {
      if (value.resetAt <= now) PublicShareRateLimiter.#windows.delete(key);
    }
  }
}

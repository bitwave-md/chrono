export interface GitHubReleaseRecord {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
}

export type ReleaseLookup =
  | { state: "available"; release: GitHubReleaseRecord; message: string; rateLimitReset: null }
  | { state: "not_found" | "unauthorized" | "rate_limited" | "unavailable" | "invalid_configuration"; release: null; message: string; rateLimitReset: string | null };
type ReleaseFailure = Extract<ReleaseLookup, { release: null }>;

export class GitHubReleaseClient {
  readonly #fetch: typeof fetch;
  readonly #logger: Pick<Console, "warn">;
  readonly #token: string | null;

  constructor(source: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch, logger: Pick<Console, "warn"> = console) {
    this.#fetch = fetcher;
    this.#logger = logger;
    this.#token = source.CHRONO_GITHUB_TOKEN?.trim() || null;
  }

  get authenticationMode(): "token" | "anonymous" { return this.#token ? "token" : "anonymous"; }

  async latest(repository: string): Promise<ReleaseLookup> {
    const parts = repository.split("/");
    if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) {
      return failure("invalid_configuration", "CHRONO_RELEASE_REPOSITORY must use owner/repository format.");
    }
    const [owner, name] = parts;
    try {
      const response = await this.#fetch(`https://api.github.com/repos/${encodeURIComponent(owner!)}/${encodeURIComponent(name!)}/releases/latest`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          "User-Agent": "chrono-self-hosted",
          ...(this.#token ? { Authorization: `Bearer ${this.#token}` } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) return { state: "available", release: await response.json() as GitHubReleaseRecord, message: "Latest release loaded.", rateLimitReset: null };

      const requestId = response.headers.get("x-github-request-id");
      const remaining = response.headers.get("x-ratelimit-remaining");
      this.#logger.warn("Chrono release lookup failed", { repository, status: response.status, requestId, remaining });
      if (response.status === 404) return failure("not_found", this.#token
        ? "No published release was found, or the configured token cannot access this repository."
        : "No public release was found. If the repository is private, configure CHRONO_GITHUB_TOKEN.");
      if (response.status === 401) return failure("unauthorized", "The configured GitHub token was rejected.");
      if (response.status === 429 || response.status === 403 && remaining === "0") {
        const reset = rateLimitReset(response.headers.get("x-ratelimit-reset"));
        return { ...failure("rate_limited", reset ? `GitHub rate limit reached until ${new Date(reset).toLocaleString()}.` : "GitHub rate limit reached."), rateLimitReset: reset };
      }
      return failure("unavailable", `GitHub returned HTTP ${response.status} while checking releases.`);
    } catch (error) {
      this.#logger.warn("Chrono release lookup could not reach GitHub", { repository, error: error instanceof Error ? error.message : "Unknown error" });
      return failure("unavailable", "GitHub could not be reached before the request timed out.");
    }
  }
}

function failure(state: ReleaseFailure["state"], message: string): ReleaseFailure {
  return { state, release: null, message, rateLimitReset: null };
}

function rateLimitReset(value: string | null): string | null {
  if (!value) return null;
  const epoch = Number(value);
  return Number.isFinite(epoch) ? new Date(epoch * 1_000).toISOString() : null;
}

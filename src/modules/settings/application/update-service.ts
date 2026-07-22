import type { Principal } from "@/modules/authorization/domain/principal";
import { InstanceOperatorPolicy } from "@/modules/settings/application/instance-operator-policy";

interface ReleaseRecord {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
}

export class UpdateService {
  static #cached: { expiresAt: number; value: ReleaseRecord | null } | null = null;
  readonly #operators = new InstanceOperatorPolicy();

  async status(principal: Principal) {
    this.#operators.assertOperator(principal);
    const installedVersion = process.env.CHRONO_VERSION?.trim() || "development";
    const repository = process.env.CHRONO_RELEASE_REPOSITORY?.trim() || "bitwave-md/chrono";
    const release = await this.#latest(repository);
    const latestVersion = release?.tag_name ?? null;
    return {
      installedVersion,
      latestVersion,
      updateAvailable: Boolean(latestVersion && normalize(latestVersion) !== normalize(installedVersion)),
      releaseName: release?.name ?? latestVersion,
      releaseNotes: release?.body ?? null,
      publishedAt: release?.published_at ?? null,
      releaseUrl: release?.html_url ?? null,
      repository,
      command: latestVersion ? `./update.sh ${latestVersion}` : "./update.sh <release-version>",
    };
  }

  async #latest(repository: string): Promise<ReleaseRecord | null> {
    const now = Date.now();
    if (UpdateService.#cached && UpdateService.#cached.expiresAt > now) return UpdateService.#cached.value;
    try {
      const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "chrono-self-hosted" },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      const value = response.ok ? await response.json() as ReleaseRecord : null;
      UpdateService.#cached = { value, expiresAt: now + 15 * 60_000 };
      return value;
    } catch {
      UpdateService.#cached = { value: null, expiresAt: now + 60_000 };
      return null;
    }
  }
}

function normalize(value: string) { return value.replace(/^v/, "").trim(); }

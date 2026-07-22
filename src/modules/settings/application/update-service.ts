import type { Principal } from "@/modules/authorization/domain/principal";
import { InstanceOperatorPolicy } from "@/modules/settings/application/instance-operator-policy";
import { GitHubReleaseClient, type ReleaseLookup } from "@/modules/settings/infrastructure/github-release-client";

export class UpdateService {
  static #cached: { expiresAt: number; value: ReleaseLookup } | null = null;
  readonly #operators = new InstanceOperatorPolicy();
  readonly #releases = new GitHubReleaseClient();

  async status(principal: Principal) {
    this.#operators.assertOperator(principal);
    const installedVersion = process.env.CHRONO_VERSION?.trim() || "development";
    const repository = process.env.CHRONO_RELEASE_REPOSITORY?.trim() || "bitwave-md/chrono";
    const lookup = await this.#latest(repository);
    const release = lookup.release;
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
      releaseState: lookup.state,
      releaseMessage: lookup.message,
      releaseAuthentication: this.#releases.authenticationMode,
      rateLimitReset: lookup.rateLimitReset,
      checkedAt: new Date().toISOString(),
      command: latestVersion ? `./update.sh ${latestVersion}` : "./update.sh <release-version>",
    };
  }

  async #latest(repository: string): Promise<ReleaseLookup> {
    const now = Date.now();
    if (UpdateService.#cached && UpdateService.#cached.expiresAt > now) return UpdateService.#cached.value;
    const value = await this.#releases.latest(repository);
    UpdateService.#cached = { value, expiresAt: now + (value.state === "available" ? 15 * 60_000 : 60_000) };
    return value;
  }
}

function normalize(value: string) { return value.replace(/^v/, "").trim(); }

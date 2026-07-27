import type { Principal } from "@/modules/authorization/domain/principal";
import { CalendarVersion } from "@/modules/settings/domain/calendar-version";
import { updateInProgress } from "@/modules/settings/domain/update-job";
import { InstanceOperatorPolicy } from "@/modules/settings/application/instance-operator-policy";
import { ConflictError } from "@/modules/shared/application/application-error";
import { GitHubReleaseClient, type ReleaseLookup } from "@/modules/settings/infrastructure/github-release-client";
import { UpdateControlStore } from "@/modules/settings/infrastructure/update-control-store";

export class UpdateService {
  static #cached: { expiresAt: number; value: ReleaseLookup } | null = null;
  readonly #operators = new InstanceOperatorPolicy();
  readonly #releases = new GitHubReleaseClient();
  readonly #control = new UpdateControlStore();

  async status(principal: Principal) {
    this.#operators.assertOperator(principal);
    const installedVersion = process.env.CHRONO_BUILD_VERSION?.trim() || "development";
    const repository = process.env.CHRONO_RELEASE_REPOSITORY?.trim() || "bitwave-md/chrono";
    const lookup = await this.#latest(repository);
    const release = lookup.release;
    const latestVersion = release?.tag_name ?? null;
    const [updateMode, job] = await Promise.all([this.#control.mode(), this.#control.readJob()]);
    const updateAvailable = isUpdateAvailable(installedVersion, latestVersion);
    return {
      installedVersion,
      latestVersion,
      updateAvailable,
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
      buildCommit: process.env.CHRONO_BUILD_COMMIT?.trim() || null,
      command: "./update.sh",
      updateMode,
      canStartUpdate: updateMode === "automatic" && updateAvailable && !updateInProgress(job),
      job,
    };
  }

  async start(principal: Principal) {
    this.#operators.assertOperator(principal);
    const status = await this.status(principal);
    if (status.updateMode !== "automatic") throw new ConflictError("Automatic updates are not enabled for this installation.");
    if (updateInProgress(status.job)) throw new ConflictError("An update is already running.");
    if (!status.latestVersion || !status.updateAvailable) throw new ConflictError("No newer official release is available.");
    return this.#control.enqueueLatest(status.latestVersion);
  }

  async #latest(repository: string): Promise<ReleaseLookup> {
    const now = Date.now();
    if (UpdateService.#cached && UpdateService.#cached.expiresAt > now) return UpdateService.#cached.value;
    const value = await this.#releases.latest(repository);
    UpdateService.#cached = { value, expiresAt: now + (value.state === "available" ? 15 * 60_000 : 60_000) };
    return value;
  }
}

function isUpdateAvailable(installed: string, latest: string | null): boolean {
  const installedVersion = CalendarVersion.parse(installed);
  const latestVersion = latest ? CalendarVersion.parse(latest) : null;
  return Boolean(installedVersion && latestVersion?.isNewerThan(installedVersion));
}

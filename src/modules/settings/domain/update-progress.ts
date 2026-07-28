import type { UpdateJobRecord, UpdateStage } from "@/modules/settings/domain/update-job";

export interface UpdateProgressStep {
  stage: UpdateStage;
  label: string;
  description: string;
  state: "complete" | "active" | "failed" | "pending";
}

const steps = [
  { stage: "queued", label: "Queued", description: "Waiting for the updater to begin." },
  { stage: "validating", label: "Validating release", description: "Checking the official release and image digests." },
  { stage: "backing_up", label: "Creating backup", description: "Saving the database and uploaded files." },
  { stage: "pulling", label: "Downloading update", description: "Fetching the verified application images." },
  { stage: "migrating", label: "Updating database", description: "Applying compatible database changes." },
  { stage: "restarting", label: "Restarting Chrono", description: "Switching the application to the new version." },
  { stage: "verifying", label: "Checking health", description: "Confirming the updated application is ready." },
] as const;

const activeMessages: Partial<Record<UpdateStage, string>> = {
  queued: "Your update request is queued and will start shortly.",
  validating: "Chrono is verifying that this is an official, untampered release.",
  backing_up: "A coordinated recovery point is being created before anything changes.",
  pulling: "The new application images are downloading. Chrono remains available.",
  migrating: "Database changes are being applied while the current app remains available.",
  restarting: "Chrono is switching versions. The page may reconnect briefly.",
  verifying: "The new version is running and completing its health checks.",
};

export class UpdateProgressModel {
  readonly #job: UpdateJobRecord;
  readonly #installedVersion: string;

  constructor(job: UpdateJobRecord, installedVersion: string) {
    this.#job = job;
    this.#installedVersion = installedVersion;
  }

  get recovered(): boolean {
    return this.#job.stage === "failed" && this.#installedVersion === this.#job.targetVersion;
  }

  get finished(): boolean {
    return this.#job.stage === "completed" || this.recovered;
  }

  get running(): boolean {
    return this.#job.stage !== "completed" && this.#job.stage !== "failed";
  }

  get tone(): "progress" | "success" | "danger" {
    if (this.finished) return "success";
    return this.#job.stage === "failed" ? "danger" : "progress";
  }

  get headline(): string {
    if (this.recovered) return "Update recovered";
    if (this.#job.stage === "completed") return "Update installed";
    if (this.#job.stage === "failed") return "Update needs attention";
    return "Updating Chrono";
  }

  get summary(): string {
    if (this.recovered) return `Chrono ${this.#job.targetVersion} is running. The interrupted installation was recovered successfully.`;
    if (this.#job.stage === "completed") return `Chrono ${this.#job.targetVersion} is installed and healthy.`;
    if (this.#job.stage !== "failed") return activeMessages[this.#job.stage] ?? this.#job.message;
    if (this.#job.rollbackState === "completed") return "The update stopped, and Chrono restored the previous working version.";
    if (this.#job.rollbackState === "failed") return "Automatic recovery did not complete. The instance operator must restore service.";
    if (["validating", "backing_up", "pulling", "migrating"].includes(this.failureStage)) return "The update stopped before the new application was activated. The current version remains available.";
    return "Chrono could not finish switching versions. The instance operator must check the installation.";
  }

  get percentage(): number {
    if (this.finished) return 100;
    const index = Math.max(0, this.currentIndex);
    if (this.#job.stage === "failed") return Math.max(5, Math.round((index / steps.length) * 100));
    return Math.min(95, Math.round(((index + 0.5) / steps.length) * 100));
  }

  get progressSteps(): UpdateProgressStep[] {
    const current = this.currentIndex;
    return steps.map((step, index) => ({
      ...step,
      state: this.finished || index < current
        ? "complete"
        : index === current
          ? this.#job.stage === "failed" ? "failed" : "active"
          : "pending",
    }));
  }

  get reconnectExpected(): boolean {
    return this.running && (this.#job.stage === "restarting" || this.#job.stage === "verifying");
  }

  get technicalDetails(): string | null {
    if (this.#job.stage !== "failed" || this.recovered) return null;
    return this.#job.details ?? this.#job.message;
  }

  private get failureStage(): UpdateStage {
    return this.#job.failureStage ?? this.#job.stage;
  }

  private get currentIndex(): number {
    const stage = this.#job.stage === "failed" ? this.failureStage : this.#job.stage;
    const index = steps.findIndex((item) => item.stage === stage);
    return index < 0 ? 0 : index;
  }
}

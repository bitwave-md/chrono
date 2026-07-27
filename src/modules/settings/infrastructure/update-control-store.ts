import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

import { ConflictError } from "@/modules/shared/application/application-error";
import { CalendarVersion } from "@/modules/settings/domain/calendar-version";
import { updateStages, type UpdateJobRecord } from "@/modules/settings/domain/update-job";

export type UpdateMode = "automatic" | "manual" | "source";

export class UpdateControlStore {
  readonly #source: Record<string, string | undefined>;
  readonly #requestDirectory: string;
  readonly #statusFile: string;

  constructor(
    source: Record<string, string | undefined> = process.env,
    requestDirectory = "/var/lib/chrono-update",
    statusFile = "/var/lib/chrono/update-status.json",
  ) {
    this.#source = source;
    this.#requestDirectory = requestDirectory;
    this.#statusFile = statusFile;
  }

  async mode(): Promise<UpdateMode> {
    if (this.#source.CHRONO_INSTALL_MODE !== "image") return "source";
    try {
      await access(this.#requestDirectory, constants.W_OK | constants.X_OK);
      return "automatic";
    } catch {
      return "manual";
    }
  }

  async readJob(): Promise<UpdateJobRecord | null> {
    try {
      const value = JSON.parse(await readFile(this.#statusFile, "utf8")) as Partial<UpdateJobRecord>;
      if (!value.id || !value.stage || !updateStages.includes(value.stage) || !value.targetVersion || !value.message || !value.requestedAt) return null;
      return {
        id: value.id,
        stage: value.stage,
        targetVersion: value.targetVersion,
        message: value.message,
        requestedAt: value.requestedAt,
        startedAt: value.startedAt ?? null,
        completedAt: value.completedAt ?? null,
        failureStage: value.failureStage ?? null,
      };
    } catch {
      return null;
    }
  }

  async enqueueLatest(targetVersion: string): Promise<UpdateJobRecord> {
    if (!CalendarVersion.parse(targetVersion)) throw new ConflictError("The latest release has an invalid version.");
    if (await this.#exists("processing.json") || await this.#exists("pending.json")) throw new ConflictError("An update is already queued or running.");
    await mkdir(this.#requestDirectory, { recursive: true });
    const requestedAt = new Date().toISOString();
    const request = { id: randomUUID(), action: "install_latest", targetVersion, requestedAt };
    try {
      await writeFile(path.join(this.#requestDirectory, "pending.json"), `${JSON.stringify(request)}\n`, { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ConflictError("An update is already queued.");
      throw error;
    }
    return { ...request, stage: "queued", message: "Update queued.", startedAt: null, completedAt: null, failureStage: null };
  }

  async #exists(name: string): Promise<boolean> {
    try { await access(path.join(this.#requestDirectory, name), constants.F_OK); return true; } catch { return false; }
  }
}

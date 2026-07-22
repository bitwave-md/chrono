import { readFile } from "node:fs/promises";

export interface BackupStatus {
  completedAt: string;
  version: string;
  path: string;
}

export class BackupStatusReader {
  async read(): Promise<BackupStatus | null> {
    const path = "/var/lib/chrono/last-backup.json";
    try {
      const value = JSON.parse(await readFile(path, "utf8")) as Partial<BackupStatus>;
      if (!value.completedAt || !value.version || !value.path) return null;
      return { completedAt: value.completedAt, version: value.version, path: value.path };
    } catch {
      return null;
    }
  }
}

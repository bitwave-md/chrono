export const updateStages = [
  "queued",
  "validating",
  "backing_up",
  "pulling",
  "migrating",
  "restarting",
  "verifying",
  "completed",
  "failed",
] as const;

export type UpdateStage = typeof updateStages[number];

export interface UpdateJobRecord {
  id: string;
  stage: UpdateStage;
  targetVersion: string;
  message: string;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureStage: UpdateStage | null;
}

export function updateInProgress(job: UpdateJobRecord | null): boolean {
  return Boolean(job && job.stage !== "completed" && job.stage !== "failed");
}

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
export const updateRollbackStates = ["not_needed", "completed", "failed"] as const;
export type UpdateRollbackState = typeof updateRollbackStates[number];

export interface UpdateJobRecord {
  id: string;
  stage: UpdateStage;
  targetVersion: string;
  message: string;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureStage: UpdateStage | null;
  details: string | null;
  rollbackState: UpdateRollbackState | null;
}

export function updateInProgress(job: UpdateJobRecord | null): boolean {
  return Boolean(job && job.stage !== "completed" && job.stage !== "failed");
}

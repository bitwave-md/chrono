import { ValidationError } from "../../shared/application/application-error.ts";
import type { ResolvedTimeCategory } from "./time-attribution-resolver.ts";

const maximumManualDurationSeconds = 31 * 24 * 60 * 60;

export class TimeEntryValidator {
  normalizeNote(input: string | null): string | null {
    const note = input?.trim() || null;

    if (note && note.length > 2_000) {
      throw new ValidationError("Time entry notes must be at most 2000 characters.");
    }

    return note;
  }

  resolveBillable(
    requested: boolean | null,
    category: ResolvedTimeCategory | null,
  ): boolean {
    return requested ?? category?.defaultBillable ?? false;
  }

  manualPeriod(startedAt: Date, durationSeconds: number) {
    if (Number.isNaN(startedAt.getTime())) {
      throw new ValidationError("Manual start time must be valid.");
    }

    this.#assertDuration(durationSeconds);

    const endedAt = new Date(startedAt.getTime() + durationSeconds * 1_000);

    if (endedAt.getTime() > Date.now()) {
      throw new ValidationError("Manual time entries cannot end in the future.");
    }

    return { startedAt, endedAt, durationSeconds };
  }

  editedPeriod(endedAt: Date, durationSeconds: number) {
    if (Number.isNaN(endedAt.getTime())) {
      throw new ValidationError("Time entry completion time must be valid.");
    }

    this.#assertDuration(durationSeconds);

    return {
      startedAt: new Date(endedAt.getTime() - durationSeconds * 1_000),
      endedAt,
      durationSeconds,
    };
  }

  timerPeriod(startedAt: Date, requestedStop: Date) {
    const endedAt = new Date(
      Math.max(requestedStop.getTime(), startedAt.getTime() + 1_000),
    );
    const durationSeconds = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1_000,
    );

    return { startedAt, endedAt, durationSeconds };
  }

  #assertDuration(durationSeconds: number): void {
    if (
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > maximumManualDurationSeconds
    ) {
      throw new ValidationError(
        "Time entry durations must contain 1 second to 31 days.",
      );
    }
  }
}

export function manualTimeStartedAt(
  entryDate: Date,
  durationSeconds: number,
  now = new Date(),
): string {
  const endedAt = new Date(
    entryDate.getFullYear(),
    entryDate.getMonth(),
    entryDate.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  return new Date(endedAt.getTime() - durationSeconds * 1_000).toISOString();
}

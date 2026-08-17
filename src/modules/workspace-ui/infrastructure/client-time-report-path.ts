export interface ClientTimeReportFilters {
  from: string;
  to: string;
  timeZone?: string;
  projectId?: string;
  categoryId?: string;
  workerUserId?: string;
}

export function clientTimeReportPath(
  clientId: string,
  filters: ClientTimeReportFilters,
  suffix = "",
): string {
  const parameters = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.timeZone) parameters.set("timeZone", filters.timeZone);
  if (filters.projectId) parameters.set("projectId", filters.projectId);
  if (filters.categoryId) parameters.set("categoryId", filters.categoryId);
  if (filters.workerUserId) parameters.set("workerUserId", filters.workerUserId);
  return `/clients/${encodeURIComponent(clientId)}/time-report${suffix}?${parameters.toString()}`;
}

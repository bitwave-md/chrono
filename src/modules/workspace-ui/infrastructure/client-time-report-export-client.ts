import { type ClientTimeReportFilters, clientTimeReportPath } from "@/modules/workspace-ui/infrastructure/client-time-report-path";
import { WorkspaceApiError } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

export class ClientTimeReportExportClient {
  readonly #basePath: string;

  constructor(workspaceSlug: string) {
    this.#basePath = `/api/workspaces/${encodeURIComponent(workspaceSlug)}`;
  }

  async download(clientId: string, filters: ClientTimeReportFilters): Promise<{ blob: Blob; filename: string }> {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const path = clientTimeReportPath(clientId, { ...filters, timeZone }, "/export");
    const response = await fetch(`${this.#basePath}${path}`, { credentials: "same-origin" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as ApiErrorEnvelope;
      throw new WorkspaceApiError(payload.error?.message ?? "The PDF could not be generated.", response.status, payload.error?.code);
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "chrono-time-report.pdf";
    return { blob: await response.blob(), filename };
  }
}

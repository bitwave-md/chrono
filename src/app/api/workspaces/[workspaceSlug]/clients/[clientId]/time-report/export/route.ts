import { format } from "date-fns";

import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { ClientTimeReportPdfService } from "@/modules/time-tracking/application/client-time-report-pdf-service";
import { ClientTimeReportService } from "@/modules/time-tracking/application/client-time-report-service";
import { aggregateTimeReport } from "@/modules/time-tracking/domain/time-report-summary";
import { ClientTimeReportRouteInput } from "@/modules/time-tracking/infrastructure/client-time-report-route-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const reportService = new ClientTimeReportService();
const pdfService = new ClientTimeReportPdfService();

interface RouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const clientId = new EntityId(value, "clientId").value;
    const filters = new ClientTimeReportRouteInput(request.url).filters();
    const result = await reportService.report(principal, clientId, filters);
    const summary = aggregateTimeReport(result.entries, filters);
    const project = filters.projectId ? result.entries.find((entry) => entry.projectId === filters.projectId) : null;
    const clientName = result.entries[0]?.clientName ?? "Client";
    const buffer = await pdfService.generate({
      subjectName: project?.projectName ?? clientName,
      subjectType: project ? "Project" : "Client",
      scope: result.scope,
      range: filters,
      report: summary,
      truncated: result.truncated,
    });
    const filename = `chrono-time-report-${format(filters.from, "yyyy-MM-dd")}-${format(filters.to, "yyyy-MM-dd")}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

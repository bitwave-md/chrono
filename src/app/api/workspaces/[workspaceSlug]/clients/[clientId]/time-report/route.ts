import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { ClientTimeReportService } from "@/modules/time-tracking/application/client-time-report-service";
import { ClientTimeReportRouteInput } from "@/modules/time-tracking/infrastructure/client-time-report-route-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const reportService = new ClientTimeReportService();

interface ClientTimeReportRouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string }>;
}

export async function GET(
  request: Request,
  context: ClientTimeReportRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const filters = new ClientTimeReportRouteInput(request.url).filters();
    const report = await reportService.report(
      principal,
      new EntityId(value, "clientId").value,
      filters,
    );
    return Response.json({ data: report });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

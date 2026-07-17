import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { SearchInput } from "@/modules/shared/infrastructure/search-input";
import { ClientTimeReportService } from "@/modules/time-tracking/application/client-time-report-service";

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
    const input = new SearchInput(request.url);
    const report = await reportService.report(
      principal,
      new EntityId(value, "clientId").value,
      {
        from: input.requiredDateTime("from"),
        to: input.requiredDateTime("to"),
        projectId: input.optionalUuid("projectId"),
        categoryId: input.optionalUuid("categoryId"),
        workerUserId: input.optionalUuid("workerUserId"),
      },
    );
    return Response.json({ data: report });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

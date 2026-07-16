import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { SearchInput } from "@/modules/shared/infrastructure/search-input";
import {
  TimeReportService,
  timeReportGroups,
} from "@/modules/time-tracking/application/time-report-service";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const reportService = new TimeReportService();

interface TimeReportRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  request: Request,
  context: TimeReportRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new SearchInput(request.url);
    const report = await reportService.aggregate(
      principal,
      input.requiredEnum("groupBy", timeReportGroups),
      {
        issueId: input.optionalUuid("issueId"),
        clientId: input.optionalUuid("clientId"),
        projectId: input.optionalUuid("projectId"),
        projectScopeId: input.optionalUuid("projectScopeId"),
        rootProjectId: input.optionalUuid("rootProjectId"),
        categoryId: input.optionalUuid("categoryId"),
        workerUserId: input.optionalUuid("workerUserId"),
        from: input.optionalDateTime("from"),
        to: input.optionalDateTime("to"),
      },
    );

    return Response.json({ data: report });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

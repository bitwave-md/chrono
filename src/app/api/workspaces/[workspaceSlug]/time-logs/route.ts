import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { SearchInput } from "@/modules/shared/infrastructure/search-input";
import { TimeLogService } from "@/modules/time-tracking/application/time-log-service";

export const runtime = "nodejs";

const logService = new TimeLogService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface TimeLogRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  request: Request,
  context: TimeLogRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new SearchInput(request.url);
    const logs = await logService.list(principal, {
      issueId: input.optionalUuid("issueId"),
      clientId: input.optionalUuid("clientId"),
      projectId: input.optionalUuid("projectId"),
      teamId: input.optionalUuid("teamId"),
      categoryId: input.optionalUuid("categoryId"),
      workerUserId: input.optionalUuid("workerUserId"),
      from: input.optionalDateTime("from"),
      to: input.optionalDateTime("to"),
    });

    return Response.json({ data: logs });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: TimeLogRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const log = await logService.createManual(principal, {
      issueId: input.requiredUuid("issueId"),
      categoryId: input.optionalUuid("categoryId"),
      startedAt: input.requiredDateTime("startedAt"),
      durationSeconds: input.requiredInteger("durationSeconds", 1),
      note: input.optionalString("note", 2_000),
      billable: input.optionalBoolean("billable"),
    });

    return Response.json({ data: log }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

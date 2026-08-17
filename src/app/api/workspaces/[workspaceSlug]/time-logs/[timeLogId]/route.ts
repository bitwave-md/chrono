import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { TimeLogService } from "@/modules/time-tracking/application/time-log-service";

export const runtime = "nodejs";

const logService = new TimeLogService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface TimeLogRouteContext {
  params: Promise<{ workspaceSlug: string; timeLogId: string }>;
}

export async function PATCH(
  request: Request,
  context: TimeLogRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, timeLogId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const log = await logService.update(
      principal,
      new EntityId(value, "timeLogId").value,
      {
        expectedVersion: input.requiredInteger("expectedVersion", 1),
        categoryId: input.optionalUuid("categoryId"),
        durationSeconds: input.requiredInteger("durationSeconds", 1),
        note: input.optionalString("note", 2_000),
      },
    );

    return Response.json({ data: log });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

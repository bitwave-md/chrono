import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { TimerService } from "@/modules/time-tracking/application/timer-service";

export const runtime = "nodejs";

const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();
const timerService = new TimerService();

interface ActiveTimerRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  _request: Request,
  context: ActiveTimerRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const activeTimer = await timerService.active(principal);

    return Response.json({ data: activeTimer });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: ActiveTimerRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const timer = await timerService.start(principal, {
      issueId: input.requiredUuid("issueId"),
      categoryId: input.optionalUuid("categoryId"),
      note: input.optionalString("note", 2_000),
      billable: input.optionalBoolean("billable"),
    });

    return Response.json({ data: timer }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function DELETE(
  request: Request,
  context: ActiveTimerRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const stoppedTimer = await timerService.stop(principal);

    return Response.json({ data: stoppedTimer });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

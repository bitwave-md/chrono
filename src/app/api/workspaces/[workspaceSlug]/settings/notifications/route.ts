import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { WorkspaceSettingsService } from "@/modules/settings/application/workspace-settings-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new WorkspaceSettingsService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug } = await context.params; return Response.json({ data: await service.notifications(await principals.requireWorkspace(workspaceSlug)) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.updateNotifications(await principals.requireWorkspace(workspaceSlug), {
      ...(input.has("assignments") ? { assignments: input.optionalBoolean("assignments") ?? false } : {}),
      ...(input.has("statusChanges") ? { statusChanges: input.optionalBoolean("statusChanges") ?? false } : {}),
      ...(input.has("comments") ? { comments: input.optionalBoolean("comments") ?? false } : {}),
    }) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

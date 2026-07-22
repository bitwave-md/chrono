import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { WorkspaceSettingsService } from "@/modules/settings/application/workspace-settings-service";
import { clientIconTypes } from "@/modules/clients/domain/client-icon";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new WorkspaceSettingsService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug } = await context.params; return Response.json({ data: await service.general(await principals.requireWorkspace(workspaceSlug)) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.updateGeneral(await principals.requireWorkspace(workspaceSlug), {
      ...(input.has("name") ? { name: input.requiredString("name", 120) } : {}),
      ...(input.has("iconType") ? { iconType: input.requiredEnum("iconType", clientIconTypes), iconKey: input.requiredString("iconKey", 80), iconColor: input.requiredString("iconColor", 7) } : {}),
    }) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { WorkspaceSettingsService } from "@/modules/settings/application/workspace-settings-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new WorkspaceSettingsService();
const principals = new ServerPrincipalResolver();
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug } = await context.params; return Response.json({ data: await service.storage(await principals.requireWorkspace(workspaceSlug)) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

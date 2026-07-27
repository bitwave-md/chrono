import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { UpdateService } from "@/modules/settings/application/update-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new UpdateService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug } = await context.params; return Response.json({ data: await service.status(await principals.requireWorkspace(workspaceSlug)) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    if (request.headers.get("content-type") !== "application/json") return Response.json({ error: { code: "validation_error", message: "JSON is required." } }, { status: 400 });
    const { workspaceSlug } = await context.params;
    return Response.json({ data: await service.start(await principals.requireWorkspace(workspaceSlug)) }, { status: 202 });
  } catch (error) { return ApiErrorResponse.from(error); }
}
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";

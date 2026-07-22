import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { IdentityAssetService } from "@/modules/storage/application/identity-asset-service";

const service = new IdentityAssetService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function POST(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const input = new JsonInput(await request.json());
    const principal = await principals.requireWorkspace(workspaceSlug);
    const result = await service.createWorkspaceIconIntent(principal, { filename: input.requiredString("filename", 240), contentType: input.requiredString("contentType", 120), sizeBytes: input.requiredInteger("sizeBytes", 1) });
    return Response.json({ data: { ...result, uploadUrl: `/api/workspaces/${workspaceSlug}/icon/uploads/${result.uploadId}/content` } }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

export async function DELETE(request: Request, context: Context) {
  try { origins.assertTrusted(request); const { workspaceSlug } = await context.params; await service.removeWorkspaceIcon(await principals.requireWorkspace(workspaceSlug)); return Response.json({ data: null }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

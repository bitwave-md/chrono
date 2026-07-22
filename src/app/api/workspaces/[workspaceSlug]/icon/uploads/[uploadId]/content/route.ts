import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { IdentityAssetService } from "@/modules/storage/application/identity-asset-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new IdentityAssetService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; uploadId: string }> }

export async function PUT(request: Request, context: Context) {
  try { origins.assertTrusted(request); const { workspaceSlug, uploadId } = await context.params; return Response.json({ data: await service.uploadWorkspaceIcon(await principals.requireWorkspace(workspaceSlug), new EntityId(uploadId, "uploadId").value, request.body) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

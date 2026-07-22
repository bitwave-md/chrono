import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { AttachmentService } from "@/modules/storage/application/attachment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new AttachmentService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; uploadId: string }> }

export async function PUT(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, uploadId } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    const data = await service.upload(principal, new EntityId(uploadId, "uploadId").value, request.body);
    return Response.json({ data });
  } catch (error) { return ApiErrorResponse.from(error); }
}

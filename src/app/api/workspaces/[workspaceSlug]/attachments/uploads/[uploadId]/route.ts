import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { AttachmentService } from "@/modules/storage/application/attachment-service";

const service = new AttachmentService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; uploadId: string }> }

export async function DELETE(request: Request, context: Context) {
  try { origins.assertTrusted(request); const { workspaceSlug, uploadId } = await context.params; return Response.json({ data: await service.cancel(await principals.requireWorkspace(workspaceSlug), new EntityId(uploadId, "uploadId").value) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

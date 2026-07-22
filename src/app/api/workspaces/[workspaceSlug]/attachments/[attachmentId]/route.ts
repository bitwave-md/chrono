import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { AttachmentService } from "@/modules/storage/application/attachment-service";

const service = new AttachmentService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; attachmentId: string }> }

export async function DELETE(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, attachmentId } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    return Response.json({ data: await service.remove(principal, new EntityId(attachmentId, "attachmentId").value) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

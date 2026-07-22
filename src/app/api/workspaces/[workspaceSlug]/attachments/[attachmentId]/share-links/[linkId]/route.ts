import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { AttachmentShareService } from "@/modules/storage/application/attachment-share-service";

const service = new AttachmentShareService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; attachmentId: string; linkId: string }> }

export async function DELETE(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, attachmentId, linkId } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    return Response.json({ data: await service.revoke(principal, new EntityId(attachmentId, "attachmentId").value, new EntityId(linkId, "linkId").value) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

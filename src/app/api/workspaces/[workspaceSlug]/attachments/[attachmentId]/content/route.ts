import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { AttachmentService } from "@/modules/storage/application/attachment-service";
import { fileDownloadResponse } from "@/modules/storage/infrastructure/file-download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new AttachmentService();
const principals = new ServerPrincipalResolver();
interface Context { params: Promise<{ workspaceSlug: string; attachmentId: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const { workspaceSlug, attachmentId } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    const result = await service.content(principal, new EntityId(attachmentId, "attachmentId").value);
    return fileDownloadResponse(result.body, result.record);
  } catch (error) { return ApiErrorResponse.from(error); }
}

import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { AttachmentShareService } from "@/modules/storage/application/attachment-share-service";

const service = new AttachmentShareService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; attachmentId: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const { workspaceSlug, attachmentId } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    return Response.json({ data: await service.list(principal, new EntityId(attachmentId, "attachmentId").value) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, attachmentId } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.create(principal, new EntityId(attachmentId, "attachmentId").value, input.requiredInteger("lifetimeSeconds", 3_600)) }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

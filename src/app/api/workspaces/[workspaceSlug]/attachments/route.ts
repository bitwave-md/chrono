import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { AttachmentService } from "@/modules/storage/application/attachment-service";
import type { AttachmentTarget } from "@/modules/storage/application/attachment-access-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { ValidationError } from "@/modules/shared/application/application-error";

export const runtime = "nodejs";
const service = new AttachmentService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
const targetTypes = ["client", "project", "issue"] as const;
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(request: Request, context: Context) {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    const parameters = new URL(request.url).searchParams;
    const type = parameters.get("targetType");
    const id = parameters.get("targetId");
    if (!type || !targetTypes.includes(type as AttachmentTarget["type"]) || !id) throw new ValidationError("A valid attachment target is required.");
    return Response.json({ data: await service.list(principal, { type: type as AttachmentTarget["type"], id: new EntityId(id, "targetId").value }) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const type = input.requiredEnum("targetType", targetTypes);
    return Response.json({ data: await service.createIntent(principal, {
      target: { type, id: input.requiredUuid("targetId") },
      filename: input.requiredString("filename", 240),
      contentType: input.requiredString("contentType", 120),
      sizeBytes: input.requiredInteger("sizeBytes", 1),
    }) }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

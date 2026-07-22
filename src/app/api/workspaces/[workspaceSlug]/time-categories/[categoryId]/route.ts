import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { TimeCategoryService } from "@/modules/time-tracking/application/time-category-service";

export const runtime = "nodejs";
const service = new TimeCategoryService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; categoryId: string }> }

export async function PATCH(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, categoryId } = await context.params;
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.update(
      await principals.requireWorkspace(workspaceSlug),
      new EntityId(categoryId, "categoryId").value,
      {
        ...(input.has("name") ? { name: input.requiredString("name", 120) } : {}),
        ...(input.has("color") ? { color: input.optionalString("color", 7) } : {}),
        ...(input.has("defaultBillable") ? { defaultBillable: input.optionalBoolean("defaultBillable") ?? false } : {}),
        ...(input.has("position") ? { position: input.requiredInteger("position", 0) } : {}),
        ...(input.has("archived") ? { archived: input.optionalBoolean("archived") ?? false } : {}),
      },
    ) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

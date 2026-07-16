import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ClientResourceService } from "@/modules/clients/application/client-resource-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const resourceService = new ClientResourceService();

interface ClientResourceDetailRouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string; resourceId: string }>;
}

export async function PATCH(request: Request, context: ClientResourceDetailRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId, resourceId } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const resource = await resourceService.update(
      principal,
      new EntityId(clientId, "clientId").value,
      new EntityId(resourceId, "resourceId").value,
      {
        ...(input.has("title") ? { title: input.requiredString("title", 160) } : {}),
        ...(input.has("url") ? { url: input.requiredString("url", 2_000) } : {}),
        ...(input.has("description") ? { description: input.optionalString("description", 2_000) } : {}),
        ...(input.has("iconKey") ? { iconKey: input.optionalString("iconKey", 80) } : {}),
        ...(input.has("position") ? { position: input.requiredInteger("position", 0) } : {}),
      },
    );
    return Response.json({ data: resource });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function DELETE(request: Request, context: ClientResourceDetailRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId, resourceId } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const resource = await resourceService.archive(
      principal,
      new EntityId(clientId, "clientId").value,
      new EntityId(resourceId, "resourceId").value,
    );
    return Response.json({ data: resource });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

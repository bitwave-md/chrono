import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ClientService } from "@/modules/clients/application/client-service";
import { clientIconTypes } from "@/modules/clients/domain/client-icon";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const clientService = new ClientService();

interface ClientDetailRouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string }>;
}

export async function PATCH(request: Request, context: ClientDetailRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const client = await clientService.update(
      principal,
      new EntityId(value, "clientId").value,
      {
        ...(input.has("name") ? { name: input.requiredString("name", 120) } : {}),
        ...(input.has("description") ? { description: input.optionalString("description", 2_000) } : {}),
        ...(input.has("iconType") ? { iconType: input.requiredEnum("iconType", clientIconTypes) } : {}),
        ...(input.has("iconKey") ? { iconKey: input.requiredString("iconKey", 80) } : {}),
        ...(input.has("iconColor") ? { iconColor: input.requiredString("iconColor", 7) } : {}),
      },
    );
    return Response.json({ data: client });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function DELETE(request: Request, context: ClientDetailRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const client = await clientService.archive(
      principal,
      new EntityId(value, "clientId").value,
    );
    return Response.json({ data: client });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

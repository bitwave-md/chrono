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

interface ClientResourceRouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string }>;
}

export async function GET(_request: Request, context: ClientResourceRouteContext) {
  try {
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const resources = await resourceService.list(
      principal,
      new EntityId(value, "clientId").value,
    );
    return Response.json({ data: resources });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(request: Request, context: ClientResourceRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const resource = await resourceService.create(
      principal,
      new EntityId(value, "clientId").value,
      {
        title: input.requiredString("title", 160),
        url: input.requiredString("url", 2_000),
        description: input.optionalString("description", 2_000),
        iconKey: input.optionalString("iconKey", 80),
      },
    );
    return Response.json({ data: resource }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

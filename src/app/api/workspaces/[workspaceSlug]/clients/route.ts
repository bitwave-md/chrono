import { ClientService } from "@/modules/clients/application/client-service";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { clientIconTypes } from "@/modules/clients/domain/client-icon";

export const runtime = "nodejs";

const clientService = new ClientService();
const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();

interface ClientRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  _request: Request,
  context: ClientRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const clients = await clientService.list(principal);

    return Response.json({ data: clients });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: ClientRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const client = await clientService.create(principal, {
      name: input.requiredString("name", 120),
      key: input.requiredString("key", 12),
      issuePrefix: input.requiredString("issuePrefix", 10),
      description: input.optionalString("description"),
      iconType: input.optionalEnum("iconType", clientIconTypes) ?? "icon",
      iconKey: input.optionalString("iconKey", 80) ?? "hash",
      iconColor: input.optionalString("iconColor", 7) ?? "#6366f1",
    });

    return Response.json({ data: client }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

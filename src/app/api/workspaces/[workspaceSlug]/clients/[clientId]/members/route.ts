import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ClientMemberService, clientPermissions } from "@/modules/clients/application/client-member-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const memberService = new ClientMemberService();

interface ClientMemberRouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string }>;
}

export async function GET(_request: Request, context: ClientMemberRouteContext) {
  try {
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const members = await memberService.list(
      principal,
      new EntityId(value, "clientId").value,
    );
    return Response.json({ data: members });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(request: Request, context: ClientMemberRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const member = await memberService.add(
      principal,
      new EntityId(value, "clientId").value,
      input.requiredUuid("membershipId"),
      input.requiredEnum("permission", clientPermissions),
    );
    return Response.json({ data: member }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

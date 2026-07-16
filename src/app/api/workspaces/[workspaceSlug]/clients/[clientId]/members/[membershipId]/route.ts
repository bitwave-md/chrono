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

interface ClientMemberDetailRouteContext {
  params: Promise<{ workspaceSlug: string; clientId: string; membershipId: string }>;
}

export async function PATCH(request: Request, context: ClientMemberDetailRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId, membershipId } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const member = await memberService.update(
      principal,
      new EntityId(clientId, "clientId").value,
      new EntityId(membershipId, "membershipId").value,
      input.requiredEnum("permission", clientPermissions),
    );
    return Response.json({ data: member });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function DELETE(request: Request, context: ClientMemberDetailRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, clientId, membershipId } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const member = await memberService.remove(
      principal,
      new EntityId(clientId, "clientId").value,
      new EntityId(membershipId, "membershipId").value,
    );
    return Response.json({ data: member });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

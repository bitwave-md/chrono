import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { WorkspaceAdministrationService } from "@/modules/settings/application/workspace-administration-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new WorkspaceAdministrationService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
const roles = ["owner", "admin", "member", "guest"] as const;
const statuses = ["active", "suspended", "removed"] as const;
interface Context { params: Promise<{ workspaceSlug: string; membershipId: string }> }

export async function PATCH(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, membershipId } = await context.params;
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.updateMember(await principals.requireWorkspace(workspaceSlug), new EntityId(membershipId, "membershipId").value, {
      ...(input.has("role") ? { role: input.requiredEnum("role", roles) } : {}),
      ...(input.has("status") ? { status: input.requiredEnum("status", statuses) } : {}),
    }) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

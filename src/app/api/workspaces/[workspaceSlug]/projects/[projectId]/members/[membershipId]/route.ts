import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ProjectMemberService } from "@/modules/projects/application/project-member-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
const service = new ProjectMemberService();
interface Context { params: Promise<{ workspaceSlug: string; projectId: string; membershipId: string }> }

export async function DELETE(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, projectId, membershipId } = await context.params;
    return Response.json({ data: await service.remove(await principals.requireWorkspace(workspaceSlug), new EntityId(projectId, "projectId").value, new EntityId(membershipId, "membershipId").value) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

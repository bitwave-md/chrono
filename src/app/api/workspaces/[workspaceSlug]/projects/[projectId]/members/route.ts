import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ProjectMemberService } from "@/modules/projects/application/project-member-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
const service = new ProjectMemberService();
interface Context { params: Promise<{ workspaceSlug: string; projectId: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug, projectId } = await context.params; return Response.json({ data: await service.list(await principals.requireWorkspace(workspaceSlug), new EntityId(projectId, "projectId").value) }); } catch (error) { return ApiErrorResponse.from(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, projectId } = await context.params;
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.add(await principals.requireWorkspace(workspaceSlug), new EntityId(projectId, "projectId").value, input.requiredUuid("membershipId")) }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

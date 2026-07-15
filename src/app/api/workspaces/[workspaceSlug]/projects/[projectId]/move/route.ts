import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ProjectService } from "@/modules/projects/application/project-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const projectService = new ProjectService();
const mutationOriginPolicy = new MutationOriginPolicy();

interface MoveProjectRouteContext {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export async function POST(
  request: Request,
  context: MoveProjectRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: projectIdInput } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const projectId = new EntityId(projectIdInput, "projectId").value;
    const input = new JsonInput(await request.json());
    const project = await projectService.move(
      principal,
      projectId,
      input.optionalUuid("parentId"),
    );

    return Response.json({ data: project });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

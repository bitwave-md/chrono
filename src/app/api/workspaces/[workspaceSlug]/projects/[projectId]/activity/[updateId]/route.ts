import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ProjectDetailService } from "@/modules/projects/application/project-detail-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const projectService = new ProjectDetailService();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceSlug: string; projectId: string; updateId: string }> },
) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId, updateId } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const update = await projectService.editPublishedUpdate(
      principal,
      new EntityId(projectId, "projectId").value,
      new EntityId(updateId, "updateId").value,
      input.requiredString("body", 20_000),
    );
    return Response.json({ data: update });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

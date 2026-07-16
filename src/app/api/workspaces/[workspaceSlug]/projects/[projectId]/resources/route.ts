import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ProjectDetailService } from "@/modules/projects/application/project-detail-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const projectService = new ProjectDetailService();

interface ResourceRouteContext { params: Promise<{ workspaceSlug: string; projectId: string }> }

export async function POST(request: Request, context: ResourceRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const resource = await projectService.addResource(principal, new EntityId(value, "projectId").value, {
      title: input.requiredString("title", 160),
      url: input.requiredString("url", 2_000),
      description: input.optionalString("description", 2_000),
    });
    return Response.json({ data: resource }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

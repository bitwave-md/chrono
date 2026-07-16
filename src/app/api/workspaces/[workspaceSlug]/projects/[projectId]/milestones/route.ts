import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import {
  milestoneStates,
  ProjectDetailService,
} from "@/modules/projects/application/project-detail-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const projectService = new ProjectDetailService();

interface MilestoneRouteContext { params: Promise<{ workspaceSlug: string; projectId: string }> }

export async function POST(request: Request, context: MilestoneRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const milestone = await projectService.addMilestone(principal, new EntityId(value, "projectId").value, {
      name: input.requiredString("name", 160),
      description: input.optionalString("description", 2_000),
      state: input.optionalEnum("state", milestoneStates) ?? "planned",
      targetDate: input.optionalDateTime("targetDate"),
    });
    return Response.json({ data: milestone }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

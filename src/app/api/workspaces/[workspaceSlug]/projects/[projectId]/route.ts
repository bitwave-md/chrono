import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import {
  ProjectDetailService,
  projectStates,
} from "@/modules/projects/application/project-detail-service";
import {
  projectPriorities,
  projectVisibilities,
} from "@/modules/projects/application/project-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { clientIconTypes } from "@/modules/clients/domain/client-icon";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const projectService = new ProjectDetailService();

interface ProjectRouteContext {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export async function GET(_request: Request, context: ProjectRouteContext) {
  try {
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const project = await projectService.get(principal, new EntityId(value, "projectId").value);
    return Response.json({ data: project });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const project = await projectService.update(
      principal,
      new EntityId(value, "projectId").value,
      {
        ...(input.has("state") ? { state: input.requiredEnum("state", projectStates) } : {}),
        ...(input.has("priority") ? { priority: input.requiredEnum("priority", projectPriorities) } : {}),
        ...(input.has("leadMembershipId") ? { leadMembershipId: input.optionalUuid("leadMembershipId") } : {}),
        ...(input.has("summary") ? { summary: input.optionalString("summary", 500) } : {}),
        ...(input.has("description") ? { description: input.optionalString("description", 20_000) } : {}),
        ...(input.has("visibility") ? { visibility: input.requiredEnum("visibility", projectVisibilities) } : {}),
        ...(input.has("startDate") ? { startDate: input.optionalDateTime("startDate") } : {}),
        ...(input.has("targetDate") ? { targetDate: input.optionalDateTime("targetDate") } : {}),
        ...(input.has("assigneeMembershipIds") ? { assigneeMembershipIds: input.uuidArray("assigneeMembershipIds", 20) } : {}),
        ...(input.has("iconType") ? { iconType: input.requiredEnum("iconType", clientIconTypes) } : {}),
        ...(input.has("iconKey") ? { iconKey: input.requiredString("iconKey", 80) } : {}),
        ...(input.has("iconColor") ? { iconColor: input.requiredString("iconColor", 7) } : {}),
      },
    );
    return Response.json({ data: project });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function DELETE(request: Request, context: ProjectRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const project = await projectService.archive(
      principal,
      new EntityId(value, "projectId").value,
    );
    return Response.json({ data: project });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

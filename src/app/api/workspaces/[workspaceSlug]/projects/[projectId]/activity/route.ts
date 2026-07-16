import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import {
  ProjectDetailService,
  projectHealthValues,
} from "@/modules/projects/application/project-detail-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const projectService = new ProjectDetailService();

interface ActivityRouteContext {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export async function GET(_request: Request, context: ActivityRouteContext) {
  try {
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const activity = await projectService.activity(principal, new EntityId(value, "projectId").value);
    return Response.json({ data: activity });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(request: Request, context: ActivityRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const update = await projectService.publishUpdate(
      principal,
      new EntityId(value, "projectId").value,
      {
        body: input.requiredString("body", 20_000),
        health: input.optionalEnum("health", projectHealthValues),
        progress: input.optionalInteger("progress", 0),
      },
    );
    return Response.json({ data: update }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

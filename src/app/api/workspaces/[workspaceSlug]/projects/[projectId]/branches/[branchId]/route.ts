import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import {
  ProjectBranchService,
  projectBranchKinds,
  projectBranchStates,
} from "@/modules/projects/application/project-branch-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const branchService = new ProjectBranchService();
const mutationOriginPolicy = new MutationOriginPolicy();

interface BranchRouteContext {
  params: Promise<{ workspaceSlug: string; projectId: string; branchId: string }>;
}

export async function PATCH(request: Request, context: BranchRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const parameters = await context.params;
    const principal = await principalResolver.requireWorkspace(parameters.workspaceSlug);
    const projectId = new EntityId(parameters.projectId, "projectId").value;
    const branchId = new EntityId(parameters.branchId, "branchId").value;
    const input = new JsonInput(await request.json());
    const branch = await branchService.update(principal, projectId, branchId, {
      ...(input.has("name") ? { name: input.requiredString("name", 160) } : {}),
      ...(input.has("slug") ? { slug: input.requiredString("slug", 63) } : {}),
      ...(input.has("kind") ? { kind: input.requiredEnum("kind", projectBranchKinds) } : {}),
      ...(input.has("state") ? { state: input.requiredEnum("state", projectBranchStates) } : {}),
      ...(input.has("summary") ? { summary: input.optionalString("summary", 500) } : {}),
      ...(input.has("description") ? { description: input.optionalString("description", 20_000) } : {}),
      ...(input.has("startDate") ? { startDate: input.optionalDateTime("startDate") } : {}),
      ...(input.has("targetDate") ? { targetDate: input.optionalDateTime("targetDate") } : {}),
      ...(input.has("archived") ? { archived: input.optionalBoolean("archived") ?? false } : {}),
    });
    return Response.json({ data: branch });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

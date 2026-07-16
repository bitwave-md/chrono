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
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export async function GET(_request: Request, context: BranchRouteContext) {
  try {
    const { workspaceSlug, projectId: projectIdInput } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const projectId = new EntityId(projectIdInput, "projectId").value;
    return Response.json({ data: await branchService.list(principal, projectId) });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(request: Request, context: BranchRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, projectId: projectIdInput } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const projectId = new EntityId(projectIdInput, "projectId").value;
    const input = new JsonInput(await request.json());
    const branch = await branchService.create(principal, projectId, {
      name: input.requiredString("name", 160),
      slug: input.requiredString("slug", 63),
      kind: input.optionalEnum("kind", projectBranchKinds) ?? "feature",
      state: input.optionalEnum("state", projectBranchStates) ?? "planned",
      summary: input.optionalString("summary", 500),
      description: input.optionalString("description", 20_000),
      startDate: input.optionalDateTime("startDate"),
      targetDate: input.optionalDateTime("targetDate"),
    });
    return Response.json({ data: branch }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

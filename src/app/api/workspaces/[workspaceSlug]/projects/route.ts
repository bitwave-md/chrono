import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import {
  ProjectService,
  projectKinds,
  projectVisibilities,
  workflowModes,
} from "@/modules/projects/application/project-service";
import { ValidationError } from "@/modules/shared/application/application-error";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const projectService = new ProjectService();
const mutationOriginPolicy = new MutationOriginPolicy();

interface ProjectRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  request: Request,
  context: ProjectRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const clientIdInput = new URL(request.url).searchParams.get("clientId");

    if (!clientIdInput) {
      throw new ValidationError("clientId is required.");
    }

    const clientId = new EntityId(clientIdInput, "clientId").value;
    const tree = await projectService.listTree(principal, clientId);

    return Response.json({ data: tree });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: ProjectRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const parentId = input.optionalUuid("parentId");
    const project = await projectService.create(principal, {
      clientId: input.requiredUuid("clientId"),
      parentId,
      kind:
        input.optionalEnum("kind", projectKinds) ??
        (parentId ? "subproject" : "project"),
      workflowMode:
        input.optionalEnum("workflowMode", workflowModes) ??
        (parentId ? "inherit" : "own"),
      visibility:
        input.optionalEnum("visibility", projectVisibilities) ?? "internal",
      name: input.requiredString("name", 160),
      slug: input.requiredString("slug", 63),
      description: input.optionalString("description"),
      namespacePrefix: input.optionalString("namespacePrefix", 10),
    });

    return Response.json({ data: project }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

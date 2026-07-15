import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { WorkflowStatusService } from "@/modules/projects/application/workflow-status-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const statusService = new WorkflowStatusService();

interface WorkflowStatusRouteContext {
  params: Promise<{ workspaceSlug: string; workflowId: string }>;
}

export async function GET(
  _request: Request,
  context: WorkflowStatusRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug, workflowId: workflowIdInput } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const workflowId = new EntityId(workflowIdInput, "workflowId").value;
    const statuses = await statusService.list(principal, workflowId);

    return Response.json({ data: statuses });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

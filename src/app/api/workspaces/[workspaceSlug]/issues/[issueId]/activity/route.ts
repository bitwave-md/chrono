import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { IssueActivityService } from "@/modules/issues/application/issue-activity-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new IssueActivityService();
const principals = new ServerPrincipalResolver();
interface Context { params: Promise<{ workspaceSlug: string; issueId: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug, issueId } = await context.params; return Response.json({ data: await service.list(await principals.requireWorkspace(workspaceSlug), new EntityId(issueId, "issueId").value) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { IssueMetadataService } from "@/modules/issues/application/issue-metadata-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const principalResolver = new ServerPrincipalResolver();
const metadataService = new IssueMetadataService();

export async function GET(_request: Request, context: { params: Promise<{ workspaceSlug: string }> }) {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    return Response.json({ data: await metadataService.list(principal) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

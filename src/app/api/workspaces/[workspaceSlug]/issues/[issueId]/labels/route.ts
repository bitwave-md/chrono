import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { IssueMetadataService } from "@/modules/issues/application/issue-metadata-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const metadataService = new IssueMetadataService();

export async function PUT(request: Request, context: { params: Promise<{ workspaceSlug: string; issueId: string }> }) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, issueId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const result = await metadataService.replaceLabels(principal, new EntityId(value, "issueId").value, input.uuidArray("labelIds", 50));
    return Response.json({ data: result });
  } catch (error) { return ApiErrorResponse.from(error); }
}

import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { IssueCommentService } from "@/modules/issues/application/issue-comment-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
const comments = new IssueCommentService();

interface Context {
  params: Promise<{ workspaceSlug: string; issueId: string; commentId: string }>;
}

export async function PATCH(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, issueId, commentId } = await context.params;
    const input = new JsonInput(await request.json());
    return Response.json({ data: await comments.update(
      await principals.requireWorkspace(workspaceSlug),
      new EntityId(issueId, "issueId").value,
      new EntityId(commentId, "commentId").value,
      input.requiredString("body", 20_000),
    ) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug, issueId, commentId } = await context.params;
    return Response.json({ data: await comments.remove(
      await principals.requireWorkspace(workspaceSlug),
      new EntityId(issueId, "issueId").value,
      new EntityId(commentId, "commentId").value,
    ) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

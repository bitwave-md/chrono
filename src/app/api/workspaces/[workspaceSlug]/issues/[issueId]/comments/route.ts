import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { IssueCommentService } from "@/modules/issues/application/issue-comment-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const principalResolver = new ServerPrincipalResolver();
const mutationOriginPolicy = new MutationOriginPolicy();
const commentService = new IssueCommentService();

interface CommentRouteContext { params: Promise<{ workspaceSlug: string; issueId: string }> }

export async function GET(_request: Request, context: CommentRouteContext) {
  try {
    const { workspaceSlug, issueId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    return Response.json({ data: await commentService.list(principal, new EntityId(value, "issueId").value) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

export async function POST(request: Request, context: CommentRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, issueId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const comment = await commentService.create(principal, new EntityId(value, "issueId").value, input.requiredString("body", 20_000));
    return Response.json({ data: comment }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

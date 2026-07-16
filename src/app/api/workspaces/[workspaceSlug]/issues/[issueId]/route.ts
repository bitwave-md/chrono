import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import {
  IssueService,
  issuePriorities,
  issueVisibilities,
  type UpdateIssueInput,
} from "@/modules/issues/application/issue-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const issueService = new IssueService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface IssueRouteContext {
  params: Promise<{ workspaceSlug: string; issueId: string }>;
}

export async function PATCH(
  request: Request,
  context: IssueRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, issueId: issueIdInput } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const issueId = new EntityId(issueIdInput, "issueId").value;
    const input = new JsonInput(await request.json());
    const update: UpdateIssueInput = {
      expectedVersion: input.requiredInteger("expectedVersion", 1),
      ...(input.has("projectId")
        ? { projectId: input.optionalUuid("projectId") }
        : {}),
      ...(input.has("assigneeMembershipIds")
        ? { assigneeMembershipIds: input.uuidArray("assigneeMembershipIds", 20) }
        : {}),
      ...(input.has("statusId")
        ? { statusId: input.optionalUuid("statusId") }
        : {}),
      ...(input.has("title")
        ? { title: input.requiredString("title", 240) }
        : {}),
      ...(input.has("description")
        ? { description: input.optionalString("description", 20_000) }
        : {}),
      ...(input.has("issueTypeId")
        ? { issueTypeId: input.optionalUuid("issueTypeId") }
        : {}),
      ...(input.has("priority")
        ? { priority: input.requiredEnum("priority", issuePriorities) }
        : {}),
      ...(input.has("visibility")
        ? { visibility: input.requiredEnum("visibility", issueVisibilities) }
        : {}),
      ...(input.has("estimateMinutes")
        ? { estimateMinutes: input.optionalInteger("estimateMinutes", 0) }
        : {}),
      ...(input.has("dueAt")
        ? { dueAt: input.optionalDateTime("dueAt") }
        : {}),
    };

    const issue = await issueService.update(principal, issueId, update);

    return Response.json({ data: issue });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function GET(
  _request: Request,
  context: IssueRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug, issueId: issueIdInput } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const issue = await issueService.get(
      principal,
      new EntityId(issueIdInput, "issueId").value,
    );

    return Response.json({ data: issue });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

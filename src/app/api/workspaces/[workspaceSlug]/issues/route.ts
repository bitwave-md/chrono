import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import {
  IssueService,
  issuePriorities,
  issueVisibilities,
} from "@/modules/issues/application/issue-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const issueService = new IssueService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface IssueRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  request: Request,
  context: IssueRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const parameters = new URL(request.url).searchParams;
    const clientIdInput = parameters.get("clientId");

    const optionalId = (key: string): string | undefined => {
      const value = parameters.get(key);
      return value ? new EntityId(value, key).value : undefined;
    };

    const issues = await issueService.list(
      principal,
      clientIdInput ? new EntityId(clientIdInput, "clientId").value : null,
      {
        projectId: optionalId("projectId"),
        branchId: optionalId("branchId"),
        mainBranch: parameters.get("branch") === "main",
        assigneeMembershipId: optionalId("assigneeMembershipId"),
        mine: parameters.get("mine") === "true",
      },
    );

    return Response.json({ data: issues });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: IssueRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const issue = await issueService.create(principal, {
      clientId: input.requiredUuid("clientId"),
      projectId: input.optionalUuid("projectId"),
      branchId: input.optionalUuid("branchId"),
      assigneeMembershipIds: input.uuidArray("assigneeMembershipIds", 20),
      statusId: input.optionalUuid("statusId"),
      parentIssueId: input.optionalUuid("parentIssueId"),
      title: input.requiredString("title", 240),
      description: input.optionalString("description", 20_000),
      priority: input.optionalEnum("priority", issuePriorities) ?? "none",
      visibility:
        input.optionalEnum("visibility", issueVisibilities) ?? "internal",
    });

    return Response.json({ data: issue }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

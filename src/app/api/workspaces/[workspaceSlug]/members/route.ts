import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { WorkspaceMemberService } from "@/modules/workspaces/application/workspace-member-service";

export const runtime = "nodejs";

const principalResolver = new ServerPrincipalResolver();
const memberService = new WorkspaceMemberService();

interface MemberRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(_request: Request, context: MemberRouteContext) {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    return Response.json({ data: await memberService.list(principal) });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}
